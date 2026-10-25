// KidQuest — Skills tab and plan editor
// Plain script: shares globals with the other files; load order is set in index.html.

// ═══════════════════════════════════════
//  SKILLS  (per-kid weekly plan · today's activities · approval → stars)
// ═══════════════════════════════════════
// plans:    id kid → { template, version, updated, days:{sun..sat:[activity]}, daily:[activity], topics:{…} }
//           activity = { id, emoji, title, minutes|null, mode:''|'together'|'separate', instructions }
// skilllog: id `${kid}_${date}_${taskId}` → { kid, date, taskId, title, status:'pending'|'approved', ts, by }
// An approved activity adds 1 star (stars id `skill_${logId}`); every weekday activity
// approved Mon–Fri adds a +2 bonus for that week (stars id `streak_${kid}_${week}`).
const DAY_KEYS = ['sun','mon','tue','wed','thu','fri','sat'];
const WEEKDAYS = ['mon','tue','wed','thu','fri'];
const SKILL_STAR = 1, FULL_WEEK_BONUS = 2;
let PLANS = {}, SKILLLOG = {};

function todayKey(){ return ymd(new Date()); }
function planFor(kid){ return PLANS[kid]; }
function fillTopics(text,topics){ return String(text||'').replace(/\{(\w+)\}/g,(m,k)=>topics?.[k] || '…'); }
function logId(kid,date,taskId){ return `${kid}_${date}_${taskId}`; }
function logFor(kid,date,taskId){ return SKILLLOG[logId(kid,date,taskId)]; }

// Today's list: the day's activities, then the every-day ones
function todaysActivities(kid){
  const p=planFor(kid); if(!p) return [];
  const day=(p.days?.[DAY_KEYS[new Date().getDay()]]||[]).map(a=>({...a,daily:false}));
  const daily=(p.daily||[]).map(a=>({...a,daily:true}));
  return [...day,...daily];
}

function skillStarsWeek(kid,offset=0){
  const from=startOfWeekTs(offset), to=startOfWeekTs(offset+1);
  let s=0;
  for(const id in STARS){ const e=STARS[id]; if(e.kid===kid && e.src==='skill' && e.ts>=from && e.ts<to) s+=e.n||1; }
  return s;
}

// ── running a timed block (on this device only) ──
let skillRun=null; // { kid, taskId, title, endsAt, warned }

function startSkillTimer(kid,taskId){
  const a=todaysActivities(kid).find(x=>x.id===taskId); if(!a?.minutes) return;
  skillRun={ kid, taskId, title:a.title, endsAt:Date.now()+a.minutes*60000, warned:false };
  speak(`${a.title} time! ${a.minutes} minutes.`);
  renderSkills();
}
function stopSkillTimer(){ skillRun=null; renderSkills(); }

function skillTick(){
  if(!skillRun) return;
  const left=Math.max(0,Math.ceil((skillRun.endsAt-Date.now())/1000));
  const el=document.getElementById('skrun-'+skillRun.kid+'-'+skillRun.taskId);
  if(el) el.textContent=mmss(left);
  if(left<=60 && !skillRun.warned && left>0){ skillRun.warned=true; speak('One minute left.'); }
  if(left>0) return;
  const {kid,taskId}=skillRun, name=kidById(kid)?.name||'';
  skillRun=null;
  speak(`Time's up, ${name}! Tap Done when you've finished.`);
  // point to the next timed block that isn't done yet
  const list=todaysActivities(kid), i=list.findIndex(x=>x.id===taskId);
  const next=list.slice(i+1).find(x=>x.minutes && !logFor(kid,todayKey(),x.id));
  if(next) speak(`Next: ${next.title}, ${next.minutes} minutes. Tap start when you're ready.`);
  renderSkills();
}

