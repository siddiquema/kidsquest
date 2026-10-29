// KidQuest — meal, homework and TV timers
// Plain script: shares globals with the other files; load order is set in index.html.

// ═══════════════════════════════════════
//  TIMERS  (synced: start on one device, the countdown shows on all)
// ═══════════════════════════════════════
// Meal and homework lengths can be changed (in 5-minute steps) before the timer starts;
// the chosen length is saved per kid as `len` and stays until changed again.
const TIMER_TYPES={
  meal:    { label:'Meal',     icon:'🍽️', mins:25, adjust:[10,60] },
  homework:{ label:'Homework', icon:'📚', mins:30, adjust:[10,90] },
  tv:      { label:'TV',       icon:'📺', mins:20 },
};
const TIMER_ORDER=['meal','homework','tv'], ADJUST_STEP=5;
function fullSecs(type,kid){ return TIMERS[kid]?.[type]?.len || TIMER_TYPES[type].mins*60; }
function mmss(s){ return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }

// Stored as an end time rather than a countdown, so every device shows the same time
// and a phone that slept catches up instead of falling behind.
function timerState(kid,type){
  const t=TIMERS[kid]?.[type]||{}, full=fullSecs(type,kid);
  if(t.endsAt){
    const secs=Math.max(0,Math.ceil((t.endsAt-Date.now())/1000));
    return { running:secs>0, expired:secs<=0, secs, by:t.by, full };
  }
  return { running:false, expired:false, secs: t.remaining==null ? full : t.remaining, by:t.by, full };
}

// Kids only see their own timers; parents see everyone's
function visibleKids(){ return isParent() ? KIDS : KIDS.filter(k=>k.id===currentWho?.id); }

function timerBoxHtml(kid,type){
  const T=TIMER_TYPES[type];
  return `
        <div class="timer-box ${type}" id="${type}-box-${kid}">
          <span class="timer-icon">${T.icon}</span>
          <div class="timer-type" id="${type}-lbl-${kid}">${T.label} · ${Math.round(fullSecs(type,kid)/60)} min</div>
          <div class="timer-digits" id="${type}-dig-${kid}"></div>
          ${T.adjust?`<div class="tc-adjust parent-only" id="${type}-adj-${kid}">
            <button class="tc-adj" onclick="adjustTimer('${kid}','${type}',-1)" title="${ADJUST_STEP} minutes less">−</button>
            <span>${ADJUST_STEP}m</span>
            <button class="tc-adj" onclick="adjustTimer('${kid}','${type}',1)" title="${ADJUST_STEP} minutes more">+</button>
          </div>`:''}
          <div class="timer-controls">
            <button class="tc-btn tc-start" id="${type}-stbtn-${kid}" onclick="toggleTimer('${kid}','${type}')">▶ Start</button>
            <button class="tc-btn tc-reset" id="${type}-rsbtn-${kid}" onclick="resetTimerDo('${kid}','${type}')">↺</button>
          </div>
          ${type==='meal'?`<button class="tc-btn tc-finish" id="meal-fin-${kid}" onclick="finishMeal('${kid}')">✅ Finished</button>`:''}
        </div>`;
}

function renderTimers(){
  const list=visibleKids();
  document.getElementById('timersContainer').innerHTML=list.map((kid,i)=>`
    <div class="kid-block">
      <div class="kid-block-header">
        <div class="kid-block-avatar" style="--kc:${kid.color};border-color:${kid.color}">${kid.emoji}</div>
        <div class="kid-block-name" style="color:${kid.color}">${esc(kid.name)}</div>
      </div>
      <div class="timers-row">${TIMER_ORDER.map(t=>timerBoxHtml(kid.id,t)).join('')}
      </div>
      ${i<list.length-1?'<div class="divider"></div>':''}
    </div>`).join('');
  updateTimerDisplays();
}

function updateTimerDisplays(){
  visibleKids().forEach(k=>TIMER_ORDER.forEach(type=>{
    const box=document.getElementById(`${type}-box-${k.id}`); if(!box) return;
    const s=timerState(k.id,type);
    document.getElementById(`${type}-lbl-${k.id}`).textContent=`${TIMER_TYPES[type].label} · ${Math.round(s.full/60)} min`;
    // length can only change before the timer starts
    const adj=document.getElementById(`${type}-adj-${k.id}`);
    if(adj) adj.classList.toggle('locked', s.running || s.expired || s.secs!==s.full);
    box.classList.toggle('running',s.running);
    const dig=document.getElementById(`${type}-dig-${k.id}`);
    dig.textContent=mmss(s.secs);
    dig.classList.toggle('expired',s.expired);
    document.getElementById(`${type}-stbtn-${k.id}`).textContent =
      s.running ? '⏸ Pause' : (s.secs<s.full && s.secs>0 ? '▶ Resume' : '▶ Start');
    const fin=document.getElementById(`meal-fin-${k.id}`);
    if(type==='meal' && fin) fin.disabled = s.secs>=s.full; // nothing to finish until the timer has run
  }));
}

// ── change a timer's length before it starts (parents) ──
function adjustTimer(kid,type,dir){
  const T=TIMER_TYPES[type], s=timerState(kid,type);
  if(!isParent() || !T.adjust || s.running || s.expired || s.secs!==s.full) return;
  const [lo,hi]=T.adjust, mins=Math.min(hi,Math.max(lo,Math.round(s.full/60)+dir*ADJUST_STEP));
  store.put('timers',kid,{[type]:{ len:mins*60, endsAt:null, remaining:null }});
}

