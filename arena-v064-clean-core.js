/* LiMATO Box Challenge v0.6.9 — LIVE TIMER / AI TIMEOUT STABILITY FIX
   Additive patch: keeps Solo / Invite / Arena / Hard Mode intact.
   AI opponent uses the same Box, rounds, dice-change penalties and scoring rules.
*/
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const randomThinkMs=()=>1000+Math.floor(Math.random()*6001); // AI delay stays hidden: 1–7 s
async function humanPause(){
  await sleep(randomThinkMs());
}

const TURN_SECONDS={9:40,12:45,15:50,18:60};
const ai={
  enabled:false, level:"challenger", results:[], roundLogs:[], running:false,
  turnTimer:null, turnEndsAt:0, timerOwner:null, starter:"human",
  timerGeneration:0, starting:false, transitioning:false, finishing:false
};

function turnSeconds(){
  return TURN_SECONDS[Number(s?.max)] || 40;
}
function renderTurnTimer(){
  const el=$("aiTurnTimer");
  if(!el)return;
  if((!s?.active && ai.timerOwner!=="ai") || !ai.turnEndsAt){
    el.textContent="--:--";
    return;
  }
  const left=Math.max(0,Math.ceil((ai.turnEndsAt-Date.now())/1000));
  el.textContent=`00:${String(left).padStart(2,"0")}`;
  const wrap=$("aiTurnTimerWrap");
  if(wrap) wrap.style.color=left<=7?"#ff9a9a":"#ffd66d";
}
function stopTurnTimer(){
  ai.timerGeneration++;
  if(ai.turnTimer){clearInterval(ai.turnTimer);ai.turnTimer=null;}
  ai.turnEndsAt=0;
  ai.timerOwner=null;
  renderTurnTimer();
}
function startTurnTimer(owner="human"){
  stopTurnTimer();
  if($("playMode")?.value==="arena" || (owner==="human" && !s?.active))return;
  ai.timerOwner=owner;
  const generation=++ai.timerGeneration;
  ai.turnEndsAt=Date.now()+turnSeconds()*1000;
  renderTurnTimer();
  ai.turnTimer=setInterval(()=>{
    if(generation!==ai.timerGeneration)return;
    renderTurnTimer();
    if(Date.now()>=ai.turnEndsAt){
      const owner=ai.timerOwner;
      if(ai.turnTimer){clearInterval(ai.turnTimer);ai.turnTimer=null;}
      ai.turnEndsAt=0;
      ai.timerOwner=null;
      if(owner==="human" && !ai.running && s?.active){
        finish("⏱️ Čas je potekel.");
      }else{
        const el=$("aiTurnTimer"); if(el) el.textContent="00:00";
      }
    }
  },200);
}

function injectUI(){
  const pm=$("playMode");
  if(!pm) return;

  if(!pm.querySelector('option[value="ai"]')){
    const opt=document.createElement("option");
    opt.value="ai";
    opt.textContent="🤖 Proti AI";
    pm.appendChild(opt);
  }

  const mount=$("extrasMount");
  if(!mount || $("aiChallengeBox")) return;

  const box=document.createElement("section");
  box.id="aiChallengeBox";
  box.className="aiChallengeBox";
  box.hidden=true;
  box.innerHTML=`
    <b>🤖 AI CHALLENGE</b>
    <div class="aiChallengeGrid">
      <label><span>Težavnost AI</span>
        <select id="aiLevel">
          <option value="beginner">🟢 Začetnik</option>
          <option value="challenger" selected>🟡 Izzivalec</option>
          <option value="master">🔴 Mojster</option>
        </select>
      </label>
    </div>
    <div id="aiScoreCard" class="aiScoreCard" hidden>
      <div class="aiScoreRows" style="align-items:stretch">
        <div style="padding:10px">
          👤 <b id="aiHumanName">Igralec</b><br><strong id="aiHumanTotal">0</strong>
          <div style="margin-top:8px;font-weight:800;color:#ffd66d">Rezultati</div>
          <div id="aiHumanRounds" style="margin-top:5px;line-height:1.6">R1: – &nbsp; R2: – &nbsp; R3: –</div>
        </div>
        <div style="padding:10px">
          🤖 <b id="aiOpponentName">LiMATO AI</b><br><strong id="aiOpponentTotal">0</strong>
          <div style="margin-top:8px;font-weight:800;color:#ffd66d">Rezultati</div>
          <div id="aiOpponentRounds" style="margin-top:5px;line-height:1.6">R1: – &nbsp; R2: – &nbsp; R3: –</div>
        </div>
      </div>
      <div id="aiRoundInfo" style="display:none"></div>
      <div id="aiStartRoll" style="margin-top:10px;padding:10px;border-radius:10px;background:rgba(0,0,0,.18);text-align:center;font-weight:800" hidden></div>
      <div id="aiLive" style="margin-top:10px;padding:10px;border-radius:10px;background:rgba(0,0,0,.18);text-align:center;line-height:1.55" hidden></div>
      <div id="aiVerdict" class="aiVerdict"></div>
    </div>`;
  mount.appendChild(box);
  mountTurnTimerInResultsPanel();

  pm.addEventListener("change",syncMode);
  $("name")?.addEventListener("input",()=>{
    if($("aiHumanName")) $("aiHumanName").textContent=$("name").value.trim()||"Igralec";
  });
  $("aiLevel").addEventListener("change",()=>{
    ai.level=$("aiLevel").value;
    renderAI();
  });
}