// ── done → approve → stars ──
function markSkillDone(kid,taskId){
  const a=todaysActivities(kid).find(x=>x.id===taskId); if(!a) return;
  const date=todayKey(), id=logId(kid,date,taskId), name=kidById(kid)?.name||'';
  if(skillRun?.kid===kid && skillRun.taskId===taskId) skillRun=null;
  if(isParent()){
    approveLog(id,{ kid, date, taskId, title:a.title });
  } else {
    store.put('skilllog',id,{ kid, date, taskId, title:a.title, status:'pending', ts:Date.now(), by:currentWho?.id||null },false);
    speak(`Great job, ${name}! Ask Mum or Dad to check it.`);
    showToast('✋ Waiting for Mum or Dad');
  }
}

// Parents approve (or tick directly). The star is keyed to the log, so approving twice gives one star.
function approveLog(id,base){
  if(!isParent()) return;
  const e={ ...(SKILLLOG[id]||{}), ...(base||{}) };
  const name=kidById(e.kid)?.name||'';
  const ts=dateTs(e.date);
  store.put('skilllog',id,{ ...e, status:'approved', ts, by:currentWho.id },false);
  store.put('stars','skill_'+id,{ kid:e.kid, ts, n:SKILL_STAR, src:'skill', task:e.taskId, by:currentWho.id },false);
  SKILLLOG[id]={ ...e, status:'approved', ts }; // so the week check below sees it straight away
  checkFullWeek(e.kid,e.date);
  speak(`Well done ${name}! One more star!`);
  showToast(`⭐ +1 for ${name}`);
}

function undoLog(id){
  const e=SKILLLOG[id]; if(!e) return;
  if(!isParent()){
    if(e.status!=='pending' || e.kid!==currentWho?.id) return; // kids can only take back their own unapproved tick
  } else if(e.status==='approved' && !confirm(`Undo "${e.title}" for ${kidById(e.kid)?.name}? The star is taken back.`)) return;
  store.remove('skilllog',id);
  store.remove('stars','skill_'+id);
  delete SKILLLOG[id];
  checkFullWeek(e.kid,e.date);
}

// local midday of a YYYY-MM-DD date, so the star lands on the right day and week
function dateTs(date){ const [y,m,d]=date.split('-').map(Number); return new Date(y,m-1,d,12).getTime(); }

// +2 bonus when every weekday activity Mon–Fri of that week is approved
function checkFullWeek(kid,date){
  const p=planFor(kid); if(!p) return;
  const day=new Date(dateTs(date)); day.setDate(day.getDate()-day.getDay()); // that week's Sunday
  const week=ymd(day), sid=`streak_${kid}_${week}`;
  let any=false, all=true;
  WEEKDAYS.forEach((k,i)=>{
    const d=new Date(day); d.setDate(d.getDate()+i+1);
    (p.days?.[k]||[]).forEach(a=>{ any=true; if(logFor(kid,ymd(d),a.id)?.status!=='approved') all=false; });
  });
  if(any && all){
    if(!STARS[sid]){
      store.put('stars',sid,{ kid, ts:dateTs(date), n:FULL_WEEK_BONUS, src:'skill', task:'full-week' },false);
      speak(`Amazing, ${kidById(kid)?.name}! Every weekday done. Two bonus stars!`);
    }
  } else if(STARS[sid]) store.remove('stars',sid);
}

