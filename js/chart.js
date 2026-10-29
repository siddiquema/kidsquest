// KidQuest — weekly behaviour chart
// Plain script: shares globals with the other files; load order is set in index.html.

// ═══════════════════════════════════════
//  BEHAVIOR CHART
// ═══════════════════════════════════════
const BEHAVIORS = [
  'Brush your teeth',
  'Get ready',
  'Have breakfast',
  'Have lunch',
  'Do homework',
  'Study',
  'No fighting with each other',
  'Have snacks',
  'Play together',
  'Have dinner',
  'Cleanup',
  'Watch TV / Play',
  'Go to sleep by 9 PM',
  'Listening to instructions',
  'Share things with each other',
];
// Each kid's rows can be changed by a parent (chartrows: id kid → { rows:[{id,label}] }).
// A row keeps its id when renamed or moved and its ticks are stored under that id, so past
// ticks stay on the right row. The default rows use ids '0'…'14': the keys the chart used
// before rows could be changed, so earlier ticks still line up.
let CHARTROWS = {};
const MAX_CHART_ROWS = 25;
function defaultChartRows(){ return BEHAVIORS.map((label,i)=>({ id:String(i), label })); }
function chartRows(kid){ const r=CHARTROWS[kid]?.rows; return Array.isArray(r)&&r.length ? r : defaultChartRows(); }

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
// cycle order: not filled in → gold star → silver star → ✗ not done → not filled in
const STAR_CYCLE = ['', 'gold', 'silver', 'no'];
const STAR_ICON  = { '':'–', gold:'★', silver:'★', no:'✗' };

// One record per kid per week (Sunday-anchored), so last week stays for comparison
let chartKid = null;

function renderChartKidTabs(){
  const list=visibleKids();
  if(!list.some(k=>k.id===chartKid)) chartKid=list[0]?.id||null;
  document.getElementById('chartKidTabs').innerHTML = list.map(k=>`
    <button class="ck-tab ${k.id===chartKid?'active':''}"
      style="${k.id===chartKid?`border-color:${k.color};color:${k.color}`:''}"
      onclick="selectChartKid('${k.id}')">${k.emoji} ${esc(k.name)}</button>`).join('');
}

function selectChartKid(id){ chartKid=id; renderChartKidTabs(); renderChart(); }

function renderChart(){
  if(!chartKid){ document.getElementById('chartGrid').innerHTML=''; document.getElementById('chartTotals').innerHTML=''; return; }
  const todayCol = new Date().getDay(); // 0=Sun
  let html = '<div class="cg-cell cg-corner">Activity</div>';
  // day header row
  DAYS.forEach((d,di)=>{
    html += `<div class="cg-cell cg-dayhead ${di===todayCol?'today':''}">${d}</div>`;
  });
  // behavior rows
  chartRows(chartKid).forEach((row,ri)=>{
    const alt = ri%2===1;
    html += `<div class="cg-cell cg-rowhead ${alt?'alt':''}">${esc(row.label)}</div>`;
    DAYS.forEach((d,di)=>{
      const val = chartCell(chartKid,row.id,di);
      const cls = STAR_ICON[val] ? (val ? 'cg-'+val : 'cg-dash') : 'cg-dash';
      html += `<div class="cg-cell cg-star ${alt?'alt':''} ${di===todayCol?'today-col':''} ${cls}"
        onclick="cycleStar('${row.id}',${di})">${STAR_ICON[val]||'–'}</div>`;
    });
  });
  document.getElementById('chartGrid').innerHTML = html;
  renderChartTotals();
}

function cycleStar(rowId,di){
  if(!isParent() || !chartKid) return; // kids can look, parents give stars
  const cur = chartCell(chartKid,rowId,di);
  const next = STAR_CYCLE[(STAR_CYCLE.indexOf(cur)+1)%STAR_CYCLE.length];
  const week = weekKey();
  // merge just this one cell, so two parents ticking at once don't overwrite each other
  store.put('charts',`${chartKid}_${week}`,{ kid:chartKid, week, cells:{ [`${rowId}_${di}`]:next } });
  if(next==='gold'){ speak(`Gold star for ${kidById(chartKid)?.name}!`,[nameClip(kidById(chartKid)?.name),'chart-gold']); }
}