function mountTurnTimerInResultsPanel(){
  if($("aiTurnTimerWrap")) return;
  const results=$("results");
  const panel=results?.closest("aside");
  if(!panel)return;
  const wrap=document.createElement("div");
  wrap.id="aiTurnTimerWrap";
  wrap.style.cssText="margin:0 0 14px;padding:12px;border:1px solid rgba(255,214,109,.35);border-radius:12px;text-align:center;font-weight:900;color:#ffd66d";
  wrap.innerHTML='<div style="font-size:15px;margin-bottom:6px">⏱️ ODŠTEVALNIK</div><div id="aiTurnTimer" style="font-size:34px;line-height:1">--:--</div>';
  panel.insertBefore(wrap, results);
}


async function decideWhoStarts(){
  if(!ai.enabled)return "human";
  const host=$("aiStartRoll");
  const human=$("name")?.value.trim()||$("player")?.textContent.trim()||"Igralec";
  if(host){host.hidden=false;host.innerHTML="🎲 <b>Kdo začne?</b><br>Oba vržeta 4 kocke — nižji seštevek začne.";}
  let hd,ad,hs,as;
  do{
    hd=Array.from({length:4},()=>1+Math.floor(Math.random()*6));
    ad=Array.from({length:4},()=>1+Math.floor(Math.random()*6));
    hs=hd.reduce((x,y)=>x+y,0);
    as=ad.reduce((x,y)=>x+y,0);
    if(host){
      host.innerHTML=
        `🎲 <b>Kdo začne?</b><br>`+
        `👤 ${human}: ${hd.join(" + ")} = <b>${hs}</b><br>`+
        `🤖 LiMATO AI: ${ad.join(" + ")} = <b>${as}</b>`+
        (hs===as?`<br>🤝 Izenačeno — ponovni met…`:"");
    }
    if(hs===as) await sleep(1000);
  }while(hs===as);
  const starter=hs<as?"human":"ai";
  if(host) host.innerHTML+=`<br>🏁 Začne: <b>${starter==="human"?human:"LiMATO AI"}</b>`;
  return starter;
}

function syncMode(){
  const pm=$("playMode");
  ai.enabled=pm?.value==="ai";
  ai.level=$("aiLevel")?.value||"challenger";
  if($("aiChallengeBox")) $("aiChallengeBox").hidden=!ai.enabled;
  if($("aiScoreCard")) $("aiScoreCard").hidden=!ai.enabled;
}
function subsets(nums,target){
  const out=[];
  function rec(i,left,cur){
    if(left===0){out.push(cur.slice());return}
    if(left<0||i>=nums.length)return;
    rec(i+1,left-nums[i],[...cur,nums[i]]);
    rec(i+1,left,cur);
  }
  rec(0,target,[]);
  return out;
}
function hasCombo(nums,target){return subsets(nums,target).length>0}
function futureMobility(open){
  let score=0;
  for(let t=2;t<=18;t++) if(hasCombo(open,t)) score++;
  return score;
}
function chooseMove(open,target,level){
  const opts=subsets(open,target);
  if(!opts.length)return null;
  if(level==="beginner") return opts[Math.floor(Math.random()*opts.length)];
  const ranked=opts.map(c=>{
    const left=open.filter(n=>!c.includes(n));
    let value=futureMobility(left)*3-left.reduce((a,b)=>a+b,0)*.12;
    value+=c.reduce((a,b)=>a+b,0)*.08-c.length*.12;
    if(level==="master"){
      let next=0;
      for(let t=2;t<=12;t++){
        const nopts=subsets(left,t);
        if(nopts.length) next+=Math.max(...nopts.map(x=>futureMobility(left.filter(n=>!x.includes(n)))));
      }
      value+=next*.08;
    }
    return {c,value};
  }).sort((a,b)=>b.value-a.value);
  if(level==="challenger"&&ranked.length>1&&Math.random()<.18)return ranked[1].c;
  return ranked[0].c;
}
function defaultDiceFor(max){return ({9:2,12:2,15:3,18:3})[max]||2}
function maybeChangeDice(open,dice,switches,level){
  if(switches>=3||level==="beginner")return dice;
  const high=Math.max(0,...open);
  if(open.length<=4&&dice>1)return dice-1;
  if(level==="master"&&open.length>=8&&high>=13&&dice<3)return dice+1;
  return dice;
}

