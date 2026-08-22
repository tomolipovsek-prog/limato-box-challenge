/* LiMATO Box Challenge v0.6.3 — AI CHALLENGE — VISIBLE AI ROUND — FIX-5
   Additive patch: keeps Solo / Invite / Arena / Hard Mode intact.
   AI opponent uses the same Box, rounds, dice-change penalties and scoring rules.
*/
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const randomThinkMs=()=>1000+Math.floor(Math.random()*6001); // 1–7 s
async function humanPause(label="Razmišlja"){
  // AI still waits randomly in the background, but its thinking time is NOT shown.
  const ms=2000+Math.floor(Math.random()*5001); // 2–7 s
  await sleep(ms);
}
const ai={
  enabled:false, level:"challenger", results:[], roundLogs:[], running:false, starter:null, opening:null
};

// FIX-5: visible timer for the HUMAN'S WHOLE ROUND in AI Challenge.
// Same base times as Arena: Classic 40, Extended 45, Pro 50, Master 60 seconds.
let aiHumanTimer=null, aiHumanDeadline=0, aiHumanTimerExpired=false;
function aiRoundSeconds(){
  const max=+(typeof s!=="undefined" ? s.max : ($("mode")?.value||9));
  return max<=9?40:max<=12?45:max<=15?50:60;
}
function ensureAIHumanTimerUI(){
  let el=$("aiHumanTimer");
  if(el)return el;
  const bar=document.querySelector(".status") || $("aiChallengeBox");
  if(!bar)return null;
  el=document.createElement("div");
  el.id="aiHumanTimer";
  el.style.cssText="font-weight:900;color:#ffd84d;text-align:center;padding:6px 10px;border:1px solid #8f55bd;border-radius:10px;margin:6px 0;font-variant-numeric:tabular-nums;";
  el.hidden=true;
  bar.appendChild(el);
  return el;
}
function stopAIHumanTimer(hide=false){
  if(aiHumanTimer){clearInterval(aiHumanTimer);aiHumanTimer=null;}
  const el=$("aiHumanTimer");
  if(el&&hide)el.hidden=true;
}
function paintAIHumanTimer(){
  const el=ensureAIHumanTimerUI(); if(!el)return;
  const left=Math.max(0,Math.ceil((aiHumanDeadline-Date.now())/1000));
  el.hidden=false;
  el.textContent=`⏱️ ČAS RUNDE: ${left} s`;
  if(left<=0 && !aiHumanTimerExpired){
    aiHumanTimerExpired=true;
    stopAIHumanTimer(false);
    // finish() uses the current board state as the round result.
    if(ai.enabled && !ai.running && typeof s!=="undefined" && s.active){
      try{ finish("timeout"); }catch(e){ console.error("AI Challenge timer timeout:",e); }
    }
  }
}
function startAIHumanTimer(){
  if(!ai.enabled)return;
  stopAIHumanTimer(false);
  aiHumanTimerExpired=false;
  aiHumanDeadline=Date.now()+aiRoundSeconds()*1000;
  paintAIHumanTimer();
  aiHumanTimer=setInterval(paintAIHumanTimer,200);
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
      <div class="aiScoreRows">
        <div>👤 <b id="aiHumanName">Igralec</b><br><strong id="aiHumanTotal">0</strong></div>
        <div>🤖 <b id="aiOpponentName">LiMATO AI</b><br><strong id="aiOpponentTotal">0</strong></div>
      </div>
      <div id="aiRoundInfo" style="margin-top:8px;text-align:center"></div>
      <div id="aiLive" style="margin-top:10px;padding:10px;border-radius:10px;background:rgba(0,0,0,.18);text-align:center;line-height:1.55" hidden></div>
      <div id="aiVerdict" class="aiVerdict"></div>
    </div>`;
  mount.appendChild(box);

  if(!$("turnOverlay")){
    const ov=document.createElement("div");
    ov.id="turnOverlay"; ov.hidden=true;
    ov.style.cssText="position:fixed;inset:0;z-index:2147483001;display:flex;align-items:center;justify-content:center;pointer-events:none;background:rgba(20,10,35,.28);font-weight:900;font-size:clamp(28px,7vw,64px);text-align:center;text-shadow:0 3px 12px #000;color:#fff;padding:24px";
    document.body.appendChild(ov);
  }

  pm.addEventListener("change",syncMode);
  $("aiLevel").addEventListener("change",()=>{
    ai.level=$("aiLevel").value;
    renderAI();
  });
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
  $("aiHumanName").textContent=$("name")?.value.trim()||"Igralec";
  $("aiOpponentName").textContent="LiMATO AI "+levelName();
  $("aiHumanTotal").textContent=(typeof s!=="undefined"&&Array.isArray(s.results))?s.results.reduce((a,b)=>a+b,0):0;
  $("aiOpponentTotal").textContent=ai.results.reduce((a,b)=>a+b,0);
  const pairs=ai.results.map((v,i)=>`R${i+1}: 👤 ${s.results[i]??"–"} / 🤖 ${v}`).join(" • ");
  $("aiRoundInfo").textContent=pairs;
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
  await humanPause();

  for(let i=0;i<r.moves.length;i++){
    const m=r.moves[i];

    if(m.switchPenalty){
      setLiveBase(`🤖 <b>LiMATO AI — runda ${roundIndex+1}</b><br>🔄 Zamenja število kock na <b>${m.dice}</b> &nbsp; (+${m.switchPenalty} pribitka)`);
      $("diceCount").textContent=m.dice;
      $("penalty").textContent=m.switchPenalty;
      await humanPause();
    }

    // 1) Show AI's open numbers on the real Box.
    renderAITiles(m.openBefore);
    $("target").textContent="–";
    $("selected").textContent="0";
    $("score").textContent=m.openBefore.reduce((a,b)=>a+b,0);
    $("dice").innerHTML="";
    setLiveBase(`🤖 <b>LiMATO AI — met ${i+1}</b><br>🎲 Meče kocke…`);
    if($("ai")) $("ai").textContent=`🤖 LiMATO AI meče — met ${i+1}`;
    await humanPause();

    // 2) The dice visibly roll/fall into the SAME dice area as the player's dice.
    showDice(m.vals);
    await sleep(900); // existing cube animation is ~820 ms
    $("target").textContent=m.target;
    setLiveBase(`🤖 <b>LiMATO AI — met ${i+1}</b><br>🎲 ${m.vals.join(" + ")} = <b>${m.target}</b><br>🧠 Razmišlja…`);
    if($("ai")) $("ai").textContent=`🤖 AI je vrgel: ${m.vals.join(" + ")} = ${m.target}`;
    await humanPause();

    if(m.move){
      // 3) Mark AI's chosen tiles, then close them visibly one by one.
      const tiles=[...document.querySelectorAll("#tiles .tile")];
      m.move.forEach(n=>tiles[n-1]?.classList.add("selected"));
      $("selected").textContent=m.move.reduce((a,b)=>a+b,0);
      setLiveBase(`🤖 <b>LiMATO AI — met ${i+1}</b><br>🧠 Izbere: <b>${m.move.join(" + ")}</b>`);
      if($("ai")) $("ai").textContent=`🤖 AI zapira: ${m.move.join(" + ")}`;
      flashAICloseButton(true);
      await sleep(450);

      let after=m.openBefore.slice();
      for(const n of m.move){
        after=after.filter(x=>x!==n);
        renderAITiles(after);
        $("score").textContent=after.reduce((a,b)=>a+b,0);
        await sleep(350);
      }
      $("selected").textContent="0";
      $("target").textContent="–";
      $("dice").innerHTML="";
      flashAICloseButton(false);
      await sleep(250);
    }else{
      setLiveBase(`${live.dataset.base||live.innerHTML}<br>⛔ Ni veljavne kombinacije. Runda je končana.`);
      if($("ai")) $("ai").textContent="🤖 AI nima veljavne kombinacije";
      await sleep(500);
    }
  }

  setLiveBase(`🤖 <b>LiMATO AI — konec runde ${roundIndex+1}</b><br>Rezultat: <b>${r.score}</b>${r.penalty?` &nbsp; (pribitek ${r.penalty})`:""}`);
  if($("ai")) $("ai").textContent=`🤖 AI R${roundIndex+1}: ${r.score}`;
  await sleep(350);
  flashAICloseButton(false);
  restoreHumanBoard();
}
async function showTurn(name){
  const ov=$("turnOverlay"); if(!ov)return;
  ov.textContent=`🎲 NA POTEZI: ${name}`; ov.hidden=false;
  await sleep(1400); ov.hidden=true;
}
function roll4(){return Array.from({length:4},()=>1+Math.floor(Math.random()*6))}
async function openingRoll(){
  const human=$("name")?.value.trim()||"Igralec";
  let h,a,hs,as;
  do{ h=roll4(); a=roll4(); hs=h.reduce((x,y)=>x+y,0); as=a.reduce((x,y)=>x+y,0); }while(hs===as);
  ai.opening={human:h,ai:a,humanSum:hs,aiSum:as}; ai.starter=hs<as?"human":"ai";
  const live=$("aiLive"); if(live){live.hidden=false; setLiveBase(`🎲 <b>ZAČETNI MET — 4 KOCKE</b><br>👤 ${human}: ${h.join(" + ")} = <b>${hs}</b><br>🤖 LiMATO AI: ${a.join(" + ")} = <b>${as}</b><br>🏁 Začne: <b>${ai.starter==="human"?human:"LiMATO AI"}</b>`);}
  await sleep(1800);
  await showTurn(ai.starter==="human"?human:"LiMATO AI");
}
function leaderboard(){
  const human=$("name")?.value.trim()||"Igralec";
  const h=s.results.reduce((a,b)=>a+b,0), a=ai.results.reduce((x,y)=>x+y,0);
  return [{name:human,score:h,icon:"👤"},{name:"LiMATO AI",score:a,icon:"🤖"}].sort((x,y)=>x.score-y.score);
}
function renderFinalRanking(){
  const rows=leaderboard();
  const human=$("name")?.value.trim()||"Igralec";
  const winner=rows[0], loser=rows[1];
  const headline=winner.name===human
    ? `🏆 <b>ZMAGOVALEC JE ${human}</b>`
    : `😢 <b>ŽAL SI IZGUBIL TEKMO</b><br>🏆 ZMAGOVALEC JE <b>LiMATO AI</b>`;
  $("aiVerdict").innerHTML=`${headline}<br>🥇 1. mesto — <b>${winner.name}</b> — ${winner.score} točk<br>🥈 2. mesto — <b>${loser.name}</b> — ${loser.score} točk`;
}

async function runAIForHumanRound(roundIndex){
  if(!ai.enabled||ai.running||ai.results[roundIndex]!==undefined)return;
  ai.running=true;
  await showTurn("LiMATO AI");
  if($("ai")) $("ai").textContent="🤖 LiMATO AI razmišlja…";
  const r=await playAIRound(s.max,ai.level);
  await showAIRound(roundIndex,r);
  ai.results[roundIndex]=r.score;
  ai.roundLogs[roundIndex]=r;
  ai.running=false;
  renderAI();
}

function finalVerdict(){
  if(!ai.enabled||ai.results.length!==s.rounds)return;
  const h=s.results.reduce((a,b)=>a+b,0),a=ai.results.reduce((x,y)=>x+y,0);
  if(h===a){$("aiVerdict").innerHTML=`🤝 <b>Neodločeno</b> — ${h} : ${a}`;return;}
  renderFinalRanking();
}
function resetAI(){
  syncMode(); ai.results=[]; ai.roundLogs=[]; ai.running=false; ai.starter=null; ai.opening=null;
  if($("aiVerdict"))$("aiVerdict").textContent="";
  if($("aiRoundInfo"))$("aiRoundInfo").textContent="";
  if($("aiLive")){$("aiLive").textContent="";$("aiLive").hidden=true;}
  renderAI();
}

const oldStart=startMatch;
startMatch=function(){
  resetAI(); oldStart();
  if(ai.enabled){
    $("aiScoreCard").hidden=false; renderAI();
    ["roll","close","change","next"].forEach(id=>{const b=$(id);if(b)b.disabled=true;});
    openingRoll().then(async()=>{
      if(ai.starter==="ai"){
        ai.running=true;
        const r=await playAIRound(s.max,ai.level);
        await showAIRound(0,r);
        ai.results[0]=r.score; ai.roundLogs[0]=r; ai.running=false; renderAI();
        await showTurn($("name")?.value.trim()||"Igralec");
      }
      if($("roll"))$("roll").disabled=false; update();
    });
  }
};
const oldFinish=finish;
finish=function(reason){
  const before=s.results.length;
  const ret=oldFinish(reason);
  const idx=before;
  if(ai.enabled&&s.results.length>before){
    stopAIHumanTimer(false);
    renderAI(); // human score refreshes immediately
    runAIForHumanRound(idx).then(()=>{renderAI();if(!s.active){stopAIHumanTimer(true);finalVerdict();}});
  }
  return ret;
};
const oldNext=nextRound;
nextRound=function(){
  if(ai.enabled&&ai.running){setMsg("🤖 AI še zaključuje svojo rundo…");return;}
  // Never allow a phantom round (e.g. 3/4 after a 3-round match).
  if(!s.active||s.round>=s.rounds){
    $("next").hidden=true;
    return;
  }
  oldNext();
  if(ai.enabled && s.active) setTimeout(startAIHumanTimer,50);
};

// The original button may still hold the old function reference.
// Capture the click first and block it while AI is playing or when the match is already over.
document.addEventListener("click",e=>{
  const b=e.target.closest?.("#next");
  if(!b)return;
  if((ai.enabled&&ai.running)||!s.active||s.round>=s.rounds){
    e.preventDefault();
    e.stopImmediatePropagation();
    if(ai.enabled&&ai.running)setMsg("🤖 AI še zaključuje svojo rundo…");
    else b.hidden=true;
  }
},true);

function bootAIChallenge(){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if($("playMode")){
      clearInterval(timer);injectUI();syncMode();renderAI();
      console.info("LiMATO Box Challenge v0.6.3 AI Challenge FIX-5 mounted");
    }else if(tries>=100){
      clearInterval(timer);
      console.warn("LiMATO AI Challenge: #playMode was not created in time.");
    }
  },100);
}
bootAIChallenge();
console.info("LiMATO Box Challenge v0.6.3 AI Challenge FIX-5 loaded");
})();