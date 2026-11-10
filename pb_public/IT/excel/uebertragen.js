/* uebertragen.js – Formeln übertragen und $-Zeichen setzen, wie in Excel (Seiten: bezuege, wenn-bezuege, und-oder-bezuege)
 * Laden nach basis.js, tabelle.js und dem Skript der Seite; dazu basis.css + tabelle.css.
 * Markup: wie in bezuege.html (#taskcard, #sheetcard mit #fbar/#pools/#grid/#chips, #workcard, #actions, #fb, #dock).
 *
 * Stufen (fest, LEVELS): 1 $-Zeichen setzen · 2 Zellen auswählen und $ setzen · 3 Rechnung aus Bausteinen ·
 *   4 Zeichen als Bausteine · 5 freie Eingabe mit Hinweisen · 6 freie Eingabe ohne Hinweise.
 * Modi: pfad (Übungen aus STD), endlos (Zufall aus GENS), lernen (nur wenn TOPICS nicht leer).
 *   Ein Modus lässt sich über die Adresse wählen: seite.html#pfad bzw. #endlos.
 * Geprüft wird, ob die Formel nach dem Übertragen in allen Zellen dasselbe ergibt wie die Musterlösung,
 *   auch mit 8 veränderten Zahlentabellen (abgeschriebene Zahlen fallen auf). Hinweise nennen falsche $-Zeichen.
 *
 * Die Seite liefert (vor dieser Datei)
 *   KEY = 'bz-'                      Speicherschlüssel
 *   GENS = {id: {title, make(r)}}    Aufgaben-Generator; make(r) mit Zufall r() liefert
 *     {intro, cells: {A4:'Name', B5:12, C5:'=…'}, fmt: {B2:'eur'|'usd'|'pct'}, ffmt (Format der Ergebnisse),
 *      fill: ['D5', 'D9'] (Formel in D5, übertragen bis D9), ref: '=B5*$B$2' (Musterlösung),
 *      what: '… berechnet' (ergänzt „Schreibe in D5 eine Formel, die …“), tip (optional, bis Stufe 4)}
 *   STD = [[gid, seed, gruppe]]      Übungen; GROUPS = [null, 'Gruppenname', …]
 *   TOPICS = [{id, name, desc, steps}] Erklärung (oder []), OV_INTRO (Text der Übersicht)
 *   HILFE    HTML, das bis Stufe 5 unter der Aufgabe steht (z. B. <details> zum $)
 *   SYM4     Zeichen-Bausteine auf Stufe 4, z. B. ['=', '+', '(', ')', 'SUMME(']; Zahlen und Texte der Lösung kommen dazu
 *   AC_FN    Funktionen für die Autovervollständigung (siehe basis.js)
 * Hilfen für Generatoren: rd(r, a, b, Stellen), pickN(r, liste, n), cols('B', 5) → ['B', … 'F']
 */