async function playAIRound(max,level){
  let open=Array.from({length:max},(_,i)=>i+1),penalty=0,switches=0;
  let dice=defaultDiceFor(max),throws=0,moves=[];
  while(open.length&&throws<80){
    const nd=maybeChangeDice(open,dice,switches,level);
    let switchPenalty=0;
    if(nd!==dice){
      switchPenalty=[2,3,4][switches]||0;
      penalty+=switchPenalty; switches++; dice=nd;
    }
    const vals=Array.from({length:dice},()=>1+Math.floor(Math.random()*6));
    const target=vals.reduce((a,b)=>a+b,0); throws++;
    const move=chooseMove(open,target,level);
    moves.push({vals,target,move:move?move.slice():null,dice,switchPenalty,openBefore:open.slice()});
    if(!move)break;
    open=open.filter(n=>!move.includes(n));
  }
  return {score:open.reduce((a,b)=>a+b,0)+penalty,penalty,throws,open,moves};
}

function levelName(){return ai.level==="beginner"?"🟢 Začetnik":ai.level==="master"?"🔴 Mojster":"🟡 Izzivalec"}
function renderAI(){
  if(!$("aiScoreCard"))return;
  $("aiScoreCard").hidden=!ai.enabled;
  if(!ai.enabled)return;
  $("aiHumanName").textContent=$("name")?.value.trim()||$("player")?.textContent.trim()||"Igralec";
  $("aiOpponentName").textContent="LiMATO AI "+levelName();
  $("aiHumanTotal").textContent=(typeof s!=="undefined"&&Array.isArray(s.results))?s.results.reduce((a,b)=>a+b,0):0;
  $("aiOpponentTotal").textContent=ai.results.reduce((a,b)=>a+b,0);
  const rounds=(typeof s!=="undefined"&&s.rounds)?s.rounds:3;
  const humanRounds=Array.from({length:rounds},(_,i)=>`R${i+1}: ${s.results[i]??"–"}`).join(" &nbsp; • &nbsp; ");
  const aiRounds=Array.from({length:rounds},(_,i)=>`R${i+1}: ${ai.results[i]??"–"}`).join(" &nbsp; • &nbsp; ");
  if($("aiHumanRounds")) $("aiHumanRounds").innerHTML=humanRounds;
  if($("aiOpponentRounds")) $("aiOpponentRounds").innerHTML=aiRounds;
}

function setLiveBase(html){
  const live=$("aiLive"); if(!live)return;
  live.dataset.base=html; live.innerHTML=html;
}
function flashAICloseButton(on){
  const b=$("close"); if(!b)return;
  if(on){
    if(!b.dataset.aiOldStyle) b.dataset.aiOldStyle=b.getAttribute("style")||"";
    b.disabled=true;
    b.style.setProperty("background","#ffffff","important");
    b.style.setProperty("color","#21152f","important");
    b.style.setProperty("border-color","#ffffff","important");
    b.style.setProperty("opacity","1","important");
    b.style.setProperty("box-shadow","0 0 16px rgba(255,255,255,.45)","important");
  }else{
    const old=b.dataset.aiOldStyle;
    if(old!==undefined){
      if(old) b.setAttribute("style",old); else b.removeAttribute("style");
      delete b.dataset.aiOldStyle;
    }
    b.disabled=true;
  }
}

