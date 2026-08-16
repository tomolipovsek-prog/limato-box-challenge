-- LiMATO Box Challenge v0.6.1 — Turn & Timer migration
-- RUN ONCE in Supabase > SQL Editor AFTER v0.6.0 migration.
-- Safe to rerun. Does not delete existing v0.5/v0.6 data.
--
-- v0.6.1 rules:
--   Arena seats follow queue order (first joined = seat 1 = starts).
--   Full ROUND timer: 1-9=40s, 1-12=45s, 1-15=50s, 1-18=60s.
--   Experience handicap: -1s per 1000 completed games, max -5s.
--   On timeout, the current saved round state is scored and play advances.

alter table public.lbc_arena_queue
  add column if not exists completed_games integer not null default 0
  check (completed_games >= 0);

alter table public.lbc_arena_players
  add column if not exists completed_games integer not null default 0
  check (completed_games >= 0);

create or replace function public.lbc_arena_seconds(
  p_max_number integer,
  p_completed_games integer
)
returns integer
language sql
immutable
as $$
  select greatest(
    10,
    (case p_max_number
      when 9 then 40
      when 12 then 45
      when 15 then 50
      when 18 then 60
      else 40
    end)
    - least(5, greatest(0, coalesce(p_completed_games,0)) / 1000)
  )::integer;
$$;

-- Matchmaking: FIRST IN QUEUE = FIRST TO PLAY.
-- completed_games is read from the already maintained LiMATO player profile.
create or replace function public.lbc_arena_join_queue(
  p_nickname text,
  p_max_number integer,
  p_rounds integer,
  p_player_count integer,
  p_persona text
)
returns table(out_match_id uuid,out_status text,out_waiting integer)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_match uuid;
  v_ids uuid[];
  v_count integer:=0;
  v_turn integer;
  v_games integer:=0;
  v_first_games integer:=0;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  p_nickname:=trim(regexp_replace(coalesce(p_nickname,''),'\s+',' ','g'));
  if char_length(p_nickname)<2 or char_length(p_nickname)>24 then raise exception 'nickname_invalid'; end if;
  if p_max_number not in (9,12,15,18) then raise exception 'box_invalid'; end if;
  if p_rounds not in (3,5,7) then raise exception 'rounds_invalid'; end if;
  if p_player_count<2 or p_player_count>6 then raise exception 'player_count_invalid'; end if;
  if p_persona not in ('friend','professor','provoker','comic','silent') then p_persona:='friend'; end if;

  select coalesce(completed_games,0)
    into v_games
  from public.lbc_profiles
  where owner_id=v_uid;
  v_games:=coalesce(v_games,0);

  -- One lock per ruleset prevents two clients from creating the same group.
  perform pg_advisory_xact_lock(
    hashtext(p_max_number::text||':'||p_rounds::text||':'||p_player_count::text)
  );

  delete from public.lbc_arena_queue
  where status='queued' and last_seen < now()-interval '90 seconds';

  insert into public.lbc_arena_queue(
    owner_id,nickname,max_number,rounds,player_count,persona,
    status,match_id,joined_at,last_seen,completed_games
  )
  values(
    v_uid,p_nickname,p_max_number,p_rounds,p_player_count,p_persona,
    'queued',null,now(),now(),v_games
  )
  on conflict(owner_id) do update set
    nickname=excluded.nickname,
    max_number=excluded.max_number,
    rounds=excluded.rounds,
    player_count=excluded.player_count,
    persona=excluded.persona,
    status='queued',
    match_id=null,
    joined_at=now(),
    last_seen=now(),
    completed_games=excluded.completed_games;

  select count(*) into v_count
  from public.lbc_arena_queue
  where status='queued'
    and max_number=p_max_number
    and rounds=p_rounds
    and player_count=p_player_count;

  if v_count>=p_player_count then
    select array_agg(owner_id order by joined_at,owner_id)
      into v_ids
    from (
      select owner_id,joined_at
      from public.lbc_arena_queue
      where status='queued'
        and max_number=p_max_number
        and rounds=p_rounds
        and player_count=p_player_count
      order by joined_at,owner_id
      for update skip locked
      limit p_player_count
    ) s;

    if coalesce(cardinality(v_ids),0)>=p_player_count then
      select coalesce(q.completed_games,0)
        into v_first_games
      from public.lbc_arena_queue q
      where q.owner_id=v_ids[1];

      v_turn:=public.lbc_arena_seconds(p_max_number,v_first_games);

      insert into public.lbc_arena_matches(
        max_number,rounds,player_count,status,
        current_seat,current_round,turn_seconds,turn_started_at
      )
      values(
        p_max_number,p_rounds,p_player_count,'playing',
        1,1,v_turn,now()
      )
      returning id into v_match;

      update public.lbc_arena_queue
      set status='matched',match_id=v_match,last_seen=now()
      where owner_id=any(v_ids);

      insert into public.lbc_arena_players(
        match_id,owner_id,nickname,seat,persona,completed_games
      )
      select
        v_match,
        q.owner_id,
        q.nickname,
        row_number() over(order by q.joined_at,q.owner_id)::integer,
        q.persona,
        coalesce(q.completed_games,0)
      from public.lbc_arena_queue q
      where q.owner_id=any(v_ids);
    end if;
  end if;

  select q.match_id,q.status
    into out_match_id,out_status
  from public.lbc_arena_queue q
  where q.owner_id=v_uid;

  select count(*)::integer
    into out_waiting
  from public.lbc_arena_queue
  where status='queued'
    and max_number=p_max_number
    and rounds=p_rounds
    and player_count=p_player_count;

  return next;
