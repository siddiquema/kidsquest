// KidQuest — Play tab: quizzes and picture games
// Plain script: shares globals with the other files; load order is set in index.html.

// ═══════════════════════════════════════
//  PLAY  (quizzes for readers, picture games for little ones; up to 3 stars a day)
// ═══════════════════════════════════════
const PLAY_STARS_PER_DAY = 3;
const QUIZ_MIN_AGE = 7;          // quizzes need reading; younger kids get the picture games
const ROUNDS = 5;
let playKid = null;

function playStarsToday(kid){
  let s=0; const from=startOfTodayTs();
  for(const id in STARS){ const e=STARS[id]; if(e.kid===kid && e.src==='play' && e.ts>=from) s+=e.n||1; }
  return s;
}

// ── quiz questions: { q, hint?, options, answer, hi? } (hi = Hindi script, bigger font) ──
const q = (text,answer,wrongs,extra={}) => ({ q:text, answer, options:shuffle([answer,...wrongs]), ...extra });

function spaceQs(){ return pickN(SPACE_BANK,ROUNDS).map(([t,a,w])=>q(t,a,w)); }

// Hindi: ling (gender of the verb), feminine forms, vachan (plurals)
function hindiQs(){
  const make=[
    ()=>{ const [s,st,en,g]=pickOne(HI_SUBJECTS), [m,f,mt,ft,ev]=pickOne(HI_VERBS);
          return q(`${s} ___ है।`, g==='m'?m:f, [g==='m'?f:m, m.replace(/ता$/,'ते')], { hi:true, hint:`${st} ___ hai — the ${en} ${ev}` }); },
    ()=>{ const [m,f]=pickOne(HI_FEM); const others=pickN(HI_FEM.filter(p=>p[0]!==m).map(p=>p[1]),2);
          return q(`${m} — girl/female word?`, f, others, { hi:true, hint:'Pick the feminine (स्त्रीलिंग) form' }); },
    ()=>{ const [one,many,en]=pickOne(HI_PLURAL); const wrong=pickN(HI_PLURAL.filter(p=>p[0]!==one).map(p=>p[1]),2);
          return q(`एक ${one}, दो ___`, many, wrong, { hi:true, hint:`one ${en}, two ${en}s (vachan)` }); },
  ];
  return Array.from({length:ROUNDS},(_,i)=>make[i%make.length]()).sort(()=>Math.random()-.5);
}

// Maths for Grade 3: tables, adding, taking away, short word problems
function nearWrongs(ans,spread=10){
  const w=new Set();
  while(w.size<3){ const d=(1+rnd(spread))*(Math.random()<.5?-1:1); if(ans+d>=0 && ans+d!==ans) w.add(ans+d); }
  return [...w].map(String);
}
function mathsQs(){
  const make=[
    ()=>{ const a=2+rnd(9), b=2+rnd(9); return q(`${a} × ${b} = ?`, String(a*b), nearWrongs(a*b,a)); },
    ()=>{ const a=10+rnd(80), b=5+rnd(Math.min(40,99-a)); return q(`${a} + ${b} = ?`, String(a+b), nearWrongs(a+b)); },
    ()=>{ const a=30+rnd(70), b=5+rnd(a-10); return q(`${a} − ${b} = ?`, String(a-b), nearWrongs(a-b)); },
    ()=>{ const n=3+rnd(7), each=2+rnd(8); return q(`There are ${n} bags with ${each} marbles in each. How many marbles?`, String(n*each), nearWrongs(n*each,each)); },
    ()=>{ const have=20+rnd(40), give=5+rnd(15); return q(`You have ${have} stickers and give away ${give}. How many are left?`, String(have-give), nearWrongs(have-give)); },
  ];
  return Array.from({length:ROUNDS},()=>pickOne(make)());
}

// English: spelling, opposites, rhymes
function englishQs(){
  const make=[
    ()=>{ const [w,bad]=pickOne(SPELL_BANK); return q('Which spelling is right?', w, bad); },
    ()=>{ const [a,b]=pickOne(OPP_BANK); const wrong=pickN(OPP_BANK.filter(p=>p[0]!==a).map(p=>p[1]),2); return q(`What is the opposite of "${a}"?`, b, wrong); },
    ()=>{ const [w,rh,no]=pickOne(RHYME_BANK); return q(`Which word rhymes with "${w}"?`, pickOne(rh), no); },
  ];
  return Array.from({length:ROUNDS},()=>pickOne(make)());
}

