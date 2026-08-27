/* LiMATO Box Challenge v0.6.11 — AI CHALLENGE — LIVE ORDER + ROUND HANDOFF FIX
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
  turnTimer:null, turnEndsAt:0, turnOwner:null, starter:"human", generation:0, orderFirst:"human", orderWaiting:false, orderHuman:null, orderAI:null
};

function turnSeconds(){
  return TURN_SECONDS[Number(s?.max)] || 40;
}
function renderTurnTimer(){
  const el=$("aiTurnTimer");
  if(!el)return;
  if(!ai.enabled || !s?.active || !ai.turnEndsAt){el.textContent="--:--";return;}
  const left=Math.max(0,Math.ceil((ai.turnEndsAt-Date.now())/1000));
  el.textContent=`00:${String(left).padStart(2,"0")}`;
  const wrap=$("aiTurnTimerWrap");
  if(wrap){
    wrap.style.color=left<=7?"#ff9a9a":"#ffd66d";
    const title=wrap.querySelector("div");
    if(title) title.textContent=ai.turnOwner==="ai"?"⏱️ ODŠTEVALNIK — LiMATO AI":"⏱️ ODŠTEVALNIK — IGRALEC";
  }
}
function stopTurnTimer(){
  if(ai.turnTimer){clearInterval(ai.turnTimer);ai.turnTimer=null;}
  ai.turnEndsAt=0; ai.turnOwner=null;
  renderTurnTimer();
}
function startTurnTimer(owner="human"){
  stopTurnTimer();
  if(!ai.enabled || !s?.active)return;
  ai.turnOwner=owner;
  ai.turnEndsAt=Date.now()+turnSeconds()*1000;
  renderTurnTimer();
  ai.turnTimer=setInterval(()=>{
    renderTurnTimer();
    if(Date.now()>=ai.turnEndsAt){
      const expiredOwner=ai.turnOwner;
      if(expiredOwner==="human" && !ai.running && s?.active){
        stopTurnTimer();
        finish("⏱️ Čas je potekel.");
      }
      // AI timeout is consumed cooperatively by showAIRound; do not call human finish().
    }
  },200);
}
function turnExpired(owner){return ai.turnOwner===owner && ai.turnEndsAt && Date.now()>=ai.turnEndsAt;}

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
  if(!results || !results.parentElement) return;
  const wrap=document.createElement("div");
  wrap.id="aiTurnTimerWrap";
  wrap.style.cssText="margin:8px 0 10px;padding:10px;border:1px solid rgba(255,214,109,.45);border-radius:12px;text-align:center;font-weight:900;color:#ffd66d";
  wrap.innerHTML=`<div style="font-size:14px;margin-bottom:5px">⏱️ ODŠTEVALNIK</div><div id="aiTurnTimer" style="font-size:28px;line-height:1">--:--</div>`;
  results.parentElement.insertBefore(wrap,results);
}



async function decideWhoStarts(){
  if(!ai.enabled)return "human";
  const host=$("aiStartRoll");
  const human=$("name")?.value.trim()||"Igralec";
  ai.orderWaiting=true; ai.orderHuman=null; ai.orderAI=null;
  // Alternate who is invited to make the first live order roll from match to match.
  const first=ai.orderFirst;
  ai.orderFirst=first==="human"?"ai":"human";
  if(host){host.hidden=false;host.innerHTML=`🎲 <b>MET ZA VRSTNI RED</b><br>Vsak vrže 4 kocke — nižji seštevek začne.<br><br>${first==="human"?`👤 <b>${human}</b> prvi: pritisni <b>VRZI KOCKE</b>.`:`🤖 <b>LiMATO AI</b> prvi meče…`}`;}
  const roll4=()=>Array.from({length:4},()=>1+Math.floor(Math.random()*6));
  const display=async(vals,label)=>{
    showDice(vals); const total=vals.reduce((a,b)=>a+b,0);
    if(host) host.innerHTML=`🎲 <b>MET ZA VRSTNI RED</b><br>${label}: ${vals.join(" + ")} = <b>${total}</b>`;
    await sleep(3000); return total;
  };
  const humanRoll=()=>new Promise(resolve=>{
    const b=$("roll"); if(!b){resolve(null);return;}
    b.disabled=false;
    const handler=async e=>{e.preventDefault();e.stopImmediatePropagation();b.removeEventListener("click",handler,true);b.disabled=true;resolve(await display(roll4(),`👤 ${human}`));};
    b.addEventListener("click",handler,true);
  });
  const aiRoll=async()=>{if(host)host.innerHTML=`🎲 <b>MET ZA VRSTNI RED</b><br>🤖 LiMATO AI meče 4 kocke…`;await sleep(700);return display(roll4(),"🤖 LiMATO AI");};
  let hs,as;
  do{
    if(first==="human"){hs=await humanRoll();as=await aiRoll();}
    else{as=await aiRoll();if(host)host.innerHTML+=`<br>👤 <b>${human}</b>: pritisni <b>VRZI KOCKE</b>.`;hs=await humanRoll();}
    if(hs===as && host){host.innerHTML+=`<br>🤝 <b>Izenačeno — ponovni met.</b>`;await sleep(1500);}
  }while(hs===as);
  const starter=hs<as?"human":"ai";
  ai.orderWaiting=false;
  if(host)host.innerHTML=`🎲 <b>MET ZA VRSTNI RED</b><br>👤 ${human}: <b>${hs}</b> &nbsp; • &nbsp; 🤖 LiMATO AI: <b>${as}</b><br>🏁 <b>NA POTEZI: ${starter==="human"?human:"LiMATO AI"}</b>`;
  $("dice").innerHTML="";
  await sleep(1200);
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
function defaultDiceFor(max){return ({9:2,12:2,15:3,18:4})[max]||2}
function maybeChangeDice(open,dice,switches,level){
  if(switches>=3||level==="beginner")return dice;
  const high=Math.max(0,...open);
  if(open.length<=4&&dice>1)return dice-1;
  if(level==="master"&&open.length>=8&&high>=13&&dice<defaultDiceFor(s.max))return dice+1;
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

function humanRoundSnapshot(){
  return {
    open:Array.isArray(s.open)?s.open.slice():[], sel:Array.isArray(s.sel)?s.sel.slice():[],
    target:s.target, dice:s.dice, penalty:s.penalty, rolled:s.rolled, rolling:s.rolling,
    switches:s.switches, perfect:s.perfect
  };
}
function restoreHumanSnapshot(h){
  if(!h)return;
  s.open=h.open.slice(); s.sel=h.sel.slice(); s.target=h.target; s.dice=h.dice;
  s.penalty=h.penalty; s.rolled=h.rolled; s.rolling=h.rolling;
  s.switches=h.switches; s.perfect=h.perfect;
  renderTiles(); $("dice").innerHTML=""; update(); renderResults();
}

async function showAIRound(roundIndex,r){
  const live=$("aiLive");
  if(!live)return r;
  const renderAITiles=open=>{
    const host=$("tiles"); if(!host)return;
    host.innerHTML="";
    for(let n=1;n<=s.max;n++){
      const e=document.createElement("div");
      e.className="tile "+(open.includes(n)?"open":"closed"); e.textContent=n; host.appendChild(e);
    }
  };
  const restoreHumanBoard=()=>{renderTiles();$("dice").innerHTML="";$("target").textContent=s.target??"–";$("selected").textContent=sum(s.sel||[]);update();};
  let actualOpen=Array.from({length:s.max},(_,i)=>i+1), actualPenalty=0, completedThrows=0;
  live.hidden=false;
  setLiveBase(`🤖 <b>LiMATO AI — runda ${roundIndex+1}</b><br>🧠 Razmišlja…`);
  if($("ai")) $("ai").textContent="🤖 LiMATO AI razmišlja…";
  for(let i=0;i<r.moves.length;i++){
    if(turnExpired("ai")) break;
    const m=r.moves[i];
    if(m.switchPenalty){
      actualPenalty+=m.switchPenalty;
      setLiveBase(`🤖 <b>LiMATO AI — runda ${roundIndex+1}</b><br>🔄 Zamenja število kock na <b>${m.dice}</b> &nbsp; (+${m.switchPenalty} pribitka)`);
      $("diceCount").textContent=m.dice; $("penalty").textContent=actualPenalty;
      await humanPause(); if(turnExpired("ai")) break;
    }
    renderAITiles(actualOpen); $("target").textContent="–"; $("selected").textContent="0"; $("score").textContent=actualOpen.reduce((a,b)=>a+b,0)+actualPenalty; $("dice").innerHTML="";
    setLiveBase(`🤖 <b>LiMATO AI — met ${i+1}</b><br>🎲 Meče <b>${m.dice}</b> ${m.dice===1?"kocko":"kocke"}…`);
    if($("ai")) $("ai").textContent=`🤖 LiMATO AI meče ${m.dice} — met ${i+1}`;
    await humanPause(); if(turnExpired("ai")) break;
    showDice(m.vals); await sleep(900); if(turnExpired("ai")) break;
    completedThrows++; $("target").textContent=m.target;
    setLiveBase(`🤖 <b>LiMATO AI — met ${i+1}</b><br>🎲 ${m.vals.join(" + ")} = <b>${m.target}</b><br>🧠 Razmišlja…`);
    await humanPause(); if(turnExpired("ai")) break;
    if(m.move){
      const tiles=[...document.querySelectorAll("#tiles .tile")]; m.move.forEach(n=>tiles[n-1]?.classList.add("selected"));
      $("selected").textContent=m.move.reduce((a,b)=>a+b,0); setLiveBase(`🤖 <b>LiMATO AI — met ${i+1}</b><br>🧠 Izbere: <b>${m.move.join(" + ")}</b>`); flashAICloseButton(true);
      await humanPause(); if(turnExpired("ai")){flashAICloseButton(false);break;}
      for(const n of m.move){actualOpen=actualOpen.filter(x=>x!==n);renderAITiles(actualOpen);$("score").textContent=actualOpen.reduce((a,b)=>a+b,0)+actualPenalty;await sleep(250);if(turnExpired("ai"))break;}
      $("selected").textContent="0"; $("target").textContent="–"; $("dice").innerHTML=""; flashAICloseButton(false);
      if(turnExpired("ai"))break;
    }else{
      setLiveBase(`${live.dataset.base||live.innerHTML}<br>⛔ Ni veljavne kombinacije. Runda je končana.`); await humanPause(); break;
    }
  }
  const timedOut=turnExpired("ai");
  const actual={...r,score:actualOpen.reduce((a,b)=>a+b,0)+actualPenalty,penalty:actualPenalty,throws:completedThrows,open:actualOpen};
  setLiveBase(`🤖 <b>LiMATO AI — konec runde ${roundIndex+1}</b><br>${timedOut?"⏱️ Čas je potekel.<br>":""}Rezultat: <b>${actual.score}</b>${actual.penalty?` &nbsp; (pribitek ${actual.penalty})`:""}`);
  if($("ai")) $("ai").textContent=`🤖 AI R${roundIndex+1}: ${actual.score}`;
  stopTurnTimer(); flashAICloseButton(false); await sleep(650); restoreHumanBoard(); return actual;
}
async function runAIForHumanRound(roundIndex){
  if(!ai.enabled || ai.running || ai.results[roundIndex] !== undefined) return;
  ai.running=true;
  stopTurnTimer();
  const humanState=humanRoundSnapshot();
  // During AI play the human cannot accidentally advance or throw.
  if($("roll")) $("roll").disabled=true;
  if($("close")) $("close").disabled=true;
  if($("change")) $("change").disabled=true;
  if($("diceChoice")) $("diceChoice").disabled=true;
  if($("next")) $("next").hidden=true;
  try{
    if($("ai")) $("ai").textContent="🤖 LiMATO AI razmišlja…";
    startTurnTimer("ai");
    const planned=await playAIRound(s.max,ai.level);
    const r=await showAIRound(roundIndex,planned);
    ai.results[roundIndex]=r.score;
    ai.roundLogs[roundIndex]=r;
  } finally {
    restoreHumanSnapshot(humanState);
    ai.running=false;
    renderAI();
  }
}

function finalVerdict(){
  if(!ai.enabled || s.results.length!==s.rounds || ai.results.filter(v=>v!==undefined).length!==s.rounds) return;
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
  if($("aiStartRoll")){$("aiStartRoll").hidden=true;$("aiStartRoll").innerHTML="";}
  if($("aiVerdict"))$("aiVerdict").textContent="";
  if($("aiRoundInfo"))$("aiRoundInfo").textContent="";
  if($("aiLive")){$("aiLive").textContent="";$("aiLive").hidden=true;}
  renderAI();
}

const oldStart=startMatch;
startMatch=async function(){
  resetAI();
  oldStart();
  if(!ai.enabled) return;

  $("aiScoreCard").hidden=false;
  mountTurnTimerInResultsPanel();
  renderAI();
  // Nobody can play while the live 4-dice order roll is running.
  if($("roll")) $("roll").disabled=true; if($("close")) $("close").disabled=true; if($("change")) $("change").disabled=true; if($("diceChoice")) $("diceChoice").disabled=true;
  ai.starter=await decideWhoStarts();
  renderAI();
  if(ai.starter==="ai") await runAIForHumanRound(0);
  // Human receives the same restored round state and a fresh, merciless timer.
  if(s.active){$("roll").disabled=false;$("change").disabled=s.switches>=3;$("diceChoice").disabled=s.switches>=3;startTurnTimer("human");}
};

const oldFinish=finish;
finish=function(reason){
  if(ai.enabled) stopTurnTimer();
  const before=s.results.length;
  const ret=oldFinish(reason);
  const idx=before;

  if(ai.enabled && s.results.length>before){
    renderAI();
    if($("next")) $("next").hidden=true;
    (async()=>{
      // Human-first match: AI answers after the human in the same round.
      // AI-first match: its result for this round already exists.
      if(ai.results[idx]===undefined) await runAIForHumanRound(idx);
      renderAI();
      const humanDone=s.results.length>=s.rounds;
      const aiDone=ai.results.filter(v=>v!==undefined).length>=s.rounds;
      if(humanDone && aiDone){
        if($("next")) $("next").hidden=true;
        finalVerdict();
      }else if(!humanDone){
        if($("next")) $("next").hidden=false;
        setMsg("Runda je zaključena. Nadaljuj v naslednjo rundo.");
      }
    })();
  }
  return ret;
};

const oldNext=nextRound;
nextRound=async function(){
  if(ai.enabled&&ai.running){setMsg("🤖 AI še zaključuje svojo rundo…");return;}
  if(!s.active||s.round>=s.rounds){
    if($("next")) $("next").hidden=true;
    return;
  }
  const currentIndex=s.round-1;
  if(ai.enabled && ai.results[currentIndex]===undefined){
    setMsg("🤖 Najprej mora LiMATO AI zaključiti to rundo.");
    return;
  }
  oldNext();
  renderAI();

  // In an AI-first match, AI must also open R2/R3/... before the human.
  const newIndex=s.round-1;
  if(ai.enabled && ai.starter==="ai" && ai.results[newIndex]===undefined){
    if($("next")) $("next").hidden=true;
    await runAIForHumanRound(newIndex);
    renderAI();
  }
  if(ai.enabled && s.active){
    // oldNext/startRound re-enables the human controls; AI playback may have disabled them again.
    if($("roll")) $("roll").disabled=false;
    if($("change")) $("change").disabled=s.switches>=3;
    if($("diceChoice")) $("diceChoice").disabled=s.switches>=3;
    if($("close")) $("close").disabled=true;
    startTurnTimer("human");
  }
};

// One and only one NEXT route. Capture phase blocks stale handlers from the core/older patches.
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
      clearInterval(timer);injectUI();syncMode();renderAI();
      if($("start")) $("start").onclick=()=>startMatch();
      if($("new")) $("new").onclick=()=>startMatch();
      if($("next")) $("next").onclick=()=>nextRound();
      if($("name")){
        const syncHumanName=()=>{if($("aiHumanName")) $("aiHumanName").textContent=$("name").value.trim()||$("player")?.textContent.trim()||"Igralec";};
        $("name").addEventListener("input",syncHumanName);
        $("name").addEventListener("change",syncHumanName);
        syncHumanName();
      }
      console.info("LiMATO Box Challenge v0.6.10 AI Challenge STABILITY / LIVE TIMER FIX mounted");
    }else if(tries>=100){
      clearInterval(timer);
      console.warn("LiMATO AI Challenge: #playMode was not created in time.");
    }
  },100);
}
bootAIChallenge();
console.info("LiMATO Box Challenge v0.6.10 AI Challenge STABILITY / LIVE TIMER FIX loaded");
})();