end;
$$;

revoke all on function public.lbc_arena_join_queue(text,integer,integer,integer,text) from public;
grant execute on function public.lbc_arena_join_queue(text,integer,integer,integer,text) to authenticated;

-- Complete a player's whole round, then pass play to the next seat.
create or replace function public.lbc_arena_complete_turn(
  p_match_id uuid,
  p_round_number integer,
  p_round_score integer
)
returns table(out_status text,out_current_seat integer,out_current_round integer)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  m public.lbc_arena_matches%rowtype;
  p public.lbc_arena_players%rowtype;
  v_score integer;
  v_total integer;
  v_next integer;
  v_next_round integer;
  v_next_games integer:=0;
  v_next_seconds integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into m
  from public.lbc_arena_matches
  where id=p_match_id
  for update;

  if not found then raise exception 'match_not_found'; end if;

  select * into p
  from public.lbc_arena_players
  where match_id=p_match_id and owner_id=v_uid;

  if not found then raise exception 'not_match_member'; end if;

  if m.status<>'playing'
     or p.seat<>m.current_seat
     or p_round_number<>m.current_round then
    return query
      select m.status,m.current_seat,m.current_round;
    return;
  end if;

  v_score:=greatest(0,least(coalesce(p_round_score,0),999));

  select coalesce(sum(x),0)::integer
    into v_total
  from unnest(coalesce(p.round_scores,'{}'::integer[])) x;

  v_total:=v_total+v_score;

  update public.lbc_arena_players
  set
    round_scores=array_append(coalesce(round_scores,'{}'::integer[]),v_score),
    partial_score=v_total,
    total_score=case when m.current_round>=m.rounds then v_total else null end,
    status=case when m.current_round>=m.rounds then 'finished' else status end,
    last_seen=now(),
    updated_at=now()
  where match_id=p_match_id and owner_id=v_uid;

  select min(seat)
    into v_next
  from public.lbc_arena_players
  where match_id=p_match_id
    and status<>'abandoned'
    and seat>m.current_seat
    and coalesce(array_length(round_scores,1),0)<m.current_round;

  if v_next is not null then
    select coalesce(completed_games,0)
      into v_next_games
    from public.lbc_arena_players
    where match_id=p_match_id and seat=v_next;

    v_next_seconds:=public.lbc_arena_seconds(m.max_number,v_next_games);

    update public.lbc_arena_matches
    set current_seat=v_next,
        turn_seconds=v_next_seconds,
        turn_started_at=now()
    where id=p_match_id;

  elsif m.current_round>=m.rounds then
    update public.lbc_arena_matches
    set status='finished',
        finished_at=now(),
        turn_started_at=null
    where id=p_match_id;

  else
    v_next_round:=m.current_round+1;

    select min(seat)
      into v_next
    from public.lbc_arena_players
    where match_id=p_match_id
      and status<>'abandoned'
      and coalesce(array_length(round_scores,1),0)<v_next_round;

    if v_next is null then
      update public.lbc_arena_matches
      set status='finished',
          finished_at=now(),
          turn_started_at=null
      where id=p_match_id;
    else
      select coalesce(completed_games,0)
        into v_next_games
      from public.lbc_arena_players
      where match_id=p_match_id and seat=v_next;

      v_next_seconds:=public.lbc_arena_seconds(m.max_number,v_next_games);

      update public.lbc_arena_matches
      set current_round=v_next_round,
          current_seat=v_next,
          turn_seconds=v_next_seconds,
          turn_started_at=now()
      where id=p_match_id;
    end if;
  end if;

  return query
    select status,current_seat,current_round
    from public.lbc_arena_matches
    where id=p_match_id;
end;
$$;

revoke all on function public.lbc_arena_complete_turn(uuid,integer,integer) from public;
grant execute on function public.lbc_arena_complete_turn(uuid,integer,integer) to authenticated;

