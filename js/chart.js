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
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
// cycle order: none → gold → silver → none
const STAR_CYCLE = ['', 'gold', 'silver'];
const STAR_ICON  = { '':'—', gold:'🥇', silver:'🥈' };

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
  BEHAVIORS.forEach((b,bi)=>{
    const alt = bi%2===1;
    html += `<div class="cg-cell cg-rowhead ${alt?'alt':''}">${b}</div>`;
    DAYS.forEach((d,di)=>{
      const val = chartCell(chartKid,bi,di);
      const dashCls = val==='' ? 'cg-dash' : '';
      html += `<div class="cg-cell cg-star ${alt?'alt':''} ${di===todayCol?'today-col':''} ${dashCls}"
        onclick="cycleStar(${bi},${di})">${STAR_ICON[val]||'—'}</div>`;
    });
  });
  document.getElementById('chartGrid').innerHTML = html;
  renderChartTotals();
}

function cycleStar(bi,di){
  if(!isParent() || !chartKid) return; // kids can look, parents give stars
  const cur = chartCell(chartKid,bi,di);
  const next = STAR_CYCLE[(STAR_CYCLE.indexOf(cur)+1)%STAR_CYCLE.length];
  const week = weekKey();
  // merge just this one cell, so two parents ticking at once don't overwrite each other
  store.put('charts',`${chartKid}_${week}`,{ kid:chartKid, week, cells:{ [`${bi}_${di}`]:next } });
  if(next==='gold'){ speak(`Gold star for ${kidById(chartKid)?.name}!`); }
}

function renderChartTotals(){
  const c=chartCount(chartKid,0);
  document.getElementById('chartTotals').innerHTML = `
    <div class="ct-pill">🥇 <span class="ct-big">${c.gold}</span> gold</div>
    <div class="ct-pill">🥈 <span class="ct-big" style="color:var(--silver)">${c.silver}</span> silver</div>
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
