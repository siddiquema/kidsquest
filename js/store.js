// KidQuest — storage (Firebase or this device), device id, synced state
// Plain script: shares globals with the other files; load order is set in index.html.

// ═══════════════════════════════════════
//  STORE  — Firebase when configured, otherwise this device only
// ═══════════════════════════════════════
// Both stores share one small API, so the rest of the app doesn't care which is in use:
//   watch(col, since, cb)   since = {field, min} or null; cb(docsById, fromCache)
//   put(col, id, data, merge=true) · add(col, data) · remove(col, id)
// Writes show up locally straight away (even offline) and reach other devices when online.
const FB_CONFIG  = window.KQ_FIREBASE_CONFIG || null;
const FB_VERSION = '10.14.1';
const FAMILY_ID  = 'home';
let store = null;

function isPlainObj(v){ return !!v && typeof v==='object' && !Array.isArray(v); }
function deepMerge(a,b){
  const out={...a};
  for(const k in b) out[k] = isPlainObj(b[k])&&isPlainObj(a[k]) ? deepMerge(a[k],b[k]) : b[k];
  return out;
}

function makeLocalStore(){
  const KEY='kq_db';
  let db; try{ db=JSON.parse(lsGet(KEY)||'{}')||{}; }catch{ db={}; }
  const subs=[];
  const snapshot=(col,since)=>{
    const m={}, c=db[col]||{};
    for(const id in c) if(!since || c[id][since.field]>=since.min) m[id]=c[id];
    return m;
  };
  const emit=col=>subs.filter(s=>s.col===col).forEach(s=>s.cb(snapshot(col,s.since),false));
  const persist=col=>{ lsSet(KEY,JSON.stringify(db)); emit(col); };
  // keep other tabs on this device in step
  window.addEventListener('storage',e=>{
    if(e.key!==KEY) return;
    try{ db=JSON.parse(e.newValue||'{}')||{}; }catch{ return; }
    [...new Set(subs.map(s=>s.col))].forEach(emit);
  });
  return {
    kind:'local',
    watch(col,since,cb){
      const s={col,since,cb}; subs.push(s);
      setTimeout(()=>cb(snapshot(col,since),false),0);
      return ()=>{ const i=subs.indexOf(s); if(i>=0) subs.splice(i,1); };
    },
    put(col,id,data,merge=true){
      db[col]=db[col]||{};
      db[col][id] = merge&&db[col][id] ? deepMerge(db[col][id],data) : {...data};
      persist(col); return Promise.resolve();
    },
    add(col,data){ return this.put(col,newId(),data,false); },
    remove(col,id){ if(db[col]) delete db[col][id]; persist(col); return Promise.resolve(); },
  };
}

