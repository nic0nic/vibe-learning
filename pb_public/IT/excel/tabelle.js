/* tabelle.js – Ergänzung zu basis.js für Trainer mit Tabellenblatt (funktionen, bezuege)
 * Laden nach basis.js; dazu tabelle.css nach basis.css.
 *
 * API
 *   Rechenwerk: FUNCS, FDESC, GOAL, ALIAS, ENGLISH, CELLRE, colN, colL, addr, ad, normRef, rangeCells,
 *     normRange, tokenize, parseFormula, refsOf, cellsOfRefs, fnsOf, numsOf, topCall, refsInText,
 *     E, toNum, evalAst, callFn, parseCached, Sheet(cells).val(a), same, fmtNum, fmtVal(v, 'eur'|'usd'|'pct')
 *   Erklärung (learn = {topic, prog:{id:{idx, done}}}): topic, prog, saveLearn, stepDone, markStep,
 *     firstOpen, stepUnlocked, curStep, gotoStep, openTopic, overview
 *   setMode, gotoTask, canNext, nextTask, renderNav, renderDock, renderOverview(introHtml),
 *   renderFeedback, renderChoice(st), checkChoice(), hint(msg)
 *   topicClick(e)   Antworten, Themen, Schritte, Übersicht, dann navClick – am Ende des Klick-Handlers
 *   caret, setCaret, focusInp, applyPT, cellAt, endPT, gridEl, trackCaret   Bezüge mit der Maus einfügen
 *   Verdrahtet: #ovBtn, #prevBtn, #resetBtn, Eingabe in .pin → syncInput, Maus-Ende im #grid
 *
 * Vergleiche und WENN/UND/ODER: logikAn() einmal aufrufen (vor dem ersten Rechnen). Dann gibt es = <> < > <= >=
 *   (Ergebnis WAHR/FALSCH, Texte ohne Groß-/Kleinschreibung) und die Funktionen WENN, UND, ODER.
 *
 * Braucht ../../lib/aufgaben.js (Multiple Choice: Aufgaben.mc), vor basis.js einbinden.
 *
 * Die Seite liefert
 *   TOPICS, GROUPS, AC_FN; let learn, endPick, CUR, S, LS, PT
 *   render, resetS, loadStep, newEndless, setLevel, clearMarks, syncInput(inp, keepSel), logSolved
 */


const FUNCS = ['SUMME', 'MITTELWERT', 'MIN', 'MAX', 'ANZAHL', 'ANZAHL2'];
const FDESC = {
  SUMME:'addiert alle Zahlen',
  MITTELWERT:'berechnet den Durchschnitt',
  MIN:'liefert den kleinsten Wert',
  MAX:'liefert den größten Wert',
  ANZAHL:'zählt die Zellen, in denen eine Zahl steht',
  ANZAHL2:'zählt alle Zellen, die nicht leer sind – auch Zellen mit Text'
};
const GOAL = {SUMME:'die Summe (alles zusammen)', MITTELWERT:'der Durchschnitt', MIN:'der kleinste Wert', MAX:'der größte Wert',
  ANZAHL:'die Anzahl der Zellen mit einer Zahl', ANZAHL2:'die Anzahl aller Einträge'};
// englische oder falsche Funktionsnamen -> Hinweis
const ALIAS = {SUM:'SUMME', AVERAGE:'MITTELWERT', COUNT:'ANZAHL', COUNTA:'ANZAHL2', MINIMUM:'MIN', MAXIMUM:'MAX',
  DURCHSCHNITT:'MITTELWERT', MITTEL:'MITTELWERT', MITTELWERTE:'MITTELWERT', SUMMEN:'SUMME', SUM2:'SUMME', SUMM:'SUMME', SUME:'SUMME',
  ANZAL:'ANZAHL', ANZAHL1:'ANZAHL', ANZAL2:'ANZAHL2', ZÄHLEN:'ANZAHL', ANZAHLZWEI:'ANZAHL2'};
const ENGLISH = ['SUM', 'AVERAGE', 'COUNT', 'COUNTA'];
let LOGIK = false;
function logikAn(){
  if (LOGIK) return; LOGIK = true;
  FUNCS.push('WENN', 'UND', 'ODER');
  Object.assign(FDESC, {WENN:'liefert je nach Bedingung den Dann- oder den Sonst-Wert', UND:'ist WAHR, wenn alle Bedingungen erfüllt sind', ODER:'ist WAHR, wenn mindestens eine Bedingung erfüllt ist'});
  Object.assign(ALIAS, {IF:'WENN', AND:'UND', OR:'ODER', WEN:'WENN', WENNN:'WENN', UN:'UND', ODR:'ODER'});
  ENGLISH.push('IF', 'AND', 'OR');
}
const fnListe = () => FUNCS.slice(0, -1).join(', ') + ' oder ' + FUNCS[FUNCS.length - 1];