const GAMES = [
  { id:'quiz-space',   emoji:'🪐', title:'Space quiz',       quiz:spaceQs },
  { id:'quiz-hindi',   emoji:'🔤', title:'Hindi grammar',    quiz:hindiQs },
  { id:'quiz-maths',   emoji:'➗', title:'Maths',            quiz:mathsQs },
  { id:'quiz-english', emoji:'📝', title:'Spelling & words', quiz:englishQs },
  { id:'memory', emoji:'🃏', title:'Memory match', start:startMemory },
  { id:'moved',  emoji:'👀', title:'What moved?',  start:startMoved },
  { id:'count',  emoji:'🔢', title:'Count it',     start:startCount },
  { id:'odd',    emoji:'🧩', title:'Odd one out',  start:startOdd },
];
function gamesFor(kid){ const age=+kidById(kid)?.age||0; return GAMES.filter(g=>!g.quiz || age>=QUIZ_MIN_AGE); }

// ── Play tab ──
function renderPlay(){
  const list=visibleKids();
  if(!list.some(k=>k.id===playKid)) playKid=list[0]?.id||null;
  document.getElementById('playKidTabs').innerHTML=list.map(k=>`
    <button class="ck-tab ${k.id===playKid?'active':''}" style="${k.id===playKid?`border-color:${k.color};color:${k.color}`:''}"
      onclick="playKid='${k.id}';renderPlay()">${k.emoji} ${esc(k.name)}</button>`).join('');
  if(!playKid){ document.getElementById('playGrid').innerHTML=''; document.getElementById('playStatus').textContent=''; return; }
  const got=playStarsToday(playKid);
  document.getElementById('playStatus').innerHTML = got<PLAY_STARS_PER_DAY
    ? `⭐ ${'★'.repeat(got)}${'☆'.repeat(PLAY_STARS_PER_DAY-got)} &nbsp;Finish a game to earn a star (${PLAY_STARS_PER_DAY-got} left today)`
    : `🌟 All ${PLAY_STARS_PER_DAY} play stars earned today — keep playing for fun!`;
  document.getElementById('playGrid').innerHTML=gamesFor(playKid).map(g=>`
    <button class="play-tile" onclick="openGame('${g.id}')">
      <span class="play-tile-emoji">${g.emoji}</span>
      <span class="play-tile-title">${g.title}</span>
    </button>`).join('');
}

// ── game shell ──
let game=null; // { def, kid, round, score, ... }
const playArea=()=>document.getElementById('playArea');

function openGame(id){
  const def=GAMES.find(g=>g.id===id); if(!def || !playKid) return;
  game={ def, kid:playKid, round:0, score:0, token:{} };
  document.getElementById('playTitle').textContent=`${def.emoji} ${def.title}`;
  document.getElementById('playOverlay').classList.add('show');
  if(def.quiz){ game.qs=def.quiz(); showQuestion(); } else def.start();
}
function closeGame(){ if(game) game.token.dead=true; game=null; document.getElementById('playOverlay').classList.remove('show'); }
function setProgress(){ document.getElementById('playProgress').innerHTML=Array.from({length:ROUNDS},(_,i)=>`<span class="${i<game.round?'on':''}"></span>`).join(''); }
// run fn later only if the same game is still open
function later(fn,ms){ const t=game?.token; setTimeout(()=>{ if(game && game.token===t) fn(); },ms); }
const PRAISE=['Yes! Well done!','Correct!','Brilliant!','You got it!','Super!'];
const MATCH_PRAISE=['A match!','Yes, a pair!','Well done!'];
// recorded as praise-1 … praise-5, in this order
function sayPraise(){ const i=rnd(PRAISE.length); speak(PRAISE[i],['praise-'+(i+1)]); }

function finishGame(scoreText){
  const kid=game.kid, name=kidById(kid)?.name||'';
  let starMsg;
  if(playStarsToday(kid)<PLAY_STARS_PER_DAY){
    store.add('stars',{ kid, ts:Date.now(), n:1, src:'play', task:game.def.id, by:currentWho?.id||null });
    starMsg='⭐ +1 star!'; speak(`Great playing, ${name}! You earned a star!`,[nameClip(name),'play-star']);
  } else { starMsg='You’ve got all 3 play stars today. Great practice!'; speak(`Great playing, ${name}!`,[nameClip(name),'play-done']); }
  game.round=ROUNDS; setProgress();
  playArea().innerHTML=`
    <div class="play-done">
      <div class="play-big">🎉</div>
      <div class="play-done-title">Great playing, ${esc(name)}!</div>
      ${scoreText?`<div class="play-done-score">${scoreText}</div>`:''}
      <div class="play-done-star">${starMsg}</div>
      <div class="play-done-btns">
        <button class="onb-next" onclick="openGame('${game.def.id}')">Play again</button>
        <button class="onb-back" onclick="closeGame()">Back to games</button>
      </div>
    </div>`;
}

