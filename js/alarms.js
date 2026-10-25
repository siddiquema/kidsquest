// KidQuest — wake-up alarms
// Plain script: shares globals with the other files; load order is set in index.html.

let ringAudioCtx=null, ringNodes=[];
let ringingKid=null;


// ═══════════════════════════════════════
//  ALARMS  (each rings only on the device picked for it)
// ═══════════════════════════════════════
function alarmOf(kid){ return { time:'07:00', on:false, device:null, ...(ALARMS[kid]||{}) }; }

function renderAlarms(){
  const devIds=Object.keys(DEVICES);
  document.getElementById('alarmList').innerHTML=KIDS.map(kid=>{
    const a=alarmOf(kid.id);
    const opts=[...devIds, ...(a.device&&!devIds.includes(a.device)?[a.device]:[])]
      .map(id=>`<option value="${id}" ${id===a.device?'selected':''}>${esc(devName(id))}</option>`).join('');
    return `
    <div class="alarm-card">
      <div class="alarm-top">
        <div class="alarm-avatar" style="--kc:${kid.color};border-color:${kid.color}">${kid.emoji}</div>
        <div class="alarm-name" style="color:${kid.color}">${esc(kid.name)}</div>
        <div class="alarm-status-dot ${a.on?'on':''}"></div>
      </div>
      <div class="alarm-time-row">
        <input type="time" class="alarm-time-input" value="${esc(a.time)}"
          onchange="saveAlarmTime('${kid.id}',this.value)">
        <button class="alarm-toggle ${a.on?'on':''}" onclick="toggleAlarm('${kid.id}')"></button>
      </div>
      ${devIds.length>1 || (a.device && a.device!==DEVICE_ID) ? `
      <label class="alarm-device-row">Rings on
        <select class="alarm-device" onchange="setAlarmDevice('${kid.id}',this.value)">
          ${a.device?'':'<option value="" selected>Choose a device</option>'}${opts}
        </select>
      </label>` : ''}
      <div class="alarm-label">${a.on?`Alarm ON ✓ · rings on ${esc(devName(a.device))}`:'Alarm OFF'}</div>
    </div>`;
  }).join('');
}

function saveAlarmTime(kid,val){
  store.put('alarms',kid,{ time:val });
  showToast(`${kidById(kid)?.name}'s alarm set to ${val}`);
}

function toggleAlarm(kid){
  const a=alarmOf(kid), on=!a.on;
  // turning on with no device picked yet → ring here
  store.put('alarms',kid,{ time:a.time, on, device: a.device||DEVICE_ID });
  const name=kidById(kid)?.name;
  showToast(on?`⏰ ${name}'s alarm is on!`:`${name}'s alarm off`);
}

function setAlarmDevice(kid,device){ if(device) store.put('alarms',kid,{ device }); }

// Kids whose alarms fired while another was still ringing wait here
let ringQueue=[];
let lastAlarmMinute='';

function checkAlarms(){
  const now=new Date();
  const hhmm=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  if(hhmm===lastAlarmMinute) return; // check each minute once, whatever second we land on
  lastAlarmMinute=hhmm;
  KIDS.forEach(k=>{
    const a=alarmOf(k.id);
    if(a.on && a.time===hhmm && a.device===DEVICE_ID && k.id!==ringingKid && !ringQueue.includes(k.id)){
      if(ringingKid===null) ringAlarm(k.id); else ringQueue.push(k.id);
    }
  });
}

function ringAlarm(id){
  const kid=kidById(id); if(!kid) return;
  ringingKid=id;
  document.getElementById('ringEmoji').textContent=kid.emoji;
  document.getElementById('ringName').textContent=`Wake up, ${kid.name}! 🌅`;
  document.getElementById('ringOverlay').classList.add('show');
  if(!ringAudioCtx) startRingSound();
  // speech after short delay so audio context is warm
  setTimeout(()=>{
    speak(`Wake up ${kid.name}! Good morning! Time to start your wonderful day!`);
  },600);
}

function dismissAlarm(){
  window.speechSynthesis&&window.speechSynthesis.cancel();
  if(ringingKid!==null){
    // turn alarm off after firing so it doesn't re-ring tomorrow
    store.put('alarms',ringingKid,{ on:false });
    ringingKid=null;
  }
  // next kid in line rings straight away
  if(ringQueue.length){ ringAlarm(ringQueue.shift()); return; }
  stopRingSound();
  document.getElementById('ringOverlay').classList.remove('show');
}

// ═══════════════════════════════════════
//  RING SOUND (Web Audio beeping)
// ═══════════════════════════════════════
function startRingSound(){
  try{
    ringAudioCtx=new (window.AudioContext||window.webkitAudioContext)();
    playRingPattern();
  }catch(e){}
}

function playRingPattern(){
  if(!ringAudioCtx||ringAudioCtx.state==='closed') return;
  const beepSeq=[880,0,880,0,660,0,0,0]; // freq 0 = silence
  let t=ringAudioCtx.currentTime;
  ringNodes=[];
  beepSeq.forEach(freq=>{
    if(freq>0){
      const osc=ringAudioCtx.createOscillator();
      const gain=ringAudioCtx.createGain();
      osc.type='sine'; osc.frequency.value=freq;
      gain.gain.setValueAtTime(0.4,t);
      gain.gain.exponentialRampToValueAtTime(0.001,t+0.18);
      osc.connect(gain); gain.connect(ringAudioCtx.destination);
      osc.start(t); osc.stop(t+0.2);
      ringNodes.push(osc);
    }
    t+=0.22;
  });
  // repeat
  ringNodes._tmr=setTimeout(()=>{
    if(ringingKid!==null) playRingPattern();
  }, beepSeq.length*220+300);
}

function stopRingSound(){
  if(ringNodes._tmr) clearTimeout(ringNodes._tmr);
  ringNodes.forEach(n=>{ try{n.stop();}catch(e){} });
  ringNodes=[];
  if(ringAudioCtx){ try{ringAudioCtx.close();}catch(e){} ringAudioCtx=null; }
}