/* ---- Zellbezüge ---- */
const CELLRE = /^\$?([A-Za-z]{1,3})\$?([0-9]{1,5})$/;
const colN = L => L.toUpperCase().split('').reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1;
function colL(n){ let s = ''; n++; while (n > 0){ const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function addr(s){ const m = String(s).match(CELLRE); return m ? {c:colN(m[1]), r:+m[2]} : null; }
const ad = (c, r) => colL(c) + r;
const normRef = s => { const a = addr(s); return ad(a.c, a.r); };
function rangeCells(a, b){
  const x = addr(a), y = addr(b), out = [];
  for (let r = Math.min(x.r, y.r); r <= Math.max(x.r, y.r); r++)
    for (let c = Math.min(x.c, y.c); c <= Math.max(x.c, y.c); c++) out.push(ad(c, r));
  return out;
}
function normRange(a, b){
  const x = addr(a), y = addr(b);
  return ad(Math.min(x.c, y.c), Math.min(x.r, y.r)) + ':' + ad(Math.max(x.c, y.c), Math.max(x.r, y.r));
}

/* ---- Zerlegen ---- */
function tokenize(src){
  const t = []; let i = 0; const n = src.length;
  const isL = ch => /[A-Za-zÄÖÜäöüß$]/.test(ch);
  while (i < n){
    const c = src[i];
    if (/\s/.test(c)){ i++; continue; }
    if (c === '"'){
      i++; let v = '', closed = false;
      while (i < n){ if (src[i] === '"'){ if (src[i+1] === '"'){ v += '"'; i += 2; continue; } closed = true; i++; break; } v += src[i++]; }
      if (!closed) throw new FErr('Ein Anführungszeichen wurde geöffnet, aber nicht wieder geschlossen.');
      t.push({type:'str', v}); continue;
    }
    if (/[0-9]/.test(c)){
      let j = i; while (j < n && /[0-9]/.test(src[j])) j++;
      if (src[j] === ',' && /[0-9]/.test(src[j+1] || '')){ j++; while (j < n && /[0-9]/.test(src[j])) j++; }
      if (src[j] === '.' && /[0-9]/.test(src[j+1] || '')) throw new FErr('Dezimalzahlen schreibt man im deutschen Excel mit Komma, z. B. 0,25.');
      if (j < n && isL(src[j])){ let k = j; while (k < n && /[A-Za-z0-9]/.test(src[k])) k++; throw new FErr(`„${src.slice(i, k)}“ verstehe ich nicht. Ein Zellbezug beginnt mit dem Buchstaben der Spalte, z. B. B4.`); }
      t.push({type:'num', v:parseFloat(src.slice(i, j).replace(',', '.'))}); i = j; continue;
    }
    if (isL(c)){
      let j = i; while (j < n && /[A-Za-z0-9ÄÖÜäöüß$_.]/.test(src[j])) j++;
      const w = src.slice(i, j), up = w.toUpperCase();
      let k = j; while (k < n && /\s/.test(src[k])) k++;
      if (src[k] === '('){ t.push({type:'fn', v:up.replace(/\./g, '')}); i = j; continue; }
      if (CELLRE.test(w)){ t.push({type:'ref', v:normRef(w)}); i = j; continue; }
      if (FUNCS.includes(up)) throw new FErr(`Nach ${up} muss eine Klammer folgen: ${up}(…)`);
      if (/^\$?[A-Za-z]{1,3}\$?\d+\$?[A-Za-z]{1,3}\$?\d+$/.test(w)) throw new FErr(`Zwischen den Zellen in „${w}“ fehlt etwas. Für einen Bereich schreibst du einen Doppelpunkt, z. B. B4:B8.`);
      if (ALIAS[up]) throw new FErr(`Meinst du ${ALIAS[up]}? Nach dem Funktionsnamen folgt eine Klammer: ${ALIAS[up]}(…)`);
      if (LOGIK && /^[A-Za-zÄÖÜäöüß]+$/.test(w)) throw new FErr(`„${w}“ ist weder ein Zellbezug (wie B4) noch eine Funktion. Ist das ein Text? Texte stehen in Anführungszeichen: "${w}"`);
      throw new FErr(`„${w}“ ist weder ein Zellbezug (wie B4) noch eine Funktion.`);
    }
    if ('+-*/^();:'.includes(c)){ t.push({type:'op', v:c}); i++; continue; }
    if (c === ',') throw new FErr('Im deutschen Excel trennt man die Teile einer Funktion mit einem Semikolon ; – und einen Bereich „von … bis“ schreibt man mit Doppelpunkt, z. B. B4:B8.');
    if (LOGIK && (c === '<' || c === '>' || c === '=')){
      const zwei = src.slice(i, i + 2);
      if (zwei === '=<' || zwei === '=>') throw new FErr(`Schreibe ${zwei[1]}= statt ${zwei}: Das Gleichheitszeichen steht hinten.`);
      const v = ['<=', '>=', '<>'].includes(zwei) ? zwei : c;
      t.push({type:'op', v}); i += v.length; continue;
    }
    if (c === '=') throw new FErr('Das = steht nur einmal ganz am Anfang der Formel.');
    if (c === '<' || c === '>') throw new FErr('Vergleiche mit < oder > brauchst du hier nicht.');
    if (c === '€' || c === '%') throw new FErr(`Das Zeichen ${c} gehört nicht in die Formel. Schreibe nur die Zahl bzw. den Zellbezug.`);
    throw new FErr(`Das Zeichen „${c}“ gehört nicht in eine Formel.`);
  }
  return t;
}

/* ---- Parser: + - * / ^, Klammern, Funktionen mit Bereichen ---- */
function noRange(n){ if (n.k === 'range') throw new FErr(`Ein Bereich wie ${n.a}:${n.b} funktioniert nur in einer Funktion, z. B. =SUMME(${n.a}:${n.b}).`); return n; }
function parseFormula(raw){
  const s = normQuotes(String(raw)).trim();
  if (!s) throw new FErr('Gib zuerst eine Formel ein.');
  if (s[0] !== '=') throw new FErr('Eine Formel beginnt in Excel immer mit einem Gleichheitszeichen =.');
  const toks = tokenize(s.slice(1)); let p = 0;
  if (!toks.length) throw new FErr('Nach dem = fehlt noch die Formel.');
  const peek = () => toks[p], next = () => toks[p++];
  const isOp = (t, v) => t && t.type === 'op' && t.v === v;
  const CMP = ['=', '<>', '<', '>', '<=', '>='];
  function cmp(){ let a = expr(); const t = peek(); if (t && t.type === 'op' && CMP.includes(t.v)){ next(); a = {k:'cmp', o:t.v, a:noRange(a), b:noRange(expr())};
    const u = peek(); if (u && u.type === 'op' && CMP.includes(u.v)) throw new FErr('Ein Vergleich hat nur ein Vergleichszeichen. Mehrere Bedingungen verknüpfst du mit UND(…) oder ODER(…).'); } return a; }
  function expr(){ let a = term(); while (isOp(peek(), '+') || isOp(peek(), '-')){ const o = next().v; a = {k:'bin', o, a:noRange(a), b:noRange(term())}; } return a; }
  function term(){ let a = factor(); while (isOp(peek(), '*') || isOp(peek(), '/')){ const o = next().v; a = {k:'bin', o, a:noRange(a), b:noRange(factor())}; } return a; }
  function factor(){ if (isOp(peek(), '-') || isOp(peek(), '+')){ const o = next().v; return {k:'neg', o, a:noRange(factor())}; } return power(); }
  function power(){ let a = atom(); if (isOp(peek(), '^')){ next(); a = {k:'bin', o:'^', a:noRange(a), b:noRange(factor())}; } return a; }
  function atom(){
    const t = next();
    if (!t) throw new FErr('Die Formel hört zu früh auf – am Ende fehlt noch etwas.');
    if (t.type === 'num') return {k:'num', v:t.v};
    if (t.type === 'str') return {k:'str', v:t.v};
    if (t.type === 'ref'){
      if (isOp(peek(), ':')){
        next(); const u = next();
        if (!u || u.type !== 'ref') throw new FErr('Nach dem Doppelpunkt muss eine Zelle folgen, z. B. B4:B8.');
        return {k:'range', a:t.v, b:u.v};
      }
      return {k:'ref', v:t.v};
    }
    if (t.type === 'fn'){
      const name = t.v; next(); // (
      if (!FUNCS.includes(name)){
        if (ENGLISH.includes(name)) throw new FErr(`Im deutschen Excel heißt die Funktion ${ALIAS[name]} statt ${name}.`);
        if (ALIAS[name]) throw new FErr(`Die Funktion heißt ${ALIAS[name]}, nicht ${name}.`);
        if (CELLRE.test(name)) throw new FErr(`Nach der Zelle ${name} darf keine Klammer folgen. Fehlt ein Rechenzeichen?`);
        throw new FErr(`Die Funktion ${name} gibt es hier nicht. Du brauchst ${fnListe()}.`);
      }
      if (isOp(peek(), ')')){ next(); throw new FErr(`In die Klammer von ${name} gehört ein Bereich, z. B. ${name}(B4:B8).`); }
      const args = [];
      for (;;){
        if (isOp(peek(), ';') || isOp(peek(), ')')) throw new FErr(`In ${name}(…) fehlt zwischen den Semikolons etwas.`);
        args.push(cmp());
        const u = next();
        if (!u) throw new FErr(`Es fehlt die schließende Klammer ) von ${name}.`);
        if (isOp(u, ';')) continue;
        if (isOp(u, ')')) break;
        if (isOp(u, ':')) throw new FErr('Vor und nach dem Doppelpunkt muss je eine Zelle stehen, z. B. B4:B8.');
        throw new FErr(`In ${name}(…) fehlt ein ; oder ein Rechenzeichen zwischen zwei Teilen.`);
      }
      if (name === 'WENN' && (args.length < 2 || args.length > 3)) throw new FErr(`WENN hat drei Teile: WENN(Bedingung; Dann-Wert; Sonst-Wert) – deine Formel hat ${args.length}.`);
      if (name === 'WENN' && args[0].k !== 'cmp' && !(args[0].k === 'call' && ['UND', 'ODER'].includes(args[0].name)) && args[0].k !== 'ref') throw new FErr('Der erste Teil von WENN ist eine Bedingung, z. B. B5>=18 oder UND(…).');
      return {k:'call', name, args};
    }
    if (isOp(t, '(')){
      const e = cmp(), u = next();
      if (!isOp(u, ')')) throw new FErr('Es fehlt eine schließende Klammer ).');
      return {k:'par', a:noRange(e)};
    }
    if (isOp(t, ')')) throw new FErr('Hier steht eine Klammer ) zu viel oder an der falschen Stelle.');
    if (isOp(t, ';')) throw new FErr('Das Semikolon ; trennt nur die Teile innerhalb einer Funktion, z. B. SUMME(B4:B8;D4:D8).');
    if (isOp(t, ':')) throw new FErr('Vor dem Doppelpunkt muss eine Zelle stehen, z. B. B4:B8.');
    if (t.type === 'op' && /[<>=]/.test(t.v)) throw new FErr(`Vor ${t.v} fehlt etwas: Ein Vergleich braucht links und rechts einen Wert, z. B. B5>=18.`);
    throw new FErr(`Das Zeichen ${t.v} steht an der falschen Stelle.`);
  }
  const ast = cmp();
  if (p < toks.length){
    const t = toks[p];
    if (isOp(t, ')')) throw new FErr('Hier steht eine Klammer ) zu viel.');
    if (isOp(t, ';')) throw new FErr('Das Semikolon ; steht außerhalb einer Funktion. Steht die Klammer ) zu früh?');
    if (isOp(t, ':')) throw new FErr('Vor dem Doppelpunkt muss eine einzelne Zelle stehen, z. B. B4:B8.');
    throw new FErr('Zwischen zwei Teilen der Formel fehlt ein Rechenzeichen.');
  }
  return noRange(ast);
}

/* ---- Bezüge einer Formel ---- */
function refsOf(n, out = []){
  if (!n) return out;
  if (n.k === 'ref') out.push({a:n.v, b:n.v});
  else if (n.k === 'range') out.push({a:n.a, b:n.b});
  else if (n.k === 'call') n.args.forEach(x => refsOf(x, out));
  else if (n.k === 'bin' || n.k === 'cmp'){ refsOf(n.a, out); refsOf(n.b, out); }
  else if (n.k === 'neg' || n.k === 'par') refsOf(n.a, out);
  return out;
}
const cellsOfRefs = refs => new Set(refs.flatMap(r => rangeCells(r.a, r.b)));
function fnsOf(n, out = new Set()){
  if (!n) return out;
  if (n.k === 'call'){ out.add(n.name); n.args.forEach(x => fnsOf(x, out)); }
  else if (n.k === 'bin' || n.k === 'cmp'){ fnsOf(n.a, out); fnsOf(n.b, out); }
  else if (n.k === 'neg' || n.k === 'par') fnsOf(n.a, out);
  return out;
}
function numsOf(n, out = []){
  if (!n) return out;
  if (n.k === 'num') out.push(n.v);
  else if (n.k === 'call') n.args.forEach(x => numsOf(x, out));
  else if (n.k === 'bin' || n.k === 'cmp'){ numsOf(n.a, out); numsOf(n.b, out); }
  else if (n.k === 'neg' || n.k === 'par') numsOf(n.a, out);
  return out;
}
function topCall(n){ while (n && n.k === 'par') n = n.a; return n && n.k === 'call' ? n : null; }
// Bezüge in einem (evtl. unfertigen) Formeltext finden – für die Farben in der Tabelle
function refsInText(s){
  const out = []; let inStr = false, chunk = '';
  const scan = c => { const re = /(^|[^A-Za-z0-9_$ÄÖÜäöüß])(\$?[A-Za-z]{1,3}\$?\d{1,5})(?:\s*:\s*(\$?[A-Za-z]{1,3}\$?\d{1,5}))?(?![A-Za-z0-9(])/g; let m;
    while ((m = re.exec(c))){ const a = normRef(m[2]), b = m[3] ? normRef(m[3]) : a; out.push({a, b, txt:m[3] ? `${a}:${b}` : a}); re.lastIndex = m.index + m[0].length; } };
  for (const ch of normQuotes(s)){ if (ch === '"'){ if (!inStr){ scan(chunk); chunk = ''; } inStr = !inStr; continue; } if (!inStr) chunk += ch; }
  scan(chunk);
  return out;
}

/* ---- Auswertung wie in Excel ---- */
const E = v => ({t:'err', v});
function toNum(v){
  if (v.t === 'num' || v.t === 'err') return v;
  if (v.t === 'empty') return {t:'num', v:0};
  if (v.t === 'bool') return {t:'num', v:v.v ? 1 : 0};
  return E('#WERT!');
}
// Vergleich wie in Excel: Zahl < Text < WAHR/FALSCH, Texte ohne Groß-/Kleinschreibung, leere Zelle = 0 bzw. ""
function vergleiche(o, a, b){
  if (a.t === 'err') return a; if (b.t === 'err') return b;
  if (a.t === 'empty') a = b.t === 'str' ? {t:'str', v:''} : b.t === 'bool' ? {t:'bool', v:false} : {t:'num', v:0};
  if (b.t === 'empty') b = a.t === 'str' ? {t:'str', v:''} : a.t === 'bool' ? {t:'bool', v:false} : {t:'num', v:0};
  const rang = {num:0, str:1, bool:2};
  let d;
  if (a.t !== b.t) d = rang[a.t] - rang[b.t];
  else if (a.t === 'str') d = a.v.toLowerCase().localeCompare(b.v.toLowerCase(), 'de');
  else d = (+a.v) - (+b.v);
  const w = {'=':d === 0, '<>':d !== 0, '<':d < 0, '>':d > 0, '<=':d <= 0, '>=':d >= 0}[o];
  return {t:'bool', v:w};
}
function wahr(v){ if (v.t === 'bool') return v.v; if (v.t === 'num') return v.v !== 0; if (v.t === 'empty') return false; return null; }
function evalAst(n, sh){
  switch (n.k){
    case 'num': return {t:'num', v:n.v};
    case 'str': return {t:'str', v:n.v};
    case 'ref': return sh.val(n.v);
    case 'par': return evalAst(n.a, sh);
    case 'neg': { const x = toNum(evalAst(n.a, sh)); return x.t === 'err' ? x : {t:'num', v:n.o === '-' ? -x.v : x.v}; }
    case 'bin': {
      const a = toNum(evalAst(n.a, sh)); if (a.t === 'err') return a;
      const b = toNum(evalAst(n.b, sh)); if (b.t === 'err') return b;
      if (n.o === '+') return {t:'num', v:a.v + b.v};
      if (n.o === '-') return {t:'num', v:a.v - b.v};
      if (n.o === '*') return {t:'num', v:a.v * b.v};
      if (n.o === '/') return b.v === 0 ? E('#DIV/0!') : {t:'num', v:a.v / b.v};
      return {t:'num', v:Math.pow(a.v, b.v)};
    }
    case 'cmp': return vergleiche(n.o, evalAst(n.a, sh), evalAst(n.b, sh));
    case 'call': return callFn(n, sh);
  }
  return E('#WERT!');
}
function callFn(n, sh){
  if (n.name === 'WENN'){
    const b = evalAst(n.args[0], sh); if (b.t === 'err') return b;
    const w = wahr(b); if (w === null) return E('#WERT!');
    const x = w ? n.args[1] : n.args[2];
    if (!x) return {t:'bool', v:false};
    const v = evalAst(x, sh); return v.t === 'empty' ? {t:'num', v:0} : v;
  }
  if (n.name === 'UND' || n.name === 'ODER'){
    const ws = [];
    for (const a of n.args){
      const v = evalAst(a, sh); if (v.t === 'err') return v;
      const w = wahr(v); if (w === null) return E('#WERT!'); ws.push(w);
    }
    return {t:'bool', v:n.name === 'UND' ? ws.every(Boolean) : ws.some(Boolean)};
  }
  const vals = [];
  for (const a of n.args){
    if (a.k === 'range') rangeCells(a.a, a.b).forEach(c => vals.push({x:sh.val(c), ref:true}));
    else if (a.k === 'ref') vals.push({x:sh.val(a.v), ref:true});
    else vals.push({x:evalAst(a, sh), ref:false});
  }
  if (n.name === 'ANZAHL') return {t:'num', v:vals.filter(o => o.x.t === 'num').length};
  if (n.name === 'ANZAHL2') return {t:'num', v:vals.filter(o => o.x.t !== 'empty').length};
  const nums = [];
  for (const o of vals){
    if (o.x.t === 'err') return o.x;
    if (o.x.t === 'num') nums.push(o.x.v);
    else if (!o.ref && o.x.t === 'str') return E('#WERT!');
  }
  if (n.name === 'SUMME') return {t:'num', v:nums.reduce((s, x) => s + x, 0)};
  if (n.name === 'MITTELWERT') return nums.length ? {t:'num', v:nums.reduce((s, x) => s + x, 0) / nums.length} : E('#DIV/0!');
  if (n.name === 'MIN') return {t:'num', v:nums.length ? Math.min(...nums) : 0};
  if (n.name === 'MAX') return {t:'num', v:nums.length ? Math.max(...nums) : 0};
  return E('#NAME?');
}
const PCACHE = new Map();
function parseCached(s){ if (!PCACHE.has(s)){ try { PCACHE.set(s, parseFormula(s)); } catch (e){ PCACHE.set(s, null); } } return PCACHE.get(s); }
class Sheet {
  constructor(cells){ this.cells = cells; this.memo = {}; this.busy = new Set(); }
  with(a, raw){ return new Sheet(Object.assign({}, this.cells, {[a]:raw})); }
  isFormula(a){ const r = this.cells[a]; return typeof r === 'string' && r[0] === '='; }
  val(a){
    if (a in this.memo) return this.memo[a];
    const r = this.cells[a]; let v;
    if (r == null || r === '') v = {t:'empty'};
    else if (typeof r === 'number') v = {t:'num', v:r};
    else if (this.isFormula(a) && r.includes('#BEZUG!')) v = E('#BEZUG!');
    else if (this.isFormula(a)){
      if (this.busy.has(a)) return E('Zirkelbezug');
      this.busy.add(a);
      const ast = parseCached(r);
      v = ast ? evalAst(ast, this) : E('#NAME?');
      this.busy.delete(a);
    } else v = {t:'str', v:r};
    this.memo[a] = v; return v;
  }
}
function same(a, b){
  if (a.t !== b.t) return false;
  if (a.t === 'num') return Math.abs(a.v - b.v) < 1e-9 * Math.max(1, Math.abs(b.v));
  return a.v === b.v;
}
function fmtNum(x, dp){ if (Math.abs(x) >= 1e11) return x.toExponential(2).replace('.', ',').replace('e+', 'E+'); return (dp != null ? x.toFixed(dp) : String(+x.toFixed(2))).replace('.', ','); }
function fmtVal(v, f){
  if (v.t === 'num') return f === 'eur' ? fmtNum(v.v, 2) + ' €' : f === 'usd' ? fmtNum(v.v, 2) + ' $' : f === 'pct' ? fmtNum(v.v * 100) + ' %' : fmtNum(v.v);
  if (v.t === 'empty') return '';
  if (v.t === 'bool') return v.v ? 'WAHR' : 'FALSCH';
  if (v.t === 'err') return v.v === 'Zirkelbezug' ? '0' : v.v;
  return v.v;
}

/* ---- Erklärung: Fortschritt je Thema (learn = {topic, prog:{id:{idx, done}}}) ---- */
const topic = () => TOPICS.find(t => t.id === learn.topic);
function prog(id){ id = id || learn.topic; return learn.prog[id] || (learn.prog[id] = {idx:0, done:[]}); }
function saveLearn(){ store('learn', JSON.stringify(learn)); }
const stepDone = i => prog().done.includes(i);
function markStep(){ const p = prog(); if (!p.done.includes(p.idx)){ p.done.push(p.idx); saveLearn(); } }
function firstOpen(){ const n = topic().steps.length; for (let i = 0; i < n; i++) if (!stepDone(i)) return i; return n - 1; }
const stepUnlocked = i => i <= firstOpen() || stepDone(i);
const curStep = () => topic().steps[prog().idx];
function gotoStep(i){ prog().idx = i; pickerOpen = false; loadStep(); window.scrollTo({top:0, behavior:'smooth'}); }
function openTopic(id){ learn.topic = id; saveLearn(); pickerOpen = false; loadStep(); window.scrollTo({top:0, behavior:'smooth'}); }
function overview(){ learn.topic = null; saveLearn(); pickerOpen = false; loadTask(); window.scrollTo({top:0, behavior:'smooth'}); }

/* ---- Modus- und Aufgabensteuerung ---- */
function setMode(m){ if (m === mode) return; mode = m; store('mode', m); pickerOpen = false; if (m === 'endlos' && !endPick) newEndless(); loadTask(); window.scrollTo({top:0, behavior:'smooth'}); }
function gotoTask(i){ pfadIdx = clamp(i, 0, STD.length - 1); store('idx', pfadIdx); pickerOpen = false; loadTask(); window.scrollTo({top:0, behavior:'smooth'}); }
function canNext(){
  if (mode === 'lernen') return !!learn.topic && prog().idx < topic().steps.length - 1 && stepDone(prog().idx);
  return mode === 'pfad' ? (pfadIdx < STD.length - 1 && isSolved(pfadIdx)) : endCounted;
}
function nextTask(){
  if (!canNext()) return;
  if (mode === 'lernen'){ gotoStep(prog().idx + 1); return; }
  if (mode === 'pfad') gotoTask(pfadIdx + 1); else { newEndless(); loadTask(); window.scrollTo({top:0, behavior:'smooth'}); }
}

/* ---- Darstellung ---- */
function renderOverview(intro){
  $('#lvlname').textContent = 'Erklärung';
  $('#taskmeta').textContent = '';
  $('#tasktext').innerHTML = `${intro}\n    <div class="topics">${TOPICS.map(t => { const p = learn.prog[t.id], n = p ? p.done.length : 0, all = n >= t.steps.length;
      return `<button class="topic${all ? ' done' : ''}" data-topic="${t.id}"><b>${esc(t.name)}</b><span class="tdesc">${esc(t.desc)}</span><span class="tprog">${all ? '✓ erledigt' : n ? `${n} von ${t.steps.length} Schritten` : `${t.steps.length} Schritte`}</span></button>`; }).join('')}</div>`;
  ['#sheetcard', '#workcard', '#actions'].forEach(id => { $(id).style.display = 'none'; });
  $('#fb').innerHTML = ''; $('#dock').innerHTML = '';
}
function renderNav(){
  if (mode === 'lernen') navLernen(prog().idx, topic().steps.length, curStep().type === 'info');
  else navPfad();
  renderDock();
}
function renderDock(){
  const d = $('#dock');
  if (mode !== 'lernen'){ d.innerHTML = dockHTML(GROUPS); return; }
  const tp = topic(), p = prog();
  let h = `<button class="dockbtn" id="dockBtn" aria-expanded="${pickerOpen}">📘 Schritt ${p.idx + 1}/${tp.steps.length} <span class="sub">· ${p.done.length} erledigt</span></button>`;
  if (pickerOpen) h += `<div class="picker steps"><div class="ptitle">${esc(tp.name)} – erledigte Schritte sind grün</div>` +
    tp.steps.map((st, i) => `<button data-step="${i}" class="stepbtn${stepDone(i) ? ' solved' : ''}${i === p.idx ? ' cur' : ''}"${stepUnlocked(i) ? '' : ' disabled'}>${i + 1}. ${esc(st.title)}</button>`).join('') +
    '<button class="stepbtn" data-ov="1">◀ Zur Übersicht</button><button class="stepreset" data-learnreset="1">Fortschritt in diesem Thema zurücksetzen</button></div>';
  d.innerHTML = h;
}
function renderFeedback(){ $('#fb').innerHTML = S.fb ? `<div class="fb ${S.fb.type}">${S.fb.html}</div>` : ''; }
let hintTimer = null;
function hint(msg){ const el = $('#selhint'); el.textContent = msg; clearTimeout(hintTimer); hintTimer = setTimeout(() => { el.textContent = ''; }, 4500); }

/* ---- Fragen in der Erklärung (LS = {sel, checked}) ---- */
function renderChoice(st){
  $('#work').innerHTML = Aufgaben.mc.html(st, LS.sel, LS.checked);
}
function checkChoice(){
  const st = curStep();
  if (!LS.sel.size){ S.fb = {type:'err', html:'Wähle zuerst eine Antwort aus.'}; renderFeedback(); return; }
  LS.checked = true;
  const r = Aufgaben.mc.pruefen(st, LS.sel);
  if (r.ok){
    const erstmals = !stepDone(prog().idx); markStep(); logSolved(erstmals);
    S.fb = {type:'ok', html:'<b>Richtig! 🎉</b>' + (st.after ? `<span class="note">${st.after}</span>` : '') + (canNext() ? '<span class="note">Weiter geht es mit „Weiter“.</span>' : '')};
  } else {
    S.fb = {type:'err', html:'Noch nicht ganz.<br>' + r.gruende.join('<br>')};
  }
  renderChoice(st); renderFeedback(); renderNav();
}
// Klicks auf Antworten, Themen, Schritte und Übersicht, danach navClick; die Seite ruft topicClick(e) am Ende ihres Klick-Handlers
function topicClick(e){
  const o = e.target.closest('[data-opt]');
  if (o && LS){ const st = curStep(), i = +o.dataset.opt;
    if (Aufgaben.mehrfach(st)){ LS.sel.has(i) ? LS.sel.delete(i) : LS.sel.add(i); } else LS.sel = new Set([i]);
    LS.checked = false; S.fb = null; renderChoice(st); renderFeedback(); return; }
  const tp = e.target.closest('[data-topic]'); if (tp){ openTopic(tp.dataset.topic); return; }
  const tg = e.target.closest('[data-topic-go]'); if (tg){ openTopic(tg.dataset.topicGo); return; }
  if (e.target.closest('[data-ov]')){ overview(); return; }
  const mg = e.target.closest('[data-mode-go]'); if (mg){ setMode(mg.dataset.modeGo); return; }
  const sp = e.target.closest('[data-step]'); if (sp){ gotoStep(+sp.dataset.step); return; }
  if (e.target.closest('[data-learnreset]')){ if (confirm('Den Fortschritt in diesem Thema löschen und von vorne beginnen?')){ learn.prog[learn.topic] = {idx:0, done:[]}; gotoStep(0); } return; }
  navClick(e);
}

/* ---- Zellen und Bereiche mit der Maus in Eingaben (.pin) einfügen, wie in Excel ---- */
// Cursorposition einer Eingabe merken, auch wenn sie gerade nicht den Fokus hat
function caret(inp){
  if (document.activeElement === inp) return [inp.selectionStart, inp.selectionEnd];
  const n = inp.value.length;
  return [inp._s != null ? Math.min(inp._s, n) : n, inp._e != null ? Math.min(inp._e, n) : n];
}
function setCaret(inp, c){ inp._s = inp._e = c; if (document.activeElement === inp) inp.setSelectionRange(c, c); }
function focusInp(inp){ const [s, e] = caret(inp); inp.focus({preventScroll:true}); inp.setSelectionRange(s, e); }
// PT = {inp, anchor, cur, start, end, base}: laufende Markierung in der Tabelle
function applyPT(){
  const ref = PT.anchor === PT.cur ? PT.anchor : normRange(PT.anchor, PT.cur);
  PT.inp.value = PT.base.slice(0, PT.start) + ref + PT.base.slice(PT.end);
  setCaret(PT.inp, PT.start + ref.length);
  S.sel = new Set(rangeCells(PT.anchor, PT.cur));
  syncInput(PT.inp, true);
}
function cellAt(x, y){ const el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('#grid td[data-c]') : null; }
function endPT(){ if (!PT) return; const inp = PT.inp; PT = null; if (document.body.contains(inp)) focusInp(inp); }
const gridEl = $('#grid');
gridEl.addEventListener('pointerup', endPT);
gridEl.addEventListener('pointercancel', endPT);
gridEl.addEventListener('mousedown', e => { if (CUR && e.target.closest('td[data-c]')) e.preventDefault(); });
gridEl.addEventListener('touchstart', e => { if (CUR && e.target.closest('td[data-c]')) e.preventDefault(); }, {passive:false});
const trackCaret = e => { const t = e.target; if (t.matches && t.matches('.pin')){ t._s = t.selectionStart; t._e = t.selectionEnd; } };
['keyup', 'click', 'select', 'focusout'].forEach(ev => document.addEventListener(ev, trackCaret, true));
document.addEventListener('input', e => { if (e.target.matches('.pin')){ trackCaret(e); syncInput(e.target, false); } });

$('#ovBtn').addEventListener('click', () => overview());
$('#resetBtn').addEventListener('click', () => { if (mode === 'lernen') loadStep(); else { resetS(); render(); } });
$('#prevBtn').addEventListener('click', () => { if (mode === 'lernen') gotoStep(prog().idx - 1); else gotoTask(pfadIdx - 1); });

/* Funktionsnamen mit Ziffern (ANZAHL2), Wörter nach Rechenzeichen */
AC.digits = true;
AC.prev = /[=(;+\-*/^<>\s]/;