function renderChartTotals(){
  const c=chartCount(chartKid,0);
  document.getElementById('chartTotals').innerHTML = `
    <div class="ct-pill"><span class="cg-gold">★</span> <span class="ct-big">${c.gold}</span> gold</div>
    <div class="ct-pill"><span class="cg-silver">★</span> <span class="ct-big" style="color:var(--silver)">${c.silver}</span> silver</div>
    <div class="ct-pill"><span class="cg-no">✗</span> <span class="ct-big" style="color:var(--meal)">${c.no}</span> not done</div>
    <div class="ct-pill">⭐ <span class="ct-big" style="color:var(--green)">${fmtStars(chartStars(c))}</span> stars</div>`;
}

function resetChart(){
  if(!isParent() || !chartKid) return;
  const name=kidById(chartKid)?.name;
  if(!confirm(`Clear ${name}'s chart for this week?`)) return;
  const week=weekKey();
  store.put('charts',`${chartKid}_${week}`,{ kid:chartKid, week, cells:{} },false);
  showToast(`${name}'s chart cleared`);
}

// ═══════════════════════════════════════
//  CHART EDITOR  (parents choose each kid's activities)
// ═══════════════════════════════════════
let ceKid=null, ceRows=[];

function openChartEditor(){
  if(!isParent() || !chartKid) return;
  ceKid=chartKid; ceRows=chartRows(chartKid).map(r=>({...r}));
  const k=kidById(chartKid);
  document.getElementById('ceTitle').textContent=`${k?.emoji} ${k?.name}'s chart`;
  document.getElementById('ceAll').checked=false;
  document.getElementById('ceAllName').textContent=KIDS.length>1?'Use this list for every kid':'';
  document.getElementById('ceAllRow').style.display=KIDS.length>1?'':'none';
  renderChartEditor();
  document.getElementById('chartEditor').classList.add('show');
}
function closeChartEditor(){ document.getElementById('chartEditor').classList.remove('show'); ceKid=null; }

function renderChartEditor(){
  const box=document.getElementById('ceRows');
  box.innerHTML=ceRows.map((r,i)=>`
    <div class="pe-line ce-row">
      <input class="ob-input pe-title" maxlength="40" placeholder="Activity" data-i="${i}">
      <button class="ce-mv" onclick="ceMove(${i},-1)" title="Move up" ${i===0?'disabled':''}>↑</button>
      <button class="ce-mv" onclick="ceMove(${i},1)" title="Move down" ${i===ceRows.length-1?'disabled':''}>↓</button>
      <button class="ob-del" onclick="ceRemove(${i})" title="Remove" ${ceRows.length<=1?'disabled':''}>✕</button>
    </div>`).join('');
  // fill values through the DOM so text never needs escaping
  box.querySelectorAll('input[data-i]').forEach(el=>{
    const r=ceRows[+el.dataset.i];
    el.value=r.label; el.oninput=()=>{ r.label=el.value; };
  });
  document.getElementById('ceAddBtn').disabled=ceRows.length>=MAX_CHART_ROWS;
}

function ceMove(i,dir){
  const j=i+dir; if(j<0 || j>=ceRows.length) return;
  [ceRows[i],ceRows[j]]=[ceRows[j],ceRows[i]];
  renderChartEditor();
}
function ceRemove(i){ if(ceRows.length>1){ ceRows.splice(i,1); renderChartEditor(); } }
function ceAdd(){
  if(ceRows.length>=MAX_CHART_ROWS) return;
  ceRows.push({ id:'r'+newId(), label:'' });
  renderChartEditor();
  const ins=document.querySelectorAll('#ceRows input'); ins[ins.length-1].focus();
}
function ceUseDefault(){
  if(!confirm('Go back to the original list of activities?')) return;
  ceRows=defaultChartRows(); renderChartEditor();
}

function saveChartRows(){
  if(!isParent() || !ceKid) return;
  const ins=document.querySelectorAll('#ceRows input');
  const empty=ceRows.findIndex(r=>!String(r.label).trim());
  if(empty>=0){ showToast('Give every activity a name, or remove it'); ins[empty]?.focus(); return; }
  const rows=ceRows.map(r=>({ id:r.id, label:String(r.label).trim() }));
  const kids=document.getElementById('ceAll').checked ? KIDS.map(k=>k.id) : [ceKid];
  kids.forEach(id=>store.put('chartrows',id,{ rows, updated:Date.now(), by:currentWho?.id||null },false));
  closeChartEditor();
  showToast(kids.length>1 ? '✅ Chart saved for every kid' : `✅ ${kidById(kids[0])?.name}'s chart saved`);
}
