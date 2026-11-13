/* basis.js – gemeinsamer Kern aller Excel-Trainer (wenn, und-oder, funktionen, bezuege)
 *
 * Einbinden (nach dem Markup, vor den eigenen <script>s), dazu genau eine Ergänzung je Seitenart:
 *   Formeln aus Bausteinen (wenn, und-oder):   basis.css + bausteine.css, basis.js + bausteine.js
 *   Tabellenblatt (funktionen, bezuege):       basis.css + tabelle.css,   basis.js + tabelle.js
 * Alles sind globale Namen, kein Build-Schritt, läuft auch per file://.
 *
 * API
 *   $, esc, rand, clamp, rng, shuffle, pick1, ri, C, B, normQuotes, FErr   Helfer und Zufall
 *   store(k, v), load(k)       localStorage unter KEY + k; store meldet TrainerSync.changed()
 *   isSolved(i), markSolved()  gelöste Übung je Stufe (solved[level])
 *   countSolved()              zählt eine gelöste Übung bzw. Endlos-Aufgabe (Serie, Rekord), → „erstmals“
 *   skipTask()                 Endlos: andere Aufgabe, Serie auf 0
 *   renderHeader()             Flammen (Stufen 1 … solange LEVELS[n] existiert), Modusknöpfe, Theme-Symbol
 *   navPfad(), navLernen(idx, n, info)   Knöpfe Prüfen/Zurücksetzen/Zurück/Weiter je Modus
 *   dockHTML(groups)           Dock für Übungen/Endlos; groups = Gruppennamen (Gruppe = letztes STD-Feld)
 *   navClick(e)                Flammen, Modi, Aufgabenwahl, Dock – am Ende des Klick-Handlers aufrufen
 *   Drag & Drop (Maus/Touch)   Ziehen, Ablageziel hervorheben, Einfügemarke in Zeilen (.iw)
 *   AC                         Autovervollständigung wie in Excel für Eingaben mit Klasse .acin
 *   Verdrahtet: #themeBtn, #checkBtn → check(), #nextBtn → nextTask(), #skipBtn → skipTask(),
 *   Escape schließt die Aufgabenwahl.
 *
 * Die Seite (bzw. bausteine.js/tabelle.js) liefert
 *   KEY, LEVELS, STD; let mode, level, pfadIdx, solved, streak, best, endCounted, pickerOpen
 *   check, loadTask, setLevel, setMode, gotoTask, canNext, nextTask, newEndless, renderDock
 *   Drag-Hooks: dragData(b, e) → Zusatzfelder für D (src:true = Quelle blass) oder null;
 *     dropOk(t); applyDrop(d, type, idx, t); dragTap(d) bei Klick ohne Ziehen; optional dragGhost(g)
 *   AC_FN = [{n, v | a, d}]; optional AC.word(before, inp) → getipptes Wort oder null
 *
 * Gerüst einer Seite
 *   <link rel="stylesheet" href="basis.css"><link rel="stylesheet" href="tabelle.css"> … Markup
 *   <script src="basis.js"></script><script src="tabelle.js"></script>
 *   <script>
 *     const KEY = 'xy-', LEVELS = [null, {name:'…'}], STD = [[…, 1]];
 *     let mode = load('mode') || 'pfad', level = 1, pfadIdx = 0, solved = {}, streak = 0,
 *         best = 0, endCounted = false, pickerOpen = false, …;
 *     function check(){ … logSolved(countSolved()); … }   function loadTask(){ … }  …
 *     if (mode === 'endlos') newEndless();
 *     loadTask();
 *   </script>
 */

