/* LiMATO Box Challenge v0.6.1 — Turn & Timer UI patch
   Additive patch: v0.6.0 core/Arena remains intact.
   Server-side ordering and timers are implemented by supabase-v061-migration.sql.
*/
(function(){
  "use strict";

  const q=id=>document.getElementById(id);

  const TXT={
    sl:{
      hint:"Vrstni red določi prijava. Čas velja za CELO rundo: 1–9 = 40 s · 1–12 = 45 s · 1–15 = 50 s · 1–18 = 60 s. Po vsakih 1.000 dokončanih tekmah −1 s, največ −5 s.",
      title:"⚡ Arena: vrstni red in čas",
      body:"Prvi prijavljeni začne, nato se igralci vrstijo po zaporedju prijave. Ura teče skozi celotno igralčevo rundo — med meti, razmišljanjem in provokacijami. Če igralec konča prej, igra takoj preide na naslednjega. Če čas poteče, se runda zaključi z zatečenim rezultatom (preostale odprte številke + pribitki). Časi: Classic 40 s, Extended 45 s, Pro 50 s, Master 60 s. Po vsakih 1.000 dokončanih tekmah se igralčev čas zmanjša za 1 sekundo, največ za 5 sekund.",
      community:"🎤 Community Voice",
      communityBody:"Komentarji so omejeni na 75 znakov in gredo najprej v pregled. Provokacije in humor so dobrodošli; grožnje, grobe žaljivke, opolzkost in podobna vsebina niso sprejeti."
    },
    en:{
      hint:"Queue order determines play order. Timer covers the WHOLE round: 1–9 = 40 s · 1–12 = 45 s · 1–15 = 50 s · 1–18 = 60 s. Every 1,000 completed matches reduces time by 1 s, max −5 s.",
      title:"⚡ Arena: order and timer",
      body:"The first player to join starts, then play follows queue order. The clock runs for the player's entire round — throws, thinking and provocations included. If a player finishes early, play passes immediately. If time expires, the current round state becomes the score (remaining open numbers + penalties). Times: Classic 40 s, Extended 45 s, Pro 50 s, Master 60 s. Every 1,000 completed matches reduces that player's time by 1 second, up to 5 seconds.",
      community:"🎤 Community Voice",
      communityBody:"Comments are limited to 75 characters and are reviewed before entering the shared pool. Witty provocation and humor are welcome; threats, severe abuse and sexual obscenity are rejected."
    }
  };

  function lang(){
    return q("lang")?.value==="sl" ? "sl" : "en";
  }

  function updateVersion(){
    document.title="LiMATO Box Challenge v0.6.1";
    const sub=document.querySelector(".brandWrap p");
    if(sub) sub.textContent="Arena Beta v0.6.1";
  }

  function addArenaHint(){
    const panel=q("arenaPanel");
    if(!panel) return;
    let box=q("v061ArenaHint");
    if(!box){
      box=document.createElement("div");
      box.id="v061ArenaHint";
      box.style.cssText=[
        "margin-top:10px",
        "padding:10px 12px",
        "border:1px solid rgba(214,166,255,.35)",
        "border-radius:12px",
        "background:rgba(20,8,34,.35)",
        "line-height:1.35",
        "font-size:.92rem",
        "opacity:.94"
      ].join(";");
      const head=panel.querySelector(".v060-arenaHead");
      if(head) head.after(box); else panel.prepend(box);
    }
    box.textContent=TXT[lang()].hint;
  }

  function appendHelp(){
    const body=q("helpBody");
    if(!body || q("helpOverlay")?.hidden) return;
    body.querySelectorAll("[data-v061-help]").forEach(x=>x.remove());
    const t=TXT[lang()];
    const sec=document.createElement("section");
    sec.dataset.v061Help="arena";
    sec.innerHTML=`<h3>${t.title}</h3><p>${t.body}</p>`;
    body.appendChild(sec);

    const sec2=document.createElement("section");
    sec2.dataset.v061Help="community";
    sec2.innerHTML=`<h3>${t.community}</h3><p>${t.communityBody}</p>`;
    body.appendChild(sec2);
  }

  function wireCommunityButton(){
    const area=q("v060CommentBody");
    const btn=q("v060CommentSubmit");
    if(!area||!btn) return;

    const sync=()=>{
      const n=area.value.trim().length;
      btn.disabled=n<3 || n>75;
    };
    area.addEventListener("input",sync);
    btn.addEventListener("click",()=>setTimeout(sync,150));
    sync();
  }

  function refresh(){
    updateVersion();
    addArenaHint();
    appendHelp();
    wireCommunityButton();
  }

  // v0.6.0 mounts synchronously before its first await, but wait a moment
  // so this patch is safe even if script loading order changes later.
  setTimeout(refresh,80);
  setTimeout(refresh,500);

  q("help")?.addEventListener("click",()=>setTimeout(appendHelp,0));
  q("lang")?.addEventListener("change",()=>setTimeout(()=>{
    addArenaHint();
    appendHelp();
  },0));
})();