// ── Skills tab ──
function renderSkills(){
  const wrap=document.getElementById('skillsList'); if(!wrap) return;
  const today=todayKey();
  wrap.innerHTML=visibleKids().map(k=>{
    const p=planFor(k.id);
    const week=skillStarsWeek(k.id), last=skillStarsWeek(k.id,-1);
    const head=`
      <div class="sk-head">
        <div class="kid-block-avatar" style="border-color:${k.color}">${k.emoji}</div>
        <div class="sk-name" style="color:${k.color}">${esc(k.name)}</div>
        <div class="sk-week">⭐ ${fmtStars(week)} this week<br><span>last week ${fmtStars(last)}</span></div>
        ${p?`<button class="sk-edit parent-only" onclick="openPlanEditor('${k.id}')" title="Edit plan">✏️</button>`:''}
      </div>`;
    if(!p){
      return `<div class="sk-card" style="--kc:${k.color}">${head}
        <div class="sk-empty parent-only">
          <div>Choose a starting plan for ${esc(k.name)}:</div>
          <!-- one button per plan: a dropdown here closed itself whenever synced data redrew the tab -->
          <div class="sk-tpls">
            ${Object.entries(PLAN_TEMPLATES).map(([key,t])=>`<button class="sk-tpl" onclick="assignPlan('${k.id}','${key}')">${esc(t.label)}</button>`).join('')}
          </div>
        </div>
        <div class="sk-empty kid-only">No plan yet — ask Mum or Dad.</div>
      </div>`;
    }
    const items=todaysActivities(k.id);
    const rows=items.map(a=>{
      const log=logFor(k.id,today,a.id);
      const running=skillRun?.kid===k.id && skillRun.taskId===a.id;
      const badge=[a.minutes?`${a.minutes} min`:'', a.mode==='together'?'Together':a.mode==='separate'?'Just me':'', a.daily?'Every day':''].filter(Boolean)
        .map(b=>`<span class="sk-badge">${b}</span>`).join('');
      const id=logId(k.id,today,a.id);
      let action;
      if(log?.status==='approved')      action=`<button class="sk-done ok" onclick="undoLog('${id}')" title="Tap to undo">✓ Done</button>`;
      else if(log?.status==='pending')  action=`<span class="sk-wait">✋ Waiting</span>
        <button class="sk-done parent-only" onclick="approveLog('${id}')">Approve</button>
        <button class="sk-x" onclick="undoLog('${id}')" title="Not yet">✕</button>`;
      else action=`${a.minutes ? (running
          ? `<button class="tc-btn tc-start sk-timer" onclick="stopSkillTimer()">⏹ <span id="skrun-${k.id}-${a.id}">${mmss(Math.max(0,Math.ceil((skillRun.endsAt-Date.now())/1000)))}</span></button>`
          : `<button class="tc-btn tc-start" onclick="startSkillTimer('${k.id}','${a.id}')">▶ Start</button>`) : ''}
        <button class="sk-done" onclick="markSkillDone('${k.id}','${a.id}')">Done</button>`;
      return `
        <div class="sk-row ${log?.status==='approved'?'is-done':''}">
          <div class="sk-emoji">${esc(a.emoji)}</div>
          <button class="sk-body sk-open" onclick="openSkillHelp('${k.id}','${a.id}')" title="How to do it">
            <div class="sk-title">${esc(a.title)} ${badge}</div>
            <div class="sk-instr">${esc(fillTopics(a.instructions,p.topics))}</div>
            <div class="sk-how">❓ How do I do it?</div>
          </button>
          <div class="sk-actions">${action}</div>
        </div>`;
    }).join('') || '<div class="sk-empty">Nothing planned today — enjoy the day! 🌈</div>';
    // older ticks still waiting (yesterday etc.) so they don't get lost
    const older=isParent()?Object.entries(SKILLLOG).filter(([,e])=>e.kid===k.id && e.status==='pending' && e.date!==today):[];
    const olderHtml=older.length?`<div class="sk-older parent-only"><div class="sk-older-h">Waiting from earlier days</div>${older.map(([id,e])=>`
        <div class="sk-row"><div class="sk-body"><div class="sk-title">${esc(e.title)} <span class="sk-badge">${esc(e.date)}</span></div></div>
        <div class="sk-actions"><button class="sk-done" onclick="approveLog('${id}')">Approve</button><button class="sk-x" onclick="undoLog('${id}')">✕</button></div></div>`).join('')}</div>`:'';
    return `<div class="sk-card" style="--kc:${k.color}">${head}${rows}${olderHtml}</div>`;
  }).join('');
}

// ── help screen: what to do, step by step ──
// Kids under 7 hear the steps read out as soon as it opens; older kids get the 🔊 button.
const HELP_AUTO_READ_UNDER = 7;
let helpOpen=null; // { kid, id }

function helpContent(kid,id){
  const p=planFor(kid), a=todaysActivities(kid).find(x=>x.id===id);
  if(!p || !a) return null;
  const h=helpFor(p,a)||{};
  const steps=(h.steps?.length ? h.steps : [a.instructions]).map(s=>fillTopics(s,p.topics)).filter(Boolean);
  return { p, a, steps, examples:h.examples||[], tip:h.tip||'' };
}

