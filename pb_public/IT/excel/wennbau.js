/* wennbau.js – WENN-Formeln mit UND/ODER/NICHT bauen und prüfen: Parser, Auswertung, Bausteine in 9 Stufen
 * Genutzt von und-oder.html und nicht.html. Laden nach basis.js und bausteine.js (dazu basis.css + bausteine.css),
 * Aufgaben aus Szenarien: uo-szenarien.js (danach laden).
 *
 * API
 *   parseFormula(src) → Baum (wirft FErr mit deutscher Meldung), ev(baum, env) → Wert, usesFn(baum, ['UND']), fmtNode(baum)
 *   checkAgainst(src, aufgabe) → {ast, rows, fail, ok, logic}: dasselbe Ergebnis wie aufgabe.sol bei allen aufgabe.tests
 *   product(listen)            alle Kombinationen (Testwerte)
 *   WB_LEVELS                  die 9 Stufen: Bedingungen auswählen … Freitext ohne Hilfe (in der Seite: const LEVELS = WB_LEVELS)
 *   wbSetup()                  Bausteine für CUR auf Stufe level anlegen (S), dann render()   (setup der Seite ruft es auf)
 *   wbRender(kopf)             Formel, Bausteine und Rückmeldung zeichnen; kopf = {lvl, meta, text (HTML)}
 *   wbGrid()                   kleine Tabelle mit Beispielwerten und Ergebnis (renderGrid der Seite ruft es auf)
 *   wbCheck(opt)               Formel prüfen, Rückmeldung; nach richtiger Lösung logSolved(opt.geloest ? opt.geloest() : countSolved()),
 *                              opt.nachher = HTML unter der Erfolgsmeldung
 *   accepts, unplace, applyDrop   Ablageregeln (für basis.js/bausteine.js)
 *   Ereignisse: Vergleichszeichen (.opsel), Werte (.cvin), Freitext (#ft), Enter in .cvin/#ft prüft.
 *
 * Aufgabe CUR (buildTask in uo-szenarien.js): {scen, text, cells, out, labels, resLabel, sample, comb, conds, condD,
 *   condCells, cvals, cvalD, dps, then, else, resD, sol, tests, noLogic}. Stufen 1–5 setzen genau zwei Bedingungen ein.
 *   Optional: muss(ast) → Fehlermeldung oder '' (Zusatzbedingung nach richtiger Auswertung, z. B. „ohne NICHT“),
 *   syms: weitere Zeichen für Stufe 6/7 (z. B. ['NICHT']).
 *
 * Die Seite liefert: render() (ruft wbRender), check() (ruft wbCheck), setup(), renderGrid(), renderNav(), logSolved(erstmals),
 *   die Variablen aus basis.js und let CUR, S, uid, poolSeed.
 */

