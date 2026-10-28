// KidQuest — story player and speech
// Plain script: shares globals with the other files; load order is set in index.html.

// story
let storyQueue=[], storySentIdx=0, activeStoryId=null;
let storySpeed=0.9;
// "Up next": story ids that play one after another without touching the screen
let storyPlaylist=[];
const NEXT_STORY_GAP=2500; // ms of quiet between two stories

// ═══════════════════════════════════════
//  STORIES — sentence-chunked for Android
// ═══════════════════════════════════════
function setSpeed(val,btn){
  storySpeed=val;
  document.querySelectorAll('.speed-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(storyAudio) storyAudio.playbackRate=storyAudioRate(); // a recording changes speed as it plays
  else if(activeStoryId){ stopStory(); } // the device voice restarts with the new speed
  showToast(`Story speed: ${val===0.75?'Slow':val===0.9?'Normal':'Fast'}`);
}

// Stories belong to a pack ('home' unless the story says otherwise); a family sees its own packs
function familyStories(){ return STORIES.filter(s=>FAMILY_PACKS.includes(s.pack||'home')); }

function renderStories(){
  const list=familyStories();
  if(!list.length){
    document.getElementById('storiesList').innerHTML=`
      <div class="story-card"><div class="story-top">
        <div class="story-emoji">📚</div>
        <div class="story-meta">
          <div class="story-title">Stories coming soon</div>
          <div class="story-desc">Your family's stories are being written. They'll appear here.</div>
        </div>
      </div></div>`;
    renderPlaylist(); return;
  }
  document.getElementById('storiesList').innerHTML=list.map(s=>`
    <div class="story-card" id="sc-${s.id}">
      <div class="story-top">
        <div class="story-emoji">${s.emoji}</div>
        <div class="story-meta">
          <div class="story-title">${s.title}</div>
          <div class="story-desc">${s.desc}</div>
        </div>
        <button class="story-add" id="sa-${s.id}" onclick="toggleQueued('${s.id}')" title="Add to Up next">＋</button>
        <button class="story-ctrl" id="sb-${s.id}" onclick="toggleStory('${s.id}')">▶</button>
      </div>
      <div class="story-progress-bar"><div class="story-progress-fill" id="sp-${s.id}"></div></div>
    </div>`).join('');
  renderPlaylist();
}

// ── Up next ──
function toggleQueued(id){
  const i=storyPlaylist.indexOf(id);
  if(i>=0) storyPlaylist.splice(i,1); else storyPlaylist.push(id);
  renderPlaylist();
}

function clearPlaylist(){ storyPlaylist=[]; renderPlaylist(); }

function playPlaylist(){
  if(activeStoryId) return; // already playing: the list follows on by itself
  const next=storyPlaylist.shift();
  if(next) playStory(next);
}

function renderPlaylist(){
  STORIES.forEach(s=>{
    const b=document.getElementById('sa-'+s.id); if(!b) return;
    const n=storyPlaylist.indexOf(s.id)+1;
    b.textContent=n?n:'＋';
    b.classList.toggle('queued',!!n);
    b.title=n?`Number ${n} in Up next — tap to remove`:'Add to Up next';
  });
  const box=document.getElementById('storyPlaylist'); if(!box) return;
  if(!storyPlaylist.length){ box.style.display='none'; return; }
  box.style.display='';
  const names=storyPlaylist.map((id,i)=>{
    const s=STORIES.find(x=>x.id===id);
    return `<span class="pl-item">${i+1}. ${s.emoji} ${esc(s.title)}</span>`;
  }).join('');
  box.innerHTML=`
    <div class="pl-head">
      <span class="pl-label">Up next</span>
      ${activeStoryId?'':'<button class="pl-play" onclick="playPlaylist()">▶ Play all</button>'}
      <button class="pl-clear" onclick="clearPlaylist()">Clear</button>
    </div>
    <div class="pl-items">${names}</div>`;
}

function toggleStory(id){
  if(activeStoryId===id){ stopStory(); return; }
  stopStory(); playStory(id);
}

function playStory(id){
  const story=STORIES.find(s=>s.id===id); if(!story) return;
  // playing a queued story takes it off Up next
  const qi=storyPlaylist.indexOf(id); if(qi>=0) storyPlaylist.splice(qi,1);
  activeStoryId=id; storySentIdx=0; storyQueue=story.sentences; storyRetries=0;
  const token=++storyToken;
  document.getElementById('sc-'+id).classList.add('playing');
  document.getElementById('sb-'+id).textContent='⏸';
  document.getElementById('nowPlayingBanner').style.display='flex';
  document.getElementById('nowPlayingText').textContent='📖 '+story.title;
  renderPlaylist();
  // reset progress bar
  const fill=document.getElementById('sp-'+id);
  fill.style.transition='none'; fill.style.width='0%';
  playStoryAudio(id,token);
}

// The recording in audio/stories/<id>.mp3 is played when there is one;
// if it is missing or won't play, the device voice reads the story instead.
function playStoryAudio(id,token){
  const a=new Audio(AUDIO_DIR+'stories/'+id+'.mp3');
  storyAudio=a;
  let started=false;
  const fallback=()=>{
    if(token!==storyToken || started || storyAudio!==a) return; // error and play() can both report it
    a.pause(); storyAudio=null;
    playStoryTTS(token);
  };
  a.onplaying=()=>{ started=true; };
  a.ontimeupdate=()=>{
    if(token!==storyToken || !a.duration) return;
    const fill=document.getElementById('sp-'+id);
    if(fill){ fill.style.transition='width 0.4s linear'; fill.style.width=Math.round(a.currentTime/a.duration*100)+'%'; }
  };
  a.onended=()=>{ if(token===storyToken) storyFinished(); };
  a.onerror=fallback;
  a.playbackRate=storyAudioRate();
  a.play().catch(fallback);
}
function storyAudioRate(){ return storySpeed/0.9; } // Normal (0.9) plays the recording as made

function playStoryTTS(token){
  if(!window.speechSynthesis){ stopStory(); showToast('Speech not supported'); return; }
  window.speechSynthesis.cancel();
  window.speechSynthesis.resume(); // Chrome can get stuck paused
  // speaking straight after cancel() is sometimes dropped, so wait a moment
  setTimeout(()=>{ if(token===storyToken) speakNextSentence(); },150);
}

// Each play gets a token, so callbacks from a cancelled play are ignored
let storyToken=0, storyRetries=0, storyAudio=null;

// Voices skip or misread "ﷺ", so it is spoken as words (the text on screen keeps the symbol)
function speakable(text){
  return text.replace(/\s*ﷺ\s*([.,!?;:])?/g,(m,p)=>`, peace be upon him${p||','} `).replace(/,\s*([.!?])/g,'$1').trim();
}

function speakNextSentence(){
  if(!activeStoryId || storySentIdx>=storyQueue.length){ storyFinished(); return; }
  const token=storyToken;
  const total=storyQueue.length;
  const pct=Math.round((storySentIdx/total)*100);
  const fill=document.getElementById('sp-'+activeStoryId);
  if(fill){ fill.style.transition='width 0.4s ease'; fill.style.width=pct+'%'; }

  const text=speakable(storyQueue[storySentIdx]);
  const u=new SpeechSynthesisUtterance(text);
  u.lang='en-GB';           // en-GB sounds better on Android Chrome
  u.rate=storySpeed;
  u.pitch=1.0;
  u.volume=1.0;
  const voice=pickVoice(['en-GB','en-US','en']);
  if(voice) u.voice=voice;

  // A voice that never starts, or "ends" without speaking, is broken on this
  // device (e.g. Edge's online voices) — drop it and retry the sentence.
  let started=false;
  const fail=()=>{
    if(token!==storyToken) return;
    clearTimeout(guard);
    if(voice) badVoices.add(voice.name);
    window.speechSynthesis.cancel();
    if(++storyRetries>3){
      stopStory();
      showToast('🔇 No voice works in this browser — try Chrome');
      return;
    }
    setTimeout(()=>{ if(token===storyToken) speakNextSentence(); },150);
  };
  const guard=setTimeout(()=>{ if(!started) fail(); },6000);
  u.onstart=()=>{ started=true; };
  u.onend=()=>{
    if(token!==storyToken) return;
    clearTimeout(guard);
    if(!started){ fail(); return; }
    storySentIdx++; storyRetries=0;
    // small pause between sentences feels more natural
    setTimeout(()=>{ if(token===storyToken) speakNextSentence(); },180);
  };
  u.onerror=e=>{
    if(token!==storyToken || e.error==='interrupted' || e.error==='canceled') return;
    fail();
  };
  window.speechSynthesis.speak(u);
}

function storyFinished(){
  const id=activeStoryId;
  if(!id) return;
  const fill=document.getElementById('sp-'+id);
  if(fill){ fill.style.transition='width 0.4s ease'; fill.style.width='100%'; }
  const token=storyToken;
  setTimeout(()=>{
    if(token!==storyToken) return; // Stop was pressed meanwhile
    stopStory();
    const next=storyPlaylist[0];
    if(!next) return;
    // a short quiet gap, then the next story starts on its own; Stop cancels it
    const waitToken=storyToken;
    const s=STORIES.find(x=>x.id===next);
    document.getElementById('nowPlayingBanner').style.display='flex';
    document.getElementById('nowPlayingText').textContent='⏭️ Next: '+s.title;
    setTimeout(()=>{ if(waitToken===storyToken) playStory(next); }, NEXT_STORY_GAP);
  }, 800);
}

function stopStory(){
  storyToken++;
  if(storyAudio){ storyAudio.pause(); storyAudio.removeAttribute('src'); storyAudio=null; }
  storyPausedForAnn=false;
  window.speechSynthesis&&window.speechSynthesis.cancel();
  storyQueue=[]; storySentIdx=0;
  if(activeStoryId){
    document.getElementById('sc-'+activeStoryId)?.classList.remove('playing');
    const btn=document.getElementById('sb-'+activeStoryId); if(btn) btn.textContent='▶';
    const fill=document.getElementById('sp-'+activeStoryId);
    if(fill){ fill.style.transition='none'; fill.style.width='0%'; }
    activeStoryId=null;
  }
  document.getElementById('nowPlayingBanner').style.display='none';
  renderPlaylist();
}

// ═══════════════════════════════════════
//  SPEECH (short announcements)
// ═══════════════════════════════════════
// Voices installed on the device come first: online voices (like Edge's
// "Natural" ones) can fail silently. Voices that failed are skipped.
const badVoices=new Set();
function pickVoice(langs){
  const voices=window.speechSynthesis.getVoices().filter(v=>!badVoices.has(v.name));
  const langOf=v=>v.lang.replace('_','-');
  for(const local of [true,false]){
    for(const l of langs){
      const ok=voices.filter(v=>v.localService===local && langOf(v).startsWith(l));
      const v=ok.find(v=>/google/i.test(v.name)) || ok[0];
      if(v) return v;
    }
  }
  return null;
}

// Announcements are queued, never cancelling — so they don't cut off a story
// or each other. With `clips` (names of recorded MP3s in audio/phrases/, played
// one after another) the recording is used; the device voice says `text` if a
// clip is missing or won't play. A recorded story pauses while a clip plays.
const AUDIO_DIR='audio/';
let annQueue=[], annBusy=false, storyPausedForAnn=false, annEl=null, annToken=0;
function nameClip(name){ return 'name-'+String(name).toLowerCase().replace(/[^a-z0-9]+/g,'-'); }

function speak(text,clips){
  if(clips?.length && window.Audio){
    annQueue.push({text,clips});
    if(!annBusy) nextAnnouncement();
    return;
  }
  speakTTS(text);
}

function nextAnnouncement(){
  const a=annQueue.shift();
  if(!a){
    annBusy=false;
    if(storyPausedForAnn){ storyPausedForAnn=false; if(storyAudio && activeStoryId) storyAudio.play().catch(()=>{}); }
    return;
  }
  annBusy=true;
  if(storyAudio && !storyAudio.paused){ storyAudio.pause(); storyPausedForAnn=true; }
  let i=0, played=false;
  const token=annToken;
  const next=()=>setTimeout(()=>{ if(token===annToken) nextAnnouncement(); },150);
  const playOne=()=>{
    if(token!==annToken) return;
    if(i>=a.clips.length){ next(); return; }
    const el=annEl=new Audio(AUDIO_DIR+'phrases/'+a.clips[i++]+'.mp3');
    let done=false;
    const ok=()=>{ if(done) return; done=true; clearTimeout(guard); played=true; playOne(); };
    const bad=()=>{
      if(done) return; done=true; clearTimeout(guard); el.pause();
      if(token!==annToken) return;
      if(!played) speakTTS(a.text); // nothing heard yet: say it all with the device voice
      next();
    };
    const guard=setTimeout(bad,8000);
    el.onended=ok; el.onerror=bad;
    el.play().catch(bad);
  };
  playOne();
}

// Silence every announcement now and drop the waiting ones (e.g. an alarm is dismissed)
function stopAnnouncements(){
  annToken++; annQueue=[];
  if(annEl){ annEl.pause(); annEl=null; }
  if(!activeStoryId || storyAudio) window.speechSynthesis?.cancel(); // never cut a story the device voice is reading
  annBusy=false;
  if(storyPausedForAnn){ storyPausedForAnn=false; if(storyAudio && activeStoryId) storyAudio.play().catch(()=>{}); }
}

function speakTTS(text){
  if(!window.speechSynthesis) return;
  const u=new SpeechSynthesisUtterance(text);
  u.lang='en-US'; u.rate=0.95; u.pitch=1.1; u.volume=1;
  const voice=pickVoice(['en-US','en-GB','en']);
  if(voice) u.voice=voice;
  window.speechSynthesis.resume();
  window.speechSynthesis.speak(u);
}
// warm up voices list
if(window.speechSynthesis){
  window.speechSynthesis.onvoiceschanged=()=>window.speechSynthesis.getVoices();
  window.speechSynthesis.getVoices();
}
