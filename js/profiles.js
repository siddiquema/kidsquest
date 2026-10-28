// KidQuest — profiles, who's here, PINs, device sign-in, family setup and editing
// Plain script: shares globals with the other files; load order is set in index.html.

// ═══════════════════════════════════════
//  PROFILES  (kids + parents, synced; set during onboarding)
// ═══════════════════════════════════════
const EMOJI_POOL = ['🦁','🦋','🐬','🦊','🐼','🐨','🦄','🐸','🐯','🐧'];
const COLOR_POOL = ['#f4a261','#e76f9a','#4ecdc4','#a78bfa','#06d6a0','#38bdf8','#ffd166','#fb923c','#f472b6','#60a5fa'];
const PARENT_EMOJI = ['👩','👨'];
const PARENT_COLOR = ['#f472b6','#60a5fa'];

// Each profile: { id, type:'kid'|'parent', name, age, emoji, color, order, pinHash }
// Kids keep a permanent id, so stars/charts/timers stay with them when others are removed.
let PROFILES = {};
let KIDS = [], PARENTS = [];
function rebuildProfiles(){
  const list=Object.entries(PROFILES).map(([id,p])=>({...p,id})).sort((a,b)=>(a.order??0)-(b.order??0));
  KIDS=list.filter(p=>p.type==='kid');
  PARENTS=list.filter(p=>p.type==='parent');
}
function kidById(id){ return KIDS.find(k=>k.id===id); }
// First pool slot not used by any current kid (for newly added kids)
function freePoolIdx(used){
  const i=EMOJI_POOL.findIndex(e=>!used.includes(e));
  return i<0 ? used.length%EMOJI_POOL.length : i;
}

// ═══════════════════════════════════════
//  WHO'S HERE  (a PIN for each person; kids get their own screen)
// ═══════════════════════════════════════
let currentWho = null;      // { id, type }
let pinTarget = null;       // profile whose PIN is being typed
let pinEntry = '';
let pinMode = 'unlock';     // 'unlock' | 'setup' | 'confirm'
let pinFirstEntry = '';     // holds first PIN while choosing a new one

function isParent(){ return currentWho?.type==='parent'; }