/* ---------- Parser und Auswertung ---------- */
function tokenize(src){
  const t = []; let i = 0; const n = src.length;
  const isL = ch => /[A-Za-zÄÖÜäöüß$_]/.test(ch);
  while (i < n){
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === SEP){ i++; continue; }
    const start = i;
    if (c === '"'){
      i++; let v = ''; let closed = false;
      while (i < n){
        if (src[i] === '"'){ if (src[i+1] === '"'){ v += '"'; i += 2; continue; } closed = true; i++; break; }
        if (src[i] !== SEP) v += src[i];
        i++;
      }
      if (!closed) throw new FErr('Ein Anführungszeichen wurde geöffnet, aber nicht wieder geschlossen.');
      t.push({type:'str', value:v, start, end:i}); continue;
    }
    if (/[0-9]/.test(c)){
      let j = i; while (j < n && /[0-9]/.test(src[j])) j++;
      if (src[j] === ',' && /[0-9]/.test(src[j+1] || '')){ j++; while (j < n && /[0-9]/.test(src[j])) j++; }
      if (src[j] === '.' && /[0-9]/.test(src[j+1] || '')) throw new FErr('Dezimalzahlen schreibt man im deutschen Excel mit Komma, z. B. 4,95.');
      if (j < n && isL(src[j])){
        let k = j; while (k < n && /[A-Za-zÄÖÜäöüß0-9]/.test(src[k])) k++;
        const w = src.slice(i, k);
        throw new FErr(`„${w}“ ist keine Zahl. Text muss in Anführungszeichen stehen: "${w}"`);
      }
      t.push({type:'num', value:parseFloat(src.slice(i, j).replace(',', '.')), start, end:j}); i = j; continue;
    }
    if (isL(c)){
      let j = i; while (j < n && /[A-Za-zÄÖÜäöüß$_0-9]/.test(src[j])) j++;
      t.push({type:'id', value:src.slice(i, j), start, end:j}); i = j; continue;
    }
    const two = src.substr(i, 2);
    if (two === '=>') throw new FErr('Das Zeichen „=>“ gibt es in Excel nicht. Meinst du „>=“?');
    if (two === '=<') throw new FErr('Das Zeichen „=<“ gibt es in Excel nicht. Meinst du „<=“?');
    if (two === '><') throw new FErr('Das Zeichen „><“ gibt es in Excel nicht. „Ungleich“ schreibt man „<>“.');
    if (two === '!=') throw new FErr('„Ungleich“ schreibt man in Excel „<>“.');
    if (two === '&&' || two === '||') throw new FErr('In Excel verknüpft man Bedingungen mit UND(…; …) bzw. ODER(…; …).');
    if (two === '<=' || two === '>=' || two === '<>'){ t.push({type:'op', value:two, start, end:i+2}); i += 2; continue; }
    if ('<>='.includes(c)){ t.push({type:'op', value:c, start, end:i+1}); i++; continue; }
    if ('();,'.includes(c)){ t.push({type:c, value:c, start, end:i+1}); i++; continue; }
    if (c === '€') throw new FErr('Das €-Zeichen gehört nicht in die Formel – schreibe nur die Zahl.');
    if (c === '%') throw new FErr('Das %-Zeichen gehört hier nicht in die Formel – schreibe nur die Zahl.');
    throw new FErr(`Das Zeichen „${c}“ ist an dieser Stelle nicht erlaubt.`);
  }
  return t;
}

const FUNCS = {WENN:[3,3], UND:[2,30], ODER:[2,30], NICHT:[1,1]};
const ENGLISH = {IF:'WENN', AND:'UND', OR:'ODER', NOT:'NICHT'};
const WENN_PART = ['Die Prüfung (der erste Teil von WENN) fehlt.', 'Der Dann_Wert (der zweite Teil von WENN) fehlt.', 'Der Sonst_Wert (der dritte Teil von WENN) fehlt.'];
const INFIX = 'UND bzw. ODER stehen in Excel vor den Bedingungen: UND(Bedingung1; Bedingung2).';