/* ================= Teil A: alle Seiten ================= */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const rand = () => (Math.random() * 1e9) | 0;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
function rng(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle(arr, r){ const a = arr.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const pick1 = (r, a) => a[Math.floor(r() * a.length)];
const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const C = s => `<code>${s}</code>`, B = s => `<b>${s}</b>`;
function normQuotes(s){ return s.replace(/[„“”″«»]/g, '"'); }
class FErr extends Error { constructor(msg){ super(msg); this.name = 'FErr'; } }

/* Speicher (Schlüssel KEY + k) und Fortschritt */
function store(k, v){ try{ localStorage.setItem(KEY + k, v); }catch(e){} if (window.TrainerSync) TrainerSync.changed(); }
function load(k){ try{ return localStorage.getItem(KEY + k); }catch(e){ return null; } }
function isSolved(i){ return (solved[level] || []).includes(i); }
function markSolved(){ const a = solved[level] || (solved[level] = []); if (!a.includes(pfadIdx)){ a.push(pfadIdx); store('solved', JSON.stringify(solved)); } }
function countSolved(){
  if (mode === 'pfad'){ const erstmals = !isSolved(pfadIdx); markSolved(); return erstmals; }
  const erstmals = !endCounted;
  if (!endCounted){ endCounted = true; streak++; if (streak > best){ best = streak; store('best', best); } }
  return erstmals;
}
function skipTask(){ streak = 0; newEndless(); loadTask(); }

/* Kopfzeile, Navigation, Dock */
function renderHeader(){
  let h = '';
  for (let n = 1; LEVELS[n]; n++){
    h += `<button class="flame${n === level ? ' on' : ''}" data-level="${n}" title="Stufe ${n}: ${esc(LEVELS[n].name)}" aria-label="Stufe ${n}" aria-pressed="${n === level}">
      ${window.PF_FLAMME ? String(window.PF_FLAMME).replace(/\{n\}/g, n) : `<svg viewBox="0 0 32 40"><path d="M16 2C18 9 27 14 27 26C27 33 22 38 16 38C10 38 5 33 5 26C5 20 9 16 11 11C12 15 13 17 15 18C16 13 17 8 16 2Z"/>
      <text x="16" y="32" text-anchor="middle">${n}</text></svg>`}</button>`;   // Design (lib/designs.js) kann die Flamme ersetzen
  }
  $('#flames').innerHTML = h;
  $('#flames').style.display = mode === 'lernen' ? 'none' : '';
  document.querySelectorAll('.modes button').forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
  const dark = document.documentElement.dataset.theme === 'dark';
  $('#themeBtn').innerHTML = dark
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
}
function navButtons(){ return {nb:$('#nextBtn'), pb:$('#prevBtn'), sb:$('#skipBtn'), cb:$('#checkBtn'), rb:$('#resetBtn'), ob:$('#ovBtn')}; }
function navPfad(){
  const {nb, pb, sb, cb, rb, ob} = navButtons();
  cb.style.display = rb.style.display = nb.style.display = ''; if (ob) ob.style.display = 'none';
  pb.style.display = mode === 'pfad' ? '' : 'none'; pb.disabled = pfadIdx === 0;
  sb.style.display = mode === 'endlos' ? '' : 'none';
  const ok = canNext(); nb.disabled = !ok;
  if (mode === 'pfad' && pfadIdx === STD.length - 1 && isSolved(pfadIdx)) nb.textContent = 'Alle Übungen geschafft 🎉';
  else nb.textContent = (ok ? '' : '🔒 ') + 'Nächste Aufgabe ▶';
  nb.title = ok ? '' : 'Erst die aktuelle Aufgabe richtig lösen';
}
function navLernen(idx, n, info){
  const {nb, pb, sb, cb, rb, ob} = navButtons();
  pb.style.display = ''; pb.disabled = idx === 0; sb.style.display = 'none'; if (ob) ob.style.display = '';
  cb.style.display = rb.style.display = info ? 'none' : '';
  nb.style.display = idx === n - 1 ? 'none' : '';
  const ok = canNext(); nb.disabled = !ok;
  nb.textContent = (ok ? '' : '🔒 ') + 'Weiter ▶';
  nb.title = ok ? '' : 'Erst die Aufgabe in diesem Schritt richtig lösen';
}
function dockHTML(groups){
  if (mode === 'endlos') return `<div class="dockbtn static">🔥 Serie: ${streak} <span class="sub">· Rekord ${best}</span></div>`;
  let h = `<button class="dockbtn" id="dockBtn" aria-expanded="${pickerOpen}">▦ Aufgabe ${pfadIdx + 1}/${STD.length} <span class="sub">· ${(solved[level] || []).length} gelöst</span></button>`;
  if (!pickerOpen) return h;
  const btn = i => `<button data-goto="${i}" class="${isSolved(i) ? 'solved' : ''}${i === pfadIdx ? ' cur' : ''}">${i + 1}</button>`;
  h += `<div class="picker"><div class="ptitle">Zu Aufgabe springen – grün = auf Stufe ${level} gelöst</div>`;
  if (!groups) h += '<div class="pg">' + STD.map((_, i) => btn(i)).join('') + '</div>';
  else for (let g = 1; g < groups.length; g++)
    h += `<div class="pgl">${esc(groups[g])}</div><div class="pg">` + STD.map((e, i) => e[e.length - 1] !== g ? '' : btn(i)).join('') + '</div>';
  return h + '</div>';
}
function navClick(e){
  const f = e.target.closest('.flame'); if (f){ setLevel(+f.dataset.level); return; }
  const m = e.target.closest('.modes button'); if (m){ setMode(m.dataset.mode); return; }
  const g = e.target.closest('[data-goto]'); if (g){ gotoTask(+g.dataset.goto); return; }
  if (e.target.closest('#dockBtn')){ pickerOpen = !pickerOpen; renderDock(); return; }
  if (pickerOpen && !e.target.closest('.picker')){ pickerOpen = false; renderDock(); }
}
$('#checkBtn').addEventListener('click', () => check());
$('#nextBtn').addEventListener('click', () => nextTask());
$('#skipBtn').addEventListener('click', () => skipTask());
$('#themeBtn').addEventListener('click', () => {
  const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = t; try { localStorage.setItem('wenn-theme', t); } catch (e) {} renderHeader();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && pickerOpen){ pickerOpen = false; renderDock(); } });

/* Drag & Drop (Maus + Touch über Pointer Events) */
let D = null, hoverEl = null, insEl = null, scrollRAF = null;
function findTarget(x, y){
  const el = document.elementFromPoint(x, y);
  let t = el && el.closest && el.closest('[data-drop]');
  // ein Baustein darf nicht in sich selbst abgelegt werden (z. B. Wert in den eigenen Baustein)
  while (t && D.el.contains(t)) t = t.parentElement && t.parentElement.closest('[data-drop]');
  return t && dropOk(t) ? t : null;
}
function rowIndex(row, x, y){
  const kids = [...row.querySelectorAll(':scope > .iw')];
  for (let i = 0; i < kids.length; i++){
    const r = kids[i].getBoundingClientRect();
    if (y < r.top) return i;
    if (y <= r.bottom && x < r.left + r.width / 2) return i;
  }
  return kids.length;
}
function clearHover(){
  if (hoverEl){ hoverEl.classList.remove('drop-hover'); hoverEl = null; }
  if (insEl){ insEl.classList.remove('ins', 'ins-after'); insEl = null; }
}
function updateHover(x, y){
  clearHover();
  const t = findTarget(x, y); if (!t) return;
  hoverEl = t; t.classList.add('drop-hover');
  if (t.dataset.drop === 'row'){
    const kids = [...t.querySelectorAll(':scope > .iw')], i = rowIndex(t, x, y);
    if (kids.length){ insEl = i < kids.length ? kids[i] : kids[kids.length - 1]; insEl.classList.add(i < kids.length ? 'ins' : 'ins-after'); }
  }
}
function autoScroll(){
  if (!D || !D.started) return;
  const topEdge = document.querySelector('header').getBoundingClientRect().bottom + 20;
  if (D.y < topEdge) window.scrollBy(0, -8); else if (D.y > innerHeight - 30) window.scrollBy(0, 8);
  updateHover(D.x, D.y);
  scrollRAF = requestAnimationFrame(autoScroll);
}
function endDrag(cancel){
  cancelAnimationFrame(scrollRAF);
  const t = cancel ? null : findTarget(D.x, D.y);
  const idx = t && t.dataset.drop === 'row' ? rowIndex(t, D.x, D.y) : 0;
  clearHover(); D.ghost.remove(); D.el.classList.remove('drag-src'); document.body.classList.remove('dragging');
  const d = D; D = null;
  if (t) applyDrop(d, t.dataset.drop, idx, t);
}
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('.block[data-drag]');
  if (!b || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const extra = dragData(b, e); if (!extra) return;
  e.preventDefault();
  D = Object.assign({el:b, x0:e.clientX, y0:e.clientY, x:e.clientX, y:e.clientY, started:false}, extra);
});
window.addEventListener('pointermove', e => {
  if (!D) return;
  D.x = e.clientX; D.y = e.clientY;
  if (!D.started){
    if (Math.hypot(e.clientX - D.x0, e.clientY - D.y0) < 5) return;
    const r = D.el.getBoundingClientRect(), g = D.el.cloneNode(true);
    ['select', 'input'].forEach(sel => { const gs = g.querySelectorAll(sel); D.el.querySelectorAll(sel).forEach((s, i) => { gs[i].value = s.value; }); });
    if (window.dragGhost) dragGhost(g);
    g.classList.add('drag-ghost'); g.classList.remove('drag-src');
    g.style.width = r.width + 'px'; g.style.left = r.left + 'px'; g.style.top = r.top + 'px';
    document.body.appendChild(g);
    D.ghost = g; D.dx = D.x0 - r.left; D.dy = D.y0 - r.top; D.started = true;
    if (D.src) D.el.classList.add('drag-src');
    document.body.classList.add('dragging');
    autoScroll();
  }
  D.ghost.style.left = (e.clientX - D.dx) + 'px'; D.ghost.style.top = (e.clientY - D.dy) + 'px';
  updateHover(e.clientX, e.clientY);
}, {passive:false});
window.addEventListener('pointerup', () => {
  if (!D) return;
  if (D.started){ endDrag(false); return; }
  const d = D; D = null;
  dragTap(d);
});
window.addEventListener('pointercancel', () => { if (!D) return; if (D.started) endDrag(true); else D = null; });