// Salted with the profile id so two people with the same PIN don't share a hash
async function hashPin(id,pin){
  const text=`kq:${id}:${pin}`;
  if(window.crypto?.subtle){
    const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
    return 's'+[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  let h=0; for(let i=0;i<text.length;i++){ h=((h<<5)-h)+text.charCodeAt(i); h|=0; }
  return 'h'+h;
}

function showWho(){
  currentWho=null; ssSet('kq_who',null);
  showWhoPick();
  document.getElementById('lockScreen').classList.add('show');
  applyRole();
}

function showWhoPick(){
  pinTarget=null; pinEntry='';
  document.getElementById('whoPin').style.display='none';
  document.getElementById('whoPick').style.display='block';
  renderWhoGrid();
}

function renderWhoGrid(){
  document.getElementById('whoGrid').innerHTML=[...KIDS,...PARENTS].map(p=>`
    <button class="who-tile" style="--kc:${p.color}" onclick="pickWho('${p.id}')">
      <span class="who-emoji">${p.emoji}</span>
      <span class="who-name">${esc(p.name)}</span>
    </button>`).join('');
}

// After every PIN_TRIES wrong PINs on this device, that person's PIN waits a while
// (1 min, then 2, 3…), so a PIN can't be found by trying them all.
const PIN_TRIES=5, PIN_WAIT=60*1000;
function pinFails(id){ try{ return JSON.parse(lsGet('kq_pinfail_'+id)||'null')||{n:0,until:0}; }catch{ return {n:0,until:0}; } }
function pinWaitSecs(id){ return Math.max(0,Math.ceil((pinFails(id).until-Date.now())/1000)); }
function notePinFail(id){
  const f=pinFails(id); f.n++;
  if(f.n%PIN_TRIES===0) f.until=Date.now()+PIN_WAIT*(f.n/PIN_TRIES);
  lsSet('kq_pinfail_'+id,JSON.stringify(f));
}
function clearPinFails(id){ try{ localStorage.removeItem('kq_pinfail_'+id); }catch{} }
function waitMsg(id){ const s=pinWaitSecs(id); return `Too many tries — wait ${s>90?Math.ceil(s/60)+' minutes':s+' seconds'}`; }

function pickWho(id){
  const p=PROFILES[id]; if(!p) return;
  if(!p.pinHash){ enterAs(id); return; }
  pinTarget={...p,id};
  pinMode='unlock'; pinEntry=''; pinFirstEntry='';
  document.getElementById('whoPick').style.display='none';
  document.getElementById('whoPin').style.display='block';
  document.getElementById('pwRow').style.display='none';
  document.getElementById('pinPad').style.display='';
  document.getElementById('pinForgot').style.display='block';
  if(pinWaitSecs(id)) setLockText(p.emoji, p.name, waitMsg(id), true);
  else setLockText(p.emoji, p.name, 'Enter your PIN');
  updatePinDots();
}

function enterAs(id){
  const p=PROFILES[id]; if(!p) return;
  currentWho={ id, type:p.type }; ssSet('kq_who',id);
  document.getElementById('lockScreen').classList.remove('show');
  chartKid=null;
  renderAll();
  showToast(`👋 Hi ${p.name}!`);
}

function lockApp(){ showWho(); }

function setLockText(icon,title,sub,isErr){
  document.getElementById('lockIcon').textContent=icon;
  document.getElementById('lockTitle').textContent=title;
  const s=document.getElementById('lockSub');
  s.textContent=sub;
  s.classList.toggle('err', !!isErr);
}

function updatePinDots(){
  document.querySelectorAll('.pin-dot').forEach((d,i)=>{
    d.classList.toggle('filled', i<pinEntry.length);
  });
}

function pinPress(n){
  if(pinEntry.length>=4) return;
  if(pinMode==='unlock' && pinTarget && pinWaitSecs(pinTarget.id)){ pinError(waitMsg(pinTarget.id)); return; }
  pinEntry+=n;
  updatePinDots();
  if(pinEntry.length===4){ setTimeout(handlePinComplete,180); }
}

function pinDelete(){
  pinEntry=pinEntry.slice(0,-1);
  updatePinDots();
}

async function handlePinComplete(){
  if(!pinTarget) return;
  if(pinMode==='unlock'){
    if(await hashPin(pinTarget.id,pinEntry)===pinTarget.pinHash){ clearPinFails(pinTarget.id); enterAs(pinTarget.id); }
    else { notePinFail(pinTarget.id); pinError(pinWaitSecs(pinTarget.id) ? waitMsg(pinTarget.id) : 'Wrong PIN, try again'); }
  } else if(pinMode==='setup'){
    pinFirstEntry=pinEntry; pinEntry='';
    pinMode='confirm';
    setLockText('🔁','Confirm PIN','Enter the same PIN again');
    updatePinDots();
  } else if(pinMode==='confirm'){
    if(pinEntry===pinFirstEntry){
      store.put('profiles',pinTarget.id,{ pinHash: await hashPin(pinTarget.id,pinEntry) });
      clearPinFails(pinTarget.id);
      showToast('🔐 New PIN saved!');
      enterAs(pinTarget.id);
    } else {
      pinMode='setup'; pinFirstEntry='';
      pinError("PINs didn't match, start over");
    }
  }
}

function pinError(msg){
  setLockText(document.getElementById('lockIcon').textContent, document.getElementById('lockTitle').textContent, msg, true);
  const icon=document.getElementById('lockIcon');
  icon.classList.add('shake');
  setTimeout(()=>icon.classList.remove('shake'),400);
  pinEntry='';
  updatePinDots();
}

// Kids ask a parent. A parent proves it's them with the device's KidQuest password
// (on this-device-only mode there is none, so it just asks to confirm).
function forgotPin(){
  if(!pinTarget) return;
  if(pinTarget.type==='kid'){ setLockText(pinTarget.emoji, pinTarget.name, 'Ask Mum or Dad to reset your PIN', true); return; }
  if(store.kind==='firebase'){
    document.getElementById('pinPad').style.display='none';
    document.getElementById('pinForgot').style.display='none';
    document.getElementById('pwRow').style.display='block';
    document.getElementById('pwInput').value='';
    setLockText('🔑', pinTarget.name, 'Enter the KidQuest password this device signed in with');
    document.getElementById('pwInput').focus();
  } else if(confirm('Reset your PIN? Your kids’ stars and charts stay safe.')){
    startNewPin();
  }
}

async function submitPassword(){
  const pw=document.getElementById('pwInput').value;
  if(!pw) return;
  try{
    await store.verifyPassword(pw);
    document.getElementById('pwInput').value='';
    startNewPin();
  }catch(e){
    setLockText('🔑', pinTarget.name, e.code==='auth/network-request-failed'?'No internet — try again when online':'Wrong password', true);
  }
}

function startNewPin(){
  document.getElementById('pwRow').style.display='none';
  document.getElementById('pinPad').style.display='';
  pinMode='setup'; pinEntry=''; pinFirstEntry='';
  setLockText('🆕','New PIN',`Choose a new 4-digit PIN for ${pinTarget.name}`);
  updatePinDots();
}

// Kids see their own screen: no giving stars, no editing, no alarms
function applyRole(){
  const kid=!isParent();
  document.body.classList.toggle('role-kid',kid);
  const who=currentWho && PROFILES[currentWho.id];
  document.getElementById('whoChip').textContent = who ? `${who.emoji} ${who.name}` : '👤';
  const active=document.querySelector('.tab-btn.active');
  if(kid && active?.classList.contains('parent-only')) switchTab('leaderboard',document.querySelector('.tab-btn'));
}

function onProfilesChanged(){
  if(currentWho && !PROFILES[currentWho.id]){ showWho(); return; }
  if(currentWho) currentWho.type=PROFILES[currentWho.id].type;
  if(document.getElementById('lockScreen').classList.contains('show') && !pinTarget) renderWhoGrid();
}

// ═══════════════════════════════════════
//  DEVICE SETUP  (a parent signs this device in once)
// ═══════════════════════════════════════
function showDeviceSetup(){
  document.getElementById('dsName').value = lsGet('kq_device_name') || '';
  document.getElementById('deviceSetup').classList.add('show');
}

async function deviceSignIn(){
  const email=document.getElementById('dsEmail').value.trim();
  const pw=document.getElementById('dsPassword').value;
  const name=document.getElementById('dsName').value.trim();
  const err=document.getElementById('dsError');
  if(!email||!pw||!name){ err.textContent='Please fill in all three boxes'; return; }
  const btn=document.getElementById('dsBtn');
  btn.disabled=true; btn.textContent='Signing in…'; err.textContent='';
  try{
    await store.signIn(email,pw);
    lsSet('kq_device_name',name);
    document.getElementById('dsPassword').value='';
    document.getElementById('deviceSetup').classList.remove('show');
    startApp();
  }catch(e){
    err.textContent = e.code==='auth/network-request-failed' ? 'No internet connection'
      : e.code==='auth/too-many-requests' ? 'Too many tries — wait a few minutes'
      : 'Wrong email or password';
  }finally{
    btn.disabled=false; btn.textContent='Sign in';
  }
}

// ═══════════════════════════════════════
//  FAMILY SETUP  (splash → onboarding → who's here)
// ═══════════════════════════════════════
const PIN_RE=/^\d{4}$/;

// ── splash ──
function showSplash(){ document.getElementById('splash').classList.add('show'); }
function hideSplash(){ document.getElementById('splash').classList.remove('show'); }

// ── onboarding ──
let onbCount = 3;
let obKids = [];
function showOnboarding(){
  onbCount = 3;
  document.getElementById('obCount').textContent = onbCount;
  document.getElementById('obParentInputs').innerHTML='';
  goOnbStep(1);
  document.getElementById('onboarding').classList.add('show');
}
function hideOnboarding(){ document.getElementById('onboarding').classList.remove('show'); }
function goOnbStep(n){
  [1,2,3].forEach(i=>{ document.getElementById('obStep'+i).style.display = n===i?'block':'none'; });
}
function obChangeCount(delta){
  onbCount = Math.max(1, Math.min(10, onbCount+delta));
  document.getElementById('obCount').textContent = onbCount;
}
function obNext(){
  // build name + age + PIN inputs
  const wrap=document.getElementById('obKidInputs');
  wrap.innerHTML='';
  for(let i=0;i<onbCount;i++){
    wrap.innerHTML += `
      <div class="ob-kid-row">
        <div class="ob-kid-emoji">${EMOJI_POOL[i%EMOJI_POOL.length]}</div>
        <input class="ob-input ob-name" type="text" placeholder="Kid ${i+1}'s name" maxlength="20" autocomplete="off">
        <input class="ob-input ob-age" type="number" placeholder="Age" min="1" max="17" inputmode="numeric">
        <input class="ob-input ob-pin" type="password" placeholder="PIN" maxlength="4" inputmode="numeric" autocomplete="off">
      </div>`;
  }
  goOnbStep(2);
}
function cleanAge(v){ let age=parseInt(v,10); if(isNaN(age)||age<1) age=5; return Math.min(age,17); }
function obKidsNext(){
  const rows=[...document.querySelectorAll('#obKidInputs .ob-kid-row')];
  const list=[];
  for(const r of rows){
    const name=r.querySelector('.ob-name'), pin=r.querySelector('.ob-pin');
    if(!name.value.trim()){ showToast('Please enter a name for every kid'); name.focus(); return; }
    if(!PIN_RE.test(pin.value)){ showToast('Each kid needs a 4-digit PIN'); pin.focus(); return; }
    list.push({ name:name.value.trim(), age:cleanAge(r.querySelector('.ob-age').value), pin:pin.value });
  }
  obKids=list;
  const wrap=document.getElementById('obParentInputs');
  if(!wrap.children.length){
    wrap.innerHTML=['Mum','Dad'].map((n,i)=>`
      <div class="ob-kid-row">
        <div class="ob-kid-emoji">${PARENT_EMOJI[i]}</div>
        <input class="ob-input ob-name" type="text" value="${n}" maxlength="20" autocomplete="off">
        <input class="ob-input ob-pin" type="password" placeholder="PIN" maxlength="4" inputmode="numeric" autocomplete="off">
      </div>`).join('');
  }
  goOnbStep(3);
}
async function obFinish(){
  const rows=[...document.querySelectorAll('#obParentInputs .ob-kid-row')];
  const parents=[];
  for(const r of rows){
    const name=r.querySelector('.ob-name'), pin=r.querySelector('.ob-pin');
    if(!name.value.trim()) continue; // second parent is optional
    if(!PIN_RE.test(pin.value)){ showToast(`${name.value.trim()} needs a 4-digit PIN`); pin.focus(); return; }
    parents.push({ name:name.value.trim(), pin:pin.value, i:rows.indexOf(r) });
  }
  if(!parents.length){ showToast('At least one parent is needed'); return; }
  let firstParent=null;
  for(const [i,k] of obKids.entries()){
    const id=newId();
    store.put('profiles',id,{ type:'kid', name:k.name, age:k.age, emoji:EMOJI_POOL[i%EMOJI_POOL.length], color:COLOR_POOL[i%COLOR_POOL.length], order:i, pinHash:await hashPin(id,k.pin) },false);
  }
  for(const p of parents){
    const id=newId(); firstParent=firstParent||id;
    store.put('profiles',id,{ type:'parent', name:p.name, emoji:PARENT_EMOJI[p.i], color:PARENT_COLOR[p.i], order:100+p.i, pinHash:await hashPin(id,p.pin) },false);
  }
  hideOnboarding();
  showToast('🎉 Family saved!');
  // wait for the new profiles to arrive from the store, then go straight in as the parent
  const go=()=>{ if(PROFILES[firstParent]) enterAs(firstParent); else setTimeout(go,100); };
  go();
}

// ═══════════════════════════════════════
//  EDIT FAMILY  (kids, parents, PINs, this device's name)
// ═══════════════════════════════════════
// Rows keep their profile id (null = new), so stars and charts stay with each person.
const MAX_KIDS = 10;
let ekKids = [], ekParents = [];

function openEditKids(){
  if(!isParent()) return;
  ekKids    = KIDS.map(k=>({ id:k.id, name:k.name, age:k.age, emoji:k.emoji, color:k.color, pin:'' }));
  ekParents = PARENTS.map(p=>({ id:p.id, name:p.name, emoji:p.emoji, color:p.color, pin:'' }));
  document.getElementById('ekDevice').value = lsGet('kq_device_name') || '';
  renderEditRows();
  document.getElementById('editKids').classList.add('show');
}
function closeEditKids(){ document.getElementById('editKids').classList.remove('show'); }

function ekRowHtml(list,r,i){
  const isKid=list==='ekKids';
  return `
    <div class="ob-kid-row">
      <div class="ob-kid-emoji">${r.emoji}</div>
      <input class="ob-input ob-name" type="text" placeholder="Name" maxlength="20" autocomplete="off"
        oninput="${list}[${i}].name=this.value">
      ${isKid?`<input class="ob-input ob-age" type="number" placeholder="Age" min="1" max="17" inputmode="numeric"
        oninput="${list}[${i}].age=this.value">`:''}
      <input class="ob-input ob-pin" type="password" placeholder="${r.id?'New PIN':'PIN'}" maxlength="4" inputmode="numeric" autocomplete="off"
        oninput="${list}[${i}].pin=this.value">
      <button class="ob-del" onclick="ekRemoveRow('${list}',${i})" title="Remove" ${(isKid?ekKids:ekParents).length<=1?'disabled':''}>✕</button>
    </div>`;
}

function renderEditRows(){
  const kw=document.getElementById('ekKidInputs'), pw=document.getElementById('ekParentInputs');
  kw.innerHTML = ekKids.map((r,i)=>ekRowHtml('ekKids',r,i)).join('');
  pw.innerHTML = ekParents.map((r,i)=>ekRowHtml('ekParents',r,i)).join('');
  // set values via DOM so names never need HTML-escaping in the template
  kw.querySelectorAll('.ob-name').forEach((el,i)=>el.value=ekKids[i].name);
  kw.querySelectorAll('.ob-age').forEach((el,i)=>el.value=ekKids[i].age);
  pw.querySelectorAll('.ob-name').forEach((el,i)=>el.value=ekParents[i].name);
  kw.querySelectorAll('.ob-pin').forEach((el,i)=>el.value=ekKids[i].pin);
  pw.querySelectorAll('.ob-pin').forEach((el,i)=>el.value=ekParents[i].pin);
  document.getElementById('ekAddBtn').disabled = ekKids.length>=MAX_KIDS;
}

function ekAddRow(){
  if(ekKids.length>=MAX_KIDS) return;
  const p=freePoolIdx(ekKids.map(r=>r.emoji));
  ekKids.push({ id:null, name:'', age:'', emoji:EMOJI_POOL[p], color:COLOR_POOL[p], pin:'' });
  renderEditRows();
  const names=document.querySelectorAll('#ekKidInputs .ob-name');
  names[names.length-1].focus();
}

function ekRemoveRow(list,i){
  const rows = list==='ekKids' ? ekKids : ekParents;
  if(rows.length<=1) return;
  const r=rows[i];
  if(r.id && !confirm(`Remove ${r.name||'this person'}? ${list==='ekKids'?'They leave the Star Board, timers and alarms when you save.':'They will no longer be able to open the parent screens.'}`)) return;
  rows.splice(i,1);
  renderEditRows();
}

async function saveEditKids(){
  for(const [rows,sel] of [[ekKids,'#ekKidInputs'],[ekParents,'#ekParentInputs']]){
    const names=document.querySelectorAll(sel+' .ob-name'), pins=document.querySelectorAll(sel+' .ob-pin');
    for(let i=0;i<rows.length;i++){
      if(!String(rows[i].name).trim()){ showToast('Please enter a name for everyone'); names[i].focus(); return; }
      if((rows[i].pin || !rows[i].id) && !PIN_RE.test(rows[i].pin)){ showToast(`${rows[i].name.trim()} needs a 4-digit PIN`); pins[i].focus(); return; }
    }
  }
  const keep=new Set();
  for(const [i,r] of ekKids.entries()){
    const id=r.id||newId(); keep.add(id);
    const data={ type:'kid', name:r.name.trim(), age:cleanAge(r.age), emoji:r.emoji, color:r.color, order:i };
    if(r.pin) data.pinHash=await hashPin(id,r.pin);
    store.put('profiles',id,data);
  }
  for(const [i,r] of ekParents.entries()){
    const id=r.id||newId(); keep.add(id);
    const data={ type:'parent', name:r.name.trim(), emoji:r.emoji, color:r.color, order:100+i };
    if(r.pin) data.pinHash=await hashPin(id,r.pin);
    store.put('profiles',id,data);
  }
  // removed people: drop their profile and live timer/alarm (old stars just stop showing)
  for(const id in PROFILES){
    if(keep.has(id)) continue;
    store.remove('profiles',id); store.remove('timers',id); store.remove('alarms',id);
  }
  const dev=document.getElementById('ekDevice').value.trim();
  if(dev){ lsSet('kq_device_name',dev); registerDevice(); }
  closeEditKids();
  showToast('✅ Family updated');
}