function openSkillHelp(kid,id){
  const c=helpContent(kid,id); if(!c) return;
  helpOpen={ kid, id };
  const {a,steps,examples,tip}=c, k=kidById(kid);
  const log=logFor(kid,todayKey(),id);
  const badge=[a.minutes?`${a.minutes} min`:'', a.mode==='together'?'Together':a.mode==='separate'?'Just me':''].filter(Boolean)
    .map(b=>`<span class="sk-badge">${b}</span>`).join('');
  document.getElementById('helpBody').innerHTML=`
    <div class="help-emoji">${esc(a.emoji)}</div>
    <div class="help-title">${esc(a.title)}</div>
    <div class="help-badges">${badge}</div>
    <button class="quiz-say" onclick="readSkillHelp()" title="Read it to me">🔊</button>
    <ol class="help-steps">${steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>
    ${examples.length?`<div class="help-sub">Try these</div><div class="help-examples">${examples.map(e=>`<span>${esc(e)}</span>`).join('')}</div>`:''}
    ${tip?`<div class="help-tip parent-only">💡 For Mum or Dad: ${esc(tip)}</div>`:''}
    <div class="help-btns">
      ${log ? `<div class="help-done">${log.status==='approved'?'✅ Done today — well done!':'✋ Waiting for Mum or Dad to check'}</div>`
            : `${a.minutes?`<button class="onb-next help-start" onclick="closeSkillHelp();startSkillTimer('${kid}','${id}')">▶ Start ${a.minutes}-minute timer</button>`:''}
               <button class="sk-done help-donebtn" onclick="closeSkillHelp();markSkillDone('${kid}','${id}')">Done ✓</button>`}
      <button class="onb-back" onclick="closeSkillHelp()">← Back</button>
    </div>`;
  document.getElementById('skillHelp').classList.add('show');
  if((+k?.age||0) < HELP_AUTO_READ_UNDER) readSkillHelp();
}

function readSkillHelp(){
  if(!helpOpen) return;
  const c=helpContent(helpOpen.kid,helpOpen.id); if(!c) return;
  if(!activeStoryId) window.speechSynthesis?.cancel(); // stop an earlier read-out, but never a story
  speak(`${c.a.title}.`);
  c.steps.forEach((s,i)=>speak(`Step ${i+1}. ${s}`));
}

function closeSkillHelp(){
  helpOpen=null;
  if(!activeStoryId) window.speechSynthesis?.cancel();
  document.getElementById('skillHelp').classList.remove('show');
}

function copyTemplate(key){
  const t=PLAN_TEMPLATES[key]||PLAN_TEMPLATES.empty;
  return JSON.parse(JSON.stringify({ template:key, days:t.days, daily:t.daily, topics:t.topics }));
}
function assignPlan(kid,key){
  if(!isParent() || !PLAN_TEMPLATES[key]) return;
  store.put('plans',kid,{ ...copyTemplate(key), version:1, updated:Date.now() },false);
  showToast(`🌱 Plan set for ${kidById(kid)?.name}`);
}

// ── plan editor (parents) ──
let edKid=null, edPlan=null, edDay='mon';
const ED_DAYS=[...DAY_KEYS.slice(1),'sun','daily'];
const ED_DAY_LABEL={ sun:'Sun', mon:'Mon', tue:'Tue', wed:'Wed', thu:'Thu', fri:'Fri', sat:'Sat', daily:'Every day' };

function openPlanEditor(kid){
  if(!isParent() || !planFor(kid)) return;
  edKid=kid; edPlan=JSON.parse(JSON.stringify(planFor(kid)));
  edPlan.days=edPlan.days||{}; edPlan.daily=edPlan.daily||[]; edPlan.topics=edPlan.topics||{};
  edDay=DAY_KEYS[new Date().getDay()];
  document.getElementById('peTitle').textContent=`${kidById(kid)?.emoji} ${kidById(kid)?.name}'s plan`;
  document.getElementById('peTemplate').innerHTML=Object.entries(PLAN_TEMPLATES).map(([key,t])=>`<option value="${key}">${esc(t.label)}</option>`).join('');
  renderPlanEditor();
  document.getElementById('planEditor').classList.add('show');
}
function closePlanEditor(){ document.getElementById('planEditor').classList.remove('show'); edKid=null; }

