// KidQuest — meal and TV timers
// Plain script: shares globals with the other files; load order is set in index.html.

// ═══════════════════════════════════════
//  TIMERS  (synced: start on one device, the countdown shows on all)
// ═══════════════════════════════════════
const MEAL_SECS=25*60, TV_SECS=20*60;
function fullSecs(type){ return type==='meal'?MEAL_SECS:TV_SECS; }
function mmss(s){ return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }

// Stored as an end time rather than a countdown, so every device shows the same time
// and a phone that slept catches up instead of falling behind.
function timerState(kid,type){
  const t=TIMERS[kid]?.[type]||{}, full=fullSecs(type);
  if(t.endsAt){
    const secs=Math.max(0,Math.ceil((t.endsAt-Date.now())/1000));
    return { running:secs>0, expired:secs<=0, secs, by:t.by, full };
  }
  return { running:false, expired:false, secs: t.remaining==null ? full : t.remaining, by:t.by, full };
}

// Kids only see their own timers; parents see everyone's
function visibleKids(){ return isParent() ? KIDS : KIDS.filter(k=>k.id===currentWho?.id); }

function timerBoxHtml(kid,type){
  return `
        <div class="timer-box ${type}" id="${type}-box-${kid}">
          <span class="timer-icon">${type==='meal'?'🍽️':'📺'}</span>
          <div class="timer-type">${type==='meal'?'Meal · 25 min':'TV · 20 min'}</div>
          <div class="timer-digits" id="${type}-dig-${kid}"></div>
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
      <div class="timers-row">${timerBoxHtml(kid.id,'meal')}${timerBoxHtml(kid.id,'tv')}
      </div>
      ${i<list.length-1?'<div class="divider"></div>':''}
    </div>`).join('');
  updateTimerDisplays();
}

function updateTimerDisplays(){
  visibleKids().forEach(k=>['meal','tv'].forEach(type=>{
    const box=document.getElementById(`${type}-box-${k.id}`); if(!box) return;
    const s=timerState(k.id,type);
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

// ── meal finished: medal by how long the timer ran ──
// ≤ 20 min → gold (1 star) · ≤ 25 min → silver (½ star) · timer ran out → no star.
// Under 5 minutes gets no star either, so a quick start-and-finish can't earn one.
const MEAL_GOLD_SECS=20*60, MEAL_MIN_SECS=5*60;
function finishMeal(kid){
  const s=timerState(kid,'meal'), name=kidById(kid)?.name||'';
  const used=s.full-s.secs; if(used<=0) return;
  const mins=Math.max(1,Math.round(used/60));
  let medal=null;
  if(!s.expired && used>=MEAL_MIN_SECS) medal = used<=MEAL_GOLD_SECS ? 'gold' : 'silver';
  store.put('timers',kid,{ meal:{ endsAt:null, remaining:null, by:DEVICE_ID } });
  if(medal){
    store.add('stars',{ kid, ts:Date.now(), n:medal==='gold'?1:SILVER_VALUE, src:'meal', medal, mins, by:currentWho?.id||null });
    speak(`${medal==='gold'?'Gold':'Silver'} star, ${name}! You finished your food in ${mins} minutes.`);
    showToast(`${medal==='gold'?'🥇':'🥈'} ${name} finished in ${mins} min`);
  } else if(s.expired){
    speak(`Well done for finishing, ${name}. Try to beat the timer next time!`);
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
  showToast(`${kidById(kid)?.name||''}'s ${type} timer reset`);
}

// Timer reminders are spoken only on devices where "Audio reminders" is ticked
// (e.g. the one next to the kids), so the whole house doesn't talk at once.
// It's a per-device setting and starts unticked.
function timerAudioOn(){ return lsGet('kq_timer_audio')==='1'; }
function setTimerAudio(on){
  lsSet('kq_timer_audio', on?'1':'0');
  // speaking here also unlocks speech for later reminders on browsers that need a tap first
  if(on) speak('Timer reminders are on for this device.');
  showToast(on?'🔊 Timer reminders on for this device':'🔇 Timer reminders off for this device');
}

const lastSecs={};
function timerTick(){
  updateTimerDisplays();
  KIDS.forEach(k=>['meal','tv'].forEach(type=>{
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
    if(secs>300){ if(rem===0&&mins>0&&mins%5===0) speak(`${name}, ${mins} minutes left to finish your food.`); }
    else if(secs>0){ if(rem===0&&mins>0) speak(`${name}, ${mins} minute${mins>1?'s':''} left to finish your food.`); if(secs===30) speak(`${name}, 30 seconds left!`); }
    else speak(`Time is up for ${name}, meal time is finished!`);
  } else {
    if(secs===600) speak(`${name}, 10 minutes of TV time left.`);
    if(secs===0)   speak(`Time is up for ${name}! Please turn off the TV or pass the remote.`);
  }
}