/* Allgemeiner Parser: =WENN(…) mit beliebig verschachtelten WENN/UND/ODER/NICHT */
function parseFormula(raw){
  const src = normQuotes(raw);
  const t = tokenize(src); let p = 0;
  const peek = () => t[p], next = () => t[p++];
  if (!t.length) throw new FErr('Es wurde noch nichts eingegeben.');
  if (!(t[0].type === 'op' && t[0].value === '=')) throw new FErr('Eine Formel beginnt in Excel immer mit einem „=“.');
  p = 1;
  const f = peek();
  if (!f) throw new FErr('Nach dem „=“ fehlt die Funktion WENN.');
  if (!(f.type === 'id' && f.value.toUpperCase() === 'WENN')){
    if (f.type === 'id' && f.value.toUpperCase() === 'IF') throw new FErr('Im deutschen Excel heißt die Funktion WENN (nicht IF).');
    throw new FErr('Die Formel muss mit =WENN( beginnen.');
  }
  const ast = expr(null);
  if (p < t.length){
    if (peek().type === ')') throw new FErr('Hier ist eine schließende Klammer „)“ zu viel.');
    throw new FErr('Nach der letzten schließenden Klammer darf nichts mehr stehen.');
  }
  return ast;

  function isLogicWord(k){ return k && k.type === 'id' && /^(UND|ODER|AND|OR)$/i.test(k.value) && !(t[p+1] && t[p+1].type === '('); }
  function expr(ctx){
    if (isLogicWord(peek())) throw new FErr(INFIX);
    const a = term(ctx);
    const k = peek();
    if (k && k.type === 'op'){
      next();
      const b = term(ctx);
      const k2 = peek();
      if (k2 && k2.type === 'op') throw new FErr('Eine Bedingung hat nur ein Vergleichszeichen. Für „zwischen“ nutzt man UND, z. B. UND(A1>=13; A1<=17).');
      if (isLogicWord(k2)) throw new FErr(INFIX);
      return {k:'cmp', op:k.value, a, b, start:a.start, end:b.end};
    }
    if (isLogicWord(k)) throw new FErr(INFIX);
    return a;
  }
  function missing(ctx){
    if (!ctx) return 'Die Formel ist unvollständig.';
    if (ctx.fn === 'WENN') return WENN_PART[Math.min(ctx.i, 2)];
    if (ctx.fn === 'UND' || ctx.fn === 'ODER') return `In ${ctx.fn}(…) fehlt eine Bedingung.`;
    return `In ${ctx.fn}(…) fehlt etwas.`;
  }
  function term(ctx){
    const k = peek();
    if (!k) throw new FErr('Die Formel ist unvollständig: ' + missing(ctx));
    if (k.type === ';' || k.type === ')' || k.type === ',') throw new FErr(missing(ctx));
    if (k.type === 'op') throw new FErr('Vor dem Vergleichszeichen fehlt etwas (z. B. die Zelle).');
    if (k.type === '('){
      next(); const e = expr(ctx); const c = next();
      if (!c || c.type !== ')') throw new FErr('Eine Klammer wurde geöffnet, aber nicht geschlossen.');
      return e;
    }
    next();
    if (k.type === 'num') return {k:'lit', v:{t:'num', v:k.value}, start:k.start, end:k.end};
    if (k.type === 'str') return {k:'lit', v:{t:'str', v:k.value}, start:k.start, end:k.end};
    const u = k.value.toUpperCase();
    if (peek() && peek().type === '(') return call(u, k);
    if (FUNCS[u]) throw new FErr(`Nach ${u} folgt eine öffnende Klammer „(“.`);
    if (u === 'WAHR') return {k:'lit', v:{t:'bool', v:true}, start:k.start, end:k.end};
    if (u === 'FALSCH') return {k:'lit', v:{t:'bool', v:false}, start:k.start, end:k.end};
    const m = k.value.match(CELL);
    if (m && !(peek() && peek().type === 'id' && !isLogicWord(peek()))) return {k:'ref', v:(m[1] + m[2]).toUpperCase(), start:k.start, end:k.end};
    while (peek() && (peek().type === 'id' || peek().type === 'num') && !isLogicWord(peek())) next();
    const txt = src.slice(k.start, t[p-1].end).split(SEP).join('');
    throw new FErr(`„${txt}“ ist Text und muss in Anführungszeichen stehen: "${txt}"`);
  }
  function call(name, tok){
    if (ENGLISH[name]) throw new FErr(`Im deutschen Excel heißt die Funktion ${ENGLISH[name]} (nicht ${name}).`);
    if (!FUNCS[name]) throw new FErr(`Die Funktion „${tok.value}“ gibt es hier nicht. Erlaubt sind WENN, UND, ODER und NICHT.`);
    next(); // (
    const args = [], spans = [];
    while (true){
      const s = peek() ? peek().start : src.length;
      const e = expr({fn:name, i:args.length});
      args.push(e); spans.push([s, t[p-1].end]);
      const k = next();
      if (!k) throw new FErr(`Es fehlt die schließende Klammer „)“ von ${name}.`);
      if (k.type === ';') continue;
      if (k.type === ')') break;
      if (k.type === ',') throw new FErr('Im deutschen Excel trennt man die Teile einer Funktion mit einem Semikolon „;“.');
      throw new FErr(`In ${name}(…) fehlt zwischen zwei Teilen ein Semikolon „;“.`);
    }
    const [mn, mx] = FUNCS[name];
    if ((name === 'UND' || name === 'ODER') && args.some(a => a.k === 'lit' && a.v.t === 'str'))
      throw new FErr(`In ${name}(…) gehören nur Bedingungen. Wurde die Klammer von ${name} vielleicht nicht vor dem Dann_Wert geschlossen?`);
    if (name === 'WENN' && args.length < 3) throw new FErr('WENN braucht drei Teile: Prüfung; Dann_Wert; Sonst_Wert.');
    if (name === 'WENN' && args.length > 3) throw new FErr('WENN hat genau drei Teile – hier ist ein Semikolon zu viel.');
    if (args.length < mn) throw new FErr(`${name} braucht mindestens zwei Bedingungen, getrennt durch „;“.`);
    if (args.length > mx) throw new FErr(`${name} hat hier zu viele Teile.`);
    return {k:'call', name, args, spans, start:tok.start, end:t[p-1].end};
  }
}