async function showAIRound(roundIndex,r){
  // v0.6.9: AI animation obeys the SAME live deadline shown by the timer.
  // If time expires, the round ends immediately with the numbers still open + penalties already incurred.
  let liveOpen=Array.from({length:s.max},(_,i)=>i+1);
  let livePenalty=0;
  const expired=()=>ai.timerOwner==="ai" && (!ai.turnEndsAt || Date.now()>=ai.turnEndsAt);
  const aiPause=async()=>{
    if(expired()) return false;
    const remaining=Math.max(0,ai.turnEndsAt-Date.now());
    const ms=Math.min(randomThinkMs(),remaining);
    if(ms>0) await sleep(ms);
    return !expired();
  };
  const timeoutResult=()=>({score:liveOpen.reduce((a,b)=>a+b,0)+livePenalty, penalty:livePenalty, open:liveOpen.slice(), timedOut:true});
  const live=$("aiLive");
  if(!live)return;

  // AI temporarily uses the SAME visible Box as the player.
  // Human state in `s` is not changed; after AI finishes we redraw the human board.
  const renderAITiles=open=>{
    const host=$("tiles");
    if(!host)return;
    host.innerHTML="";
    for(let n=1;n<=s.max;n++){
      const e=document.createElement("div");
      e.className="tile "+(open.includes(n)?"open":"closed");
      e.textContent=n;
      host.appendChild(e);
    }
  };
  const restoreHumanBoard=()=>{
    renderTiles();
    $("dice").innerHTML="";
    $("target").textContent=s.target??"–";
    $("selected").textContent=sum(s.sel||[]);
    update();
  };

  live.hidden=false;
  setLiveBase(`🤖 <b>LiMATO AI — runda ${roundIndex+1}</b><br>🧠 Razmišlja…`);
  if($("ai")) $("ai").textContent="🤖 LiMATO AI razmišlja…";
  if(!(await aiPause())) return timeoutResult();

  for(let i=0;i<r.moves.length;i++){
    if(expired()) return timeoutResult();
    const m=r.moves[i];

    if(m.switchPenalty){
      setLiveBase(`🤖 <b>LiMATO AI — runda ${roundIndex+1}</b><br>🔄 Zamenja število kock na <b>${m.dice}</b> &nbsp; (+${m.switchPenalty} pribitka)`);
      $("diceCount").textContent=m.dice;
      $("penalty").textContent=m.switchPenalty;
      livePenalty+=m.switchPenalty;
      if(!(await aiPause())) return timeoutResult();
    }

    // 1) Show AI's open numbers on the real Box.
    renderAITiles(m.openBefore);
    $("target").textContent="–";
    $("selected").textContent="0";
    $("score").textContent=m.openBefore.reduce((a,b)=>a+b,0);
    $("dice").innerHTML="";
    setLiveBase(`🤖 <b>LiMATO AI — met ${i+1}</b><br>🎲 Meče kocke…`);
    if($("ai")) $("ai").textContent=`🤖 LiMATO AI meče — met ${i+1}`;
    if(!(await aiPause())) return timeoutResult();

    // 2) The dice visibly roll/fall into the SAME dice area as the player's dice.
    showDice(m.vals);
    await sleep(Math.min(900,Math.max(0,ai.turnEndsAt-Date.now()))); // never run past AI deadline
    if(expired()) return timeoutResult();
    $("target").textContent=m.target;
    setLiveBase(`🤖 <b>LiMATO AI — met ${i+1}</b><br>🎲 ${m.vals.join(" + ")} = <b>${m.target}</b><br>🧠 Razmišlja…`);
    if($("ai")) $("ai").textContent=`🤖 AI je vrgel: ${m.vals.join(" + ")} = ${m.target}`;
    if(!(await aiPause())) return timeoutResult();

    if(m.move){
      // 3) Mark AI's chosen tiles, then close them visibly one by one.
      const tiles=[...document.querySelectorAll("#tiles .tile")];
      m.move.forEach(n=>tiles[n-1]?.classList.add("selected"));
      $("selected").textContent=m.move.reduce((a,b)=>a+b,0);
      setLiveBase(`🤖 <b>LiMATO AI — met ${i+1}</b><br>🧠 Izbere: <b>${m.move.join(" + ")}</b>`);
      if($("ai")) $("ai").textContent=`🤖 AI zapira: ${m.move.join(" + ")}`;
      flashAICloseButton(true);
      if(!(await aiPause())) return timeoutResult();

      let after=m.openBefore.slice();
      for(const n of m.move){
        after=after.filter(x=>x!==n);
        renderAITiles(after);
        $("score").textContent=after.reduce((a,b)=>a+b,0);
        liveOpen=after.slice();
        await sleep(Math.min(350,Math.max(0,ai.turnEndsAt-Date.now())));
        if(expired()) return timeoutResult();
      }
      $("selected").textContent="0";
      $("target").textContent="–";
      $("dice").innerHTML="";
      flashAICloseButton(false);
      if(!(await aiPause())) return timeoutResult();
    }else{
      setLiveBase(`${live.dataset.base||live.innerHTML}<br>⛔ Ni veljavne kombinacije. Runda je končana.`);
      if($("ai")) $("ai").textContent="🤖 AI nima veljavne kombinacije";
      if(!(await aiPause())) return timeoutResult();
    }
  }

  setLiveBase(`🤖 <b>LiMATO AI — konec runde ${roundIndex+1}</b><br>Rezultat: <b>${r.score}</b>${r.penalty?` &nbsp; (pribitek ${r.penalty})`:""}`);
  if($("ai")) $("ai").textContent=`🤖 AI R${roundIndex+1}: ${r.score}`;
  await sleep(Math.min(700,Math.max(0,ai.turnEndsAt-Date.now())));
  flashAICloseButton(false);
  restoreHumanBoard();
  return {score:r.score,penalty:r.penalty,open:r.open.slice(),timedOut:false};
}
async function runAIForHumanRound(roundIndex){
  if(!ai.enabled||ai.running||ai.results[roundIndex]!==undefined)return;
  ai.running=true;
  // Human controls are locked for the whole AI turn: no overlapping roll/close/change events.
  if($("roll")) $("roll").disabled=true;
  if($("close")) $("close").disabled=true;
  if($("change")) $("change").disabled=true;
  if($("diceChoice")) $("diceChoice").disabled=true;
  startTurnTimer("ai");
  if($("ai")) $("ai").textContent="🤖 LiMATO AI razmišlja…";
  const r=await playAIRound(s.max,ai.level);
  const actual=await showAIRound(roundIndex,r);
  const finalRound=actual||r;
  if(finalRound.timedOut){
    setLiveBase(`🤖 <b>LiMATO AI — čas je potekel</b><br>Rezultat: <b>${finalRound.score}</b>${finalRound.penalty?` &nbsp; (pribitek ${finalRound.penalty})`:""}`);
    if($("ai")) $("ai").textContent=`🤖 AI R${roundIndex+1}: ${finalRound.score} — čas`;
  }
  ai.results[roundIndex]=finalRound.score;
  ai.roundLogs[roundIndex]={...r,...finalRound};
  ai.running=false;
  stopTurnTimer();
  // Always restore the real human board, also after an AI timeout.
  flashAICloseButton(false);
  renderTiles();
  if($("dice")) $("dice").innerHTML="";
  if($("target")) $("target").textContent=s.target??"–";
  if($("selected")) $("selected").textContent=sum(s.sel||[]);
  update();
  // If AI played first, hand control to the human. If human already finished, NEXT stays in charge.
  const humanDone=s.results[roundIndex]!==undefined;
  if(s.active && !humanDone){
    if($("roll")) $("roll").disabled=false;
    if($("diceChoice")) $("diceChoice").disabled=false;
    if($("change")) $("change").disabled=false;
    if($("close")) $("close").disabled=true;
  }
  renderAI();
}