// ── meal finished: medal by how long the timer ran ──
// Within 80% of the meal time → gold (1 star; 20 of the default 25 min) · within the
// meal time → silver (½ star) · timer ran out → no star. Under 5 minutes gets no star
// either, so a quick start-and-finish can't earn one.
const MEAL_GOLD_SHARE=0.8, MEAL_MIN_SECS=5*60;
function finishMeal(kid){
  const s=timerState(kid,'meal'), name=kidById(kid)?.name||'';
  const used=s.full-s.secs; if(used<=0) return;
  const mins=Math.max(1,Math.round(used/60));
  let medal=null;
  if(!s.expired && used>=MEAL_MIN_SECS) medal = used<=Math.round(s.full*MEAL_GOLD_SHARE) ? 'gold' : 'silver';
  store.put('timers',kid,{ meal:{ endsAt:null, remaining:null, by:DEVICE_ID } });
  if(medal){
    store.add('stars',{ kid, ts:Date.now(), n:medal==='gold'?1:SILVER_VALUE, src:'meal', medal, mins, by:currentWho?.id||null });
    speak(`${medal==='gold'?'Gold':'Silver'} star, ${name}! You finished your food in ${mins} minutes.`,[nameClip(name),'meal-'+medal]);
    showToast(`${medal==='gold'?'⭐ Gold':'★ Silver'} star — ${name} finished in ${mins} min`);
  } else if(s.expired){
    speak(`Well done for finishing, ${name}. Try to beat the timer next time!`,[nameClip(name),'meal-late']);
    showToast(`${name} finished after the timer — no star this time`);
  } else {
    showToast(`Only ${mins} min — too quick for a star. Was the plate really finished?`);
  }
}
// meal medals earned between two times, for the Star Board breakdown
function mealMedals(kid,from,to=Infinity){
  const m={gold:0,silver:0,value:0};
  for(const id in STARS){ const e=STARS[id]; if(e.kid===kid && e.src==='meal' && e.ts>=from && e.ts<to){ m[e.medal]++; m.value+=e.n||0; } }
  return m;
}

function toggleTimer(kid,type){
  const s=timerState(kid,type);
  if(s.running){
    store.put('timers',kid,{[type]:{ endsAt:null, remaining:s.secs, by:DEVICE_ID }});
  } else {
    const secs = s.secs<=0 ? s.full : s.secs;
    store.put('timers',kid,{[type]:{ endsAt:Date.now()+secs*1000, remaining:secs, by:DEVICE_ID }});
  }
}

function resetTimerDo(kid,type){
  store.put('timers',kid,{[type]:{ endsAt:null, remaining:null, by:DEVICE_ID }});
  showToast(`${kidById(kid)?.name||''}'s ${TIMER_TYPES[type].label.toLowerCase()} timer reset`);
}

// Timer reminders are spoken only on devices where "Audio reminders" is ticked
// (e.g. the one next to the kids), so the whole house doesn't talk at once.
// It's a per-device setting and starts unticked.
function timerAudioOn(){ return lsGet('kq_timer_audio')==='1'; }
function setTimerAudio(on){
  lsSet('kq_timer_audio', on?'1':'0');
  // speaking here also unlocks speech for later reminders on browsers that need a tap first
  if(on) speak('Timer reminders are on for this device.',['timer-audio-on']);
  showToast(on?'🔊 Timer reminders on for this device':'🔇 Timer reminders off for this device');
}

const lastSecs={};
function timerTick(){
  updateTimerDisplays();
  KIDS.forEach(k=>TIMER_ORDER.forEach(type=>{
    const key=k.id+'_'+type, s=timerState(k.id,type), prev=lastSecs[key];
    lastSecs[key]=s.secs;
    if(prev==null || s.secs>=prev || !timerAudioOn() || !TIMERS[k.id]?.[type]?.endsAt) return;
    if(prev-s.secs<=3){ for(let x=prev-1;x>=s.secs;x--) onTick(k.id,type,x); }
    else if(s.secs===0) onTick(k.id,type,0); // woke up after the end: still say time's up
  }));
}

function onTick(kid,type,secs){
  const name=kidById(kid)?.name||'';
  if(type==='meal'){
    const mins=Math.floor(secs/60), rem=secs%60;
    if(secs>300){ if(rem===0&&mins>0&&mins%5===0) speak(`${name}, ${mins} minutes left to finish your food.`,[nameClip(name),'meal-left-'+mins]); }
    else if(secs>0){ if(rem===0&&mins>0) speak(`${name}, ${mins} minute${mins>1?'s':''} left to finish your food.`,[nameClip(name),'meal-left-'+mins]); if(secs===30) speak(`${name}, 30 seconds left!`,[nameClip(name),'meal-30s']); }
    else speak(`Time is up for ${name}, meal time is finished!`,[nameClip(name),'meal-up']);
  } else if(type==='homework'){
    if(secs===600 && timerState(kid,type).full>900) speak(`${name}, 10 minutes of homework time left.`,[nameClip(name),'hw-10']);
    if(secs===300) speak(`${name}, 5 minutes left. Finish the question you're on.`,[nameClip(name),'hw-5']);
    if(secs===0)   speak(`Homework time is done, ${name}. Great focus! Time for a short break.`,[nameClip(name),'hw-done']);
  } else {
    if(secs===600) speak(`${name}, 10 minutes of TV time left.`,[nameClip(name),'tv-10']);
    if(secs===0)   speak(`Time is up for ${name}! Please turn off the TV or pass the remote.`,[nameClip(name),'tv-up']);
  }
}
