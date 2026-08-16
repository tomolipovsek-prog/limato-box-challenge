// LiMATO Box Challenge v0.6.0 — Arena/Supabase data layer.
// Uses its own persisted auth storage so the proven v0.5 Invite Room remains untouched.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.LBC_SUPABASE || {};
const configured = /^https:\/\//.test(cfg.url || "") && String(cfg.key || "").length > 20;
const projectRef = configured ? new URL(cfg.url).hostname.split(".")[0] : "local";
const sb = configured
  ? createClient(cfg.url, cfg.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: `lbc-v060-${projectRef}-auth`
      }
    })
  : null;

async function ensureAuth(){
  if(!sb) throw new Error("Supabase ni nastavljen.");
  const {data:{session}, error:sessionError}=await sb.auth.getSession();
  if(sessionError) throw sessionError;
  if(session?.user) return session.user;
  const {data,error}=await sb.auth.signInAnonymously();
  if(error) throw error;
  return data.user;
}

async function getUser(){
  if(!sb) return null;
  const user=await ensureAuth();
  const {data,error}=await sb.auth.getUser();
  if(error) throw error;
  return data.user || user;
}

async function isPermanent(){
  const u=await getUser();
  return !!u && !u.is_anonymous;
}

async function upsertProfile(nickname, completedGames=0){
  const u=await ensureAuth();
  const {error}=await sb.from("lbc_profiles").upsert({
    owner_id:u.id,
    nickname:String(nickname||"").trim().slice(0,24),
    completed_games:Math.max(0,Number(completedGames)||0),
    updated_at:new Date().toISOString()
  },{onConflict:"owner_id"});
  if(error) throw error;
  return u.id;
}

async function requestEmailIdentity(email){
  await ensureAuth();
  const {data,error}=await sb.auth.updateUser({email:String(email||"").trim()});
  if(error) throw error;
  return data;
}

async function verifyEmailIdentity(email, token){
  const {data,error}=await sb.auth.verifyOtp({
    email:String(email||"").trim(),
    token:String(token||"").replace(/\D/g,"").slice(0,6),
    type:"email_change"
  });
  if(error) throw error;
  return data;
}

async function joinQueue(settings){
  const u=await ensureAuth();
  await upsertProfile(settings.nickname, settings.completedGames||0);
  const {data,error}=await sb.rpc("lbc_arena_join_queue",{
    p_nickname:settings.nickname,
    p_max_number:Number(settings.maxNumber),
    p_rounds:Number(settings.rounds),
    p_player_count:Number(settings.playerCount),
    p_persona:settings.persona
  });
  if(error) throw error;
  const row=Array.isArray(data)?data[0]:data;
  return row || {out_match_id:null,out_status:"queued",out_waiting:1};
}

async function pollQueue(){
  const u=await ensureAuth();
  const {data,error}=await sb.from("lbc_arena_queue")
    .select("status,match_id,player_count,max_number,rounds,joined_at,last_seen")
    .eq("owner_id",u.id).maybeSingle();
  if(error) throw error;
  return data;
}

async function heartbeatQueue(){
  const u=await ensureAuth();
  const {error}=await sb.from("lbc_arena_queue")
    .update({last_seen:new Date().toISOString()})
    .eq("owner_id",u.id).eq("status","queued");
  if(error) throw error;
}

async function cancelQueue(){
  const u=await ensureAuth();
  const {error}=await sb.from("lbc_arena_queue").delete().eq("owner_id",u.id).eq("status","queued");
  if(error) throw error;
}

async function getMatch(matchId){
  const u=await ensureAuth();
  const [{data:match,error:me},{data:players,error:pe},{data:states,error:se}] = await Promise.all([
    sb.from("lbc_arena_matches").select("*").eq("id",matchId).single(),
    sb.from("lbc_arena_players").select("*").eq("match_id",matchId).order("seat",{ascending:true}),
    sb.from("lbc_arena_state").select("*").eq("match_id",matchId)
  ]);
  if(me) throw me;
  if(pe) throw pe;
  if(se) throw se;
  return {match,players:players||[],states:states||[],userId:u.id};
}