function finalVerdict(){
  if(!ai.enabled||ai.results.length!==s.rounds||ai.results.some(v=>v===undefined))return;
  stopTurnTimer();
  const h=s.results.reduce((a,b)=>a+b,0),a=ai.results.reduce((x,y)=>x+y,0);
  const human=$("name")?.value.trim()||"Igralec";
  $("aiVerdict").textContent=
    h<a ? `🏆 Zmagovalec je ${human}! ${h} : ${a}` :
    h>a ? `🏆 Zmagovalec je LiMATO AI! ${h} : ${a}` :
          `🤝 Neodločeno! ${h} : ${a}`;
}
function resetAI(){
  stopTurnTimer();
  syncMode(); ai.results=[]; ai.roundLogs=[]; ai.running=false; ai.starter="human";
  ai.starting=false; ai.transitioning=false; ai.finishing=false;
  if($("aiStartRoll")){$("aiStartRoll").hidden=true;$("aiStartRoll").innerHTML="";}
  if($("aiVerdict"))$("aiVerdict").textContent="";
  if($("aiRoundInfo"))$("aiRoundInfo").textContent="";
  if($("aiLive")){$("aiLive").textContent="";$("aiLive").hidden=true;}
  renderAI();
}

const oldStart=startMatch;
startMatch=async function(){
  if(ai.starting)return;
  ai.starting=true;
  try{
    resetAI();
    oldStart();
    mountTurnTimerInResultsPanel();
    if(ai.enabled){
      if($("aiScoreCard")) $("aiScoreCard").hidden=false;
      renderAI();
      stopTurnTimer();
      ai.starter=await decideWhoStarts();
      renderAI();
      if(ai.starter==="ai"){
        if($("next")) $("next").hidden=true;
        await runAIForHumanRound(0);
      }
    }
    if(s.active) startTurnTimer("human");
  }finally{ ai.starting=false; }
};

