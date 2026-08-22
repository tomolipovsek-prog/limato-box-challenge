/* LiMATO Box Challenge v0.6.3 — AI CHALLENGE
   Additive patch: keeps Solo / Invite / Arena / Hard Mode intact.
   AI opponent uses the same Box, rounds, dice-change penalties and scoring rules.
*/
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ai={
  enabled:false, level:"challenger", results:[], roundLogs:[], running:false
};

function injectUI(){
  // FIX-2: keep the existing setup layout untouched.
  // Add "🤖 Proti AI" directly into the existing "Način igre" selector.
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
      <div id="aiVerdict" class="aiVerdict"></div>
    </div>`;
  mount.appendChild(box);

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
  if(level==="beginner"){
    // Beginner often chooses a merely valid option rather than the strategic best.
    return opts[Math.floor(Math.random()*opts.length)];
  }
  const ranked=opts.map(c=>{
    const left=open.filter(n=>!c.includes(n));
    let value=futureMobility(left)*3 - left.reduce((a,b)=>a+b,0)*.12;
    // Preserve small flexible numbers; closing high numbers is usually valuable.
    value += c.reduce((a,b)=>a+b,0)*.08 - c.length*.12;
    if(level==="master"){
      // Look one layer deeper across plausible next totals.
      let next=0;
      for(let t=2;t<=12;t++){
        const nopts=subsets(left,t);
        if(nopts.length) next+=Math.max(...nopts.map(x=>futureMobility(left.filter(n=>!x.includes(n)))));
      }
      value+=next*.08;
    }
    return {c,value};
  }).sort((a,b)=>b.value-a.value);
  if(level==="challenger" && ranked.length>1 && Math.random()<.18) return ranked[1].c;
  return ranked[0].c;
}
function defaultDiceFor(max){return ({9:2,12:2,15:3,18:3})[max]||2}
function maybeChangeDice(open,dice,switches,level){
  if(switches>=3||level==="beginner") return dice;
  // Conservative strategy: change only when board has become small.
  const high=Math.max(0,...open);
  if(open.length<=4 && dice>1) return dice-1;
  if(level==="master" && open.length>=8 && high>=13 && dice<3) return dice+1;
  return dice;
}
async function playAIRound(max,level){
  let open=Array.from({length:max},(_,i)=>i+1), penalty=0, switches=0;
  let dice=defaultDiceFor(max), throws=0, moves=[];
  while(open.length && throws<80){
    const nd=maybeChangeDice(open,dice,switches,level);
    if(nd!==dice){ penalty += [2,3,4][switches]||0; switches++; dice=nd; }
    const vals=Array.from({length:dice},()=>1+Math.floor(Math.random()*6));
    const target=vals.reduce((a,b)=>a+b,0); throws++;
    const move=chooseMove(open,target,level);
    moves.push({vals,target,move:move?move.slice():null});
    if(!move) break;
    open=open.filter(n=>!move.includes(n));
  }
  return {score:open.reduce((a,b)=>a+b,0)+penalty, penalty, throws, open, moves};
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
async function runAIForHumanRound(roundIndex){
  if(!ai.enabled||ai.running||ai.results.length>roundIndex)return;
  ai.running=true;
  if($("ai")) $("ai").textContent="🤖 LiMATO AI razmišlja…";
  await sleep(450);
  const r=await playAIRound(s.max,ai.level);
  ai.results[roundIndex]=r.score; ai.roundLogs[roundIndex]=r;
  ai.running=false; renderAI();
  if($("ai")) $("ai").textContent=`🤖 AI R${roundIndex+1}: ${r.score}`;
}
function finalVerdict(){
  if(!ai.enabled||ai.results.length!==s.rounds)return;
  const h=s.results.reduce((a,b)=>a+b,0), a=ai.results.reduce((x,y)=>x+y,0);
  $("aiVerdict").textContent=h<a?`🏆 Zmagaš! ${h} : ${a}`:h>a?`🤖 AI zmaga ${a} : ${h}`:`🤝 Neodločeno ${h} : ${a}`;
}
function resetAI(){
  syncMode(); ai.results=[]; ai.roundLogs=[]; ai.running=false;
  if($("aiVerdict")) $("aiVerdict").textContent="";
  if($("aiRoundInfo")) $("aiRoundInfo").textContent="";
  renderAI();
}

// Wrap existing core without replacing it.
const oldStart=startMatch;
startMatch=function(){
  resetAI();
  oldStart();
  if(ai.enabled){ $("aiScoreCard").hidden=false; renderAI(); }
};
const oldFinish=finish;
finish=function(reason){
  const before=s.results.length;
  const ret=oldFinish(reason);
  const idx=before;
  if(ai.enabled && s.results.length>before){
    runAIForHumanRound(idx).then(()=>{renderAI(); if(!s.active) finalVerdict();});
  }
  return ret;
};
const oldNext=nextRound;
nextRound=function(){
  if(ai.enabled && ai.running){ setMsg("🤖 AI še zaključuje svojo rundo…"); return; }
  oldNext();
};
// FIX-3: backend.js is loaded as type="module", so #playMode is created
// asynchronously and may not exist yet when this classic script runs.
// Wait until the real "Način igre" selector exists, then attach AI exactly once.
function bootAIChallenge(){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if($("playMode")){
      clearInterval(timer);
      injectUI();
      syncMode();
      renderAI();
      console.info("LiMATO Box Challenge v0.6.3 AI Challenge FIX-3 mounted");
    }else if(tries>=100){
      clearInterval(timer);
      console.warn("LiMATO AI Challenge: #playMode was not created in time.");
    }
  },100);
}
bootAIChallenge();
console.info("LiMATO Box Challenge v0.6.3 AI Challenge FIX-3 loaded");
})();