/* ---- Formel übertragen wie in Excel: relative Teile wandern, $-Teile bleiben ---- */
const REFRE = () => /(^|[^A-Za-z0-9_$ÄÖÜäöüß.])(\$?)([A-Za-z]{1,3})(\$?)(\d{1,5})(?![A-Za-z0-9_(])/g;
function outsideStrings(s, fn){
  let out = '', chunk = '', inStr = false;
  for (const ch of normQuotes(s)){
    if (ch === '"'){ if (!inStr){ out += fn(chunk); chunk = ''; } out += ch; inStr = !inStr; continue; }
    if (inStr) out += ch; else chunk += ch;
  }
  return out + fn(chunk);
}
function shiftFormula(s, dc, dr){
  return outsideStrings(s, part => part.replace(REFRE(), (m, pre, d1, col, d2, row) => {
    const c = colN(col) + (d1 ? 0 : dc), r = +row + (d2 ? 0 : dr);
    if (c < 0 || r < 1) return pre + '#BEZUG!';
    return pre + d1 + colL(c) + d2 + r;
  }));
}
// alle Zellbezüge (auch Bereichsgrenzen) mit ihren $-Zeichen
function refTokens(s){
  const out = [];
  outsideStrings(s, part => { const re = REFRE(); let m;
    while ((m = re.exec(part))){ out.push({raw:(m[2] + m[3] + m[4] + m[5]).toUpperCase(), c:colN(m[3]), r:+m[5], fc:!!m[2], fr:!!m[4]}); re.lastIndex = m.index + m[0].length; }
    return part; });
  return out;
}
const strip$ = s => s.replace(/\$/g, '').replace(/\s+/g, '').toUpperCase();
function offset(T, f){ const a = addr(T.src), b = addr(f); return {dc:b.c - a.c, dr:b.r - a.r}; }
function runCopy(text, T, cells){
  const c = Object.assign({}, cells), forms = {};
  T.fill.forEach(f => { const o = offset(T, f); forms[f] = shiftFormula(text, o.dc, o.dr); c[f] = forms[f]; });
  const sh = new Sheet(c), vals = {};
  T.fill.forEach(f => { vals[f] = sh.val(f); });
  return {vals, forms};
}

/* ---- Zufallszahlen ---- */
const rd = (r, a, b, dp) => +(a + r() * (b - a)).toFixed(dp);
const pickN = (r, arr, n) => shuffle(arr, r).slice(0, n);
const cols = (from, n) => [...Array(n)].map((_, i) => colL(colN(from) + i));
// gleiche Tabelle mit anderen Zahlen – damit abgeschriebene Zahlen auffallen
function perturb(cells, r){
  const out = {};
  for (const [k, v] of Object.entries(cells)){
    if (typeof v !== 'number'){ out[k] = v; continue; }
    let w;
    if (Number.isInteger(v)) w = v <= 0 ? v + ri(r, -6, 6) || 1 : Math.max(1, Math.round(v * (0.5 + r() * 1.2)));
    else if (v > 0 && v < 1) w = rd(r, 0.02, 0.45, 2);
    else w = +(v * (0.5 + r() * 1.2)).toFixed(2);
    if (w === v) w = v + 1;
    out[k] = w;
  }
  return out;
}

// Formel in Bausteine zerlegen: Funktion mit Klammer, Zellbezug, Zahl oder einzelnes Zeichen
function piecesOf(ref){
  const out = []; let i = 0;
  while (i < ref.length){
    const rest = ref.slice(i); let m;
    if ((m = rest.match(/^[A-ZÄÖÜ]{2,}\d*\(/))) out.push({lit:m[0]});
    else if ((m = rest.match(/^\$?[A-Z]{1,3}\$?\d{1,5}/))) out.push({cell:true, raw:m[0]});
    else if ((m = rest.match(/^\d+(,\d+)?/))) out.push({lit:m[0]});
    else if ((m = rest.match(/^"[^"]*"/))) out.push({lit:m[0]});
    else if ((m = rest.match(/^(<=|>=|<>)/))) out.push({lit:m[0]});
    else { m = [rest[0]]; out.push({lit:m[0]}); }
    i += m[0].length;
  }
  return out;
}
// Jeder einzelne falsche $-Bezug (ein Bezug in einem anderen der vier Zustände) soll schon in der gezeigten Tabelle
// ein anderes Ergebnis liefern – sonst würfelt makeTask die Zahlen neu (höchstens 40-mal, sonst bleibt der erste Wurf).
function jederFehlerSichtbar(o){
  const T = {src:o.fill[0], fill:rangeCells(o.fill[0], o.fill[1])}, want = runCopy(o.ref, T, o.cells);
  const re = REFRE(), teile = []; let m;
  while ((m = re.exec(o.ref))){ teile.push({st:m.index + m[1].length, en:m.index + m[0].length, col:m[3], row:m[5], d1:m[2], d2:m[4]}); re.lastIndex = m.index + m[0].length; }
  for (const t of teile) for (const [d1, d2] of [['', ''], ['$', '$'], ['$', ''], ['', '$']]){
    if (d1 === t.d1 && d2 === t.d2) continue;
    const falsch = o.ref.slice(0, t.st) + d1 + t.col + d2 + t.row + o.ref.slice(t.en);
    const mine = runCopy(falsch, T, o.cells);
    if (T.fill.every(f => strip$(mine.forms[f]) === strip$(want.forms[f]))) continue;   // bewirkt in dieser Richtung nichts
    if (T.fill.every(f => same(mine.vals[f], want.vals[f]))) return false;
  }
  return true;
}
function makeTask(gid, seed, lv){
  const G = GENS[gid], s0 = seed == null ? 4711 : seed, r0 = rng(s0);
  const o0 = G.make(r0);
  let o = o0, k = 0;
  while (k++ < 40 && !jederFehlerSichtbar(o)) o = G.make(r0);
  if (!jederFehlerSichtbar(o)) o = o0;   // kein Wurf passt (z. B. Bereich wächst in leere Zellen): beim ersten bleiben
  const [src, end] = o.fill, fill = rangeCells(src, end), a = addr(src), b = addr(end);
  const dir = a.c === b.c ? `nach unten bis ${B(end)}` : a.r === b.r ? `nach rechts bis ${B(end)}` : `in den ganzen Bereich ${B(src + ':' + end)}`;
  const how = {
    2:' Die Rechenzeichen sind schon vorgegeben: Klicke in ein Zell-Feld, dann auf die passende Zelle in der Tabelle, und setze – wo nötig – $-Zeichen.',
    3:' Ziehe die Bausteine in der richtigen Reihenfolge in die Formelzeile. In die Zell-Felder setzt du die passenden Zellen – wo nötig mit $.',
    4:' Baue die Formel aus den Zeichen-Bausteinen. Für jede Zelle ziehst du einen Baustein „Zelle“ in die Formel und wählst dann die Zelle aus – wo nötig mit $.'};
  let text = lv === 1
    ? `In ${B(src)} steht schon eine Formel, die ${o.what}. Sie rechnet in ${src} richtig. Setze die $-Zeichen so, dass sie sich ${dir} übertragen lässt. Wo kein $ nötig ist, lässt du es weg.`
    : `Schreibe in ${B(src)} eine Formel, die ${o.what}. Die Formel soll sich ${dir} übertragen lassen.` + (how[lv] || '');
  if (o.tip && lv <= 4) text += `<br><i>Tipp:</i> ${o.tip}`;
  const fmt = Object.assign({}, o.fmt || {});
  if (o.ffmt) fill.forEach(f => { fmt[f] = o.ffmt; });
  const vr = rng(s0 ^ 0x5bd1e995), variants = [];
  for (let i = 0; i < 8; i++) variants.push(perturb(o.cells, vr));
  const top = Math.min(...Object.keys(o.cells).map(k => addr(k).r));
  return {gid, seed:s0, lv, title:G.title, intro:o.intro, cells:o.cells, fmt, src, end, fill, ref:o.ref, text, variants, top,
    dcMax:b.c - a.c, drMax:b.r - a.r, pre:lv === 1 ? o.ref.replace(/\$/g, '') : '',
    pieces:piecesOf(o.ref), nums:piecesOf(o.ref).filter(p => /^[\d"]/.test(p.lit || '')).map(p => p.lit)};
}

const STEP_TOTAL = TOPICS.reduce((s, t) => s + t.steps.length, 0);

const LEVELS = {1:{name:'$-Zeichen setzen'}, 2:{name:'Zellen auswählen und $ setzen'}, 3:{name:'Rechnung aus Bausteinen'}, 4:{name:'Zeichen als Bausteine'}, 5:{name:'Freie Eingabe mit Hinweisen'}, 6:{name:'Freie Eingabe ohne Hinweise'}};
const NLV = 6;
const IA = 'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"';
const isBlk = () => !!CUR && CUR.lv >= 2 && CUR.lv <= 4;

const MODI = TOPICS.length ? ['pfad', 'endlos', 'lernen'] : ['pfad', 'endlos'];
let mode = MODI.includes(location.hash.slice(1)) ? location.hash.slice(1) : MODI.includes(load('mode')) ? load('mode') : MODI[MODI.length - 1];
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
let level = clamp(parseInt(load('level')) || 1, 1, NLV);
let pfadIdx = clamp(parseInt(load('idx')) || 0, 0, STD.length - 1);
let solved = {}; try { const x = JSON.parse(load('solved') || '{}'); solved = x && !Array.isArray(x) ? x : {}; } catch (e) {}
let endPick = null, endCounted = false, streak = 0, best = parseInt(load('best')) || 0;
let learn = {topic:null, prog:{}};
try { const o = JSON.parse(load('learn') || '{}'); learn.prog = o.prog || {}; learn.topic = TOPICS.some(t => t.id === o.topic) ? o.topic : null; } catch (e) {}
let CUR = null, S = {}, LS = null, LSHEET = null, pickerOpen = false, PT = null;

/* gelöste Aufgabe bzw. erledigten Schritt an den Server melden (nur wenn die Seite über PocketBase läuft) */
function logSolved(erstmals){
  if (!window.TrainerSync) return;
  if (mode === 'lernen'){
    const tp = topic(), i = prog().idx, st = tp.steps[i];
    TrainerSync.event({modus:'erarbeitung', stufe:st.task ? st.task[2] : 0, aufgabe:`${tp.id}-${i + 1}`, titel:`${tp.name}: ${st.title}`, gesamt:STEP_TOTAL, erstmals});
  } else TrainerSync.event({modus:mode === 'pfad' ? 'uebungen' : 'endlos', stufe:level,
    aufgabe:mode === 'pfad' ? String(pfadIdx + 1) : CUR.gid, titel:CUR.title, gesamt:mode === 'pfad' ? STD.length : 0, erstmals});
}

/* ---------- Aufgaben- und Modussteuerung ---------- */
function resetS(){
  S = {text:CUR ? CUR.pre : '', row:[], p3:[], gi:null, success:false, fb:null, vals:null, forms:null, bad:new Set(), peek:null, inspect:null, sel:null};
  if (!CUR) return;
  // Stufe 2: Rechenzeichen fest, Zellen als Felder; Stufe 3: die Teile der Formel als Bausteine
  if (CUR.lv === 2) S.row = CUR.pieces.map(p => p.cell ? {t:'cell', v:''} : {t:'sym', lit:p.lit});
  if (CUR.lv === 3) S.p3 = shuffle(CUR.pieces.map((p, i) => ({pid:i, lit:p.cell ? null : p.lit})), rng(CUR.seed + 7));
}
const liveText = () => isBlk() ? S.row.map(x => x.t === 'cell' ? x.v : x.lit).join('') : S.text;
function loadTask(){
  PT = null; LS = null; LSHEET = null; CUR = null;
  if (mode === 'lernen'){ if (learn.topic) loadStep(); else { resetS(); render(); } return; }
  if (mode === 'pfad'){ const e = STD[pfadIdx]; CUR = makeTask(e[0], e[1], level); }
  else CUR = makeTask(endPick.gid, endPick.seed, level);
  resetS(); render();
}
function demoSheet(sh){
  const T = makeTask(sh.gid, sh.seed, 2), cells = Object.assign({}, T.cells);
  if (sh.formula) T.fill.forEach(f => { const o = offset(T, f); cells[f] = shiftFormula(sh.formula, o.dc, o.dr); });
  return {cells, fmt:T.fmt, top:T.top};
}
function loadStep(){
  const p = prog(), tp = topic();
  p.idx = clamp(p.idx, 0, tp.steps.length - 1); saveLearn();
  const st = tp.steps[p.idx];
  CUR = null; LS = null; LSHEET = null;
  if (st.type === 'task') CUR = makeTask(...st.task);
  resetS();
  if (st.type === 'choice') LS = {sel:new Set(), checked:false};
  if (st.sheet){ LSHEET = demoSheet(st.sheet); S.inspect = st.sheet.sel || null; }
  if (st.type === 'info') markStep();
  render();
}
function newEndless(){
  const ids = Object.keys(GENS), pool = ids.filter(g => !endPick || g !== endPick.gid);
  endPick = {gid:pick1(Math.random, pool), seed:rand()}; endCounted = false;
}
function setLevel(n){ level = n; store('level', n); pickerOpen = false; loadTask(); }
/* ---------- Rendering ---------- */
function render(){
  renderHeader();
  const show = (id, on) => { $(id).style.display = on ? '' : 'none'; };
  if (mode === 'lernen' && !learn.topic){ renderOverview(OV_INTRO); return; }
  show('#actions', true);
  const st = mode === 'lernen' ? curStep() : null;
  if (st){
    const tp = topic();
    $('#lvlname').textContent = `${tp.name} · ${st.title}`;
    $('#taskmeta').textContent = `Schritt ${prog().idx + 1} von ${tp.steps.length}`;
    let h = st.html;
    if (CUR) h += `<div class="assign"><div class="intro">${esc(CUR.intro)}</div><b>Aufgabe:</b> ${CUR.text}</div>${HILFE}`;
    if (st.final) h += finalButtons();
    $('#tasktext').innerHTML = h;
  } else {
    $('#lvlname').textContent = `Stufe ${level}: ${LEVELS[level].name}`;
    $('#taskmeta').textContent = mode === 'pfad' ? `Übungen · Aufgabe ${pfadIdx + 1} von ${STD.length}` : `Endlos · ${CUR.title}`;
    $('#tasktext').innerHTML = `<div class="intro"><b>${esc(CUR.title)}:</b> ${esc(CUR.intro)}</div><p>${CUR.text}</p>${CUR.lv < 6 ? HILFE : ''}`;
  }
  show('#sheetcard', !!(CUR || LSHEET));
  show('#workcard', !!(st && st.type === 'choice'));
  if (CUR || LSHEET){ renderFbar(); renderGrid(); }
  if (st && st.type === 'choice') renderChoice(st);
  renderFeedback(); renderNav();
}

function finalButtons(){
  const i = TOPICS.findIndex(t => t.id === learn.topic), nx = TOPICS[i + 1];
  return `<p style="margin-top:12px">${nx ? `<button class="btn primary" data-topic-go="${nx.id}">Weiter mit „${esc(nx.name)}“</button> ` : ''}<button class="btn${nx ? '' : ' primary'}" data-ov="1">Zur Übersicht</button> <button class="btn" data-mode-go="pfad">Zu den Übungen</button></p>`;
}


/* ---------- Tabelle & Bearbeitungsleiste ---------- */
function curSheet(){ return CUR ? {cells:CUR.cells, fmt:CUR.fmt, top:CUR.top} : LSHEET; }
const inFill = a => !!CUR && CUR.fill.includes(a);
function curRefs(sh){
  if (CUR) return refsInText(S.peek && S.forms ? S.forms[S.peek] : liveText());
  const raw = S.inspect && sh.cells[S.inspect];
  return typeof raw === 'string' && raw[0] === '=' ? refsInText(raw) : [];
}

function renderGrid(){
  const sh = curSheet(); if (!sh) return;
  const cells = sh.cells, keys = Object.keys(cells).concat(CUR ? CUR.fill : []);
  let maxC = 0, maxR = sh.top;
  keys.forEach(a => { const x = addr(a); maxC = Math.max(maxC, x.c); maxR = Math.max(maxR, x.r); });
  const book = new Sheet(cells), refs = curRefs(sh), col = {};
  refs.forEach((rg, i) => { if (rg.a.includes('#')) return; rangeCells(rg.a, rg.b).forEach(c => { col[c] = i % 6; }); });
  let h = `<table class="xl${CUR ? ' pick' : ''}"><tr><th></th>`;
  for (let c = 0; c <= maxC; c++) h += `<th>${colL(c)}</th>`;
  h += '</tr>';
  for (let r = sh.top; r <= maxR; r++){
    h += `<tr><th>${r}</th>`;
    for (let c = 0; c <= maxC; c++){
      const a = ad(c, r), cls = [];
      let content = '';
      if (inFill(a)){
        if (a === CUR.src) cls.push('tgt');
        if (S.vals){ cls.push(S.bad.has(a) ? 'bad' : 'good'); content = esc(fmtVal(S.vals[a], sh.fmt[a])); if (S.peek === a) cls.push('peekc'); }
        else if (a === CUR.src) content = esc(liveText());
        else cls.push('fill');
      } else {
        const v = book.val(a);
        content = esc(fmtVal(v, sh.fmt[a]));
        if (typeof cells[a] === 'string' && cells[a][0] !== '=') cls.push(c === 0 ? 'lbl' : 'hd');
        if (v.t === 'num' || v.t === 'err') cls.push('num');
        if (LSHEET && typeof cells[a] === 'string' && cells[a][0] === '=') cls.push('fill');
      }
      if (col[a] != null) cls.push('rc' + col[a]);
      if (S.sel && S.sel.has(a)) cls.push('sel');
      if (!CUR && S.inspect === a) cls.push('ins');
      h += `<td data-c="${a}" class="${cls.join(' ')}">${content}</td>`;
    }
    h += '</tr>';
  }
  $('#grid').innerHTML = h + '</table>';
  $('#sheetcard').classList.toggle('solved', !!S.success);
  if (!CUR){ $('#chips').innerHTML = '<span class="howto">Klicke auf eine Zelle, um oben zu sehen, was darin steht.</span>'; return; }
  if (S.peek && S.forms){
    const v = S.vals[S.peek];
    $('#chips').innerHTML = `<span class="peek">Nach dem Übertragen steht in <b>${S.peek}</b>: <code>${esc(S.forms[S.peek])}</code> → ${esc(fmtVal(v, sh.fmt[S.peek]) || '(leer)')}</span>`;
  } else if (S.vals) $('#chips').innerHTML = '<span class="howto">Klicke auf eine Zelle im grünen Bereich, um zu sehen, welche Formel nach dem Übertragen darin steht.</span>';
  else {
    const chips = refs.map((rg, i) => `<span class="chip c${i % 6}">${esc(rg.txt || rg.a)}</span>`).join('');
    $('#chips').innerHTML = chips + `<span class="howto">${chips ? '' : 'Tipp: '}${isBlk() ? 'Klicke in ein Zell-Feld und dann auf eine Zelle in der Tabelle.' : 'Zellen kannst du auch anklicken.'} $-Zeichen setzt du mit F4 oder dem Knopf <code>$ F4</code>.</span>`;
  }
}

function renderFbar(){
  const sh = curSheet(); if (!sh) return;
  const ia = 'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"';
  if (CUR){
    const lv = CUR.lv;
    let inner;
    if (lv === 2) inner = `<div class="fixrow">${S.row.map((x, i) => x.t === 'cell' ? cellInput(i) : `<span>${esc(x.lit)}</span>`).join('')}</div>`;
    else if (lv === 3 || lv === 4) inner = `<div class="row" data-drop="row">${S.row.map((x, i) => `<span class="iw">${rowBlock(x, i)}</span>`).join('') || '<span class="ph">Ziehe die Bausteine hierher, um die Formel zu bauen.</span>'}</div>`;
    else inner = `<input id="ft" class="ftin acin pin" ${ia} placeholder="Formel eingeben, z. B. =B5*$B$2" value="${esc(S.text)}" aria-label="Formel">`;
    $('#fbar').innerHTML = `<div class="nbox" title="Namenfeld: Hier kommt deine Formel hin">${CUR.src}</div><span class="fxl">fx</span><div class="fin">${inner}<button class="btn small dbtn" id="f4Btn" title="$-Zeichen im Bezug am Cursor setzen (wie F4 in Excel)">$ F4</button></div>`;
    renderPools();
  } else {
    $('#pools').innerHTML = '';
    const raw = S.inspect ? sh.cells[S.inspect] : null;
    const txt = raw == null ? '' : typeof raw === 'number' ? fmtNum(raw) : raw;
    $('#fbar').innerHTML = `<div class="nbox">${S.inspect || ''}</div><span class="fxl">fx</span><div class="fshow${txt ? '' : ' empty'}">${txt ? esc(txt) : (S.inspect ? '(leer)' : 'Klicke auf eine Zelle')}</div>`;
  }
  $('#selhint').textContent = '';
}

/* ---------- Bausteine (Stufe 2 bis 4) ---------- */
const blockKind = lit => /^[A-ZÄÖÜ]{2,}/.test(lit) ? 'fn' : /^[\d"]/.test(lit) ? 'val' : 'sym';
const cellInput = i => `<input class="gapin pin cg" data-ci="${i}" ${IA} placeholder="Zelle" value="${esc(S.row[i].v)}" aria-label="Zelle">`;
function rowBlock(x, i){
  return x.t === 'cell'
    ? `<div class="block val" data-drag="1" data-kind="rowitem" data-ri="${i}">${cellInput(i)}</div>`
    : `<div class="block ${blockKind(x.lit)}" data-drag="1" data-kind="rowitem" data-ri="${i}">${esc(x.lit)}</div>`;
}
function poolBlock(lit, o){
  return `<div class="block ${lit == null ? 'val' : blockKind(lit)}${o.ghost ? ' ghost' : ''}" data-drag="1" data-kind="pool" data-val="${lit == null ? '' : esc(lit)}"${o.pid != null ? ` data-pid="${o.pid}"` : ''}>${lit == null ? 'Zelle' : esc(lit)}</div>`;
}
function renderPools(){
  const P = $('#pools');
  if (!CUR || (CUR.lv !== 3 && CUR.lv !== 4)){ P.innerHTML = ''; return; }
  let items, title;
  if (CUR.lv === 3){
    const used = new Set(S.row.map(x => x.pid));
    items = S.p3.map(p => poolBlock(p.lit, {pid:p.pid, ghost:used.has(p.pid)}));
    title = 'Bausteine – jeder wird genau einmal gebraucht';
  } else {
    items = [...SYM4, ...CUR.nums.filter(n => !SYM4.includes(n))].map(l => poolBlock(l, {})).concat(poolBlock(null, {}));
    title = 'Zeichen – beliebig oft verwendbar';
  }
  P.innerHTML = `<div class="pool sympool" data-drop="pool"><div class="pool-title">${title}</div><div class="pool-items">${items.join('')}</div></div>`;
}

/* Drag & Drop: Hooks für den Kern in basis.js */
function dropOk(t){ const d = t.dataset.drop; return d === 'row' || (d === 'pool' && D.kind === 'rowitem'); }
function dragData(b, e){
  if (!CUR || e.target.closest('input,button') || b.classList.contains('ghost')) return null;
  const pid = b.dataset.pid != null ? +b.dataset.pid : null;
  return {kind:b.dataset.kind, val:b.dataset.val, pid, ri:b.dataset.ri != null ? +b.dataset.ri : null, src:b.dataset.kind === 'rowitem' || pid != null};
}
function dragGhost(g){ g.querySelectorAll('input').forEach(x => { x.className = 'gapin'; x.removeAttribute('data-ci'); }); }
function dragTap(d){ if (d.kind === 'pool') applyDrop(d, 'row', S.row.length); }   // Antippen statt Ziehen: hinten anhängen
function applyDrop(d, type, idx){
  let focusCell = null;
  if (type === 'row'){
    if (d.kind === 'rowitem'){ const [it] = S.row.splice(d.ri, 1); if (d.ri < idx) idx--; S.row.splice(idx, 0, it); }
    else {
      const it = d.val === '' ? {t:'cell', v:''} : {t:'sym', lit:d.val};
      if (d.pid != null) it.pid = d.pid;
      S.row.splice(idx, 0, it);
      if (it.t === 'cell') focusCell = it;
    }
  } else if (type === 'pool' && d.kind === 'rowitem') S.row.splice(d.ri, 1);
  S.gi = focusCell ? S.row.indexOf(focusCell) : null;
  S.sel = null; clearMarks(); renderFbar(); renderGrid();
  if (focusCell){ const g = document.querySelector(`.cg[data-ci="${S.gi}"]`); if (g) g.focus({preventScroll:true}); }
}

/* ---------- F4: $-Zeichen am Cursor durchschalten ---------- */
function f4(inp){
  inp = inp || $('#ft') || document.querySelector(`.cg[data-ci="${S.gi}"]`);
  if (!inp){ hint('Klicke zuerst in ein Zell-Feld – dann setzt F4 die $-Zeichen.'); return; }
  const v = inp.value, [s] = caret(inp), re = REFRE();
  let m, hit = null;
  while ((m = re.exec(v))){ const st = m.index + m[1].length, en = m.index + m[0].length; if (s >= st && s <= en){ hit = {st, en, m}; break; } re.lastIndex = en; }
  if (!hit){ hint('Setze den Cursor in einen Zellbezug (z. B. B2) – dann setzt F4 die $-Zeichen.'); focusInp(inp); return; }
  const [, , d1, cl, d2, rw] = hit.m, state = d1 && d2 ? 1 : d2 ? 2 : d1 ? 3 : 0, nx = (state + 1) % 4;
  const nw = (nx === 1 || nx === 3 ? '$' : '') + cl.toUpperCase() + (nx === 1 || nx === 2 ? '$' : '') + rw;
  inp.value = v.slice(0, hit.st) + nw + v.slice(hit.en);
  setCaret(inp, hit.st + nw.length); syncInput(inp, false); focusInp(inp);
}

/* ---------- Zellen mit der Maus einfügen (wie in Excel) ---------- */
function insertionPoint(inp){
  const v = inp.value, [s, e] = caret(inp), before = v.slice(0, s);
  const okBefore = pc => /[=(;+\-*/^:<>]/.test(pc);
  const m = before.match(/\$?[A-Za-z]{1,3}\$?\d{1,5}(?:\s*:\s*\$?[A-Za-z]{1,3}\$?\d{1,5})?$/);
  if (m){
    const st = s - m[0].length, pre = v.slice(0, st).replace(/\s+$/, '');
    if (okBefore(pre.slice(-1))) return {start:st, end:Math.max(s, e)};
  }
  const pc = before.replace(/\s+$/, '').slice(-1);
  if (okBefore(pc)) return {start:s, end:e};
  return {err:'Hier kann kein Bezug eingefügt werden. Setze den Cursor hinter „=“, ein Rechenzeichen oder „(“.'};
}
function syncInput(inp, keepSel){
  if (inp.classList.contains('cg')){ S.row[+inp.dataset.ci].v = inp.value; S.gi = +inp.dataset.ci; } else S.text = inp.value;
  if (!keepSel) S.sel = null;
  clearMarks(); renderGrid();
  acUpdate(inp);
}
gridEl.addEventListener('pointerdown', e => {
  const td = e.target.closest('td[data-c]'); if (!td || e.button > 0) return;
  const a = td.dataset.c;
  if (!CUR){ if (curSheet()){ S.inspect = a; renderFbar(); renderGrid(); } return; }
  e.preventDefault();
  if (S.vals && inFill(a)){ S.peek = a; renderGrid(); return; }
  if (isBlk()){
    const gaps = [...document.querySelectorAll('.cg')];
    const g = gaps.find(x => +x.dataset.ci === S.gi) || gaps.find(x => !x.value);
    if (!g){ hint(gaps.length ? 'Klicke zuerst in das Zell-Feld, das du ändern möchtest.' : 'Ziehe zuerst einen Baustein „Zelle“ in die Formel – dann kannst du eine Zelle auswählen.'); return; }
    if (a === CUR.src){ hint(`In ${a} steht deine Formel selbst.`); return; }
    g.value = a; setCaret(g, a.length); syncInput(g, false); focusInp(g);
    return;
  }
  const inp = $('#ft');
  if (a === CUR.src){ hint(`In ${a} steht deine Formel selbst.`); focusInp(inp); return; }
  if (!inp.value.trim()){ inp.value = '='; setCaret(inp, 1); }
  const at = insertionPoint(inp);
  if (at.err){ hint(at.err); focusInp(inp); return; }
  $('#selhint').textContent = '';
  PT = {inp, anchor:a, cur:a, start:at.start, end:at.end, base:inp.value};
  applyPT();
  try { gridEl.setPointerCapture(e.pointerId); } catch (x) {}
});
gridEl.addEventListener('pointermove', e => {
  if (!PT) return;
  const td = cellAt(e.clientX, e.clientY);
  if (td && td.dataset.c !== PT.cur && td.dataset.c !== CUR.src){ PT.cur = td.dataset.c; applyPT(); }
});
/* ---------- Prüfen ---------- */
const cellName = t => ad(t.c, t.r);
// Bezüge der Schülerformel den Bezügen der Musterlösung zuordnen (gleiche Zelle) und $-Fehler benennen
function refHints(text, T){
  const mine = refTokens(text), want = refTokens(T.ref), used = new Set(), out = [];
  const far = T.end, o = offset(T, far);
  let unmatched = 0;
  want.forEach(q => {
    const i = mine.findIndex((s, k) => !used.has(k) && s.c === q.c && s.r === q.r);
    if (i < 0){ unmatched++; return; }
    used.add(i); const s = mine[i];
    const colBad = T.dcMax > 0 && s.fc !== q.fc, rowBad = T.drMax > 0 && s.fr !== q.fr;
    if (!colBad && !rowBad) return;
    let m = `Aus ${C(s.raw)} wird beim Übertragen nach ${far} ${C(shiftFormula(s.raw, o.dc, o.dr))}.`;
    if (colBad) m += q.fc ? ` Die Spalte ${colL(q.c)} soll aber fest bleiben – setze ein $ vor das ${colL(q.c)}.` : ` Die Spalte soll aber mitwandern – vor dem ${colL(q.c)} darf kein $ stehen.`;
    if (rowBad) m += q.fr ? ` Die Zeile ${q.r} soll aber fest bleiben – setze ein $ vor die ${q.r}.` : ` Die Zeile soll aber mitwandern – vor der ${q.r} darf kein $ stehen.`;
    out.push(m);
  });
  const extra = mine.filter((s, k) => !used.has(k));
  if (unmatched || extra.length) out.unshift(extra.length
    ? `Prüfe ${extra.length > 1 ? 'die Bezüge' : 'den Bezug'} ${extra.map(s => C(s.raw)).join(', ')} – ist das die richtige Zelle für diese Rechnung?`
    : 'In deiner Formel fehlt noch ein Wert aus der Tabelle.');
  return [...new Set(out)];
}
// halbe $-Zeichen, die hier nichts bewirken (z. B. $B5, wenn nur nach unten übertragen wird); $B$2 gilt immer als fester Bezug
function extraDollars(text, T){
  return refTokens(text).filter(s => s.fc !== s.fr && ((s.fc && T.dcMax === 0) || (s.fr && T.drMax === 0))).map(s => s.raw);
}
function judge(text, T){
  const lv = T.lv;
  let ast;
  try { ast = parseFormula(text); }
  catch (e){ if (!(e instanceof FErr)) throw e; return {err:lv >= 6 ? 'Die Formel enthält einen Fehler.' : esc(e.message)}; }
  if (!refsOf(ast).length) return {err:'Deine Formel enthält keinen Zellbezug. Verwende Zellen wie B5 – nur dann kann Excel die Formel beim Übertragen anpassen.'};
  const runs = [T.cells, ...T.variants];
  let first = null;
  for (let k = 0; k < runs.length; k++){
    const mine = runCopy(text, T, runs[k]), want = runCopy(T.ref, T, runs[k]);
    const bad = T.fill.filter(f => !same(mine.vals[f], want.vals[f]));
    if (k === 0) first = {mine, bad};
    if (!bad.length) continue;
    const res = {vals:first.mine.vals, forms:first.mine.forms, bad:k === 0 ? bad : [], peek:k === 0 ? bad[0] : null};
    const f = bad[0], fmt = T.fmt[f], hints = lv < 6 ? refHints(text, T) : [];
    let msg;
    if (k > 0){
      const nums = numsOf(ast).filter(x => x !== 1 && x !== 100);
      msg = nums.length
        ? `Deine Formel liefert hier nur zufällig das richtige Ergebnis. Du hast die Zahl ${fmtNum(nums[0])} abgeschrieben – verwende stattdessen den Zellbezug. Dann rechnet Excel richtig weiter, wenn sich ein Wert in der Tabelle ändert.`
        : 'Deine Formel liefert nur mit genau diesen Zahlen das richtige Ergebnis – sobald sich ein Wert in der Tabelle ändert, nicht mehr.' + (hints.length ? '<br>' + hints.join('<br>') : '');
    } else if (f === T.src){
      msg = `Schon in ${B(T.src)} stimmt das Ergebnis noch nicht: Deine Formel ergibt ${esc(fmtVal(mine.vals[f], fmt) || '0')}.`;
      if (lv < 6) msg += '<br>' + (hints.length ? hints.join('<br>') : 'Prüfe, ob du die richtigen Zellen und Rechenzeichen verwendest.');
    } else if (lv >= 6){
      msg = `In ${B(T.src)} stimmt das Ergebnis – aber nach dem Übertragen nicht mehr überall, zum Beispiel in ${B(f)}. Klicke auf die rot markierten Zellen, um die Formeln zu sehen.`;
    } else {
      const v = mine.vals[f];
      msg = `In ${B(T.src)} stimmt das Ergebnis – aber nach dem Übertragen nicht mehr. In ${B(f)} steht dann ${C(esc(mine.forms[f]))}` +
        (v.t === 'err' ? `, und Excel zeigt ${C(esc(v.v === 'Zirkelbezug' ? 'einen Zirkelbezug' : v.v))}.` : v.t === 'empty' ? '.' : ` – das ergibt ${esc(fmtVal(v, fmt))}.`) +
        (hints.length ? '<br>' + hints.join('<br>') : '');
    }
    if (lv === 1 && strip$(text) !== strip$(T.pre)) msg += '<span class="note">Auf dieser Stufe musst du nur $-Zeichen setzen – der Rest der Formel stimmt schon. Mit „Zurücksetzen“ bekommst du die Formel wieder.</span>';
    return Object.assign(res, {err:msg});
  }
  const notes = [];
  if (lv < 6){ const x = extraDollars(text, T); if (x.length) notes.push(`Kleiner Hinweis: Die $-Zeichen in ${x.map(C).join(', ')} bewirken hier nichts, weil die Formel nur ${T.dcMax ? 'nach rechts' : 'nach unten'} übertragen wird. Sie schaden aber auch nicht.`); }
  return {ok:true, vals:first.mine.vals, forms:first.mine.forms, bad:[], notes};
}

function check(){
  if (!CUR){ if (LS) checkChoice(); return; }
  if (S.success) return;
  const text = liveText();
  let miss = null;
  if (isBlk() && !S.row.length) miss = 'Ziehe zuerst Bausteine in die Formelzeile.';
  else if (isBlk() && S.row.some(x => x.t === 'cell' && !x.v.trim())) miss = 'Es ist noch ein Zell-Feld leer. Klicke hinein und wähle eine Zelle in der Tabelle aus.';
  else if (!text.trim()) miss = `Schreibe zuerst eine Formel in ${CUR.src}.`;
  if (miss){ S.fb = {type:'err', html:miss}; renderFeedback(); return; }
  const j = judge(text, CUR);
  S.vals = j.vals || null; S.forms = j.forms || null; S.bad = new Set(j.bad || []); S.peek = j.peek || null;
  if (j.ok){
    S.success = true;
    let erstmals;
    if (mode === 'lernen'){ erstmals = !stepDone(prog().idx); markStep(); }
    else erstmals = countSolved();
    logSolved(erstmals);
    const nx = canNext() ? `<span class="note">Weiter geht es mit „${mode === 'lernen' ? 'Weiter' : 'Nächste Aufgabe'}“.</span>` : '';
    S.fb = {type:'ok', html:`<b>Richtig! 🎉</b> Die Formel stimmt in allen Zellen von ${CUR.src} bis ${CUR.end}.<br><span class="fcol">${esc(text)}</span>` +
      j.notes.map(n => `<span class="note">${n}</span>`).join('') + '<span class="note">Klicke auf eine Zelle im grünen Bereich, um zu sehen, welche Formel dort nach dem Übertragen steht.</span>' + nx};
  } else S.fb = {type:'err', html:j.err};
  renderGrid(); renderFeedback(); renderNav();
}

function clearMarks(){
  if (!S.success && !S.fb && !S.vals) return;
  S.success = false; S.fb = null; S.vals = null; S.forms = null; S.bad = new Set(); S.peek = null;
  renderFeedback();
}

/* ---------- Autovervollständigung (basis.js): Funktionen dieser Seite ---------- */
AC.word = before => { const m = before.match(/[A-Za-zÄÖÜäöüß]+$/); return m && m[0].length >= 2 && before.trimStart().startsWith('=') ? m[0] : null; };

document.addEventListener('focusin', e => { if (e.target.matches && e.target.matches('.cg')) S.gi = +e.target.dataset.ci; });
/* ---------- Ereignisse ---------- */
document.addEventListener('pointerdown', e => { if (e.target.closest('#f4Btn')) e.preventDefault(); });
document.addEventListener('click', e => {
  if (e.target.closest('#f4Btn')){ f4(); return; }
  if (e.target.closest('.cg')) return;
  topicClick(e);
});
document.addEventListener('keydown', e => {
  if (e.key === 'F4' && (e.target.id === 'ft' || e.target.matches('.cg'))){ e.preventDefault(); f4(e.target); return; }
  if (e.key === 'Enter' && e.target.matches && e.target.matches('.pin')){ e.preventDefault(); check(); }
});
if (mode === 'endlos') newEndless();
loadTask();