// ── quiz ──
function showQuestion(){
  setProgress();
  if(game.round>=ROUNDS){ finishGame(`${game.score} out of ${ROUNDS} right`); return; }
  const it=game.qs[game.round];
  playArea().innerHTML=`
    <div class="quiz-q ${it.hi?'hi':''}">${esc(it.q)}</div>
    ${it.hint?`<div class="quiz-hint">${esc(it.hint)}</div>`:''}
    <button class="quiz-say" onclick="speak(${esc(JSON.stringify(it.hi?(it.hint||''):it.q))})" title="Read it to me">🔊</button>
    <div class="quiz-opts">${it.options.map((o,i)=>`<button class="quiz-opt ${it.hi?'hi':''}" onclick="answerQuiz(${i})">${esc(o)}</button>`).join('')}</div>
    <div class="quiz-feedback" id="quizFeedback"></div>`;
}
function answerQuiz(i){
  const it=game.qs[game.round]; if(it.answered) return; it.answered=true;
  const btns=playArea().querySelectorAll('.quiz-opt');
  const right=it.options[i]===it.answer;
  btns.forEach((b,j)=>{ if(it.options[j]===it.answer) b.classList.add('right'); else if(j===i) b.classList.add('wrong'); });
  if(right){ game.score++; sayPraise(); }
  else if(it.hi) speak('Good try! Look at the green answer.',['quiz-try-pic']);
  else speak(`Good try! The answer is ${it.answer}.`,['quiz-try']);
  document.getElementById('quizFeedback').innerHTML=`<div class="quiz-msg">${right?'✅ '+pickOne(PRAISE):'💡 Good try! The answer is in green.'}</div>
    <button class="onb-next" onclick="game.round++;showQuestion()">${game.round+1<ROUNDS?'Next →':'Finish 🎉'}</button>`;
}

// ── memory match ──
const PIC_POOL=['🐶','🐱','🐰','🦊','🐼','🐸','🐵','🦁','🍎','🍌','🍓','🍉','🚗','🚀','⚽','🌈','🌻','🎈'];
function startMemory(){
  const cards=shuffle(pickN(PIC_POOL,6).flatMap(e=>[e,e])).map(e=>({e,open:false,done:false}));
  Object.assign(game,{ cards, picks:[], pairs:0, moves:0, busy:false });
  speak('Find the matching pairs!',['memory-start']);
  drawMemory();
}
function drawMemory(){
  game.round=Math.min(ROUNDS,Math.round(game.pairs/6*ROUNDS)); setProgress();
  playArea().innerHTML=`<div class="mem-grid">${game.cards.map((c,i)=>`
    <button class="mem-card ${c.open||c.done?'open':''} ${c.done?'done':''}" onclick="flipCard(${i})">${c.open||c.done?c.e:'⭐'}</button>`).join('')}</div>`;
}
function flipCard(i){
  const c=game.cards[i]; if(game.busy || c.open || c.done) return;
  c.open=true; game.picks.push(i); drawMemory();
  if(game.picks.length<2) return;
  game.moves++;
  const [a,b]=game.picks.map(j=>game.cards[j]); game.picks=[];
  if(a.e===b.e){
    a.done=b.done=true; a.open=b.open=false; game.pairs++;
    if(game.pairs<6){ const m=rnd(MATCH_PRAISE.length); speak(MATCH_PRAISE[m],['match-'+(m+1)]); }
    else speak('You found them all!',['memory-all']);
    drawMemory();
    if(game.pairs===6) later(()=>finishGame(`All pairs found in ${game.moves} tries`),900);
  } else {
    game.busy=true;
    later(()=>{ a.open=b.open=false; game.busy=false; drawMemory(); },900);
  }
}

// ── what moved? (from the twins' thinking day) ──
function startMoved(){ speak('Look carefully at the pictures!',['moved-start']); movedRound(); }
function movedRound(){
  setProgress();
  if(game.round>=ROUNDS){ finishGame(`${game.score} out of ${ROUNDS} spotted`); return; }
  const n=3+Math.min(2,Math.floor(game.round/2)); // 3 → 5 pictures as rounds go on
  const cells=pickN([...Array(9).keys()],n+1);
  const items=pickN(PIC_POOL,n).map((e,i)=>({e,at:cells[i]}));
  const mover=rnd(n), from=items[mover].at;
  game.moved={ items, mover, to:cells[n] };
  drawMoved('look');
  later(()=>{ drawMoved('hide'); speak('Close your eyes!',['moved-close']); },3000);
  later(()=>{ items[mover].at=cells[n]; game.moved.from=from; drawMoved('ask'); speak('Which one moved? Tap it!',['moved-ask']); },4300);
}
function drawMoved(stage){
  const grid=Array(9).fill('');
  if(stage!=='hide') game.moved.items.forEach((it,i)=>{ grid[it.at]=`<button class="mv-item" ${stage==='ask'?`onclick="answerMoved(${i})"`:''}>${it.e}</button>`; });
  playArea().innerHTML=`<div class="mv-label">${stage==='look'?'👀 Look carefully…':stage==='hide'?'🙈 Close your eyes!':'👆 Which one moved?'}</div>
    <div class="mv-grid">${grid.map(c=>`<div class="mv-cell">${c|| (stage==='hide'?'🙈':'')}</div>`).join('')}</div>`;
}
function answerMoved(i){
  if(game.moved.answered) return; game.moved.answered=true;
  const right=i===game.moved.mover;
  if(right){ game.score++; sayPraise(); } else speak('Good try! This one moved.',['moved-try']);
  playArea().querySelectorAll('.mv-item').forEach((b,j)=>{ if(j===game.moved.mover) b.classList.add('right'); else if(j===i) b.classList.add('wrong'); });
  later(()=>{ game.round++; movedRound(); },1600);
}