/* Auswertung nach Excel-Regeln */
const ERR = {t:'err', v:'#WERT!'};
function toBool(v){ if (v.t === 'bool') return v.v; if (v.t === 'num') return v.v !== 0; return null; }
function ev(n, env){
  if (n.k === 'lit') return n.v;
  if (n.k === 'ref'){ const x = env[n.v]; return x === undefined ? {t:'num', v:0} : x; }
  if (n.k === 'cmp'){ const a = ev(n.a, env), b = ev(n.b, env); if (a.t === 'err') return a; if (b.t === 'err') return b; return {t:'bool', v:opTest(n.op, cmp(a, b))}; }
  if (n.name === 'WENN'){ const c = ev(n.args[0], env); if (c.t === 'err') return c; const b = toBool(c); if (b === null) return ERR; return ev(n.args[b ? 1 : 2], env); }
  const vals = n.args.map(a => ev(a, env));
  if (vals.some(v => v.t === 'err')) return ERR;
  const bs = vals.map(toBool); if (bs.includes(null)) return ERR;
  if (n.name === 'UND') return {t:'bool', v:bs.every(Boolean)};
  if (n.name === 'ODER') return {t:'bool', v:bs.some(Boolean)};
  return {t:'bool', v:!bs[0]}; // NICHT
}
function usesFn(n, names){ return n.k === 'call' && (names.includes(n.name) || n.args.some(a => usesFn(a, names))) || n.k === 'cmp' && (usesFn(n.a, names) || usesFn(n.b, names)); }
function fmtNode(n){
  if (n.k === 'lit') return n.v.t === 'str' ? '"' + n.v.v.replace(/"/g, '""') + '"' : fmtVal(n.v);
  if (n.k === 'ref') return n.v;
  if (n.k === 'cmp') return fmtNode(n.a) + n.op + fmtNode(n.b);
  return n.name + '(' + n.args.map(fmtNode).join(';') + ')';
}

function checkAgainst(src, task){
  const ast = parseFormula(src);
  const ref = parseFormula(task.sol);
  const rows = task.tests.map(env => ({env, got:ev(ast, env), exp:ev(ref, env)}));
  const fail = rows.find(r => !same(r.got, r.exp)) || null;
  return {ast, rows, fail, ok:!fail, logic:usesFn(ast, ['UND', 'ODER'])};
}
function product(arrs){ return arrs.reduce((acc, a) => acc.flatMap(x => a.map(y => [...x, y])), [[]]); }

/* ---------- Stufen und Bausteine ---------- */
const WB_LEVELS = [null,
  {name:'Bedingungen auswählen',              mode:'slots', comb:'fixed',  cond:'choose',    res:'fixed'},
  {name:'UND oder ODER wählen',               mode:'slots', comb:'choose', cond:'choose',    res:'fixed'},
  {name:'DANN und SONST einsetzen',           mode:'slots', comb:'choose', cond:'choose',    res:'drag'},
  {name:'Bedingungen bauen – Wert ziehen',    mode:'slots', comb:'choose', cond:'buildDrag', res:'drag'},
  {name:'Bedingungen bauen – Wert eintippen', mode:'slots', comb:'choose', cond:'buildType', res:'drag'},
  {name:'Formel komplett bauen',              mode:'row',   cond:'buildType', quotes:false},
  {name:'Formel bauen inkl. Anführungszeichen', mode:'row', cond:'buildType', quotes:true},
  {name:'Freitext mit Hilfe',                 mode:'text',  help:true},
  {name:'Freitext ohne Hilfe',                mode:'text',  help:false}
];

function wbSetup(){
  const T = CUR, L = LEVELS[level], r = rng(poolSeed);
  S = {items:{}, pools:{fn:[], cond:[], cval:[], res:[]}, slots:{comb:null, c1:null, c2:null, then:null, else:null},
       row:[], text:'', success:false, rowRoles:{}, fb:null, result:null};
  uid = 0;
  if (L.mode === 'text'){ render(); return; }
  const mk = (kind, lit, extra) => { const id = 'b' + (++uid); S.items[id] = {id, kind, lit, label:lit, ...extra}; return id; };
  if (L.comb === 'choose') S.pools.fn = ['UND', 'ODER'].map(f => mk('fn', f));
  const builders = (L.cond === 'buildDrag' || L.cond === 'buildType') ? T.condCells.map(c => mk('builder', '', {bcell:c, op:'', input:''})) : [];
  if (L.cond === 'choose') S.pools.cond = shuffle([...T.conds, ...T.condD].map(l => mk('cond', l)), r);
  if (L.cond === 'buildDrag'){
    S.pools.cval = shuffle([...new Set([...T.cvals, ...T.cvalD])].map(l => mk('val', l)), r);
    builders.forEach(b => S.slots['cv:' + b] = null);
  }
  if (L.mode === 'slots' && L.cond !== 'choose') S.pools.cond = builders;
  if (L.res === 'drag' || L.mode === 'row'){
    const seen = new Set();
    const res = [T.then, T.else, ...T.resD].map(l => L.quotes ? stripQ(l) : l).filter(l => !seen.has(l) && seen.add(l));
    S.pools.res = shuffle(res.map(l => mk('val', l)), r);
  }
  if (L.mode === 'row') S.pools.res = [...builders, ...S.pools.res];
  render();
}

function fmtCell(v, dp){ return v.t === 'num' ? fx(v.v, dp) : esc(v.v); }
function wbGrid(){
  const T = CUR, row = T.out.match(/\d+/)[0], col = c => c.replace(/\d+/, '');
  const out = S.result ? esc(S.result.t === 'str' ? S.result.v : fmtVal(S.result)) : '';
  $('#grid').innerHTML = `<table class="grid"><tr><th></th>${T.cells.map(c => `<th>${col(c)}</th>`).join('')}<th>${col(T.out)}</th></tr>
    <tr><th>${row - 1}</th>${T.labels.map(l => `<td class="lbl">${esc(l)}</td>`).join('')}<td class="lbl">${esc(T.resLabel)}</td></tr>
    <tr><th>${row}</th>${T.cells.map((c, i) => `<td>${fmtCell(T.sample[c], T.dps[i])}</td>`).join('')}<td class="fx">${out}</td></tr></table>`;
}

function builderInner(it, grip){
  const L = LEVELS[level];
  const opts = ['', ...OPS].map(o => `<option value="${esc(o)}"${it.op === o ? ' selected' : ''}>${o === '' ? '?' : esc(o)}</option>`).join('');
  let v;
  if (L.cond === 'buildDrag'){
    const k = 'cv:' + it.id, id = S.slots[k];
    v = `<div class="slot pill small" data-drop="slot" data-slot="${k}">${id ? blockHTML(S.items[id], {role:role('cond')}) : '<span class="ph">Wert</span>'}</div>`;
  } else {
    v = `<input class="cvin" data-b="${it.id}" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Wert" value="${esc(it.input)}" size="${Math.max(4, it.input.length + 1)}" aria-label="Vergleichswert">`;
  }
  return `${grip ? '<span class="grip" aria-hidden="true">⠿</span>' : ''}<span class="cellref">${it.bcell}</span><select class="opsel" data-b="${it.id}" aria-label="Vergleichszeichen">${opts}</select>${v}`;
}

function condSlot(key, live){
  if (!live) return '<div class="slot hex dummy"><span class="ph">Bedingung</span></div>';
  const id = S.slots[key];
  return `<div class="slot hex" data-drop="slot" data-slot="${key}">${id ? blockHTML(S.items[id], {role:role('cond')}) : '<span class="ph">Bedingung</span>'}</div>`;
}

function blockHTML(it, o = {}){
  const cls = ['block'];
  if (it.kind === 'val') cls.push('val');
  else if (it.kind === 'sym') cls.push('sym');
  else if (it.kind === 'fn') cls.push('fn');
  else cls.push('hex');
  if (it.kind === 'builder') cls.push('builder');
  if (o.role) cls.push('r-' + o.role);
  if (o.ghost) cls.push('ghost');
  const drag = o.drag !== false && !o.ghost && it.id ? ` data-drag="1" data-id="${it.id}"` : '';
  let inner;
  if (it.kind === 'builder' && o.ghost) inner = `<span class="cellref">${it.bcell}</span> ? Wert`;
  else if (it.kind === 'builder') inner = builderInner(it, !!drag);
  else if (it.kind === 'fn') inner = `<span class="fname">${it.lit}(</span>${condSlot('c1', o.live)}<span class="fsep">;</span>${condSlot('c2', o.live)}<span class="fname">)</span>`;
  else inner = esc(it.label);
  return `<div class="${cls.join(' ')}"${drag}>${inner}</div>`;
}

function wbRender(kopf){
  const T = CUR, L = LEVELS[level];
  renderHeader();
  $('#workcard').style.display = ''; $('#wtlabel').textContent = 'Deine Formel';
  $('#lvlname').textContent = kopf.lvl;
  $('#taskmeta').textContent = kopf.meta;
  $('#tasktext').innerHTML = kopf.text;
  renderGrid();
  const W = $('#work'), P = $('#pools');

  if (L.mode === 'slots'){
    let comb;
    if (L.comb === 'fixed') comb = blockHTML({kind:'fn', lit:T.comb}, {drag:false, live:true, role:role('cond')});
    else comb = `<div class="slot fnslot" data-drop="slot" data-slot="comb">${S.slots.comb ? blockHTML(S.items[S.slots.comb], {live:true, role:role('cond')}) : '<span class="ph">UND / ODER</span>'}</div>`;
    const res = s => L.res === 'fixed'
      ? `<span class="fixv${S.success ? ' c-' + s : ''}">${esc(T[s])}</span>`
      : `<div class="slot pill" data-drop="slot" data-slot="${s}">${S.slots[s] ? blockHTML(S.items[S.slots[s]], {role:role(s)}) : `<span class="ph">${s === 'then' ? 'Dann_Wert' : 'Sonst_Wert'}</span>`}</div>`;
    W.innerHTML = `<div class="formula"><span class="ft">=WENN(</span>${comb}<span class="ft">;</span>${res('then')}<span class="ft">;</span>${res('else')}<span class="ft">)</span></div>`;
  } else if (L.mode === 'row'){
    const kids = S.row.map(id => `<span class="iw">${blockHTML(S.items[id], {role:S.success ? (S.rowRoles[id] || '') : ''})}</span>`).join('');
    W.innerHTML = `<div class="row" data-drop="row">${kids || '<span class="ph">Ziehe Zeichen und Bausteine hierher, um die Formel zu bauen.</span>'}</div>`;
  } else {
    W.innerHTML = `<input id="ft" class="ftin acin" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Formel eingeben …" value="${esc(S.text)}" aria-label="Formel">`;
    updateTip();
  }

  let ph = '';
  const pool = (title, key) => `<div class="pool" data-drop="pool"><div class="pool-title">${title}</div><div class="pool-items">${S.pools[key].map(id => blockHTML(S.items[id], {ghost:isPlaced(id)})).join('')}</div></div>`;
  if (S.pools.fn.length) ph += pool('Verknüpfung', 'fn');
  if (S.pools.cond.length) ph += pool(L.cond === 'choose' ? 'Bedingungen' : 'Bedingungen bauen', 'cond');
  if (S.pools.cval.length) ph += pool('Vergleichswerte', 'cval');
  if (S.pools.res.length) ph += pool(L.mode === 'row' ? 'Bausteine' : 'Werte für DANN und SONST', 'res');
  if (L.mode === 'row'){
    const syms = ['=', 'WENN', 'UND', 'ODER', ...(T.syms || []), '(', ';', ')'].concat(L.quotes ? ['"'] : []);
    ph += `<div class="pool sympool" data-drop="pool"><div class="pool-title">Zeichen – beliebig oft verwendbar</div><div class="pool-items">${syms.map(s => `<div class="block sym" data-drag="1" data-sym="${esc(s)}">${esc(s)}</div>`).join('')}</div></div>`;
  }
  P.innerHTML = ph; P.style.display = ph ? '' : 'none';
  $('#wthint').textContent = L.mode === 'text' ? '' : '· Zum Entfernen einen Baustein zurück nach unten ziehen';
  renderFeedback(); renderNav();
}


/* ---------- Formel zusammensetzen & prüfen ---------- */
function builderStr(it){
  const L = LEVELS[level];
  if (!it.op) return {missing:'Wähle in jeder Bedingung ein Vergleichszeichen aus.'};
  let v;
  if (L.cond === 'buildDrag'){ const id = S.slots['cv:' + it.id]; if (!id) return {missing:'Ziehe in jede Bedingung einen Vergleichswert.'}; v = S.items[id].lit; }
  else { v = it.input.trim(); if (!v) return {missing:'Trage in jeder Bedingung einen Vergleichswert ein.'}; }
  return {str:it.bcell + it.op + v};
}
function piece(id){ const it = S.items[id]; return it.kind === 'builder' ? builderStr(it) : {str:it.lit}; }

function currentFormula(){
  const T = CUR, L = LEVELS[level];
  if (L.mode === 'text') return {src:S.text};
  if (L.mode === 'slots'){
    let comb = T.comb;
    if (L.comb === 'choose'){ if (!S.slots.comb) return {missing:'Ziehe UND oder ODER in das Feld der Prüfung.'}; comb = S.items[S.slots.comb].lit; }
    if (!S.slots.c1 || !S.slots.c2) return {missing:`Setze in ${comb}(…) zwei Bedingungen ein.`};
    const a = piece(S.slots.c1), b = piece(S.slots.c2);
    if (a.missing) return a; if (b.missing) return b;
    let th = T.then, el = T.else;
    if (L.res === 'drag'){
      if (!S.slots.then) return {missing:'Das Feld „Dann_Wert“ ist noch leer.'};
      if (!S.slots.else) return {missing:'Das Feld „Sonst_Wert“ ist noch leer.'};
      th = S.items[S.slots.then].lit; el = S.items[S.slots.else].lit;
    }
    return {src:`=WENN(${comb}(${a.str};${b.str});${th};${el})`};
  }
  if (!S.row.length) return {missing:'Die Formelzeile ist noch leer.'};
  let src = '', ranges = {};
  for (let i = 0; i < S.row.length; i++){
    const pc = piece(S.row[i]); if (pc.missing) return pc;
    if (i) src += SEP;
    ranges[S.row[i]] = [src.length, src.length + pc.str.length];
    src += pc.str;
  }
  return {src, ranges};
}

function caseText(env){
  const parts = CUR.cells.map((c, i) => `in <b>${c}</b> <code>${esc(fmtVal(env[c]))}</code>`);
  return parts.length === 1 ? parts[0] : parts.slice(0, -1).join(', ') + ' und ' + parts[parts.length - 1];
}

function wbCheck(opt = {}){
  const T = CUR, L = LEVELS[level], knapp = L.mode === 'text' && !L.help;   // letzte Stufe: Rückmeldung ohne Hinweise
  const cur = currentFormula();
  if (cur.missing){ S.fb = {type:'err', html:esc(cur.missing)}; S.success = false; renderFeedback(); return; }
  let res;
  try { res = checkAgainst(cur.src, T); }
  catch (e){
    if (!(e instanceof FErr)) throw e;
    S.success = false; S.fb = {type:'err', html: knapp ? 'Die Formel enthält einen Fehler.' : esc(e.message)};
    renderFeedback(); return;
  }
  if (!res.ok){
    S.success = false;
    if (knapp) S.fb = {type:'err', html:'Die Formel ist gültig, liefert aber nicht in allen Fällen das richtige Ergebnis.'};
    else {
      const f = res.fail;
      let h = `Die Formel ist gültig, aber das Ergebnis stimmt noch nicht in jedem Fall.<br>Wenn ${caseText(f.env)} steht, liefert deine Formel <code>${esc(fmtVal(f.got))}</code> – richtig wäre <code>${esc(fmtVal(f.exp))}</code>.`;
      if (f.got.t === 'str' && f.exp.t === 'str' && f.got.v.toLowerCase() === f.exp.v.toLowerCase()) h += '<br>Achte auf Groß- und Kleinschreibung.';
      else if (f.got.t !== f.exp.t && fmtVal(f.got).replace(/"/g, '') === fmtVal(f.exp).replace(/"/g, '')) h += '<br>Achte darauf, ob eine Zahl oder ein Text ausgegeben werden soll.';
      S.fb = {type:'err', html:h};
    }
    renderFeedback(); return;
  }
  if (!res.logic && !T.noLogic){
    S.success = false;
    S.fb = {type:'err', html:'Das Ergebnis stimmt – aber in dieser Übung sollst du die Bedingungen mit UND bzw. ODER verknüpfen statt mehrere WENN-Funktionen zu verschachteln.'};
    renderFeedback(); return;
  }
  const fehlt = T.muss ? T.muss(res.ast) : '';
  if (fehlt){ S.success = false; S.fb = {type:'err', html:fehlt}; renderFeedback(); return; }
  // richtig
  S.success = true;
  S.ast = res.ast;
  logSolved(opt.geloest ? opt.geloest() : countSolved());
  const a = res.ast;
  if (L.mode === 'row'){
    S.rowRoles = {};
    for (const [id, [x, y]] of Object.entries(cur.ranges))
      ['cond', 'then', 'else'].forEach((r, i) => { const sp = a.spans[i]; if (x >= sp[0] && y <= sp[1]) S.rowRoles[id] = r; });
  }
  S.result = ev(a, T.sample);
  const colored = `=WENN(<span class="c-cond">${esc(fmtNode(a.args[0]))}</span>;<span class="c-then">${esc(fmtNode(a.args[1]))}</span>;<span class="c-else">${esc(fmtNode(a.args[2]))}</span>)`;
  const norm = s => normQuotes(s).split(SEP).join('').replace(/\s+/g, '').toUpperCase();
  let h = `<b>Glückwunsch, richtig! 🎉</b><br><span class="fcol">${colored}</span><br><span class="legend"><span class="c-cond">■</span> Prüfung &nbsp; <span class="c-then">■</span> Dann_Wert &nbsp; <span class="c-else">■</span> Sonst_Wert</span>`;
  if (norm(cur.src) !== norm(T.sol)) h += `<br>Deine Lösung ist gleichwertig zur Musterlösung <code>${esc(T.sol)}</code>.`;
  if (!knapp){
    h += `<details class="cases"><summary>Alle ${res.rows.length} getesteten Fälle anzeigen</summary><table class="tt"><tr>${T.cells.map(c => `<th>${c}</th>`).join('')}<th>Ergebnis</th></tr>` +
      res.rows.map(r => `<tr>${T.cells.map(c => `<td>${esc(fmtVal(r.env[c]))}</td>`).join('')}<td>${esc(fmtVal(r.got))}</td></tr>`).join('') + '</table></details>';
  }
  if (opt.nachher) h += opt.nachher + '<br>';
  if (canNext()) h += mode === 'lernen' ? 'Weiter geht es mit „Weiter“.' : 'Weiter geht es mit „Nächste Aufgabe“.';
  S.fb = {type:'ok', html:h};
  render();
}


/* ---------- Drag & Drop: Ablageregeln (Ziehen: basis.js, Shift+Klick: bausteine.js) ---------- */
function accepts(target, kind){
  const t = target.dataset.drop;
  if (t === 'slot'){
    const s = target.dataset.slot;
    if (s === 'comb') return kind === 'fn';
    if (s === 'c1' || s === 'c2') return kind === 'cond' || kind === 'builder';
    return kind === 'val';
  }
  if (t === 'row') return kind !== 'cond' && kind !== 'fn';
  return t === 'pool';
}
function unplace(id){
  for (const k in S.slots) if (S.slots[k] === id){ S.slots[k] = null; if (k === 'comb'){ S.slots.c1 = null; S.slots.c2 = null; } }
  const i = S.row.indexOf(id); if (i >= 0) S.row.splice(i, 1);
  if (S.items[id] && S.items[id].kind === 'sym') delete S.items[id];
}

function applyDrop(d, type, idx, t){
  if (type === 'slot'){
    const s = t.dataset.slot;
    if (S.slots[s] === d.id) return;
    const prev = Object.keys(S.slots).find(k => S.slots[k] === d.id);
    const occ = S.slots[s];
    if (prev) S.slots[prev] = null;
    S.slots[s] = d.id;
    if (prev && occ){ const pe = document.querySelector(`[data-slot="${prev}"]`); if (pe && accepts(pe, S.items[occ].kind)) S.slots[prev] = occ; } // tauschen
  } else if (type === 'row'){
    let id = d.id;
    if (d.sym){ id = 's' + (++uid); S.items[id] = {id, kind:'sym', lit:d.sym, label:d.sym}; }
    const cur = S.row.indexOf(id);
    if (cur >= 0){ S.row.splice(cur, 1); if (cur < idx) idx--; }
    S.row.splice(idx, 0, id);
  } else {
    if (d.sym || !isPlaced(d.id)) return;
    unplace(d.id);
  }
  S.success = false; S.fb = null; S.result = null;
  render();
}

/* ---------- Ereignisse ---------- */
document.addEventListener('change', e => {
  if (e.target.matches('.opsel')){ S.items[e.target.dataset.b].op = e.target.value; clearMarks(); }
});
document.addEventListener('input', e => {
  if (e.target.matches('.cvin')){ const it = S.items[e.target.dataset.b]; it.input = e.target.value; e.target.size = Math.max(4, it.input.length + 1); clearMarks(); }
  if (e.target.id === 'ft'){ S.text = e.target.value; updateTip(); clearMarks(); }
});
document.addEventListener('keyup', e => { if (e.target.id === 'ft') updateTip(); });
document.addEventListener('click', e => { if (e.target.id === 'ft') updateTip(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.target.id === 'ft' || (e.target.matches && e.target.matches('.cvin')))){ e.preventDefault(); check(); }
});