/* Autovervollständigung wie in Excel: Funktionsliste beim Tippen, Argument-Hinweis in Klammern */
const acCanvas = document.createElement('canvas').getContext('2d');
const AC = {list:[], sel:0, key:'', start:0, token:'', closed:'', input:null,
  digits:false,           // Funktionsnamen dürfen Ziffern enthalten (ANZAHL2)
  prev:/[=(;<>\s,]/,      // erlaubtes Zeichen vor dem getippten Wort
  // getipptes Wort am Cursor (oder null); in #ft erst nach einem „=“
  word:(before, inp) => { const m = before.match(/[A-Za-zÄÖÜäöüß]+$/); return m && (inp.id !== 'ft' || before.trimStart().startsWith('=')) ? m[0] : null; }};
function acArgs(f, i){
  if (f.a) return f.a;
  const n = Math.max(2, i + 1), out = [];
  for (let k = 1; k <= n; k++) out.push(k === 1 ? f.v + k : `[${f.v}${k}]`);
  return [...out, '…'];
}
function acCaretX(inp, idx){
  const cs = getComputedStyle(inp), r = inp.getBoundingClientRect();
  acCanvas.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  return r.left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth) + acCanvas.measureText(inp.value.slice(0, idx)).width - inp.scrollLeft;
}
function acEls(){
  let pop = document.getElementById('acpop'), tip = document.getElementById('actip');
  if (!pop){
    pop = document.createElement('div'); pop.id = 'acpop'; pop.className = 'acpop'; document.body.appendChild(pop);
    tip = document.createElement('div'); tip.id = 'actip'; tip.className = 'actip'; document.body.appendChild(tip);
    pop.addEventListener('pointerdown', e => { const it = e.target.closest('[data-aci]'); e.preventDefault(); if (it){ AC.sel = +it.dataset.aci; acInsert(); } });
  }
  return {pop, tip};
}
function acHide(){ const {pop, tip} = acEls(); pop.style.display = 'none'; tip.style.display = 'none'; AC.list = []; }
function acPlace(el, x, inp){
  const r = inp.getBoundingClientRect();
  el.style.display = 'block';
  el.style.left = Math.max(8, Math.min(x - 6, innerWidth - el.offsetWidth - 8)) + 'px';
  el.style.top = (r.bottom + 4) + 'px';
}
function acUpdate(inp){
  inp = inp || document.activeElement;
  if (!inp || !inp.matches || !inp.matches('.acin') || document.activeElement !== inp){ acHide(); return; }
  AC.input = inp;
  const {pop, tip} = acEls();
  const pos = inp.selectionStart ?? inp.value.length, before = normQuotes(inp.value.slice(0, pos));
  // Zeichen für Zeichen lesen: Textbereiche überspringen, offene Funktionen merken
  const stack = []; let inStr = false, word = '', wstart = 0;
  for (let i = 0; i < before.length; i++){
    const ch = before[i];
    if (ch === '"'){ inStr = !inStr; word = ''; continue; }
    if (inStr) continue;
    if (/[A-Za-zÄÖÜäöüß]/.test(ch) || (AC.digits && word && /[0-9]/.test(ch))){ if (!word) wstart = i; word += ch; continue; }
    if (ch === '(') stack.push({fn:word.toUpperCase(), i:0, at:wstart});
    else if (ch === ';' && stack.length) stack[stack.length - 1].i++;
    else if (ch === ')') stack.pop();
    word = '';
  }
  // Funktionsliste: nur wenn gerade ein Funktionsname getippt wird (nicht in Text, nicht Teil einer Zelle)
  let list = [], token = '', start = pos;
  const w = !inStr && AC.word(before, inp);
  if (w){
    token = w; start = pos - token.length;
    const prev = before[start - 1];
    if (!prev || AC.prev.test(prev)) list = AC_FN.filter(f => f.n.startsWith(token.toUpperCase()));
    if (list.length === 1 && list[0].n === token.toUpperCase() && inp.value[pos] === '(') list = [];
  }
  const key = start + ':' + token.toUpperCase();
  if (AC.closed === key) list = [];
  if (key !== AC.key) AC.sel = 0;
  AC.key = key; AC.token = token; AC.start = start; AC.list = list;
  if (AC.sel >= list.length) AC.sel = 0;
  if (list.length){
    const f = list[AC.sel];
    pop.innerHTML = `<div class="acl">${list.map((x, i) => `<div class="aci${i === AC.sel ? ' sel' : ''}" data-aci="${i}"><span class="acfx">fx</span>${x.n}</div>`).join('')}</div><div class="acdesc">${esc(f.d)}</div><div class="ackey">Tab ↹ fügt ein · ↑ ↓ wählen</div>`;
    acPlace(pop, acCaretX(inp, start), inp);
    tip.style.display = 'none';
    return;
  }
  pop.style.display = 'none';
  const top = stack[stack.length - 1], f = top && AC_FN.find(x => x.n === top.fn);
  if (f){
    const args = acArgs(f, top.i);
    const act = f.a ? Math.min(top.i, args.length - 1) : top.i;
    tip.innerHTML = `<span class="acfn">${f.n}</span>(${args.map((a, i) => i === act ? `<b>${esc(a)}</b>` : esc(a)).join('; ')})`;
    acPlace(tip, acCaretX(inp, top.at), inp);
  } else tip.style.display = 'none';
}
function acInsert(){
  const inp = AC.input, f = AC.list[AC.sel];
  if (!inp || !f) return;
  const pos = inp.selectionStart ?? inp.value.length;
  const after = inp.value.slice(pos), add = after.startsWith('(') ? f.n : f.n + '(';
  inp.value = inp.value.slice(0, AC.start) + add + after;
  const c = AC.start + f.n.length + 1;
  inp.focus(); inp.setSelectionRange(c, c);
  inp.dispatchEvent(new Event('input', {bubbles:true}));
  acUpdate(inp);
}
document.addEventListener('keydown', e => {
  if (!e.target.matches || !e.target.matches('.acin') || !AC.list.length) return;
  if (e.key === 'ArrowDown'){ e.preventDefault(); AC.sel = (AC.sel + 1) % AC.list.length; acUpdate(e.target); }
  else if (e.key === 'ArrowUp'){ e.preventDefault(); AC.sel = (AC.sel - 1 + AC.list.length) % AC.list.length; acUpdate(e.target); }
  else if (e.key === 'Tab'){ e.preventDefault(); acInsert(); }
  else if (e.key === 'Escape'){ e.preventDefault(); AC.closed = AC.key; acUpdate(e.target); }
  else if (e.key === 'Enter'){ acHide(); }
}, true);
document.addEventListener('keyup', e => { if (e.target.matches && e.target.matches('.acin') && !['ArrowDown', 'ArrowUp', 'Tab', 'Escape', 'Enter', 'F4'].includes(e.key)) acUpdate(e.target); });
document.addEventListener('focusin', e => { if (e.target.matches && e.target.matches('.acin')) acUpdate(e.target); });
document.addEventListener('focusout', () => setTimeout(() => acUpdate(), 0));
window.addEventListener('scroll', () => { if (AC.input && document.activeElement === AC.input) acUpdate(AC.input); }, {passive:true});
window.addEventListener('resize', () => acUpdate());