const oldFinish=finish;
finish=function(reason){
  // A round may be ended by the core, the timer and an older patch almost at once.
  // Accept exactly one finish for each round.
  if(ai.finishing || !s.active || s.results.length>=s.round)return;
  ai.finishing=true;
  stopTurnTimer();
  const idx=s.round-1;
  const before=s.results.length;
  let ret;
  try{ ret=oldFinish(reason); }
  finally{ ai.finishing=false; }

  if(ai.enabled && s.results.length>before){
    renderAI();
    if(ai.starter==="human"){
      // Human finished first: AI must complete the SAME round before NEXT is allowed.
      if($("next")) $("next").hidden=true;
      void runAIForHumanRound(idx).then(()=>{
        renderAI();
        if(s.active && s.round<s.rounds && $("next")) $("next").hidden=false;
        if(!s.active) finalVerdict();
      });
    }else if(!s.active){
      finalVerdict();
    }
  }
  return ret;
};

const oldNext=nextRound;
nextRound=async function(){
  if(ai.transitioning)return;
  if(ai.enabled&&ai.running){setMsg("🤖 AI še zaključuje svojo rundo…");return;}
  if(!s.active||s.round>=s.rounds){
    if($("next")) $("next").hidden=true;
    return;
  }
  ai.transitioning=true;
  try{
    stopTurnTimer();
    if($("next")) $("next").hidden=true;
    oldNext();
    renderAI();
    if(!s.active)return;

    const idx=s.round-1;
    if(ai.enabled && ai.starter==="ai" && ai.results[idx]===undefined){
      await runAIForHumanRound(idx);
      renderAI();
    }
    if(s.active) startTurnTimer("human");
  }finally{ ai.transitioning=false; }
};

// En sam NEXT tok. Prestrezanje v capture fazi prepreči starim handlerjem,
// da bi rundo povečali brez ponovnega zagona odštevalnika.
document.addEventListener("click",e=>{
  const b=e.target.closest?.("#next");
  if(!b)return;
  e.preventDefault();
  e.stopImmediatePropagation();
  void nextRound();
},true);

function bootAIChallenge(){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if($("playMode")){
      clearInterval(timer);injectUI();syncMode();renderAI();mountTurnTimerInResultsPanel();
      if($("start")) $("start").onclick=()=>startMatch();
      if($("new")) $("new").onclick=()=>startMatch();
      if($("next")) $("next").onclick=()=>nextRound();
      if($("name")){
        const syncHumanName=()=>{if($("aiHumanName")) $("aiHumanName").textContent=$("name").value.trim()||$("player")?.textContent.trim()||"Igralec";};
        $("name").addEventListener("input",syncHumanName);
        $("name").addEventListener("change",syncHumanName);
        syncHumanName();
      }
      console.info("LiMATO Box Challenge v0.6.9 LIVE TIMER / AI TIMEOUT STABILITY FIX mounted");
    }else if(tries>=100){
      clearInterval(timer);
      console.warn("LiMATO AI Challenge: #playMode was not created in time.");
    }
  },100);
}
bootAIChallenge();
console.info("LiMATO Box Challenge v0.6.9 LIVE TIMER / AI TIMEOUT STABILITY FIX loaded");
})();