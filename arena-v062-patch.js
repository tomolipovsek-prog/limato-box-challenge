/* LiMATO Box Challenge v0.6.2 — Hard Mode patch
   Additive patch: v0.5 core, Invite Room, v0.6 Arena and v0.6.1 Turn & Timer remain intact. */
(function(){
  "use strict";
  const q=id=>document.getElementById(id);
  const V="0.6.3";
  const HARD_PENALTY=2;
  let hardMistakes=0;

  const TXT={
    sl:{label:"Težavnost",normal:"Normal",hard:"🔥 HARD",hint:"HARD: napačna potrditev izbire doda +2 pribitka. Čas v Areni teče naprej.",bad:n=>`🔥 HARD: napačna vsota. +${n} pribitka. Poskusi znova.`},
    en:{label:"Difficulty",normal:"Normal",hard:"🔥 HARD",hint:"HARD: confirming a wrong selection adds +2 penalty points. Arena time keeps running.",bad:n=>`🔥 HARD: wrong sum. +${n} penalty. Try again.`}
  };
  const lang=()=>q("lang")?.value==="sl"?"sl":"en";
  const t=k=>(TXT[lang()]||TXT.en)[k];
  const isHard=()=>q("v062Difficulty")?.value==="hard";

  function updateVersion(){
    document.title=`LiMATO Box Challenge v${V}`;
    const sub=document.querySelector(".brandWrap p");
    if(sub) sub.textContent=`Arena Beta v${V}`;
  }

  function mountDifficulty(){
    const setup=document.querySelector(".setup");
    if(!setup || q("v062Difficulty")) return;
    const label=document.createElement("label");
    label.id="v062DifficultyWrap";
    label.innerHTML=`<span id="v062DifficultyLabel"></span><select id="v062Difficulty"><option value="normal"></option><option value="hard"></option></select><small id="v062DifficultyHint" style="display:none;color:#ffd46f;line-height:1.25;margin-top:4px"></small>`;
    const start=q("start");
    if(start) setup.insertBefore(label,start); else setup.appendChild(label);
    const select=q("v062Difficulty");
    const saved=localStorage.getItem("lbc-v062-difficulty");
    if(saved==="hard") select.value="hard";
    select.addEventListener("change",()=>{
      localStorage.setItem("lbc-v062-difficulty",select.value);
      hardMistakes=0;
      translate();
    });
    translate();
  }

  function translate(){
    if(!q("v062Difficulty")) return;
    q("v062DifficultyLabel").textContent=t("label");
    q("v062Difficulty").options[0].textContent=t("normal");
    q("v062Difficulty").options[1].textContent=t("hard");
    q("v062DifficultyHint").textContent=t("hint");
    q("v062DifficultyHint").style.display=isHard()?"block":"none";
  }

  function installHardMode(){
    const btn=q("close");
    if(!btn || btn.dataset.v062Hard) return;
    btn.dataset.v062Hard="1";

    // Core v0.6.1 disables CLOSE while the sum is wrong. In HARD mode we deliberately
    // allow a confirmation attempt after at least one number is selected, so mistakes
    // become part of the strategy instead of being silently blocked by the UI.
    const syncClose=()=>{
      try{
        if(!isHard() || typeof s==="undefined" || !s.active || !s.rolled || s.rolling) return;
        btn.disabled=!(Array.isArray(s.sel) && s.sel.length>0);
      }catch(e){}
    };
    const observer=new MutationObserver(()=>setTimeout(syncClose,0));
    [q("tiles"),q("selected"),q("target")].filter(Boolean).forEach(el=>observer.observe(el,{subtree:true,childList:true,characterData:true,attributes:true}));
    document.addEventListener("click",()=>setTimeout(syncClose,0),true);

    btn.addEventListener("click",e=>{
      try{
        if(!isHard() || typeof s==="undefined" || !s.active || !s.rolled || s.rolling) return;
        const selected=(Array.isArray(s.sel)?s.sel:[]).reduce((a,b)=>a+(+b||0),0);
        const target=Number(s.target);
        if(!s.sel?.length || selected===target) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        hardMistakes++;
        s.penalty=(Number(s.penalty)||0)+HARD_PENALTY;
        if(q("penalty")) q("penalty").textContent=s.penalty;
        if(q("score")) q("score").textContent=(Array.isArray(s.open)?s.open.reduce((a,b)=>a+(+b||0),0):0)+s.penalty;
        if(q("message")) q("message").textContent=t("bad")(HARD_PENALTY);
        if(q("ai")) q("ai").textContent=lang()==="sl"?"🤖 Matematika vrača udarec. 😈":"🤖 Mathematics strikes back. 😈";
        if(typeof window.LBCArenaV060?.arena!=="undefined"){
          // Existing Arena MutationObserver/snapshot hooks pick up the changed score/message.
        }
        setTimeout(syncClose,0);
      }catch(err){console.warn("LiMATO v0.6.2 Hard Mode:",err)}
    },true);
  }

  function appendHelp(){
    const body=q("helpBody");
    if(!body || q("helpOverlay")?.hidden) return;
    body.querySelectorAll("[data-v062-help]").forEach(x=>x.remove());
    const sec=document.createElement("section");
    sec.dataset.v062Help="hard";
    sec.innerHTML=lang()==="sl"
      ?`<h3>🔥 HARD način</h3><p>V načinu HARD lahko potrdiš tudi napačno izbrano vsoto. Vsaka napačna potrditev doda +${HARD_PENALTY} pribitka, številke ostanejo odprte in poskusiš znova. V Areni ura med napako ne obstane.</p>`
      :`<h3>🔥 HARD mode</h3><p>In HARD mode you may confirm an incorrect selected sum. Each wrong confirmation adds +${HARD_PENALTY} penalty points; the numbers stay open and you try again. In Arena, the clock does not stop for the mistake.</p>`;
    body.appendChild(sec);
  }

  function refresh(){updateVersion();mountDifficulty();translate();installHardMode();appendHelp()}
  setTimeout(refresh,120);
  setTimeout(refresh,650);
  q("help")?.addEventListener("click",()=>setTimeout(appendHelp,0));
  q("lang")?.addEventListener("change",()=>setTimeout(()=>{translate();appendHelp()},0));
})();