async function makeFirebaseStore(){
  const base=`https://www.gstatic.com/firebasejs/${FB_VERSION}/`;
  const [appMod,authMod,fs]=await Promise.all([
    import(base+'firebase-app.js'), import(base+'firebase-auth.js'), import(base+'firebase-firestore.js'),
  ]);
  const app=appMod.initializeApp(FB_CONFIG);
  const auth=authMod.getAuth(app);
  // Offline cache shared by all tabs: keeps working with no internet and syncs later
  const db=fs.initializeFirestore(app,{ localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
  const col=c=>fs.collection(db,'families',FAMILY_ID,c);
  const warn=e=>{ console.error('sync',e); };
  return {
    kind:'firebase',
    currentUser(){ return new Promise(res=>{ const stop=authMod.onAuthStateChanged(auth,u=>{ stop(); res(u); }); }); },
    signIn(email,pw){ return authMod.signInWithEmailAndPassword(auth,email,pw); },
    // Re-checks the password this device signed in with (to reset a forgotten parent PIN)
    verifyPassword(pw){ return authMod.signInWithEmailAndPassword(auth,auth.currentUser.email,pw); },
    watch(c,since,cb){
      const q = since ? fs.query(col(c), fs.where(since.field,'>=',since.min)) : col(c);
      return fs.onSnapshot(q,{includeMetadataChanges:true},snap=>{
        const m={}; snap.forEach(d=>{ m[d.id]=d.data(); });
        cb(m, snap.metadata.fromCache);
      }, e=>{ warn(e); showToast('⚠️ Sync problem — try reloading'); });
    },
    put(c,id,data,merge=true){ return fs.setDoc(fs.doc(col(c),id),data,{merge}).catch(warn); },
    add(c,data){ return fs.addDoc(col(c),data).catch(warn); },
    remove(c,id){ return fs.deleteDoc(fs.doc(col(c),id)).catch(warn); },
  };
}

// ═══════════════════════════════════════
//  DEVICE  (alarms ring only on the device chosen for them)
// ═══════════════════════════════════════
let DEVICE_ID = lsGet('kq_device');
if(!DEVICE_ID){ DEVICE_ID='d'+newId(); lsSet('kq_device',DEVICE_ID); }
function deviceName(){ return lsGet('kq_device_name') || 'This device'; }
let DEVICES = {};
function registerDevice(){ store.put('devices',DEVICE_ID,{ name:deviceName(), seen:Date.now() }); }
function devName(id){
  if(id===DEVICE_ID) return `${deviceName()} (this one)`;
  return DEVICES[id]?.name || 'another device';
}

// ═══════════════════════════════════════
//  SYNCED STATE
// ═══════════════════════════════════════
// stars:   { kid, ts, n, src:'bonus'|'skill', by }      one record per award
// plans, skilllog: see SKILLS below
// charts:  id `${kid}_${week}` → { kid, week, cells:{ 'rowId_day':'gold'|'silver'|'' } }
// chartrows: id kid → { rows:[{id,label}] }   (see CHART in chart.js)
// timers:  id kid → { meal:{endsAt,remaining,by}, tv:{…} }
// alarms:  id kid → { time, on, device }
// devices: id device → { name, seen }
let STARS={}, CHARTS={}, TIMERS={}, ALARMS={};

// ── time helpers (weeks start on Sunday, local time) ──
function dayStart(d){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
function startOfTodayTs(){ return dayStart(new Date()).getTime(); }
function weekStartDate(offset=0){ const d=dayStart(new Date()); d.setDate(d.getDate()-d.getDay()+offset*7); return d; }
function startOfWeekTs(offset=0){ return weekStartDate(offset).getTime(); }
function ymd(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function weekKey(offset=0){ return ymd(weekStartDate(offset)); }

function starSum(kid,from,to=Infinity){
  let s=0;
  for(const id in STARS){ const e=STARS[id]; if(e.kid===kid && e.ts>=from && e.ts<to) s+=e.n||1; }
  return s;
}

let unwatch=[], watchWeek='';
// (Re)subscribe to everything. Star and chart queries only fetch this week and last week.
function startWatches(onReady){
  unwatch.forEach(u=>u&&u()); unwatch=[];
  watchWeek=weekKey();
  let ready=false;
  unwatch.push(store.watch('profiles',null,(m,fromCache)=>{
    PROFILES=m; rebuildProfiles();
    // a new device's first answer may come from an empty cache — wait for the server
    if(!ready){ if(fromCache && !Object.keys(m).length) return; ready=true; onReady&&onReady(); }
    else onProfilesChanged();
    scheduleRender();
  }));
  unwatch.push(store.watch('stars',  {field:'ts',  min:startOfWeekTs(-1)}, m=>{ STARS=m;  scheduleRender(); }));
  unwatch.push(store.watch('charts', {field:'week',min:weekKey(-1)},       m=>{ CHARTS=m; scheduleRender(); }));
  unwatch.push(store.watch('chartrows', null, m=>{ CHARTROWS=m; scheduleRender(); }));
  unwatch.push(store.watch('timers', null, m=>{ TIMERS=m;  scheduleRender(); }));
  unwatch.push(store.watch('alarms', null, m=>{ ALARMS=m;  scheduleRender(); }));
  unwatch.push(store.watch('devices',null, m=>{ DEVICES=m; scheduleRender(); }));
  unwatch.push(store.watch('plans',  null, m=>{ PLANS=m;   scheduleRender(); }));
  unwatch.push(store.watch('skilllog',{field:'date',min:weekKey(-1)}, m=>{ SKILLLOG=m; scheduleRender(); }));
}
function checkWeekRollover(){ if(watchWeek && weekKey()!==watchWeek) startWatches(null); }
