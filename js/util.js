// KidQuest — small helpers used everywhere
// Plain script: shares globals with the other files; load order is set in index.html.

// Names come from the shared database, so escape them before putting them into HTML
function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function newId(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function lsGet(k){ try{ return localStorage.getItem(k); }catch{ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch{} }
function ssGet(k){ try{ return sessionStorage.getItem(k); }catch{ return null; } }
function ssSet(k,v){ try{ v==null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k,v); }catch{} }

const rnd = n => Math.floor(Math.random()*n);
const pickOne = a => a[rnd(a.length)];
function shuffle(a){ a=[...a]; for(let i=a.length-1;i>0;i--){ const j=rnd(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function pickN(a,n){ return shuffle(a).slice(0,n); }

// ═══════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════
let toastTmr;
// Star icons used everywhere instead of medals. Stored values stay 'gold' / 'silver',
// so existing families' charts and meal stars show the new icons with no data change.
const STAR_HTML = { gold:'<span class="star-ic gold">⭐</span>', silver:'<span class="star-ic silver">⭐</span>' };

function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTmr);
  toastTmr=setTimeout(()=>t.classList.remove('show'),2600);
}