// ── count it ──
const COUNT_POOL=[['🍎','apples'],['⭐','stars'],['🐟','fish'],['🚗','cars'],['🎈','balloons'],['🐤','chicks'],['🌸','flowers'],['🍪','cookies']];
function startCount(){ countRound(); }
function countRound(){
  setProgress();
  if(game.round>=ROUNDS){ finishGame(`${game.score} out of ${ROUNDS} counted right`); return; }
  const [e,name]=pickOne(COUNT_POOL), n=1+rnd(Math.min(10,4+game.round*2)); // bigger numbers as it goes
  const opts=shuffle([n,...pickN([n-2,n-1,n+1,n+2].filter(x=>x>0&&x<=12),2)]);
  game.count={ n, opts, answered:false };
  speak(`How many ${name}?`,['count-'+name]);
  playArea().innerHTML=`<div class="cnt-items">${Array(n).fill(`<span>${e}</span>`).join('')}</div>
    <button class="quiz-say" onclick="speak('How many ${name}?',['count-${name}'])">🔊</button>
    <div class="cnt-opts">${opts.map(o=>`<button class="cnt-opt" onclick="answerCount(${o})">${o}</button>`).join('')}</div>`;
}
function answerCount(o){
  if(game.count.answered) return; game.count.answered=true;
  const right=o===game.count.n;
  if(right){ game.score++; speak(`Yes! ${o}!`,['count-yes-'+o]); } else speak(`Good try! There are ${game.count.n}.`,['count-try-'+game.count.n]);
  playArea().querySelectorAll('.cnt-opt').forEach(b=>{ const v=+b.textContent; if(v===game.count.n) b.classList.add('right'); else if(v===o) b.classList.add('wrong'); });
  later(()=>{ game.round++; countRound(); },1600);
}

// ── odd one out ──
const ODD_SETS=[ ['fruit',['🍎','🍌','🍇','🍓','🍊','🍐']], ['animals',['🐶','🐱','🐮','🐷','🐰','🐸']],
  ['vehicles',['🚗','🚌','🚲','🚂','✈️','🚀']], ['clothes',['👕','👖','🧦','👗','🧢','👟']], ['sports balls',['⚽','🏀','🏈','⚾','🎾','🏐']] ];
function startOdd(){ speak('Which one is different?',['odd-start']); oddRound(); }
function oddRound(){
  setProgress();
  if(game.round>=ROUNDS){ finishGame(`${game.score} out of ${ROUNDS} found`); return; }
  const [cat,set]=pickOne(ODD_SETS), other=pickOne(ODD_SETS.filter(s=>s[0]!==cat))[1];
  const odd=pickOne(other), items=shuffle([...pickN(set,3),odd]);
  game.odd={ items, odd, cat, answered:false };
  playArea().innerHTML=`<div class="mv-label">🧐 Which one is different?</div>
    <button class="quiz-say" onclick="speak('Which one is different?',['odd-start'])">🔊</button>
    <div class="odd-grid">${items.map((e,i)=>`<button class="odd-item" onclick="answerOdd(${i})">${e}</button>`).join('')}</div>`;
}
function answerOdd(i){
  if(game.odd.answered) return; game.odd.answered=true;
  const right=game.odd.items[i]===game.odd.odd;
  const catClip=game.odd.cat.split(' ').pop(); // 'sports balls' → balls
  if(right){ game.score++; speak(`Yes! The others are all ${game.odd.cat}.`,['odd-yes-'+catClip]); } else speak(`Good try! The others are all ${game.odd.cat}.`,['odd-try-'+catClip]);
  playArea().querySelectorAll('.odd-item').forEach((b,j)=>{ if(game.odd.items[j]===game.odd.odd) b.classList.add('right'); else if(j===i) b.classList.add('wrong'); });
  later(()=>{ game.round++; oddRound(); },1800);
}
