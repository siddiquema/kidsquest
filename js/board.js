// KidQuest — kids strip and Star Board
// Plain script: shares globals with the other files; load order is set in index.html.

// ═══════════════════════════════════════
//  KIDS STRIP
// ═══════════════════════════════════════
function renderKidsStrip(){
  document.getElementById('kidsStrip').innerHTML=KIDS.map(k=>`
    <div class="kid-chip">
      <div class="kid-chip-emoji">${k.emoji}</div>
      <div>
        <div class="kid-chip-name" style="color:${k.color}">${esc(k.name)}</div>
        <div class="kid-chip-age">${esc(k.age)} yrs</div>
      </div>
    </div>`).join('');
}

// ═══════════════════════════════════════
//  STAR BOARD  (every star counts; each kid vs their own last week, no places)
// ═══════════════════════════════════════
// ── chart star counters (gold + silver from the behavior chart) ──
function chartDoc(kid,offset=0){ return CHARTS[`${kid}_${weekKey(offset)}`]; }
function chartCell(kid,bi,di){ return chartDoc(kid)?.cells?.[`${bi}_${di}`] || ''; }
// day = 0..6 for one day, or null for the whole week
function chartCount(kid,offset=0,day=null){
  let gold=0, silver=0, no=0;
  const cells=chartDoc(kid,offset)?.cells||{};
  for(const k in cells){
    if(day!==null && +k.split('_')[1]!==day) continue;
    if(cells[k]==='gold') gold++; else if(cells[k]==='silver') silver++; else if(cells[k]==='no') no++;
  }
  return {gold,silver,no};
}

// ── combined totals per kid (bonus/skill stars + chart stars) ──
// Gold = 1 star, silver = ½ star (partly done), bonus = face value
const SILVER_VALUE = 0.5;
function chartStars(c){ return c.gold + c.silver*SILVER_VALUE; }
function kidStarsToday(kid){ return starSum(kid,startOfTodayTs()) + chartStars(chartCount(kid,0,new Date().getDay())); }
function kidStarsWeek(kid,offset=0){ return starSum(kid,startOfWeekTs(offset),startOfWeekTs(offset+1)) + chartStars(chartCount(kid,offset)); }
function fmtStars(n){ const w=Math.floor(n); return n===w ? String(w) : (w?w:'')+'½'; }

function renderBoard(){
  const today=new Date().getDay();
  let goldT=0,silverT=0,bonusT=0, goldW=0,silverW=0,bonusW=0, lastW=0;
  KIDS.forEach(k=>{
    const ct=chartCount(k.id,0,today), cw=chartCount(k.id,0);
    // meal gold/silver stars show with the chart's; the rest of the stars count as ➕
    const mt=mealMedals(k.id,startOfTodayTs()), mw=mealMedals(k.id,startOfWeekTs(),startOfWeekTs(1));
    goldT+=ct.gold+mt.gold; silverT+=ct.silver+mt.silver; bonusT+=starSum(k.id,startOfTodayTs())-mt.value;
    goldW+=cw.gold+mw.gold; silverW+=cw.silver+mw.silver; bonusW+=starSum(k.id,startOfWeekTs(),startOfWeekTs(1))-mw.value;
    lastW+=kidStarsWeek(k.id,-1);
  });
  const tToday=chartStars({gold:goldT,silver:silverT})+bonusT;
  const tWeek =chartStars({gold:goldW,silver:silverW})+bonusW;

  // ── family totals ──
  document.getElementById('dashSummary').innerHTML = `
    <div class="ds-card day">
      <div class="ds-label">Today</div>
      <div class="ds-num">${fmtStars(tToday)}</div>
      <div class="ds-unit">family stars</div>
      <div class="ds-break"><span class="cg-gold">★</span> ${goldT} &nbsp; <span class="cg-silver">★</span> ${silverT} &nbsp; ➕ ${bonusT}</div>
      <div class="ds-leader">${tToday>0?'✨ Every star counts!':'No stars yet today'}</div>
    </div>
    <div class="ds-card week">
      <div class="ds-label">This Week</div>
      <div class="ds-num">${fmtStars(tWeek)}</div>
      <div class="ds-unit">family stars</div>
      <div class="ds-break"><span class="cg-gold">★</span> ${goldW} &nbsp; <span class="cg-silver">★</span> ${silverW} &nbsp; ➕ ${bonusW}</div>
      <div class="ds-leader">Last week: ${fmtStars(lastW)}</div>
    </div>`;

  // ── one card per kid, in family order (no ranking) ──
  document.getElementById('lbList').innerHTML=KIDS.map(k=>{
    const day=kidStarsToday(k.id), week=kidStarsWeek(k.id), last=kidStarsWeek(k.id,-1);
    const trend = week>last ? `⬆ ${fmtStars(week-last)} more than last week` : `last week ${fmtStars(last)}`;
    return `
    <div class="lb-card" style="--kc:${k.color}">
      <div class="lb-medal">${k.emoji}</div>
      <div class="lb-info">
        <div class="lb-name">${esc(k.name)}</div>
        <div class="lb-age">${esc(k.age)} yrs · ${trend}</div>
      </div>
      <div class="lb-stats">
        <div class="lb-stat day"><div class="v" id="dv-${k.id}">${fmtStars(day)}</div><div class="l">Today</div></div>
        <div class="lb-stat week"><div class="v" id="wv-${k.id}">${fmtStars(week)}</div><div class="l">Week</div></div>
      </div>
      <button class="plus-btn parent-only" onclick="openBonus('${k.id}')" title="Add bonus stars">+</button>
    </div>`;
  }).join('');
}

// ── bonus stars chooser ──
let bonusKid=null;
function openBonus(id){
  const k=kidById(id); if(!k || !isParent()) return;
  bonusKid=id;
  document.getElementById('bonusTitle').textContent=`${k.emoji} ${k.name}`;
  document.getElementById('bonusSub').textContent='How many bonus stars to add?';
  document.getElementById('bonusOverlay').classList.add('show');
}
function chooseBonus(n){ const id=bonusKid; closeBonus(); if(id) addBonus(id,n); }
function closeBonus(){ document.getElementById('bonusOverlay').classList.remove('show'); bonusKid=null; }

function addBonus(id,amount){
  const k=kidById(id); if(!k) return;
  store.add('stars',{ kid:id, ts:Date.now(), n:amount, src:'bonus', by:currentWho?.id||null });
  setTimeout(()=>{
    const dv=document.getElementById('dv-'+id);
    if(dv){ dv.classList.add('bump'); setTimeout(()=>dv.classList.remove('bump'),360); }
  },60);
  speak(`${amount} bonus star${amount>1?'s':''} for ${k.name}! Great job!`,[nameClip(k.name),'bonus-'+amount]);
  showToast(`🌟 +${amount} bonus for ${k.name}!`);
}

function resetPoints(){
  if(!isParent()) return;
  if(!confirm("Clear this week's bonus stars? (Chart stars are not affected.)")) return;
  const from=startOfWeekTs();
  for(const id in STARS){ const e=STARS[id]; if(e.src==='bonus' && e.ts>=from) store.remove('stars',id); }
  showToast("This week's bonus stars cleared");
}