function edList(){ return edDay==='daily' ? edPlan.daily : (edPlan.days[edDay] = edPlan.days[edDay]||[]); }

function renderPlanEditor(){
  document.getElementById('peDays').innerHTML=ED_DAYS.map(d=>`
    <button class="ck-tab ${d===edDay?'active':''}" onclick="edDay='${d}';renderPlanEditor()">${ED_DAY_LABEL[d]}
      <span class="pe-count">${(d==='daily'?edPlan.daily:edPlan.days[d]||[]).length}</span></button>`).join('');
  const list=edList();
  const box=document.getElementById('peActs');
  box.innerHTML=list.map((a,i)=>`
    <div class="pe-act">
      <div class="pe-line">
        <input class="ob-input pe-emoji" maxlength="4" data-f="emoji" data-i="${i}">
        <input class="ob-input pe-title" maxlength="40" placeholder="Activity" data-f="title" data-i="${i}">
        <button class="ob-del" onclick="edRemove(${i})" title="Remove">✕</button>
      </div>
      <div class="pe-line">
        <input class="ob-input pe-min" type="number" min="0" max="180" inputmode="numeric" placeholder="min" data-f="minutes" data-i="${i}">
        <select class="ob-input pe-mode" data-f="mode" data-i="${i}">
          <option value="">On their own</option><option value="together">Together</option><option value="separate">Just me (differs per kid)</option>
        </select>
      </div>
      <textarea class="ob-input pe-instr" rows="2" placeholder="What to do" data-f="instructions" data-i="${i}"></textarea>
      <textarea class="ob-input pe-instr" rows="3" placeholder="Help steps, one per line (optional — the built-in help is used if empty)" data-f="steps" data-i="${i}"></textarea>
    </div>`).join('') || '<div class="sk-empty">No activities on this day.</div>';
  // fill values through the DOM so text never needs escaping
  box.querySelectorAll('[data-f]').forEach(el=>{
    const a=list[+el.dataset.i], f=el.dataset.f;
    if(f==='steps'){
      el.value=(a.steps||[]).join('\n');
      el.oninput=()=>{ a.steps=el.value.split('\n').map(x=>x.trim()).filter(Boolean); };
      return;
    }
    el.value = a[f]==null ? '' : a[f];
    el.oninput=()=>{ a[f] = f==='minutes' ? (el.value===''?null:Math.max(0,parseInt(el.value,10)||0)||null) : el.value; };
  });
  TOPIC_FIELDS.forEach(([key])=>{ const el=document.getElementById('pe-'+key); el.value=edPlan.topics[key]||''; el.oninput=()=>{ edPlan.topics[key]=el.value; }; });
}

function edAdd(){ edList().push(act(newId(),'⭐','',null,'')); renderPlanEditor(); }
function edRemove(i){ edList().splice(i,1); renderPlanEditor(); }
function edLoadTemplate(){
  const key=document.getElementById('peTemplate').value;
  if(!confirm(`Replace this plan with "${PLAN_TEMPLATES[key].label}"? Your changes to the plan will be lost (done ticks and stars stay).`)) return;
  edPlan={ ...copyTemplate(key), version:edPlan.version };
  renderPlanEditor();
}
function savePlan(){
  for(const d of ED_DAYS){
    const list=d==='daily'?edPlan.daily:(edPlan.days[d]||[]);
    if(list.some(a=>!String(a.title).trim())){ edDay=d; renderPlanEditor(); showToast(`Give every activity on ${ED_DAY_LABEL[d]} a name`); return; }
    list.forEach(a=>{ a.title=String(a.title).trim(); a.emoji=String(a.emoji||'⭐').trim()||'⭐'; });
  }
  store.put('plans',edKid,{ ...edPlan, version:(edPlan.version||1)+1, updated:Date.now() },false);
  showToast(`✅ ${kidById(edKid)?.name}'s plan saved`);
  closePlanEditor();
}
