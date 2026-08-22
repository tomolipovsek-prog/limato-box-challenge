/* LiMATO Box Challenge v0.6.3 — AI DUEL COMPLETE
   Human -> AI -> Human automatic turn flow.
   Whole-round timer: Classic 40s / Extended 45s / Pro 50s / Master 60s.
*/
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const BASE_TIME={9:40,12:45,15:50,18:60};
const ai={enabled:false,level:"challenger",results:[],roundLogs:[],running:false,turn:"human",timer:null,timeLeft:0,humanTimedOut:false};

function injectUI(){
  const pm=$("playMode"); if(!pm)return;
  if(!pm.querySelector('option[value="ai"]')){
    const o=document.createElement("option"); o.value="ai"; o.textContent="🤖 Proti AI"; pm.appendChild(o);
  }
  const mount=$("extrasMount"); if(!mount||$("aiChallengeBox"))return;
  const box=document.createElement("section");
  box.id="aiChallengeBox"; box.className="aiChallengeBox"; box.hidden=true;
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
    <div id="aiTurnBar" style="margin:10px 0;padding:10px;border-radius:12px;background:rgba(0,0,0,.20);text-align:center;font-weight:800" hidden></div>
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
  pm.addEventListener("change",syncMode);
  $("aiLevel").addEventListener("change",()=>{ai.level=$("aiLevel").value;renderAI();});
}
function syncMode(){
  ai.enabled=$("playMode")?.value==="ai";
  ai.level=$("aiLevel")?.value||"challenger";
  if($("aiChallengeBox"))$("aiChallengeBox").hidden=!ai.enabled;
  if($("aiScoreCard"))$("aiScoreCard").hidden=!ai.enabled;
  if($("aiTurnBar"))$("aiTurnBar").hidden=!ai.enabled;
}
function levelName(){return ai.level==="beginner"?"🟢 Začetnik":ai.level==="master"?"🔴 Mojster":"🟡 Izzivalec"}
function roundSeconds(){return BASE_TIME[s.max]||40}
function clearTurnTimer(){if(ai.timer){clearInterval(ai.timer);ai.timer=null}}
function turnText(){
  if(!ai.enabled)return "";
  const who=ai.turn==="ai"?"🤖 LiMATO AI":"👤 "+($("name")?.value.trim()||"Igralec");
  return `${who} • Runda ${s.round}/${s.rounds} • ⏱ ${String(Math.max(0,ai.timeLeft)).padStart(2,"0")} s`;
}
function paintTurn(){if($("aiTurnBar"))$("aiTurnBar").textContent=turnText()}
function lockHuman(v){
  ["roll","close","change","diceChoice"].forEach(id=>{if($(id))$(id).disabled=v});
  document.querySelectorAll("#tiles .tile").forEach(x=>{x.style.pointerEvents=v?"none":"";x.style.opacity=v?".72":""});
}
function startHumanTimer(){
  clearTurnTimer(); if(!ai.enabled)return;
  ai.turn="human"; ai.timeLeft=roundSeconds(); ai.humanTimedOut=false; paintTurn();
  ai.timer=setInterval(()=>{
    if(!ai.enabled||ai.turn!=="human"||!s.active){clearTurnTimer();return}
    ai.timeLeft--; paintTurn();
    if(ai.timeLeft<=0){
      clearTurnTimer(); ai.humanTimedOut=true; lockHuman(true);
      setMsg("⏱ Čas je potekel. Runda se zaključi z zatečenim rezultatom.");
      finish("⏱ Čas");
    }
  },1000);
}
function startAITimer(){
  clearTurnTimer(); ai.turn="ai"; ai.timeLeft=roundSeconds(); paintTurn();
  ai.timer=setInterval(()=>{if(ai.turn!=="ai"){clearTurnTimer();return}ai.timeLeft--;paintTurn();if(ai.timeLeft<=0)clearTurnTimer()},1000);
}
function subsets(nums,target){
  const out=[]; (function rec(i,left,cur){
    if(left===0){out.push(cur.slice());return}
    if(left<0||i>=nums.length)return;
    rec(i+1,left-nums[i],[...cur,nums[i]]); rec(i+1,left,cur);
  })(0,target,[]); return out;
}
function hasCombo(nums,target){return subsets(nums,target).length>0}
function futureMobility(open){let x=0;for(let t=2;t<=18;t++)if(hasCombo(open,t))x++;return x}
function chooseMove(open,target,level){
  const opts=subsets(open,target); if(!opts.length)return null;
  if(level==="beginner")return opts[Math.floor(Math.random()*opts.length)];
  const ranked=opts.map(c=>{
    const left=open.filter(n=>!c.includes(n));
    let value=futureMobility(left)*3-left.reduce((a,b)=>a+b,0)*.12+c.reduce((a,b)=>a+b,0)*.08-c.length*.12;
    if(level==="master"){let next=0;for(let t=2;t<=12;t++){const no=subsets(left,t);if(no.length)next+=Math.max(...no.map(x=>futureMobility(left.filter(n=>!x.includes(n)))))}value+=next*.08}
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
  if(level==="master"&&open.length>=8&&high>=13&&dice<4)return dice+1;
  return dice;
}
async function playAIRound(max,level){
  let open=Array.from({length:max},(_,i)=>i+1),penalty=0,switches=0,dice=defaultDiceFor(max),throws=0,moves=[];
  while(open.length&&throws<80){
    if(ai.timeLeft<=0)break;
    const nd=maybeChangeDice(open,dice,switches,level); let switchPenalty=0;
    if(nd!==dice){switchPenalty=[2,3,4][switches]||0;penalty+=switchPenalty;switches++;dice=nd}
    const vals=Array.from({length:dice},()=>1+Math.floor(Math.random()*6));
    const target=vals.reduce((a,b)=>a+b,0);throws++;
    const move=chooseMove(open,target,level);
    moves.push({vals,target,move:move?move.slice():null,dice,switchPenalty,openBefore:open.slice()});
    if(!move)break;
    open=open.filter(n=>!move.includes(n));
  }
  return {score:open.reduce((a,b)=>a+b,0)+penalty,penalty,throws,open,moves,timedOut:ai.timeLeft<=0};
}
function renderAI(){
  if(!$("aiScoreCard"))return;$("aiScoreCard").hidden=!ai.enabled;if(!ai.enabled)return;
  $("aiHumanName").textContent=$("name")?.value.trim()||"Igralec";
  $("aiOpponentName").textContent="LiMATO AI "+levelName();
  $("aiHumanTotal").textContent=Array.isArray(s.results)?s.results.reduce((a,b)=>a+b,0):0;
  $("aiOpponentTotal").textContent=ai.results.reduce((a,b)=>a+b,0);
  $("aiRoundInfo").textContent=ai.results.map((v,i)=>`R${i+1}: 👤 ${s.results[i]??"–"} / 🤖 ${v}`).join(" • ");
  paintTurn();
}
async function animateAIMove(roundIndex,m,i){
  const live=$("aiLive");if(!live)return;
  if(m.switchPenalty){live.innerHTML=`🤖 <b>LiMATO AI — R${roundIndex+1}</b><br>🔄 Menjava na ${m.dice} kock(e) • +${m.switchPenalty} pribitka`;await sleep(650)}
  live.innerHTML=`🤖 <b>LiMATO AI — met ${i+1}</b><br>🎲 ${m.vals.join(" + ")} = <b>${m.target}</b><br>Odprte: ${m.openBefore.join(", ")}`;
  $("ai").textContent=`🤖 AI meče: ${m.vals.join(" + ")} = ${m.target}`;await sleep(700);
  if(m.move){live.innerHTML+=`<br>🧠 Zapre: <b>${m.move.join(" + ")}</b>`;$("ai").textContent=`🤖 AI zapira: ${m.move.join(" + ")}`}
  else{live.innerHTML+=`<br>⛔ Ni veljavne kombinacije.`;$("ai").textContent="🤖 AI nima veljavne kombinacije"}
  await sleep(700);
}
async function runAIForHumanRound(roundIndex){
  if(!ai.enabled||ai.running||ai.results.length>roundIndex)return;
  ai.running=true;lockHuman(true);if($("next"))$("next").hidden=true;
  const live=$("aiLive");if(live){live.hidden=false;live.innerHTML=`🤖 <b>LiMATO AI je na potezi</b><br>Pripravlja rundo ${roundIndex+1}…`}
  startAITimer();await sleep(450);
  const r=await playAIRound(s.max,ai.level);
  for(let i=0;i<r.moves.length&&ai.timeLeft>0;i++)await animateAIMove(roundIndex,r.moves[i],i);
  clearTurnTimer();
  ai.results[roundIndex]=r.score;ai.roundLogs[roundIndex]=r;ai.running=false;renderAI();
  if(live)live.innerHTML=`🤖 <b>Konec AI runde ${roundIndex+1}</b><br>Rezultat: <b>${r.score}</b>${r.penalty?` • pribitek ${r.penalty}`:""}${r.timedOut?" • ⏱ čas":""}`;
  $("ai").textContent=`🤖 AI R${roundIndex+1}: ${r.score}`;
  await sleep(700);
  if(roundIndex+1>=s.rounds){ai.turn="done";paintTurn();finalVerdict();return}
  // Core finish() left the human match alive and exposed NEXT ROUND.
  // Advance automatically only after AI has finished.
  oldNext();
  lockHuman(false);startHumanTimer();renderAI();focusPlay();
}
function finalVerdict(){
  clearTurnTimer();if(!ai.enabled||ai.results.length!==s.rounds)return;
  const h=s.results.reduce((a,b)=>a+b,0),a=ai.results.reduce((x,y)=>x+y,0);
  $("aiVerdict").textContent=h<a?`🏆 Zmagaš! ${h} : ${a}`:h>a?`🤖 AI zmaga ${a} : ${h}`:`🤝 Neodločeno ${h} : ${a}`;
  lockHuman(true);if($("new"))$("new").disabled=false;
}
function resetAI(){
  clearTurnTimer();syncMode();ai.results=[];ai.roundLogs=[];ai.running=false;ai.turn="human";ai.timeLeft=0;ai.humanTimedOut=false;
  if($("aiVerdict"))$("aiVerdict").textContent="";
  if($("aiRoundInfo"))$("aiRoundInfo").textContent="";
  if($("aiLive")){$("aiLive").textContent="";$("aiLive").hidden=true}
  renderAI();
}

const oldStart=startMatch,oldFinish=finish,oldNext=nextRound;
startMatch=function(){
  resetAI();oldStart();
  if(ai.enabled){$("aiScoreCard").hidden=false;$("aiTurnBar").hidden=false;startHumanTimer();renderAI()}
};
finish=function(reason){
  if(!ai.enabled)return oldFinish(reason);
  if(ai.turn!=="human"||ai.running)return;
  clearTurnTimer();
  const before=s.results.length;
  const lastRound=s.round>=s.rounds;
  // Prevent core from fully ending the match before AI gets its matching last round.
  if(lastRound)s.rounds=s.rounds+1;
  const ret=oldFinish(reason);
  if(lastRound)s.rounds=s.rounds-1;
  if(lastRound){s.active=true;setPlaying(true);lockSetup(true);$("new").disabled=true}
  const idx=before;
  if(s.results.length>before)runAIForHumanRound(idx);
  return ret;
};
nextRound=function(){
  if(ai.enabled){setMsg(ai.running?"🤖 AI je na potezi…":"Počakaj na samodejni preklop.");return}
  oldNext();
};

function bootAIChallenge(){
  let tries=0;const timer=setInterval(()=>{tries++;
    if($("playMode")){clearInterval(timer);injectUI();syncMode();renderAI();console.info("LiMATO v0.6.3 AI DUEL COMPLETE mounted")}
    else if(tries>=100){clearInterval(timer);console.warn("LiMATO AI: #playMode not found")}
  },100);
}
bootAIChallenge();
console.info("LiMATO Box Challenge v0.6.3 AI DUEL COMPLETE loaded");
})();