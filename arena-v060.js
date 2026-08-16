/* LiMATO Box Challenge v0.6.0 — Arena additive controller.
   IMPORTANT: intentionally additive. v0.5.0 core and Invite Room stay intact. */
(function(){
  "use strict";

  const V="0.6.0";
  const TRIAL_LIMIT=7;
  const TIME_BY_BOX={9:20,12:25,15:30,18:45};
  const LS={
    nick:"lbc-v060-nickname",
    baseline:"lbc-v060-trial-baseline",
    strikes:"lbc-v060-comment-strikes",
    mutedUntil:"lbc-v060-comment-muted-until"
  };

  const q=id=>document.getElementById(id);
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

  const arena={
    db:null,
    user:null,
    permanent:false,
    queueTimer:null,
    heartbeatTimer:null,
    matchTimer:null,
    countdownTimer:null,
    channel:null,
    matchId:null,
    match:null,
    players:[],
    states:[],
    userId:null,
    myTurn:false,
    active:false,
    currentTurnKey:null,
    submittedTurnKey:null,
    lastDice:[],
    snapshotTimer:null,
    watchdogBusy:false
  };

  function lang(){ return q("lang")?.value || "sl"; }
  function nick(){ return (q("name")?.value || "").trim().replace(/\s+/g," ").slice(0,24); }
  function validNick(){ return nick().length>=2; }
  function rawCompleted(){ return Math.max(0,+localStorage.getItem("lbc-completed-games")||0); }
  function ensureBaseline(){
    if(localStorage.getItem(LS.baseline)===null) localStorage.setItem(LS.baseline,String(rawCompleted()));
  }
  function trialUsed(){ ensureBaseline(); return Math.max(0,rawCompleted()-(+localStorage.getItem(LS.baseline)||0)); }
  function trialLeft(){ return Math.max(0,TRIAL_LIMIT-trialUsed()); }
  function needsRegistration(){ return !arena.permanent && trialUsed()>=TRIAL_LIMIT; }

  const T={
    sl:{
      arena:"⚡ LiMATO ARENA", arenaSub:"Samodejno poišče igralce z enakim Boxom in številom rund.",
      players:"Igralcev", find:"IGRAJ ONLINE", cancel:"PREKLIČI", inviteMode:"🔗 Online soba – povabi", arenaMode:"⚡ Arena – samodejno",
      nicknameNeed:"Najprej vpiši vzdevek (najmanj 2 znaka).", trial:n=>`Brezplačni preizkus: ${Math.min(trialUsed(),TRIAL_LIMIT)}/${TRIAL_LIMIT} dokončanih tekem`,
      registered:"LiMATO Player račun ✓", searching:n=>`Iščem soigralce… prijavljenih približno ${n}.`,
      matched:"Tekmeci najdeni. Arena se začenja!", turn:"Na potezi", round:"Runda", time:"Čas", watching:"V živo spremljaš",
      you:"TI", timedOut:"⏱️ Čas je potekel.", syncing:"Sinhroniziram Areno…", arenaError:"Arena trenutno ni dosegljiva.",
      community:"Community Voice", communitySub:"Dodaj kratko provokacijo ali komentar. Največ 75 znakov.", addComment:"🎤 DODAJ SVOJ KOMENTAR",
      registerTitle:"🌿 Ustvari LiMATO Player račun", registerIntro:"Odigral si prvih 7 tekem. Za nadaljevanje poveži račun z e-pošto. Brez gesla.",
      email:"E-pošta", sendCode:"POŠLJI KODO", otp:"6-mestna koda", verify:"POTRDI", close:"ZAPRI",
      privacy:"E-pošta je namenjena prijavi v igralni račun, ne oglaševanju.", codeSent:"Koda je poslana. Preveri e-pošto.",
      verified:"Račun je potrjen. Dobrodošel nazaj v Areno! 🚀", manualLink:"Če Supabase javi napako, preveri nastavitev »Allow manual linking«.",
      commentTitle:"🎤 LiMATO Community Voice", commentPersona:"Vrsta", commentText:"Tvoj komentar", submit:"POŠLJI V PREGLED",
      pending:"Super. Komentar je v čakalnici za pregled.", blocked1:"🟨 Rumeni karton. Provokacija ja, grožnje in grobe žaljivke ne. Poskusi bolj duhovito. 😂",
      blocked2:"🟥 Komentatorska klop za 24 ur. Igraš lahko naprej, komentarji pa malo počivajo. 😈",
      muted:"Komentiranje trenutno počiva. Kocke pa še vedno delajo. 🎲",
      opponentComment:name=>`🤖 ${name}: `,
      leaving:"Zapustil si Areno."
    },
    en:{
      arena:"⚡ LiMATO ARENA", arenaSub:"Automatically finds players with the same Box and round count.",
      players:"Players", find:"PLAY ONLINE", cancel:"CANCEL", inviteMode:"🔗 Online room – invite", arenaMode:"⚡ Arena – automatic",
      nicknameNeed:"Enter a nickname first (at least 2 characters).", trial:n=>`Free trial: ${Math.min(trialUsed(),TRIAL_LIMIT)}/${TRIAL_LIMIT} completed matches`,
      registered:"LiMATO Player account ✓", searching:n=>`Looking for players… about ${n} queued.`,
      matched:"Players found. Arena is starting!", turn:"Turn", round:"Round", time:"Time", watching:"Watching live",
      you:"YOU", timedOut:"⏱️ Time is up.", syncing:"Syncing Arena…", arenaError:"Arena is currently unavailable.",
      community:"Community Voice", communitySub:"Add a short provocation or comment. Max 75 characters.", addComment:"🎤 ADD YOUR COMMENT",
      registerTitle:"🌿 Create your LiMATO Player account", registerIntro:"You completed your first 7 matches. Link an email to continue. No password.",
      email:"Email", sendCode:"SEND CODE", otp:"6-digit code", verify:"VERIFY", close:"CLOSE",
      privacy:"Email is used for signing into your player account, not advertising.", codeSent:"Code sent. Check your email.",
      verified:"Account verified. Welcome back to the Arena! 🚀", manualLink:"If Supabase reports an error, check »Allow manual linking«.",
      commentTitle:"🎤 LiMATO Community Voice", commentPersona:"Type", commentText:"Your comment", submit:"SEND FOR REVIEW",
      pending:"Great. Your comment is waiting for review.", blocked1:"🟨 Yellow card. Provocation yes; threats and heavy abuse no. Make it witty. 😂",
      blocked2:"🟥 Commentary bench for 24 hours. You can keep playing; comments take a rest. 😈",
      muted:"Commenting is resting for now. The dice still work. 🎲",
      opponentComment:name=>`🤖 ${name}: `,
      leaving:"You left the Arena."
    }
  };
  const tx=(k,...args)=>{
    const d=T[lang()]||T.en;
    const v=d[k]??T.en[k]??k;
    return typeof v==="function"?v(...args):v;
  };

  function toast(text,kind="warn"){
    let el=q("v060Toast");
    if(!el){
      el=document.createElement("div");
      el.id="v060Toast";
      el.style.cssText="position:fixed;z-index:99999;left:50%;bottom:max(22px,env(safe-area-inset-bottom));transform:translateX(-50%);max-width:min(92vw,560px);padding:12px 16px;border-radius:14px;background:#1d1029;color:#fff;border:1px solid #8c68b3;box-shadow:0 10px 35px #000a;font-weight:800;text-align:center";
      document.body.appendChild(el);
    }
    el.textContent=text;
    el.style.borderColor=kind==="bad"?"#b94a58":kind==="ok"?"#72b855":"#c79b42";
    el.hidden=false;
    clearTimeout(el._t);
    el._t=setTimeout(()=>el.hidden=true,3200);
  }

  function setArenaStatus(text,kind=""){
    const el=q("arenaStatus"); if(!el)return;
    el.textContent=text||""; el.className="v060-arenaStatus "+kind;
  }

  function waitForDb(){
    return new Promise(async resolve=>{
      if(window.LBCArenaDB) return resolve(window.LBCArenaDB);
      let n=0;
      while(!window.LBCArenaDB && n++<80) await wait(100);
      resolve(window.LBCArenaDB||null);
    });
  }

  function extendComments(){
    try{
      if(typeof A==="undefined") return;
      const extraSL={
        friend:[
          "Ajde, mirno. Ena dobra poteza in si nazaj v igri.",
          "Ne lovi popolnosti — zapri pametno.",
          "Lepo. Samo brez panike, kocke še niso šef.",
          "Dober tempo. Poglej še eno kombinacijo.",
          "Tole imaš. Počasi in z glavo."
        ],
        professor:[
          "Zanimiva odločitev. Matematika bi rada še besedo.",
          "Preden klikneš: preveri, ali obstaja cenejša kombinacija.",
          "Vsota je prava. Vprašanje je, ali je izbira optimalna.",
          "Majhna številka danes lahko pomeni velik problem jutri.",
          "Analiza, prosim. Kocke niso izgovor."
        ],
        provoker:[
          "Kaj je zdej… a boš danes al kaj?",
          "A te je krč zagrabu?",
          "Ja kva si pa to naredu… dej, dej.",
          "Hm… tole je blo pa čist mim.",
          "Čas teče, Einstein.",
          "A rabiš kalkulator al bo šlo?",
          "Nasprotnik se ti že smeji.",
          "Ne glej mene. Številke čakajo.",
          "Tole je strategija… ali umetniški vtis?",
          "Ajde, junak. Klikni že neki.",
          "Kocke so bile bolj pripravljene kot ti.",
          "A je to plan ali improvizacija?"
        ],
        comic:[
          "A računaš al pečeš palačinke?",
          "Halo Houston… imamo matematiko!",
          "Kocke so oddale poročilo. Ti še vedno sestankuješ.",
          "Tole bo še za vnuke za povedat.",
          "Če bi številke znale govoriti, bi zdaj kričale.",
          "Mirno. Nihče še ni klical računovodje.",
          "Dve možnosti: genialno ali material za blooperje.",
          "Tvoj kalkulator je pravkar dal odpoved."
        ]
      };
      Object.entries(extraSL).forEach(([p,arr])=>{ if(A.sl?.[p]) A.sl[p].push(...arr); });
      const extraEN={
        friend:["Easy now. One good move at a time.","Nice pace. Check one more combination.","You have this. Think, then close."],
        professor:["The sum is correct. The strategy may still be questionable.","Before you click, check the cheaper combination.","Small numbers now can become big problems later."],
        provoker:["Today would be nice…","Need a calculator or are we doing this?","The clock is moving faster than your strategy.","Was that the plan… really?","Your opponent is already smiling.","Come on, champion. Pick something."],
        comic:["Are you calculating or baking pancakes?","Houston, we have mathematics.","The dice finished their job. Your meeting can end now.","Your calculator just resigned."]
      };
      Object.entries(extraEN).forEach(([p,arr])=>{ if(A.en?.[p]) A.en[p].push(...arr); });
    }catch(e){ console.warn("LiMATO comments:",e); }
  }

  function mount(){
    const setup=document.querySelector(".setup");
    const nameInput=q("name");
    if(!setup||!nameInput) return;

    const saved=localStorage.getItem(LS.nick);
    if(saved && !nameInput.value) nameInput.value=saved;

    const hint=document.createElement("small");
    hint.id="v060NameHint";
    hint.className="v060-nameHint";
    nameInput.parentElement.appendChild(hint);

    nameInput.addEventListener("input",()=>{
      const n=nick();
      if(n) localStorage.setItem(LS.nick,n);
      if(q("player")) q("player").textContent=n||"–";
      refreshGate();
    });

    const community=document.createElement("section");
    community.className="v060-community";
    community.innerHTML=`<div><b>🎤 <span id="v060CommunityTitle"></span></b><p id="v060CommunitySub"></p></div><button id="v060CommunityOpen"></button>`;
    const rules=document.querySelector(".rules");
    rules?.after(community);
    q("v060CommunityOpen").onclick=openCommunityModal;

    const register=document.createElement("div");
    register.id="v060RegisterOverlay";
    register.className="v060-overlay";
    register.hidden=true;
    register.innerHTML=`<div class="v060-modal">
      <h2 id="v060RegTitle"></h2>
      <p id="v060RegIntro"></p>
      <div class="v060-card"><p id="v060RegPrivacy"></p></div>
      <div class="v060-form">
        <label><span id="v060EmailLabel"></span><input id="v060RegEmail" type="email" autocomplete="email" placeholder="ime@primer.si"></label>
        <button id="v060SendCode" class="primary"></button>
        <div id="v060OtpWrap" hidden>
          <label><span id="v060OtpLabel"></span><input id="v060RegOtp" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="123456"></label>
          <button id="v060VerifyCode" class="primary"></button>
        </div>
      </div>
      <p id="v060RegMsg" class="v060-msg"></p>
      <div class="v060-actions"><button id="v060RegClose"></button></div>
    </div>`;
    document.body.appendChild(register);
    q("v060SendCode").onclick=requestCode;
    q("v060VerifyCode").onclick=verifyCode;
    q("v060RegClose").onclick=()=>register.hidden=true;

    const cm=document.createElement("div");
    cm.id="v060CommentOverlay";
    cm.className="v060-overlay";
    cm.hidden=true;
    cm.innerHTML=`<div class="v060-modal">
      <h2 id="v060CommentTitle"></h2>
      <div class="v060-form">
        <label><span id="v060CommentPersonaLabel"></span>
          <select id="v060CommentPersona">
            <option value="friend">🙂 Friend</option>
            <option value="professor">🤓 Professor</option>
            <option value="provoker" selected>😈 Provoker</option>
            <option value="comic">😂 Comic</option>
          </select>
        </label>
        <label><span id="v060CommentTextLabel"></span>
          <textarea id="v060CommentBody" maxlength="75"></textarea>
        </label>
        <div><b class="v060-count"><span id="v060Chars">0</span>/75</b></div>
      </div>
      <p id="v060CommentMsg" class="v060-msg"></p>
      <div class="v060-actions"><button id="v060CommentSubmit" class="primary"></button><button id="v060CommentClose"></button></div>
    </div>`;
    document.body.appendChild(cm);
    q("v060CommentBody").addEventListener("input",()=>q("v060Chars").textContent=q("v060CommentBody").value.length);
    q("v060CommentSubmit").onclick=submitComment;
    q("v060CommentClose").onclick=()=>cm.hidden=true;

    addArenaOption();
    translateV060();
    refreshGate();

    // Gate every path that can start a new match.
    ["start","new"].forEach(id=>q(id)?.addEventListener("click",gateClick,true));
    ["createRoom","joinRoom"].forEach(id=>q(id)?.addEventListener("click",gateClick,true));

    // Keep the visible player label in sync immediately.
    if(q("player")) q("player").textContent=nick()||"–";

    // Existing analytics consent text from v0.5 no longer claims that nicknames can never be stored.
    setTimeout(refreshConsentText,250);

    installCoreHooks();
  }

  function addArenaOption(){
    const pm=q("playMode");
    if(!pm || pm.querySelector('option[value="arena"]')) return;
    if(pm.options[1]) pm.options[1].textContent=tx("inviteMode");
    const o=document.createElement("option");
    o.value="arena";o.textContent=tx("arenaMode");pm.appendChild(o);

    const panel=document.createElement("section");
    panel.id="arenaPanel"; panel.hidden=true;
    panel.innerHTML=`<div class="v060-arenaHead">
      <div class="v060-arenaTitle"><b id="arenaTitle"></b><small id="arenaSub"></small></div>
      <div class="v060-arenaControls">
        <label><span id="arenaPlayersLabel"></span>
          <select id="arenaPlayerCount"><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option></select>
        </label>
        <button id="arenaFind" class="primary"></button>
        <button id="arenaCancel" hidden></button>
      </div>
    </div>
    <p id="arenaStatus" class="v060-arenaStatus"></p>
    <div id="arenaMatch" hidden>
      <div class="v060-turnbar">
        <div class="v060-turnwho"><span id="arenaTurnLabel"></span>: <strong id="arenaTurnName">–</strong> · <span id="arenaRoundLabel"></span> <b id="arenaRoundValue">–</b></div>
        <div id="arenaTimerWrap" class="v060-timer"><span id="arenaTimeLabel"></span><b id="arenaTimer">--:--</b></div>
      </div>
      <div id="arenaPlayers" class="v060-playerGrid"></div>
      <div id="arenaWatch" class="v060-watch" hidden>
        <h3><span id="arenaWatchingLabel"></span>: <span id="arenaWatchingName">–</span></h3>
        <div id="arenaWatchTiles" class="v060-watchTiles"></div>
        <div class="v060-watchMeta">
          <span>🎲 <b id="arenaWatchDice">–</b></span>
          <span>🎯 <b id="arenaWatchTarget">–</b></span>
          <span>📊 <b id="arenaWatchScore">–</b></span>
        </div>
        <p id="arenaWatchMessage"></p>
      </div>
    </div>`;

    q("extrasMount")?.appendChild(panel);
    q("arenaFind").onclick=startQueue;
    q("arenaCancel").onclick=cancelArena;
    pm.addEventListener("change",onPlayModeChanged);
  }

  function onPlayModeChanged(){
    const isArena=q("playMode")?.value==="arena";
    if(q("arenaPanel")) q("arenaPanel").hidden=!isArena;
    if(isArena){
      if(q("onlinePanel")) q("onlinePanel").hidden=true;
      q("start").hidden=true;
    }else{
      q("start").hidden=false;
    }
    refreshGate();
  }

  function gateClick(e){
    if(!validNick()){
      e.preventDefault();e.stopImmediatePropagation();
      toast(tx("nicknameNeed"),"warn");
      q("name")?.focus();
      return false;
    }
    if(needsRegistration()){
      e.preventDefault();e.stopImmediatePropagation();
      openRegisterModal();
      return false;
    }
  }

  function refreshGate(){
    ensureBaseline();
    const h=q("v060NameHint");
    if(h){
      if(arena.permanent){h.textContent=tx("registered");h.className="v060-nameHint ok";}
      else{h.textContent=tx("trial",trialUsed());h.className="v060-nameHint "+(trialLeft()<=2?"warn":"");}
    }
    if(q("playMode")?.value==="arena"){
      q("start").hidden=true;
    }
  }

  function openRegisterModal(){
    translateV060();
    q("v060RegisterOverlay").hidden=false;
    q("v060RegMsg").textContent=tx("registerIntro");
    q("v060RegMsg").className="v060-msg";
    setTimeout(()=>q("v060RegEmail")?.focus(),80);
  }

  async function requestCode(){
    const email=q("v060RegEmail").value.trim();
    const msg=q("v060RegMsg");
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      msg.textContent="Vpiši veljaven e-naslov.";msg.className="v060-msg bad";return;
    }
    try{
      q("v060SendCode").disabled=true;
      await arena.db.requestEmailIdentity(email);
      q("v060OtpWrap").hidden=false;
      msg.textContent=tx("codeSent")+" "+tx("manualLink");
      msg.className="v060-msg ok";
      q("v060RegOtp").focus();
    }catch(e){
      msg.textContent=(e?.message||String(e))+" — "+tx("manualLink");
      msg.className="v060-msg bad";
    }finally{q("v060SendCode").disabled=false}
  }

  async function verifyCode(){
    const email=q("v060RegEmail").value.trim();
    const token=q("v060RegOtp").value.replace(/\D/g,"").slice(0,6);
    const msg=q("v060RegMsg");
    if(token.length!==6){msg.textContent="Koda mora imeti 6 številk.";msg.className="v060-msg bad";return}
    try{
      q("v060VerifyCode").disabled=true;
      await arena.db.verifyEmailIdentity(email,token);
      arena.permanent=await arena.db.isPermanent();
      await arena.db.upsertProfile(nick(),rawCompleted());
      msg.textContent=tx("verified");msg.className="v060-msg ok";
      refreshGate();
      setTimeout(()=>q("v060RegisterOverlay").hidden=true,1100);
    }catch(e){
      msg.textContent=e?.message||String(e);msg.className="v060-msg bad";
    }finally{q("v060VerifyCode").disabled=false}
  }

  function openCommunityModal(){
    translateV060();
    const until=+localStorage.getItem(LS.mutedUntil)||0;
    const msg=q("v060CommentMsg");
    if(Date.now()<until){
      msg.textContent=tx("muted");msg.className="v060-msg warn";
      q("v060CommentSubmit").disabled=true;
    }else{
      msg.textContent="";msg.className="v060-msg";
      q("v060CommentSubmit").disabled=false;
    }
    q("v060CommentOverlay").hidden=false;
    q("v060CommentBody").focus();
  }

  function normalizeModeration(v){
    return String(v||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"");
  }

  function moderateLocal(text){
    const v=normalizeModeration(text);
    if(/https?:\/\/|www\.|@\w+\.\w+/.test(v)) return {ok:false,cat:"link_or_contact"};
    if(/\b(ubil|ubij|zakol|zaklal|murder|kill|rape|posil)\w*\b/.test(v)) return {ok:false,cat:"threat"};
    if(/\b(jebem\s+ti\s+mater|pizd|kurc|retard|idiot\s+zafukan|fuck\s+you|motherfucker)\w*/.test(v)) return {ok:false,cat:"gross_abuse"};
    if(/\b(sex|porn|fuk|fuck|suck\s+my|blowjob|dick|pussy)\w*/.test(v)) return {ok:false,cat:"sexual"};
    return {ok:true,cat:"clean"};
  }

  async function submitComment(){
    const body=q("v060CommentBody").value.trim();
    const msg=q("v060CommentMsg");
    if(body.length<3){msg.textContent="Napiši vsaj 3 znake.";msg.className="v060-msg warn";return}
    if(body.length>75){msg.textContent="Največ 75 znakov.";msg.className="v060-msg warn";return}
    if(!validNick()){msg.textContent=tx("nicknameNeed");msg.className="v060-msg warn";return}

    const verdict=moderateLocal(body);
    if(!verdict.ok){
      let strikes=(+localStorage.getItem(LS.strikes)||0)+1;
      localStorage.setItem(LS.strikes,String(strikes));
      arena.db?.logModeration(verdict.cat);
      if(strikes>=2){
        localStorage.setItem(LS.mutedUntil,String(Date.now()+24*60*60*1000));
        msg.textContent=tx("blocked2");msg.className="v060-msg bad";
        q("v060CommentSubmit").disabled=true;
      }else{
        msg.textContent=tx("blocked1");msg.className="v060-msg warn";
      }
      return;
    }
    try{
      q("v060CommentSubmit").disabled=true;
      await arena.db.submitCommunityComment({
        nickname:nick(),language:lang(),persona:q("v060CommentPersona").value,body
      });
      msg.textContent=tx("pending");msg.className="v060-msg ok";
      q("v060CommentBody").value="";q("v060Chars").textContent="0";
    }catch(e){msg.textContent=e?.message||String(e);msg.className="v060-msg bad"}
    finally{ if(Date.now()>(+localStorage.getItem(LS.mutedUntil)||0)) q("v060CommentSubmit").disabled=false; }
  }

  async function startQueue(){
    if(!validNick()){toast(tx("nicknameNeed"),"warn");q("name").focus();return}
    if(needsRegistration()){openRegisterModal();return}
    if(!arena.db?.configured){setArenaStatus("Najprej dokončaj Supabase nastavitev za v0.6.0.","bad");return}
    try{
      await stopArenaTimers(false);
      arena.active=true;
      q("arenaFind").disabled=true;
      q("arenaCancel").hidden=false;
      q("arenaMatch").hidden=true;

      const settings={
        nickname:nick(),
        maxNumber:+q("mode").value,
        rounds:+q("rounds").value,
        playerCount:+q("arenaPlayerCount").value,
        persona:q("persona").value,
        completedGames:rawCompleted()
      };
      const r=await arena.db.joinQueue(settings);
      setArenaStatus(tx("searching",r?.out_waiting||1),"warn");
      if(r?.out_match_id) return enterMatch(r.out_match_id);

      arena.queueTimer=setInterval(pollQueue,1600);
      arena.heartbeatTimer=setInterval(()=>arena.db.heartbeatQueue().catch(()=>{}),10000);
    }catch(e){
      console.error(e);setArenaStatus((e?.message||tx("arenaError")),"bad");
      q("arenaFind").disabled=false;
    }
  }

  async function pollQueue(){
    try{
      const r=await arena.db.pollQueue();
      if(!r) return;
      if(r.match_id) return enterMatch(r.match_id);
      setArenaStatus(tx("searching","…"),"warn");
    }catch(e){setArenaStatus(e?.message||tx("arenaError"),"bad")}
  }

  async function cancelArena(){
    if(arena.matchId){
      try{await arena.db.leaveMatch(arena.matchId)}catch(e){}
      await exitMatch();
      setArenaStatus(tx("leaving"),"warn");
      return;
    }
    try{await arena.db?.cancelQueue()}catch(e){}
    arena.active=false;
    await stopArenaTimers(false);
    q("arenaFind").disabled=false;q("arenaCancel").hidden=true;
    setArenaStatus("");
  }

  async function enterMatch(id){
    clearInterval(arena.queueTimer);clearInterval(arena.heartbeatTimer);
    arena.queueTimer=arena.heartbeatTimer=null;
    arena.matchId=id;arena.active=true;
    setArenaStatus(tx("matched"),"ok");
    q("arenaMatch").hidden=false;
    q("arenaCancel").hidden=false;
    q("arenaFind").disabled=true;
    if(arena.channel) await arena.db.unsubscribe(arena.channel);
    arena.channel=arena.db.subscribeMatch(id,()=>refreshMatch().catch(console.warn));
    await refreshMatch();
    arena.matchTimer=setInterval(()=>refreshMatch().catch(()=>{}),1500);
  }

  async function refreshMatch(){
    if(!arena.matchId||!arena.db)return;
    const data=await arena.db.getMatch(arena.matchId);
    arena.match=data.match;arena.players=data.players;arena.states=data.states;arena.userId=data.userId;
    arena.user=data.players.find(p=>p.owner_id===data.userId)||null;
    if(!arena.user){await exitMatch();return}

    renderArena();

    if(arena.match.status==="playing"){
      ["name","mode","rounds","persona","playMode"].forEach(id=>{const el=q(id);if(el)el.disabled=true});
    }

    const current=arena.players.find(p=>p.seat===arena.match.current_seat);
    const isMine=current?.owner_id===arena.userId && arena.match.status==="playing";
    const turnKey=`${arena.matchId}:${arena.match.current_round}:${arena.match.current_seat}`;

    if(isMine && (!arena.myTurn || arena.currentTurnKey!==turnKey)){
      arena.myTurn=true;arena.currentTurnKey=turnKey;arena.submittedTurnKey=null;
      beginMyTurn();
    }else if(!isMine){
      arena.myTurn=false;
      disableCoreForSpectator();
    }

    runWatchdog();
    if(arena.match.status==="finished"){
      arena.myTurn=false;
      clearInterval(arena.countdownTimer);arena.countdownTimer=null;
      setArenaStatus("🏆 Arena je končana. Najnižji skupni rezultat zmaga.","ok");
      q("arenaCancel").textContent="ZAPRI ARENO";
      q("roll").disabled=true;q("close").disabled=true;q("next").disabled=true;
      ["name","mode","rounds","persona","playMode"].forEach(id=>{const el=q(id);if(el)el.disabled=false});
      syncProfileCount();
    }
  }

  function renderArena(){
    const m=arena.match;if(!m)return;
    const current=arena.players.find(p=>p.seat===m.current_seat);
    q("arenaTurnName").textContent=current?.nickname||"–";
    q("arenaRoundValue").textContent=`${m.current_round}/${m.rounds}`;

    q("arenaPlayers").innerHTML=arena.players.map(p=>{
      const rs=Array.isArray(p.round_scores)?p.round_scores:[];
      const score=p.total_score??(rs.reduce((a,b)=>a+(+b||0),0));
      const classes=["v060-player",p.owner_id===arena.userId?"me":"",p.seat===m.current_seat&&m.status==="playing"?"current":""].filter(Boolean).join(" ");
      const state=p.status==="finished"?"končal":p.status==="abandoned"?"odstopil":`${rs.length}/${m.rounds}`;
      return `<div class="${classes}"><span>${esc(p.nickname)} ${p.owner_id===arena.userId?"· "+tx("you"):""}</span><small>#${p.seat} · ${state} · ${score}</small></div>`;
    }).join("");

    const st=arena.states.find(x=>x.owner_id===current?.owner_id);
    const watch=q("arenaWatch");
    if(current && current.owner_id!==arena.userId){
      watch.hidden=false;
      q("arenaWatchingName").textContent=current.nickname;
      renderWatchState(st,m.max_number);
    }else watch.hidden=true;

    updateCountdownDisplay();
  }

  function renderWatchState(st,maxNumber){
    const open=new Set(Array.isArray(st?.open_numbers)?st.open_numbers:Array.from({length:maxNumber},(_,i)=>i+1));
    q("arenaWatchTiles").innerHTML=Array.from({length:maxNumber},(_,i)=>i+1).map(n=>`<span class="v060-watchTile ${open.has(n)?"":"closed"}">${n}</span>`).join("");
    q("arenaWatchDice").textContent=(st?.dice_values||[]).join(" + ")||"–";
    q("arenaWatchTarget").textContent=st?.target??"–";
    q("arenaWatchScore").textContent=st?.round_score??"–";
    q("arenaWatchMessage").textContent=st?.message||tx("syncing");
  }

  async function beginMyTurn(){
    if(!arena.user||!arena.match)return;
    enableCoreForMyTurn();

    // Restore rounds that may have been timed out while this browser was away.
    const serverScores=Array.isArray(arena.user.round_scores)?arena.user.round_scores.map(Number):[];
    try{
      if(typeof s!=="undefined"){
        s.max=arena.match.max_number;
        s.rounds=arena.match.rounds;
        s.results=[...serverScores];
        s.round=arena.match.current_round;
        q("mode").value=String(arena.match.max_number);
        q("rounds").value=String(arena.match.rounds);

        if(serverScores.length===0 && arena.match.current_round===1 && !s.active){
          startMatch();
        }else{
          s.active=true;
          lockSetup(true);
          startRound();
          renderResults();
          setPlaying(true);
        }
      }
    }catch(e){console.warn("LiMATO turn restore:",e)}

    clearInterval(arena.countdownTimer);
    arena.countdownTimer=setInterval(updateCountdownDisplay,250);
    scheduleSnapshot();
  }

  function disableCoreForSpectator(){
    ["roll","close","change","diceChoice","next"].forEach(id=>{const el=q(id);if(el)el.disabled=true});
  }
  function enableCoreForMyTurn(){
    if(typeof s==="undefined")return;
    if(s.rolled){q("close").disabled=false}
    else q("roll").disabled=false;
    if(s.switches<3&&!s.rolled){q("change").disabled=false;q("diceChoice").disabled=false}
  }

  function secondsLeft(){
    const m=arena.match;if(!m?.turn_started_at)return null;
    const end=new Date(m.turn_started_at).getTime()+(Number(m.turn_seconds)||TIME_BY_BOX[m.max_number]||30)*1000;
    return (end-Date.now())/1000;
  }

  function updateCountdownDisplay(){
    const left=secondsLeft();
    if(left===null||!q("arenaTimer"))return;
    const sec=Math.max(0,Math.ceil(left));
    q("arenaTimer").textContent=`00:${String(sec).padStart(2,"0")}`;
    q("arenaTimerWrap").classList.toggle("urgent",sec<=7);
    if(arena.myTurn && left<=0.05) timeoutMyTurn();
  }

  function timeoutMyTurn(){
    if(!arena.myTurn||!arena.match||arena.submittedTurnKey===arena.currentTurnKey)return;
    try{
      if(typeof s!=="undefined" && s.active){
        finish(tx("timedOut"));
      }else{
        arena.db.forceTimeout(arena.matchId).catch(console.warn);
      }
    }catch(e){arena.db.forceTimeout(arena.matchId).catch(console.warn)}
  }

  async function runWatchdog(){
    if(arena.watchdogBusy||arena.myTurn||!arena.match||arena.match.status!=="playing")return;
    const left=secondsLeft();
    if(left!==null && left<-0.25){
      arena.watchdogBusy=true;
      try{await arena.db.forceTimeout(arena.matchId)}catch(e){}
      finally{arena.watchdogBusy=false}
    }
  }

  async function submitTurnFromCore(){
    if(!arena.active||!arena.myTurn||!arena.matchId||arena.submittedTurnKey===arena.currentTurnKey)return;
    arena.submittedTurnKey=arena.currentTurnKey;
    clearInterval(arena.countdownTimer);arena.countdownTimer=null;
    try{
      const roundScore=Array.isArray(s?.results)?Number(s.results[s.results.length-1]):Number(q("score")?.textContent||0);
      await arena.db.completeTurn(arena.matchId,arena.match.current_round,roundScore);
      q("next").disabled=true;
      await refreshMatch();
    }catch(e){
      console.warn("LiMATO complete turn:",e);
      arena.submittedTurnKey=null;
    }
  }

  function snapshot(){
    if(!arena.active||!arena.myTurn||!arena.matchId||!arena.db)return;
    const open=[...document.querySelectorAll("#tiles .tile.open")].map(x=>+x.textContent).filter(Number.isFinite);
    const targetText=q("target")?.textContent;
    const target=targetText && targetText!=="–" ? +targetText : null;
    const roundScore=+q("score")?.textContent||0;
    const totalScore=+q("total")?.textContent||0;
    arena.db.saveState(arena.matchId,{
      nickname:nick(),roundNumber:arena.match?.current_round||1,
      openNumbers:open,diceValues:arena.lastDice,target,
      roundScore,totalScore,message:q("message")?.textContent||""
    }).catch(()=>{});
  }

  function scheduleSnapshot(){
    if(arena.snapshotTimer)return;
    arena.snapshotTimer=setTimeout(()=>{arena.snapshotTimer=null;snapshot()},300);
  }

  function installCoreHooks(){
    try{
      // Capture dice values for spectators.
      if(typeof showDice==="function"){
        const oldShowDice=showDice;
        showDice=function(vals){arena.lastDice=[...(vals||[])];const r=oldShowDice(vals);scheduleSnapshot();return r};
      }
      if(typeof renderTiles==="function"){
        const oldRender=renderTiles;
        renderTiles=function(){const r=oldRender();scheduleSnapshot();return r};
      }
      if(typeof setMsg==="function"){
        const oldMsg=setMsg;
        setMsg=function(x){const r=oldMsg(x);scheduleSnapshot();return r};
      }
      if(typeof update==="function"){
        const oldUpdate=update;
        update=function(){const r=oldUpdate();scheduleSnapshot();return r};
      }

      // In Arena, the active player receives a taunt from one of the opponents'
      // selected commentator personalities — not from their own commentator.
      if(typeof provoke==="function"){
        const oldProvoke=provoke;
        provoke=function(){
          if(arena.active && arena.myTurn && arena.players.length>1 && typeof A!=="undefined"){
            const opponents=arena.players.filter(p=>p.owner_id!==arena.userId && p.persona!=="silent");
            const opp=opponents[Math.floor(Math.random()*opponents.length)];
            if(opp){
              const pools=A[s.lang]||A.en;
              const pool=pools[opp.persona]||pools.provoker||[];
              if(pool.length){
                q("ai").textContent=tx("opponentComment",opp.nickname)+pool[Math.floor(Math.random()*pool.length)];
                scheduleSnapshot();
                return;
              }
            }
          }
          return oldProvoke();
        };
      }

      // The core computes timeout score exactly as requested: remaining open numbers + penalties.
      if(typeof finish==="function"){
        const oldFinish=finish;
        finish=function(reason){
          const before=Array.isArray(s?.results)?s.results.length:0;
          const r=oldFinish(reason);
          const after=Array.isArray(s?.results)?s.results.length:0;
          if(arena.active && arena.myTurn && after>before){
            scheduleSnapshot();
            setTimeout(submitTurnFromCore,70);
          }
          setTimeout(()=>{refreshGate();syncProfileCount()},150);
          return r;
        };
      }

      const observer=new MutationObserver(scheduleSnapshot);
      ["tiles","dice","message","score","target","total"].forEach(id=>{
        const el=q(id);if(el)observer.observe(el,{subtree:true,childList:true,characterData:true,attributes:true});
      });
    }catch(e){console.warn("LiMATO v0.6 hooks:",e)}
  }

  async function syncProfileCount(){
    refreshGate();
    try{ if(arena.db && validNick()) await arena.db.upsertProfile(nick(),rawCompleted()); }catch(e){}
  }

  async function loadCommunity(){
    try{
      if(!arena.db||typeof A==="undefined")return;
      const rows=await arena.db.loadCommunityComments(lang());
      rows.forEach(c=>{
        const dictionary=A[c.language]||A.en;
        if(dictionary?.[c.persona] && !dictionary[c.persona].includes(c.body)) dictionary[c.persona].push(c.body);
      });
    }catch(e){}
  }

  async function exitMatch(){
    clearInterval(arena.matchTimer);clearInterval(arena.countdownTimer);
    arena.matchTimer=arena.countdownTimer=null;
    if(arena.channel) await arena.db?.unsubscribe(arena.channel);
    arena.channel=null;arena.matchId=null;arena.match=null;arena.players=[];arena.states=[];
    arena.myTurn=false;arena.active=false;arena.currentTurnKey=null;arena.submittedTurnKey=null;
    q("arenaMatch").hidden=true;q("arenaFind").disabled=false;q("arenaCancel").hidden=true;
    ["name","mode","rounds","persona","playMode"].forEach(id=>{const el=q(id);if(el)el.disabled=false});
    q("arenaCancel").textContent=tx("cancel");
  }

  async function stopArenaTimers(unsubscribe=true){
    [arena.queueTimer,arena.heartbeatTimer,arena.matchTimer,arena.countdownTimer].forEach(x=>clearInterval(x));
    arena.queueTimer=arena.heartbeatTimer=arena.matchTimer=arena.countdownTimer=null;
    if(unsubscribe&&arena.channel){await arena.db?.unsubscribe(arena.channel);arena.channel=null}
  }

  function refreshConsentText(){
    const c=q("consentText");if(!c)return;
    c.textContent=lang()==="sl"
      ?"Dovoli anonimno statistiko za izboljšanje igre. Vzdevek se lahko shrani za Online/Arena igranje; e-pošto shranimo samo, če ustvariš LiMATO Player račun."
      :"Allow anonymous game analytics. A nickname may be stored for Online/Arena play; email is stored only if you create a LiMATO Player account.";
  }

  function translateV060(){
    if(q("arenaTitle")){
      q("arenaTitle").textContent=tx("arena");q("arenaSub").textContent=tx("arenaSub");
      q("arenaPlayersLabel").textContent=tx("players");q("arenaFind").textContent=tx("find");q("arenaCancel").textContent=tx("cancel");
      q("arenaTurnLabel").textContent=tx("turn");q("arenaRoundLabel").textContent=tx("round");q("arenaTimeLabel").textContent=tx("time");
      q("arenaWatchingLabel").textContent=tx("watching");
      const pm=q("playMode"); if(pm){const old=pm.querySelector('option[value="online"]'),a=pm.querySelector('option[value="arena"]');if(old)old.textContent=tx("inviteMode");if(a)a.textContent=tx("arenaMode")}
    }
    if(q("v060CommunityTitle")){
      q("v060CommunityTitle").textContent=tx("community");q("v060CommunitySub").textContent=tx("communitySub");q("v060CommunityOpen").textContent=tx("addComment");
    }
    if(q("v060RegTitle")){
      q("v060RegTitle").textContent=tx("registerTitle");q("v060RegIntro").textContent=tx("registerIntro");q("v060RegPrivacy").textContent=tx("privacy");
      q("v060EmailLabel").textContent=tx("email");q("v060SendCode").textContent=tx("sendCode");q("v060OtpLabel").textContent=tx("otp");
      q("v060VerifyCode").textContent=tx("verify");q("v060RegClose").textContent=tx("close");
    }
    if(q("v060CommentTitle")){
      q("v060CommentTitle").textContent=tx("commentTitle");q("v060CommentPersonaLabel").textContent=tx("commentPersona");
      q("v060CommentTextLabel").textContent=tx("commentText");q("v060CommentSubmit").textContent=tx("submit");q("v060CommentClose").textContent=tx("close");
    }
    refreshGate();refreshConsentText();
  }

  async function boot(){
    ensureBaseline();
    extendComments();
    mount();
    arena.db=await waitForDb();
    if(!arena.db){
      setArenaStatus("Supabase Arena modul se ni naložil.","bad");
      return;
    }
    try{
      arena.user=await arena.db.getUser();
      arena.permanent=await arena.db.isPermanent();
      await syncProfileCount();
      await loadCommunity();
    }catch(e){console.warn("LiMATO Arena auth:",e)}
    translateV060();

    q("lang")?.addEventListener("change",()=>{setTimeout(()=>{translateV060();loadCommunity()},0)});

    window.addEventListener("beforeunload",()=>{
      if(arena.matchId) arena.db?.saveState(arena.matchId,{
        nickname:nick(),roundNumber:arena.match?.current_round||1,
        openNumbers:[...document.querySelectorAll("#tiles .tile.open")].map(x=>+x.textContent),
        diceValues:arena.lastDice,target:null,roundScore:+q("score")?.textContent||0,totalScore:+q("total")?.textContent||0,message:""
      }).catch(()=>{});
    });
  }

  window.addEventListener("load",boot,{once:true});
  window.LBCArenaV060={version:V,arena,openRegister:openRegisterModal,openCommunity:openCommunityModal};
})();