-- Any match member may advance play only AFTER the server-side deadline.
-- The last saved live state already contains "remaining open numbers + penalties"
-- in round_score, so timeout preserves the actual state of play.
create or replace function public.lbc_arena_force_timeout(p_match_id uuid)
returns table(out_status text,out_current_seat integer,out_current_round integer)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  m public.lbc_arena_matches%rowtype;
  p public.lbc_arena_players%rowtype;
  st public.lbc_arena_state%rowtype;
  v_owner uuid;
  v_score integer;
  v_total integer;
  v_next integer;
  v_next_round integer;
  v_next_games integer:=0;
  v_next_seconds integer;
begin
  if v_uid is null or not public.lbc_is_match_member(p_match_id) then
    raise exception 'not_match_member';
  end if;

  select * into m
  from public.lbc_arena_matches
  where id=p_match_id
  for update;

  if not found then raise exception 'match_not_found'; end if;

  if m.status<>'playing' then
    return query select m.status,m.current_seat,m.current_round;
    return;
  end if;

  if m.turn_started_at is null
     or now() < m.turn_started_at + make_interval(secs=>m.turn_seconds) then
    return query select m.status,m.current_seat,m.current_round;
    return;
  end if;

  select owner_id
    into v_owner
  from public.lbc_arena_players
  where match_id=p_match_id and seat=m.current_seat;

  select * into p
  from public.lbc_arena_players
  where match_id=p_match_id and owner_id=v_owner;

  select * into st
  from public.lbc_arena_state
  where match_id=p_match_id
    and owner_id=v_owner
    and round_number=m.current_round;

  if found then
    v_score:=greatest(0,least(coalesce(st.round_score,0),999));
  else
    v_score:=(m.max_number*(m.max_number+1))/2;
  end if;

  select coalesce(sum(x),0)::integer
    into v_total
  from unnest(coalesce(p.round_scores,'{}'::integer[])) x;

  v_total:=v_total+v_score;

  update public.lbc_arena_players
  set
    round_scores=array_append(coalesce(round_scores,'{}'::integer[]),v_score),
    partial_score=v_total,
    total_score=case when m.current_round>=m.rounds then v_total else null end,
    status=case
      when status='abandoned' then 'abandoned'
      when m.current_round>=m.rounds then 'finished'
      else status
    end,
    updated_at=now()
  where match_id=p_match_id and owner_id=v_owner;

  select min(seat)
    into v_next
  from public.lbc_arena_players
  where match_id=p_match_id
    and status<>'abandoned'
    and seat>m.current_seat
    and coalesce(array_length(round_scores,1),0)<m.current_round;

  if v_next is not null then
    select coalesce(completed_games,0)
      into v_next_games
    from public.lbc_arena_players
    where match_id=p_match_id and seat=v_next;

    v_next_seconds:=public.lbc_arena_seconds(m.max_number,v_next_games);

    update public.lbc_arena_matches
    set current_seat=v_next,
        turn_seconds=v_next_seconds,
        turn_started_at=now()
    where id=p_match_id;

  elsif m.current_round>=m.rounds then
    update public.lbc_arena_matches
    set status='finished',
        finished_at=now(),
        turn_started_at=null
    where id=p_match_id;

  else
    v_next_round:=m.current_round+1;

    select min(seat)
      into v_next
    from public.lbc_arena_players
    where match_id=p_match_id
      and status<>'abandoned'
      and coalesce(array_length(round_scores,1),0)<v_next_round;

    if v_next is null then
      update public.lbc_arena_matches
      set status='finished',
          finished_at=now(),
          turn_started_at=null
      where id=p_match_id;
    else
      select coalesce(completed_games,0)
        into v_next_games
      from public.lbc_arena_players
      where match_id=p_match_id and seat=v_next;

      v_next_seconds:=public.lbc_arena_seconds(m.max_number,v_next_games);

      update public.lbc_arena_matches
      set current_round=v_next_round,
          current_seat=v_next,
          turn_seconds=v_next_seconds,
          turn_started_at=now()
      where id=p_match_id;
    end if;
  end if;

  return query
    select status,current_seat,current_round
    from public.lbc_arena_matches
    where id=p_match_id;
end;
$$;

revoke all on function public.lbc_arena_force_timeout(uuid) from public;
grant execute on function public.lbc_arena_force_timeout(uuid) to authenticated;

-- Quick verification after migration:
-- select public.lbc_arena_seconds(9,0);       -- 40
-- select public.lbc_arena_seconds(12,1000);  -- 44
-- select public.lbc_arena_seconds(15,3000);  -- 47
-- select public.lbc_arena_seconds(18,5000);  -- 55
