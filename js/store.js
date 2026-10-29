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
// Which family this device belongs to: 'home' (the first family) unless the
// signed-in login says otherwise (users/{uid} → familyId, set in startApp).
let FAMILY_ID = 'home';
// Story packs this family sees (families/{id}.packs). New families start with none.
let FAMILY_PACKS = ['home'];
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
    watchFamily(cb){ setTimeout(()=>cb({ packs:['home'] }),0); return ()=>{}; },
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
  const ref=(...path)=>fs.doc(db,...path);
  const warn=e=>{ console.error('sync',e); };
  const famKey=()=>'kq_family_'+auth.currentUser.uid;
  // One of the original two logins, opening this version for the first time:
  // record it as an owner of 'home' (the rules still let these two in by UID).
  async function joinHome(uid){
    try{
      const fam=await fs.getDoc(ref('families','home'));
      const b=fs.writeBatch(db);
      if(!fam.exists()) b.set(ref('families','home'),{ name:'Home', createdBy:uid, created:Date.now(), packs:['home'] });
      b.set(ref('families','home','members',uid),{ role:'owner', joined:Date.now(), via:'migrated' });
      b.set(ref('users',uid),{ familyId:'home' });
      await b.commit();
      return true;
    }catch(e){
      if(e.code==='permission-denied') return false; // a newer login with no family yet
      throw e;
    }
  }
  return {
    kind:'firebase',
    currentUser(){ return new Promise(res=>{ const stop=authMod.onAuthStateChanged(auth,u=>{ stop(); res(u); }); }); },
    email(){ return auth.currentUser?.email || ''; },
    signIn(email,pw){ return authMod.signInWithEmailAndPassword(auth,email,pw); },
    signUp(email,pw){ return authMod.createUserWithEmailAndPassword(auth,email,pw); },
    // Leaves the family on this device and wipes its offline copy of the data
    async signOut(){
      try{ localStorage.removeItem(famKey()); }catch{}
      await authMod.signOut(auth);
      await fs.terminate(db);
      try{ await fs.clearIndexedDbPersistence(db); }catch(e){ console.warn('cache',e); } // fails while another KidQuest tab is open
    },
    // The family this login belongs to, or null if it has none yet
    async findFamily(){
      const uid=auth.currentUser.uid;
      try{
        const u=await fs.getDoc(ref('users',uid));
        if(u.exists()){ lsSet(famKey(),u.data().familyId); return u.data().familyId; }
      }catch(e){
        if(e.code==='permission-denied') return 'home'; // older rules: only the original logins get in, to 'home'
        // offline: the family this device used last. Only the original devices can
        // have none saved (new families save it when they sign in), so that means 'home'.
        return lsGet(famKey()) || 'home';
      }
      if(await joinHome(uid)){ lsSet(famKey(),'home'); return 'home'; }
      // another device with this login may have just joined 'home' at the same moment
      const again=await fs.getDoc(ref('users',uid));
      if(again.exists()){ lsSet(famKey(),again.data().familyId); return again.data().familyId; }
      return null;
    },
    // Is this pilot code real and still unused? 'ok' | 'missing' | 'used'
    async checkPilotCode(code){
      const c=await fs.getDoc(ref('pilotCodes',code));
      return !c.exists() ? 'missing' : c.data().usedBy ? 'used' : 'ok';
    },
    // New family: family doc, me as owner, my pointer to it, and the pilot code used up — all or nothing
    async createFamily({name,code,consentVersion}){
      const uid=auth.currentUser.uid, now=Date.now();
      const fid=fs.doc(fs.collection(db,'families')).id;
      const b=fs.writeBatch(db);
      b.set(ref('families',fid),{ name, createdBy:uid, created:now, packs:[], pilotCode:code, consent:{ by:uid, at:now, version:consentVersion } });
      b.set(ref('families',fid,'members',uid),{ role:'owner', joined:now, via:'create' });
      b.set(ref('users',uid),{ familyId:fid });
      b.update(ref('pilotCodes',code),{ usedBy:uid, family:fid });
      await b.commit();
      lsSet(famKey(),fid);
      return fid;
    },
    // A single-use code that lets one more family sign up (made from the 'home' family)
    async makePilotCode(){
      const abc='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
      const code=[...crypto.getRandomValues(new Uint8Array(10))].map(n=>abc[n%abc.length]).join('');
      await fs.setDoc(ref('pilotCodes',code),{ by:auth.currentUser.uid, created:Date.now(), usedBy:null, family:null });
      return code;
    },
    watchFamily(cb){
      return fs.onSnapshot(ref('families',FAMILY_ID),d=>cb(d.data()||{}),e=>{ console.warn('family',e); cb({}); });
    },
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
// charts:  id `${kid}_${week}` → { kid, week, cells:{ 'rowId_day':'gold'|'silver'|'no'|'' }   (no = ✗ not done) }
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
  unwatch.push(store.watchFamily(f=>{
    const packs = f.packs || (FAMILY_ID==='home' ? ['home'] : []);
    if(String(packs)===String(FAMILY_PACKS)) return; // don't redraw (and stop) a playing story for nothing
    FAMILY_PACKS = packs; renderStories();
  }));
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
