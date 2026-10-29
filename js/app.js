// KidQuest — tabs, redraws and start-up (loads last)
// Plain script: shares globals with the other files; load order is set in index.html.

// ═══════════════════════════════════════
//  TABS
// ═══════════════════════════════════════
function switchTab(name,btn){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('panel-'+name).classList.add('active');
  btn.classList.add('active');
}

// ═══════════════════════════════════════
//  REDRAW
// ═══════════════════════════════════════
let renderQueued=false;
function scheduleRender(){
  if(renderQueued) return; renderQueued=true;
  setTimeout(()=>{ renderQueued=false; renderAll(); },16); // batches a burst of sync updates into one redraw
}
function renderAll(){
  // redrawing would close an open dropdown and reset its choice — wait until it's closed
  const f=document.activeElement;
  if(f?.tagName==='SELECT' && f.closest('.app-wrapper')){ setTimeout(scheduleRender,500); return; }
  applyRole();
  renderKidsStrip();
  renderBoard();
  renderChartKidTabs();
  renderChart();
  renderTimers();
  renderSkills();
  renderPlay();
  // don't redraw alarms while someone is picking a time or device
  const af=document.activeElement;
  if(!(document.getElementById('alarmList').contains(af) && /^(INPUT|SELECT)$/.test(af.tagName))) renderAlarms();
}


// ═══════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════
async function startApp(){
  showSplash();
  if(store.kind==='firebase'){
    let fid;
    try{ fid=await store.findFamily(); }
    catch(e){ console.error(e); showSplashError("Can't reach KidQuest. Check the internet and reload."); return; }
    if(!fid){ hideSplash(); showNewFamily(); return; } // signed in, but no family yet
    FAMILY_ID=fid;
    if(fid!=='home'){ FAMILY_PACKS=[]; renderStories(); }
  }
  registerDevice();
  startWatches(()=>{
    hideSplash();
    if(!KIDS.length && !PARENTS.length){ showOnboarding(); return; }
    const saved=ssGet('kq_who');
    if(saved && PROFILES[saved]){ currentWho={ id:saved, type:PROFILES[saved].type }; renderAll(); }
    else showWho();
  });
}

function showSplashError(msg){
  document.querySelector('.splash-tag').textContent=msg;
  document.querySelector('.splash-dots').style.display='none';
}

async function boot(){
  renderStories(); // stories don't depend on kids
  document.getElementById('timerAudio').checked=timerAudioOn();
  showSplash();
  const minSplash=new Promise(r=>setTimeout(r,1200));
  try{
    store = FB_CONFIG ? await makeFirebaseStore() : makeLocalStore();
  }catch(e){
    console.error(e);
    await minSplash;
    showSplashError("Can't reach KidQuest. Check the internet and reload.");
    return;
  }
  await minSplash;
  if(store.kind==='firebase' && !(await store.currentUser())){ hideSplash(); showDeviceSetup(); return; }
  startApp();
}

// timers, alarms and the weekly rollover all run off one clock
setInterval(()=>{
  if(!store || !KIDS.length) return; // wait until the family has loaded
  timerTick(); skillTick(); checkAlarms(); checkWeekRollover(); checkAutoLock();
},500);

if('serviceWorker' in navigator && location.protocol!=='file:'){
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(e=>console.warn('sw',e)));
}

boot();