function subscribeMatch(matchId, onChange){
  if(!sb) return null;
  const ch=sb.channel(`lbc-v060-match-${matchId}-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes",{event:"*",schema:"public",table:"lbc_arena_matches",filter:`id=eq.${matchId}`},onChange)
    .on("postgres_changes",{event:"*",schema:"public",table:"lbc_arena_players",filter:`match_id=eq.${matchId}`},onChange)
    .on("postgres_changes",{event:"*",schema:"public",table:"lbc_arena_state",filter:`match_id=eq.${matchId}`},onChange)
    .subscribe();
  return ch;
}

async function unsubscribe(channel){
  if(sb && channel) await sb.removeChannel(channel);
}

async function saveState(matchId, snapshot){
  const u=await ensureAuth();
  const payload={
    match_id:matchId,
    owner_id:u.id,
    nickname:String(snapshot.nickname||"").slice(0,24),
    round_number:Number(snapshot.roundNumber)||1,
    open_numbers:Array.isArray(snapshot.openNumbers)?snapshot.openNumbers:[],
    dice_values:Array.isArray(snapshot.diceValues)?snapshot.diceValues:[],
    target:Number.isFinite(snapshot.target)?snapshot.target:null,
    round_score:Number(snapshot.roundScore)||0,
    total_score:Number(snapshot.totalScore)||0,
    message:String(snapshot.message||"").slice(0,180),
    updated_at:new Date().toISOString()
  };
  const {error}=await sb.from("lbc_arena_state").upsert(payload,{onConflict:"match_id,owner_id"});
  if(error) throw error;
}

async function completeTurn(matchId, roundNumber, roundScore){
  const {data,error}=await sb.rpc("lbc_arena_complete_turn",{
    p_match_id:matchId,
    p_round_number:Number(roundNumber),
    p_round_score:Number(roundScore)
  });
  if(error) throw error;
  return Array.isArray(data)?data[0]:data;
}

async function forceTimeout(matchId){
  const {data,error}=await sb.rpc("lbc_arena_force_timeout",{p_match_id:matchId});
  if(error) throw error;
  return Array.isArray(data)?data[0]:data;
}

async function leaveMatch(matchId){
  const {data,error}=await sb.rpc("lbc_arena_leave_match",{p_match_id:matchId});
  if(error) throw error;
  return data;
}

async function loadCommunityComments(language){
  if(!sb) return [];
  await ensureAuth();
  const {data,error}=await sb.from("lbc_community_comments")
    .select("id,nickname,language,persona,body")
    .eq("status","approved")
    .eq("language",String(language||"sl").slice(0,5))
    .order("created_at",{ascending:false})
    .limit(300);
  if(error) throw error;
  return data||[];
}

async function submitCommunityComment(payload){
  const u=await ensureAuth();
  const {data,error}=await sb.from("lbc_community_comments").insert({
    owner_id:u.id,
    nickname:String(payload.nickname||"").trim().slice(0,24),
    language:String(payload.language||"sl").slice(0,5),
    persona:String(payload.persona||"provoker").slice(0,20),
    body:String(payload.body||"").trim().slice(0,75),
    status:"pending"
  }).select("id").single();
  if(error) throw error;
  return data;
}

async function logModeration(category){
  const u=await ensureAuth();
  const {error}=await sb.from("lbc_moderation_events").insert({
    owner_id:u.id,
    category:String(category||"blocked").slice(0,40)
  });
  if(error) console.warn("LiMATO moderation log:",error.message);
}

window.LBCArenaDB={
  configured,
  ensureAuth,
  getUser,
  isPermanent,
  upsertProfile,
  requestEmailIdentity,
  verifyEmailIdentity,
  joinQueue,
  pollQueue,
  heartbeatQueue,
  cancelQueue,
  getMatch,
  subscribeMatch,
  unsubscribe,
  saveState,
  completeTurn,
  forceTimeout,
  leaveMatch,
  loadCommunityComments,
  submitCommunityComment,
  logModeration
};
window.dispatchEvent(new CustomEvent("lbc-arena-db-ready"));
