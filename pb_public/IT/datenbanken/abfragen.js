/* abfragen.js – SQL-Abfragen üben: Entwurf, Blöcke, Access-Entwurfsansicht, SQL-Editor
 *
 * Läuft komplett im Browser (SQLite über sql.js), auch per file://. Nutzt Kopfzeile, Stufen,
 * Modi und Dock aus ../excel/basis.js. Einbinden am Ende von <body>, in dieser Reihenfolge:
 *   <link> ../python/lib/codemirror.css, lib/show-hint.min.css, ../excel/basis.css, abfragen.css
 *   <script> filme.js (Daten), lib/sql-asm.js, ../python/lib/codemirror.min.js, lib/show-hint.min.js,
 *            ../excel/basis.js, dann window.SQLKURS = {…}, dann abfragen.js
 * Markup der Seite: wie abfragen.html (Kopfzeile, #tasktext, #work, #fb, #ergebnis, #dock, Knöpfe).
 *
 * SQLKURS = {
 *   id:      'sql'                 Tool-id aus katalog.js (Speicherstand: id + '-…')
 *   tabelle: DB_FILME              {name, felder:[{n, typ, art, d}], zeilen:[[…]]}
 *   stufen:  [null, {name, ui}]    ui: 'block'  Felder anklicken, eine Bedingung als Baustein
 *                                      'baum'   Felder anklicken, Bedingung aus Blöcken (AND/OR verschachtelt)
 *                                      'text'   Felder anklicken, Bedingung eintippen
 *                                      'sql'    SQL-Editor; vorlage: 'erklaert' | 'geruest' | 'leer'
 *                                      'access' Access-Entwurf (Feld, Sortierung, Anzeigen, Kriterien/oder);
 *                                               krit: 'bloecke' nur die nötigen Kriterien (mit Feldname),
 *                                               'falsch' dazu falsche, 'text' selbst eintippen (Access-Schreibweise)
 *   ansichten: {access:{name, stufen}, sql:{name, stufen}}   statt stufen: Umschalter in der Kopfzeile
 *            (Knöpfe mit data-ansicht="…"); Stufe, Fortschritt und Modus je Ansicht getrennt (id-ansicht-…).
 *            An den Server wird die Stufe durchgezählt gemeldet (Access 1–3, dann SQL 4–8),
 *            passend zu stufen in katalog.js
 *   kalender:{tage:['Montag', …]}  Aufgabenwahl als Kalender (Wochen × Tage) statt Nummern
 *   aufgaben:[{frage, felder:['titel', …] oder ['*'], where?:"jahr < 1970", sort?:'jahr DESC', tipp?,
 *             auch?:["…"] gleichwertige Bedingungen, die ebenfalls als richtig zählen}]
 *   endlos:  [(r, Z) => Aufgabe]   r = Zufall, Z = {pick1, ri, liste(sql) → erste Spalte aller Zeilen}
 *            Ergebnis mit 1 bis 80 Zeilen wird genommen, sonst neu gewürfelt.
 *   intro:   HTML über der Abfrage, nur ohne aufgaben
 *   erarbeitung: [schritt, …]   (auch je Ansicht: ansichten.access.erarbeitung) → Modus „Erarbeitung“
 *            (Knopf data-mode="lernen", wird ohne Erarbeitung ausgeblendet). schritt = {titel, html, …}:
 *              nur html                       Info-Schritt (gilt beim Anzeigen als erledigt), final:true = Abschluss;
 *                                             Knöpfe mit data-mode-go="pfad|endlos" wechseln den Modus
 *              aufgabe:{typ, …}               Baustein aus lib/aufgaben.js (Seite bindet ../../lib/aufgaben.js/.css ein)
 *              access:{frage, felder, where, sort, tipp, auch}, krit:'bloecke'|'falsch'|'text'
 *                                             Abfrage im Access-Entwurf, geprüft wie eine Übung
 *            Stand unter id(-ansicht)-lernen {idx, done}; gelöste Schritte melden modus 'erarbeitung'.
 * }
 * Ohne aufgaben: freie Abfragen (wie filmdatenbank.html). Kein Prüfen, keine Modi, kein Dock;
 * die Knöpfe #checkBtn, #nextBtn, #skipBtn, #prevBtn braucht basis.js trotzdem (hidden).
 * Beim Stufenwechsel wird die bisherige Abfrage in den SQL-Editor übernommen,
 * leere WHERE- oder ORDER-BY-Zeilen des Gerüsts werden beim Ausführen ignoriert.
 * Geprüft wird über das Ergebnis: gleiche Spalten (Reihenfolge egal), gleiche Zeilen,
 * bei sort gleiche Reihenfolge der Sortierspalte. Fehler werden vor dem Ausführen
 * selbst gesucht und auf Deutsch erklärt; SQLite-Meldungen nur als Rückfall übersetzt.
 * Tasten: Strg+Enter führt aus, Strg+Shift+Enter prüft; Autovervollständigung beim Tippen.
 */
/* Zustand, den basis.js als globale Namen erwartet */
var KEY = SQLKURS.id + '-', LEVELS = SQLKURS.stufen, STD = SQLKURS.aufgaben || [];
var mode, level, pfadIdx, solved, streak = 0, best = 0, endCounted = false, pickerOpen = false;
(function(){
const K = window.SQLKURS, T = K.tabelle, TAB = T.name, FREI = !K.aufgaben;
const FELD = {}; T.felder.forEach(f => FELD[f.n.toLowerCase()] = f);
const SPALTEN = T.felder.map(f => f.n);
const KW = ['SELECT', 'FROM', 'WHERE', 'ORDER', 'BY', 'ASC', 'DESC', 'LIKE', 'IS', 'NOT', 'NULL', 'AND', 'OR', 'AS', 'DISTINCT', 'LIMIT', 'OFFSET', 'IN', 'BETWEEN', 'GROUP', 'HAVING'];
const KWS = new Set(KW);
const OPS = ['=', '<>', '<', '<=', '>', '>=', 'LIKE', 'NOT LIKE', 'IS NULL', 'IS NOT NULL'];
const istText = n => { const f = FELD[n]; return f && f.art !== 'Zahl' && f.art !== 'Kommazahl'; };

/* ---------- Zustand ---------- */
let db = null, CUR = null, S = null, ed = null, endScen = -1, endSeed = 0;
const ANS = K.ansichten ? Object.keys(K.ansichten) : null;
let ansicht = null, lernIdx = 0, lernDone = new Set(), LST = null;
const ER = () => (ANS ? K.ansichten[ansicht].erarbeitung : K.erarbeitung) || null;
const stufe = () => mode === 'lernen' && LST ? LST : LEVELS[level];
if (ANS){ try { ansicht = localStorage.getItem(K.id + '-ansicht'); } catch (e) {} if (!ANS.includes(ansicht)) ansicht = ANS[0]; }
function ladeStand(){
  if (ANS){ KEY = K.id + '-' + ansicht + '-'; LEVELS = K.ansichten[ansicht].stufen; }
  const m = load('mode');
  mode = m === 'endlos' || m === 'pfad' ? m : ER() ? 'lernen' : 'pfad';
  lernIdx = 0; lernDone = new Set();
  if (ER()){ try { const st = JSON.parse(load('lernen') || '{}'); lernIdx = Math.min(ER().length - 1, Math.max(0, st.idx || 0)); lernDone = new Set(st.done || []); } catch (e) {} }
  level = Math.min(LEVELS.length - 1, Math.max(1, parseInt(load('level')) || 1));
  pfadIdx = Math.min(Math.max(0, STD.length - 1), Math.max(0, parseInt(load('idx')) || 0));
  try { solved = JSON.parse(load('solved') || '{}') || {}; } catch (e) { solved = {}; }
  best = parseInt(load('best')) || 0; streak = 0; endCounted = false; pickerOpen = false;
}
ladeStand();
function setAnsicht(a){
  if (!ANS || a === ansicht) return;
  ansicht = a; try { localStorage.setItem(K.id + '-ansicht', a); } catch (e) {}
  if (window.TrainerSync) TrainerSync.changed();
  ladeStand();
  starte();
}
// Aufgabe passend zum Modus wählen und zeichnen
function starte(){
  if (mode === 'lernen'){ zeigeSchritt(); return; }
  LST = null;
  if (mode === 'endlos') newEndless(); else CUR = STD[pfadIdx];
  setup();
}

/* ---------- Datenbank ---------- */
function baueDB(SQL){
  db = new SQL.Database();
  db.run(`CREATE TABLE ${TAB} (` + T.felder.map(f => f.n + ' ' + f.typ + (f.typ === 'TEXT' ? ' COLLATE NOCASE' : '')).join(', ') + ')');
  const st = db.prepare(`INSERT INTO ${TAB} VALUES (` + T.felder.map(() => '?').join(',') + ')');
  db.run('BEGIN'); T.zeilen.forEach(z => st.run(z)); db.run('COMMIT'); st.free();
}
// über prepare, damit auch ein leeres Ergebnis seine Spaltennamen hat
function abfrage(sql){
  const st = db.prepare(sql), values = [];
  try { while (st.step()) values.push(st.get()); return {columns:st.getColumnNames(), values}; }
  finally { st.free(); }
}
function sqlVon(a){
  let s = 'SELECT ' + a.felder.join(', ') + '\nFROM ' + TAB;
  if (a.where) s += '\nWHERE ' + a.where;
  if (a.sort) s += '\nORDER BY ' + a.sort;
  return s;
}

/* ---------- Zerlegen in Wörter, Zahlen, Texte, Zeichen ---------- */
function lex(src){
  const out = []; let i = 0;
  while (i < src.length){
    const ch = src[i], rest = src.slice(i);
    let m;
    if (/\s/.test(ch)){ i++; continue; }
    if (rest.startsWith('--')){ const e = src.indexOf('\n', i); i = e < 0 ? src.length : e; continue; }
    if (ch === "'"){
      let j = i + 1, v = '';
      while (j < src.length){ if (src[j] === "'"){ if (src[j + 1] === "'"){ v += "'"; j += 2; continue; } break; } v += src[j++]; }
      out.push({t:'str', v, a:i, b:Math.min(j + 1, src.length), open:j >= src.length}); i = j + 1; continue;
    }
    if (ch === '"'){ const j = src.indexOf('"', i + 1); const e = j < 0 ? src.length : j + 1; out.push({t:'dq', v:src.slice(i + 1, j < 0 ? src.length : j), a:i, b:e, open:j < 0}); i = e; continue; }
    if (/[„“”‘’‚´`]/.test(ch)){ out.push({t:'badq', v:ch, a:i, b:i + 1}); i++; continue; }
    if ((m = rest.match(/^\d+(\.\d+)?/))){ out.push({t:'num', v:m[0], a:i, b:i + m[0].length}); i += m[0].length; continue; }
    if ((m = rest.match(/^[A-Za-z_ÄÖÜäöüß][A-Za-z0-9_ÄÖÜäöüß]*/))){
      const u = m[0].toUpperCase();
      out.push({t:KWS.has(u) ? 'kw' : 'word', v:m[0], u, a:i, b:i + m[0].length}); i += m[0].length; continue;
    }
    if ((m = rest.match(/^(<=|>=|<>|!=|==|=>|=<|[=<>+\-\/%])/))){ out.push({t:'op', v:m[0], a:i, b:i + m[0].length}); i += m[0].length; continue; }
    const z = {',':'comma', '*':'star', ';':'semi', '(':'lpar', ')':'rpar', '.':'dot'}[ch];
    out.push({t:z || 'bad', v:ch, a:i, b:i + 1}); i++;
  }
  return out;
}
function abst(a, b){
  a = a.toLowerCase(); b = b.toLowerCase();
  const d = Array.from({length:a.length + 1}, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function aehnlich(w, liste){
  let best = null, bd = 99;
  for (const x of liste){ const d = abst(w, x); if (d < bd){ bd = d; best = x; } }
  return bd <= Math.max(1, Math.min(2, Math.floor(w.length / 3))) || (w.length >= 3 && best && best.toLowerCase().startsWith(w.toLowerCase())) ? best : null;
}
const c = s => `<code>${esc(s)}</code>`;

/* ---------- Fehler suchen und auf Deutsch erklären ---------- */
function F(msg, tok, tok2){ return {msg, a:tok ? tok.a : null, b:tok2 ? tok2.b : tok ? tok.b : null}; }
function pruefeSyntax(src){
  const t = lex(src);
  if (!t.length) return F('Schreibe zuerst eine Abfrage.');
  const bq = t.find(x => x.t === 'badq');
  if (bq) return F(`Das Zeichen ${c(bq.v)} versteht SQL nicht. Texte stehen in einfachen Anführungszeichen ${c("'")} (Taste Shift + #).`, bq);
  const os = t.find(x => x.t === 'str' && x.open);
  if (os) return F(`Ein Text ist nicht geschlossen: Hinter ${c("'" + os.v.trim())} fehlt das schließende ${c("'")}.`, os);
  const od = t.find(x => x.t === 'dq' && x.open);
  if (od) return F(`Hinter ${c('"' + od.v.trim())} fehlt das schließende Anführungszeichen. Texte schreibt man in SQL besser in ${c("'")}.`, od);
  const bad = t.find(x => x.t === 'bad');
  if (bad) return F(`Das Zeichen ${c(bad.v)} gehört nicht in diese Abfrage.`, bad);
  const semi = t.findIndex(x => x.t === 'semi');
  if (semi >= 0 && semi < t.length - 1) return F('Bitte nur eine Abfrage. Nach dem Semikolon ; darf nichts mehr kommen.', t[semi + 1], t[t.length - 1]);
  const q = semi >= 0 ? t.slice(0, semi) : t;
  if (!q.length) return F('Schreibe zuerst eine Abfrage.');

  // Beginn
  const first = q[0];
  if (first.u !== 'SELECT'){
    if (first.t === 'word' && /^(DELETE|DROP|UPDATE|INSERT|CREATE|ALTER|REPLACE|TRUNCATE)$/.test(first.u))
      return F(`Hier werden nur Daten abgefragt. ${c(first.u)} ist nicht erlaubt – eine Abfrage beginnt mit ${c('SELECT')}.`, first);
    if (first.t === 'word' && aehnlich(first.v, ['SELECT'])) return F(`Meinst du ${c('SELECT')} statt ${c(first.v)}?`, first);
    return F(`Eine Abfrage beginnt mit ${c('SELECT')}.`, first);
  }
  // falsch geschriebene Schlüsselwörter finden, bevor sie als Spalten gelten
  for (const x of q) if (x.t === 'word' && !FELD[x.v.toLowerCase()] && x.v.toLowerCase() !== TAB.toLowerCase()){
    const k = {absteigend:'DESC', aufsteigend:'ASC', wo:'WHERE', von:'FROM', aus:'FROM', wenn:'WHERE', sortiere:'ORDER BY', wie:'LIKE', und:'AND', oder:'OR'}[x.v.toLowerCase()];
    if (k) return F(`SQL-Befehle sind englisch: ${c(k)} statt ${c(x.v)}.`, x);
    const kw = aehnlich(x.v, ['SELECT', 'FROM', 'WHERE', 'ORDER', 'LIKE', 'DESC', 'NULL']);
    if (kw && x.v.length >= 3 && !aehnlich(x.v, SPALTEN)) return F(`Meinst du ${c(kw)} statt ${c(x.v)}?`, x);
  }
  const pos = u => q.findIndex(x => x.u === u && x.t === 'kw');
  const pF = pos('FROM'), pW = pos('WHERE'), pO = pos('ORDER');
  // Reihenfolge der Teile
  if (pF < 0){
    const tw = q.findIndex(x => x.t === 'word' && x.v.toLowerCase() === TAB.toLowerCase());
    if (tw > 0) return F(`Vor ${c(q[tw].v)} fehlt ${c('FROM')}: ${c('FROM ' + TAB)}.`, q[tw]);
    return F(`Es fehlt ${c('FROM ' + TAB)}: Nach den Spalten muss stehen, aus welcher Tabelle sie kommen.`, q[q.length - 1]);
  }
  const reihenfolge = `Die Reihenfolge ist immer: ${c('SELECT …')} ${c('FROM …')} ${c('WHERE …')} ${c('ORDER BY …')}.`;
  if (pW >= 0 && pW < pF) return F(`${c('WHERE')} steht vor ${c('FROM')}. ` + reihenfolge, q[pW]);
  if (pO >= 0 && pO < pF) return F(`${c('ORDER BY')} steht vor ${c('FROM')}. ` + reihenfolge, q[pO]);
  if (pO >= 0 && pW > pO) return F(`${c('ORDER BY')} steht vor ${c('WHERE')}. ` + reihenfolge, q[pO]);
  if (q.filter(x => x.u === 'FROM' || x.u === 'WHERE' || x.u === 'SELECT').length > 3 || [pos('SELECT'), pF, pW].some((p, i) => p >= 0 && q.filter(x => x.u === ['SELECT', 'FROM', 'WHERE'][i]).length > 1))
    return F(`Jeder Teil (${c('SELECT')}, ${c('FROM')}, ${c('WHERE')}) darf nur einmal vorkommen.`);

  // SELECT-Teil
  const sel = q.slice(1, pF);
  if (!sel.length) return F(`Nach ${c('SELECT')} fehlen die Spalten, die angezeigt werden sollen, z. B. ${c('titel, jahr')} – oder ${c('*')} für alle.`, q[0]);
  if (sel[sel.length - 1].t === 'comma') return F(`Vor ${c('FROM')} steht ein Komma zu viel. Nach der letzten Spalte kommt kein Komma.`, sel[sel.length - 1]);
  if (sel[0].t === 'comma') return F(`Nach ${c('SELECT')} steht ein Komma zu viel.`, sel[0]);
  for (let i = 0; i < sel.length - 1; i++){
    const a = sel[i], b = sel[i + 1];
    if (a.t === 'comma' && b.t === 'comma') return F('Zwei Kommas hintereinander – dazwischen fehlt eine Spalte.', a, b);
    const spalte = x => (x.t === 'word' && FELD[x.v.toLowerCase()]) || x.t === 'star';
    if (spalte(a) && spalte(b)) return F(`Zwischen ${c(a.v)} und ${c(b.v)} fehlt ein Komma.`, a, b);
    if (a.t === 'word' && b.t === 'word' && FELD[(a.v + '_' + b.v).toLowerCase()]) return F(`Spaltennamen haben keine Leerzeichen: ${c((a.v + '_' + b.v).toLowerCase())}.`, a, b);
  }
  // FROM-Teil
  const fromEnd = [pW, pO, pos('GROUP'), pos('LIMIT')].filter(p => p > pF).reduce((a, b) => Math.min(a, b), q.length);
  const fr = q.slice(pF + 1, fromEnd);
  if (!fr.length) return F(`Nach ${c('FROM')} fehlt der Name der Tabelle: ${c(TAB)}.`, q[pF]);
  if (fr[0].t !== 'word' || fr[0].v.toLowerCase() !== TAB.toLowerCase())
    return F(`Die Tabelle heißt ${c(TAB)}${fr[0].t === 'word' ? `, nicht ${c(fr[0].v)}` : ''}.`, fr[0]);
  if (fr.length > 1){
    const n = fr[1];
    if (n.t === 'word' && FELD[n.v.toLowerCase()] || n.t === 'op') return F(`Vor der Bedingung fehlt ${c('WHERE')}.`, n);
    return F(`Nach ${c('FROM ' + TAB)} kommt nur noch ${c('WHERE')} oder ${c('ORDER BY')}.`, n);
  }
  // WHERE-Teil
  if (pW >= 0){
    const w = q.slice(pW + 1, pO >= 0 ? pO : q.length);
    if (!w.length) return F(`Nach ${c('WHERE')} fehlt die Bedingung, z. B. ${c('jahr > 2000')}.`, q[pW]);
    for (let i = 0; i < w.length; i++){
      const x = w[i], n = w[i + 1];
      if (x.t === 'num' && n && n.t === 'comma' && w[i + 2] && w[i + 2].t === 'num')
        return F(`Kommazahlen schreibt man in SQL mit Punkt: ${c(x.v + '.' + w[i + 2].v)} statt ${c(x.v + ',' + w[i + 2].v)}.`, x, w[i + 2]);
      if (x.t === 'op' && (x.v === '=>' || x.v === '=<')) return F(`Schreibe ${c(x.v[1] + '=')} statt ${c(x.v)}.`, x);
      if (x.t === 'comma') return F(`In der Bedingung steht ein Komma. Kommazahlen schreibt man mit Punkt, Spalten gehören in den ${c('SELECT')}-Teil.`, x);
    }
    const last = w[w.length - 1];
    if (last.t === 'op' || last.u === 'LIKE') return F(`Nach ${c(last.v)} fehlt der Vergleichswert.`, last);
    if (last.u === 'IS' || (last.u === 'NOT' && w.length > 1 && w[w.length - 2].u === 'IS')) return F(`Nach ${c(last.v)} fehlt ${c('NULL')}.`, last);
    // unbekannte Wörter: meist ein Text ohne Anführungszeichen
    for (let i = 0; i < w.length; i++){
      const x = w[i];
      if (x.t !== 'word' || FELD[x.v.toLowerCase()] || (w[i + 1] && w[i + 1].t === 'lpar')) continue;
      if (w[i + 1] && w[i + 1].t === 'word' && FELD[(x.v + '_' + w[i + 1].v).toLowerCase()])
        return F(`Spaltennamen haben keine Leerzeichen: ${c((x.v + '_' + w[i + 1].v).toLowerCase())}.`, x, w[i + 1]);
      const vor = w[i - 1];
      if (vor && (vor.t === 'op' || vor.u === 'LIKE')){
        let j = i; while (w[j + 1] && (w[j + 1].t === 'word' || w[j + 1].t === 'num')) j++;
        const txt = src.slice(x.a, w[j].b);
        return F(`${c(txt)} ist keine Spalte der Tabelle. Ist es ein Text? Dann gehört er in Anführungszeichen: ${c("'" + txt + "'")}.`, x, w[j]);
      }
      const s = aehnlich(x.v, SPALTEN);
      return F(`Die Spalte ${c(x.v)} gibt es nicht.${s ? ` Meinst du ${c(s)}?` : ''}`, x);
    }
    // Spalte und Wert ohne Vergleichszeichen dazwischen
    for (let i = 0; i < w.length - 1; i++){
      const x = w[i], n = w[i + 1];
      if (x.t === 'word' && FELD[x.v.toLowerCase()] && ['str', 'num', 'dq'].includes(n.t))
        return F(`Zwischen ${c(x.v)} und ${c(n.t === 'str' ? "'" + n.v + "'" : n.v)} fehlt ein Vergleichszeichen wie ${c('=')}, ${c('>')} oder ${c('LIKE')}.`, x, n);
    }
  }
  // ORDER-BY-Teil
  if (pO >= 0){
    const o = q.slice(pO + 1);
    if (!o.length || o[0].u !== 'BY') return F(`Nach ${c('ORDER')} fehlt ${c('BY')}: ${c('ORDER BY jahr')}.`, q[pO]);
    if (o.length === 1) return F(`Nach ${c('ORDER BY')} fehlt die Spalte, nach der sortiert wird.`, o[0]);
  }
  // übrige unbekannte Wörter (SELECT- oder ORDER-BY-Teil)
  const alias = new Set(q.filter((x, i) => i && q[i - 1].u === 'AS').map(x => x.v.toLowerCase()));
  for (let i = 0; i < q.length; i++){
    const x = q[i];
    if (x.t !== 'word' || FELD[x.v.toLowerCase()] || x.v.toLowerCase() === TAB.toLowerCase() || alias.has(x.v.toLowerCase()) || (q[i + 1] && q[i + 1].t === 'lpar')) continue;
    const s = aehnlich(x.v, SPALTEN);
    return F(`Die Spalte ${c(x.v)} gibt es nicht.${s ? ` Meinst du ${c(s)}?` : ` Die Spalten heißen: ${SPALTEN.map(c).join(', ')}.`}`, x);
  }
  return null;
}
function uebersetze(msg){
  let m;
  if ((m = msg.match(/no such column: (.+)/))) return `Die Spalte ${c(m[1])} gibt es nicht.`;
  if ((m = msg.match(/no such table: (.+)/))) return `Die Tabelle ${c(m[1])} gibt es nicht. Die Tabelle heißt ${c(TAB)}.`;
  if ((m = msg.match(/near "(.+)": syntax error/))) return `In der Nähe von ${c(m[1])} stimmt etwas nicht. Prüfe Schreibweise, Kommas und Anführungszeichen.`;
  if (/incomplete input/.test(msg)) return 'Die Abfrage ist unvollständig. Fehlt am Ende noch etwas?';
  if ((m = msg.match(/no such function: (.+)/))) return `Die Funktion ${c(m[1])} gibt es nicht.`;
  return 'SQLite meldet einen Fehler: ' + esc(msg);
}
/* Abfrage ausführen → {res} oder {err:{msg, a, b}}; hin = Tipps (z. B. "…" statt '…') */
function fuehreAus(src){
  const e = pruefeSyntax(src);
  if (e) return {err:e};
  try { return {res:abfrage(src)}; }
  catch (x){ return {err:{msg:uebersetze(x.message)}}; }
}

/* ---------- Farbige Darstellung (Vorschau, Erklärungen) ---------- */
function farbe(src){
  let h = '', i = 0;
  for (const x of lex(src)){
    h += esc(src.slice(i, x.a));
    const s = src.slice(x.a, x.b);
    const cls = x.t === 'kw' ? 'keyword' : x.t === 'str' || x.t === 'dq' ? 'string' : x.t === 'num' ? 'number' : x.t === 'op' || x.t === 'star' ? 'operator'
      : x.t === 'word' && FELD[x.v.toLowerCase()] ? 'variable-2' : x.t === 'word' && x.v.toLowerCase() === TAB.toLowerCase() ? 'builtin' : '';
    h += cls ? `<span class="cm-${cls}">${esc(s)}</span>` : esc(s);
    i = x.b;
  }
  return h + esc(src.slice(i));
}

/* ---------- CodeMirror: SQL-Modus, Autovervollständigung, graue Erklärungen ---------- */
CodeMirror.defineMode('vlsql', () => ({
  startState: () => ({str:null}),
  token(st, s){
    if (s.str){ while (!st.eol()){ const ch = st.next(); if (ch === s.str){ if (s.str === "'" && st.peek() === "'"){ st.next(); continue; } s.str = null; break; } } return 'string'; }
    if (st.eatSpace()) return null;
    if (st.match('--')){ st.skipToEnd(); return 'comment'; }
    const ch = st.peek();
    if (ch === "'" || ch === '"'){ st.next(); s.str = ch; return this.token(st, s); }
    if (st.match(/^\d+(\.\d+)?/)) return 'number';
    const m = st.match(/^[A-Za-z_ÄÖÜäöüß][A-Za-z0-9_ÄÖÜäöüß]*/);
    if (m){ const w = m[0]; if (KWS.has(w.toUpperCase())) return 'keyword'; if (FELD[w.toLowerCase()]) return 'variable-2'; if (w.toLowerCase() === TAB.toLowerCase()) return 'builtin'; return null; }
    if (st.match(/^(<=|>=|<>|!=|=|<|>|\*)/)) return 'operator';
    st.next(); return null;
  }
}));
const WORTE = [
  ...['SELECT', 'FROM', 'WHERE', 'ORDER BY', 'ASC', 'DESC', 'LIKE', 'IS NULL', 'IS NOT NULL'].map(w => ({text:w + ' ', anz:w, art:'Befehl'})),
  {text:TAB, anz:TAB, art:'Tabelle'},
  ...T.felder.map(f => ({text:f.n, anz:f.n, art:'Spalte · ' + f.art, d:f.d}))
];
function hinweisListe(cm){
  const cur = cm.getCursor(), line = cm.getLine(cur.line);
  let s = cur.ch; while (s && /[A-Za-z0-9_ÄÖÜäöüß]/.test(line[s - 1])) s--;
  const w = line.slice(s, cur.ch);
  if (!w || /^\d/.test(w) || cm.getTokenTypeAt(cur) === 'string') return null;
  const vor = line.slice(0, s).toUpperCase();
  const nachFrom = /FROM\s*$/.test(vor);
  const list = WORTE.filter(x => x.anz.toLowerCase().startsWith(w.toLowerCase()) && x.anz.toLowerCase() !== w.toLowerCase() && (!nachFrom || x.art === 'Tabelle'))
    .map(x => ({text:x.text, render(el){ el.innerHTML = `<span class="hw">${esc(x.anz)}</span><span class="ha">${esc(x.art)}</span>`; if (x.d) el.title = x.d; }}));
  return list.length ? {list, from:CodeMirror.Pos(cur.line, s), to:cur} : null;
}
function editor(el, opt){
  const cm = CodeMirror(el, Object.assign({
    mode:'vlsql', lineNumbers:false, lineWrapping:true, viewportMargin:Infinity, matchBrackets:true, indentUnit:2, tabSize:2,
    extraKeys:{'Ctrl-Enter':() => ausfuehren(), 'Cmd-Enter':() => ausfuehren(), 'Shift-Ctrl-Enter':() => check(), 'Shift-Cmd-Enter':() => check(), 'Ctrl-Space':cm => cm.showHint({hint:hinweisListe, completeSingle:false})}
  }, opt));
  cm.on('inputRead', (cm, ch) => { if (/[A-Za-zÄÖÜäöüß_]/.test(ch.text[0]) && !cm.state.completionActive) cm.showHint({hint:hinweisListe, completeSingle:false}); });
  cm.on('change', () => { cm.getAllMarks().forEach(m => m.className === 'cm-fehler' && m.clear()); erklaerungen(cm); if (S.fb){ S.fb = null; S.success = false; renderFeedback(); } });
  return cm;
}
// graue Erklärung hinter einem Schlüsselwort, solange die Zeile sonst leer ist
const ERKL = {
  SELECT:'Welche Spalten sollen angezeigt werden? z. B. titel, jahr – oder * für alle',
  FROM:'Aus welcher Tabelle? Hier: ' + TAB,
  WHERE:'Welche Bedingung müssen die Zeilen erfüllen? z. B. jahr > 2000',
  'ORDER BY':'Wonach sortieren? z. B. jahr ASC (aufsteigend) oder jahr DESC (absteigend)'
};
function erklaerungen(cm){
  (cm.state.erkl || []).forEach(b => b.clear()); cm.state.erkl = [];
  const L = stufe();
  if (L.vorlage === 'erklaert') cm.eachLine(l => {
    const m = l.text.match(/^\s*(SELECT|FROM|WHERE|ORDER BY)\s*$/i);
    if (!m) return;
    const sp = document.createElement('span'); sp.className = 'erkl'; sp.textContent = (/\s$/.test(l.text) ? '' : ' ') + ERKL[m[1].toUpperCase()];
    cm.state.erkl.push(cm.setBookmark(CodeMirror.Pos(cm.getLineNumber(l), l.text.length), {widget:sp, insertLeft:true}));
  });
  if (cm.state.platzhalter && !cm.getValue()){
    const sp = document.createElement('span'); sp.className = 'erkl'; sp.textContent = cm.state.platzhalter;
    cm.state.erkl.push(cm.setBookmark(CodeMirror.Pos(0, 0), {widget:sp, insertLeft:true}));
  }
}
function markiere(cm, a, b){
  if (a == null || !cm) return;
  const n = cm.getValue().length; a = Math.max(0, Math.min(a, n)); b = Math.max(a + 1, Math.min(b, n));
  if (a >= n) a = Math.max(0, n - 1);
  cm.markText(cm.posFromIndex(a), cm.posFromIndex(b), {className:'cm-fehler'});
}

/* ---------- Aufgaben ---------- */
function rows1(sql){ try { return abfrage(sql).values.map(z => z[0]); } catch (e) { return []; } }
function newEndless(){
  const Z = {pick1, ri, liste:rows1, shuffle};
  endSeed = rand(); endCounted = false;
  for (let v = 0; v < 40; v++){
    let k; do { k = Math.floor(Math.random() * K.endlos.length); } while (K.endlos.length > 1 && k === endScen);
    const a = K.endlos[k](rng(endSeed + v), Z);
    const n = rows1(sqlVon(a).replace(/^SELECT [^\n]*/, 'SELECT COUNT(*)'))[0];
    if (n >= 1 && n <= 80){ endScen = k; CUR = a; return; }
  }
}
window.newEndless = newEndless;
function aufgabeText(a){
  const fs = a.felder[0] === '*' ? 'alle Felder' : (a.felder.length > 1 ? 'die Felder ' : 'das Feld ') + a.felder.map(c).join(', ').replace(/, ([^,]*)$/, ' und $1');
  let h = `${a.frage}<br><span class="zeige">Zeige ${fs}.`;
  if (a.sort){ const [f, d] = a.sort.split(/\s+/); h += ` Sortiere nach ${c(f)} ${/DESC/i.test(d || '') ? 'absteigend' : 'aufsteigend'}.`; }
  return h + '</span>';
}
function loadTask(){ if (mode === 'pfad') CUR = STD[pfadIdx]; setup(); }
function setup(start){
  S = {sel:[], wf:'', wop:'=', wv:'', where:'', sf:'', sdir:'ASC', fb:null, success:false, erg:null, ergInfo:'', start, kn:{}, wurzel:null};
  if (stufe().ui === 'access') S.acc = neuAccess(stufe());
  render();
}
// freie Abfragen: bisherige Abfrage in den SQL-Editor mitnehmen (nur das Gerüst zählt nicht)
function mitnehmen(){
  if (!S) return;
  const q = aktSQL();
  return q.sql && q.sql.replace(/\b(SELECT|FROM|WHERE|ORDER BY)\b/gi, '').trim() ? q.sql : undefined;
}
function setLevel(n){ const mit = FREI ? mitnehmen() : undefined; level = n; store('level', n); setup(mit); }
function setMode(m){
  if (m === mode || (m === 'lernen' && !ER())) return;
  mode = m; store('mode', m); pickerOpen = false;
  starte(); window.scrollTo({top:0, behavior:'smooth'});
}
function gotoTask(i){ pfadIdx = Math.max(0, Math.min(STD.length - 1, i)); store('idx', pfadIdx); pickerOpen = false; CUR = STD[pfadIdx]; setup(); window.scrollTo({top:0, behavior:'smooth'}); }
function canNext(){
  if (mode === 'lernen') return lernIdx < ER().length - 1 && lernDone.has(lernIdx);
  return mode === 'pfad' ? (pfadIdx < STD.length - 1 && isSolved(pfadIdx)) : endCounted; }
function nextTask(){
  if (!canNext()) return;
  if (mode === 'lernen') gotoStep(lernIdx + 1);
  else if (mode === 'pfad') gotoTask(pfadIdx + 1);
  else { newEndless(); setup(); window.scrollTo({top:0, behavior:'smooth'}); }
}
function skip(){ streak = 0; newEndless(); setup(); }
Object.assign(window, {setLevel, setMode, gotoTask, canNext, nextTask, loadTask, check, renderDock});
window.skipTask = skip;

/* ---------- Erarbeitung ---------- */
const schritt = () => ER()[lernIdx];
const schrittArt = st => st.access ? 'access' : st.aufgabe ? 'aufgabe' : 'info';
function speichereLernen(){ store('lernen', JSON.stringify({idx:lernIdx, done:[...lernDone]})); }
function ersterOffener(){ const E = ER(); for (let i = 0; i < E.length; i++) if (!lernDone.has(i)) return i; return E.length - 1; }
const offen = i => i <= ersterOffener() || lernDone.has(i);
function schrittGeschafft(){
  const st = schritt(), erstmals = !lernDone.has(lernIdx);
  lernDone.add(lernIdx); speichereLernen();
  if (schrittArt(st) !== 'info' && window.TrainerSync)
    TrainerSync.event({modus:'erarbeitung', stufe:0, aufgabe:String(lernIdx + 1), titel:st.titel, gesamt:ER().length, erstmals});
}
function zeigeSchritt(){
  lernIdx = Math.min(ER().length - 1, Math.max(0, lernIdx)); speichereLernen();
  const st = schritt(), art = schrittArt(st);
  LST = {name:'Erarbeitung', ui:'access', krit:st.krit || 'bloecke'};
  CUR = art === 'access' ? st.access : null;
  if (art === 'info' && !lernDone.has(lernIdx)){ lernDone.add(lernIdx); speichereLernen(); }
  setup();
}
function gotoStep(i){ lernIdx = i; pickerOpen = false; zeigeSchritt(); window.scrollTo({top:0, behavior:'smooth'}); }
function lernDock(){
  const E = ER();
  let h = `<button class="dockbtn" id="dockBtn" aria-expanded="${pickerOpen}">📘 Schritt ${lernIdx + 1}/${E.length} <span class="sub">· ${lernDone.size} erledigt</span></button>`;
  if (pickerOpen) h += '<div class="picker steps"><div class="ptitle">Schritte – erledigte sind grün, gesperrte noch nicht erreichbar</div>' +
    E.map((st, i) => `<button data-step="${i}" class="stepbtn${lernDone.has(i) ? ' solved' : ''}${i === lernIdx ? ' cur' : ''}"${offen(i) ? '' : ' disabled'}>${i + 1}. ${esc(st.titel)}</button>`).join('') +
    '<button class="stepreset" data-lernreset="1">Fortschritt zurücksetzen</button></div>';
  return h;
}
function renderLernen(){
  const st = schritt(), art = schrittArt(st), E = ER();
  $('#lvlname').textContent = 'Erarbeitung · ' + st.titel;
  $('#taskmeta').textContent = `Schritt ${lernIdx + 1} von ${E.length}`;
  const schon = art !== 'info' && lernDone.has(lernIdx) ? '<p class="schon">✓ Diesen Schritt hast du schon gelöst. Du kannst ihn noch einmal bearbeiten.</p>' : '';
  $('#tasktext').innerHTML = schon + (st.html || '') + (art === 'access' ? `<div class="auftrag">${aufgabeText(st.access)}</div>` + (st.access.tipp ? `<div class="tipp">💡 ${st.access.tipp}</div>` : '') : '');
  $('#workcard').style.display = art === 'info' ? 'none' : '';
  ['#runBtn', '#tabBtn'].forEach(b => { $(b).style.display = art === 'access' ? '' : 'none'; });
  if (art === 'aufgabe'){
    $('#worktitle').textContent = st.arbeit || 'Aufgabe';
    const W = $('#work'); W.innerHTML = '<div></div>';
    Aufgaben.baue(W.firstChild, st.aufgabe, {fertig:() => {
      schrittGeschafft(); S.success = true;   // „Richtig“ meldet schon der Baustein
      const h = [st.nachher, canNext() ? 'Weiter geht es mit „Weiter“.' : ''].filter(Boolean).join('<br>');
      S.fb = h ? {type:'ok', html:h} : null;
      renderFeedback(); renderNav();
    }});
  }
}

/* ---------- Entwurf (Stufe 1–2) → SQL ---------- */
function wertSQL(f, v){
  v = v.trim();
  if (istText(f.toLowerCase())){
    const m = v.match(/^['"„“](.*)['"“”]$/); if (m) v = m[1];
    return "'" + v.replace(/'/g, "''") + "'";
  }
  return v.replace(/^(-?\d+),(\d+)$/, '$1.$2');
}
function entwurfSQL(){
  const L = stufe();
  if (!S.sel.length) return {fehlt:'Klicke links in der Tabelle auf die Felder, die angezeigt werden sollen.'};
  let s = 'SELECT ' + S.sel.join(', ') + '\nFROM ' + TAB, off = null;
  if (L.ui === 'block' && S.wf){
    if (/NULL/.test(S.wop)) s += '\nWHERE ' + S.wf + ' ' + S.wop;
    else {
      if (!S.wv.trim()) return {fehlt:`Trage in der Bedingung einen Vergleichswert für ${c(S.wf)} ein.`};
      if (!istText(S.wf) && !/^-?\d+([.,]\d+)?$/.test(S.wv.trim()) && S.wop !== 'LIKE') return {fehlt:`${c(S.wf)} enthält Zahlen. Trage als Vergleichswert eine Zahl ein.`};
      s += '\nWHERE ' + S.wf + ' ' + S.wop + ' ' + wertSQL(S.wf, S.wv);
    }
  }
  if (L.ui === 'baum' && S.wurzel){ try { s += '\nWHERE ' + baumSQL(S.wurzel); } catch (e){ if (e.fehlt) return e; throw e; } }
  if (L.ui === 'text' && S.where.trim()){ s += '\nWHERE '; off = s.length; s += S.where.trim(); }
  if (S.sf) s += '\nORDER BY ' + S.sf + ' ' + S.sdir;
  return {sql:s, off};
}
function aktSQL(){
  if (stufe().ui === 'access') return accessSQL();
  if (stufe().ui !== 'sql') return entwurfSQL();
  let sql = ed.getValue();
  if (FREI) sql = sql.replace(/^[ \t]*(WHERE|ORDER BY)[ \t]*$/gim, '');
  return {sql, off:0};
}

/* ---------- Bedingung einer Aufgabe zerlegen (für Access-Bausteine) ---------- */
// WHERE-Text der Musterlösung → Baum {t:'und'|'oder', a, b} bzw. {t:'cmp', f, op, v:{num}|{str}}
function parseWhere(src){
  const t = lex(src); let i = 0;
  const kw = u => t[i] && t[i].t === 'kw' && t[i].u === u;
  const wert = () => { const x = t[i++]; return x.t === 'num' ? {num:+x.v} : {str:x.v}; };
  function oder(){ let a = und(); while (kw('OR')){ i++; a = {t:'oder', a, b:und()}; } return a; }
  function und(){ let a = prim(); while (kw('AND')){ i++; a = {t:'und', a, b:prim()}; } return a; }
  function prim(){
    if (t[i].t === 'lpar'){ i++; const e = oder(); i++; return e; }
    const f = t[i++].v.toLowerCase();
    if (kw('IS')){ i++; const neg = kw('NOT'); if (neg) i++; i++; return {t:'cmp', f, op:neg ? 'IS NOT NULL' : 'IS NULL'}; }
    if (kw('NOT')){ i += 2; return {t:'cmp', f, op:'NOT LIKE', v:wert()}; }
    if (kw('LIKE')){ i++; return {t:'cmp', f, op:'LIKE', v:wert()}; }
    const op = t[i++].v; return {t:'cmp', f, op:op === '!=' ? '<>' : op, v:wert()};
  }
  return oder();
}
// Baum → Zeilen (ODER) aus Vergleichen (UND), so wie im Access-Entwurf
function zeilenVon(n){
  if (n.t === 'cmp') return [[n]];
  if (n.t === 'oder') return zeilenVon(n.a).concat(zeilenVon(n.b));
  const A = zeilenVon(n.a), B = zeilenVon(n.b), r = [];
  A.forEach(x => B.forEach(y => r.push(x.concat(y)))); return r;
}
const accZahl = n => String(n).replace('.', ',');
const accWert = v => v.num !== undefined ? accZahl(v.num) : '"' + v.str + '"';
function accText(n){
  if (n.op === 'IS NULL') return 'Ist Null';
  if (n.op === 'IS NOT NULL') return 'Ist Nicht Null';
  if (/LIKE/.test(n.op)) return (n.op === 'NOT LIKE' ? 'Nicht ' : '') + 'Wie "' + n.v.str.replace(/%/g, '*').replace(/_/g, '?') + '"';
  return (n.op === '=' ? '' : n.op) + accWert(n.v);
}
// Kriterien der Musterlösung als Zellen: [{f, text}] je Zeile, gleiche Felder einer Zeile mit „Und“ verbunden
function accZellen(where){
  return zeilenVon(parseWhere(where)).map(z => {
    const m = new Map(); z.forEach(n => { if (!m.has(n.f)) m.set(n.f, []); m.get(n.f).push(accText(n)); });
    return [...m].map(([f, l]) => ({f, text:l.join(' Und ')}));
  });
}
function accFalsch(text){
  const tausch = {'>=':'>', '>':'>=', '<=':'<', '<':'<='};
  let m;
  if ((m = text.match(/^(>=|<=|>|<)(.*)$/))) return tausch[m[1]] + m[2];
  if ((m = text.match(/^(Nicht )?Wie "\*?(.*?)\*?"$/))) return (m[1] || '') + 'Wie "' + m[2] + '"';
  if (text === 'Ist Null') return 'Ist Nicht Null';
  if (text === 'Ist Nicht Null') return 'Ist Null';
  if ((m = text.match(/^(\d+)$/))) return '<' + m[1];
  if ((m = text.match(/^"(.*)"$/))) return '<>"' + m[1] + '"';
  if ((m = text.match(/^(.*) Und (.*)$/))) return accFalsch(m[1]) + ' Und ' + m[2];
  return null;
}

/* ---------- Access-Kriterien lesen (deutsch und englisch) → SQL ---------- */
const ACCKW = {UND:'AND', AND:'AND', ODER:'OR', OR:'OR', NICHT:'NOT', NOT:'NOT', WIE:'LIKE', LIKE:'LIKE', ZWISCHEN:'BETWEEN', BETWEEN:'BETWEEN', IST:'IS', IS:'IS', NULL:'NULL', LEER:'NULL'};
function accLex(s){
  const out = []; let i = 0, m;
  while (i < s.length){
    const r = s.slice(i);
    if ((m = r.match(/^\s+/))){ i += m[0].length; continue; }
    if ((m = r.match(/^["„“”]([^"„“”]*)["„“”]?/))){ out.push({t:'str', v:m[1], offen:!/["“”]$/.test(m[0]) || m[0].length < 2}); i += m[0].length; continue; }
    if ((m = r.match(/^'([^']*)'?/))){ out.push({t:'str', v:m[1], offen:!m[0].endsWith("'") || m[0].length < 2}); i += m[0].length; continue; }
    if ((m = r.match(/^#([^#]*)#?/))){ out.push({t:'datum', v:m[1]}); i += m[0].length; continue; }
    if ((m = r.match(/^(<=|>=|<>|=>|=<|!=|[=<>])/))){ out.push({t:'op', v:m[1]}); i += m[0].length; continue; }
    if (r[0] === '(' || r[0] === ')'){ out.push({t:r[0]}); i++; continue; }
    if ((m = r.match(/^-?\d+([.,]\d+)?(?![^\s()<>="'])/))){ out.push({t:'num', v:m[0].replace(',', '.')}); i += m[0].length; continue; }
    m = r.match(/^[^\s()<>="'„“”#]+/);
    out.push({t:'wort', v:m[0], u:ACCKW[m[0].toUpperCase()]}); i += m[0].length;
  }
  return out;
}
function accParse(text, f){
  const t = accLex(text); let i = 0;
  const err = msg => { throw {acc:msg}; };
  const kw = u => t[i] && t[i].t === 'wort' && t[i].u === u;
  const q = s => "'" + s.replace(/'/g, "''") + "'";
  const datum = s => { const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : s; };
  function wert(wie){
    const x = t[i];
    if (!x || (x.t === 'wort' && x.u) || x.t === 'op' || x.t === ')') err(`Hier fehlt ein Wert${x ? ` vor ${c(x.v || x.t)}` : ' am Ende'}.`);
    i++;
    if (x.t === 'str'){ if (x.offen) err(`Hinter ${c('"' + x.v)} fehlt das schließende Anführungszeichen ${c('"')}.`); return q(wie ? x.v.replace(/\*/g, '%').replace(/\?/g, '_') : x.v); }
    if (x.t === 'num') return istText(f) ? q(x.v) : x.v;
    if (x.t === 'datum') return q(datum(x.v));
    let w = x.v; while (t[i] && (t[i].t === 'wort' && !t[i].u || t[i].t === 'num')){ w += ' ' + t[i].v; i++; }
    if (!istText(f) && !wie) err(`${c(w)} ist keine Zahl – das Feld ${c(f)} enthält Zahlen.`);
    return q(wie ? w.replace(/\*/g, '%').replace(/\?/g, '_') : w);
  }
  function oder(){ const l = [und()]; while (kw('OR')){ i++; l.push(und()); } return l.length > 1 ? '(' + l.join(' OR ') + ')' : l[0]; }
  function und(){ const l = [nicht()]; while (kw('AND')){ i++; l.push(nicht()); } return l.join(' AND '); }
  function nicht(){ if (kw('NOT')){ i++; return 'NOT (' + nicht() + ')'; } return prim(); }
  function prim(){
    const x = t[i];
    if (!x) err('Hier fehlt noch etwas.');
    if (x.t === '('){ i++; const e = oder(); if (!t[i] || t[i].t !== ')') err(`Es fehlt die schließende Klammer ${c(')')}.`); i++; return '(' + e + ')'; }
    if (kw('LIKE')){ i++; return `${f} LIKE ${wert(true)}`; }
    if (kw('BETWEEN')){ i++; const a = wert(); if (!kw('AND')) err(`Bei ${c('Zwischen')} gehören zwei Werte dazu: ${c('Zwischen 1960 Und 1969')}.`); i++; return `${f} BETWEEN ${a} AND ${wert()}`; }
    if (kw('IS')){ i++; const neg = kw('NOT'); if (neg) i++; if (!kw('NULL')) err(`Nach ${c('Ist')} kommt ${c('Null')} (leer), z. B. ${c('Ist Null')}.`); i++; return `${f} IS ${neg ? 'NOT ' : ''}NULL`; }
    if (kw('NULL')){ i++; return `${f} IS NULL`; }
    if (x.t === 'op'){
      if (x.v === '=>' || x.v === '=<') err(`Schreibe ${c(x.v[1] + '=')} statt ${c(x.v)}.`);
      i++; return `${f} ${x.v === '!=' ? '<>' : x.v} ${wert()}`;
    }
    if (x.t === 'wort' && x.u) err(`${c(x.v)} steht hier an der falschen Stelle.`);
    return `${f} = ${wert()}`;
  }
  const e = oder();
  if (i < t.length){ const x = t[i]; err(x.t === 'wort' && /^%/.test(x.v) ? `Der Platzhalter in Access ist ${c('*')}: ${c('Wie "*Text*"')}.` : `${c(x.v || x.t)} verstehe ich hier nicht. Verbinde mehrere Kriterien mit ${c('Und')} bzw. ${c('Oder')}.`); }
  return e;
}
const ZEILEN = ['Kriterien:', 'oder:', '', ''];
function neuAccess(L){
  const noetig = CUR ? new Set([...CUR.felder, ...(CUR.where ? lex(CUR.where).filter(x => x.t === 'word' && FELD[x.v.toLowerCase()]).map(x => x.v) : [])]).size : 0;
  const A = {cols:Array.from({length:Math.max(6, noetig)}, () => ({f:'', sort:'', show:true})), zellen:{}, bl:{}, pool:[]};
  if (L.krit !== 'text' && CUR && CUR.where){
    let n = 0; const mk = (text, f) => { const id = 'a' + (++n); A.bl[id] = {text, f}; A.pool.push(id); };
    const echt = accZellen(CUR.where).flat();
    echt.forEach(z => mk(z.text, z.f));
    if (L.krit === 'falsch'){
      const r = rng(endSeed + pfadIdx * 31 + 7), schon = new Set(echt.map(z => z.text));
      shuffle(echt, r).forEach(z => { const v = accFalsch(z.text); if (v && !schon.has(v) && A.pool.length < echt.length + 4){ schon.add(v); mk(v, z.f); } });
    }
    A.pool = shuffle(A.pool, rng(rand()));
  }
  return A;
}
function zellText(key){ const z = S.acc.zellen[key]; return stufe().krit === 'text' ? (z || '').trim() : z ? S.acc.bl[z].text : ''; }
function accessSQL(){
  const A = S.acc, cols = A.cols.map((col, i) => Object.assign({i}, col));
  for (const key of Object.keys(A.zellen)){ const ci = +key.split('_')[1]; if (zellText(key) && !cols[ci].f) return {fehlt:`In Spalte ${ci + 1} steht ein Kriterium, aber oben bei „Feld:“ ist noch kein Feld gewählt.`}; }
  const gezeigt = cols.filter(col => col.f && col.show).map(col => col.f);
  if (!gezeigt.length) return {fehlt:'Wähle oben bei „Feld:“ die Felder aus und setze bei „Anzeigen:“ den Haken.'};
  const zeilen = [];
  for (let r = 0; r < ZEILEN.length; r++){
    const teile = [];
    for (const col of cols){
      const txt = col.f && zellText(r + '_' + col.i);
      if (!txt) continue;
      if (col.f === '*') return {fehlt:`Bei ${c(TAB + '.*')} kann kein Kriterium stehen. Wähle für Kriterien ein einzelnes Feld.`};
      try { teile.push(accParse(txt, col.f)); }
      catch (e){ if (!e.acc) throw e; return {fehlt:`Feld ${c(col.f)}, Zeile „${ZEILEN[r] || 'oder:'}“: ${e.acc}`}; }
    }
    if (teile.length) zeilen.push(teile);
  }
  let s = 'SELECT ' + gezeigt.join(', ') + '\nFROM ' + TAB;
  if (zeilen.length) s += '\nWHERE ' + zeilen.map(z => zeilen.length > 1 && z.length > 1 ? '(' + z.join(' AND ') + ')' : z.join(' AND ')).join('\n   OR ');
  const sort = cols.filter(col => col.f && col.sort && col.f !== '*');
  if (sort.length) s += '\nORDER BY ' + sort.map(col => col.f + ' ' + col.sort).join(', ');
  return {sql:s, off:null};
}
function accBlock(id){
  const b = S.acc.bl[id];
  return `<div class="block val acc" data-drag="1" data-acc="${id}">${esc(b.text)}${stufe().krit === 'bloecke' ? `<span class="bfeld">${esc(b.f)}</span>` : ''}</div>`;
}
function accessHTML(){
  const A = S.acc, L = stufe(), frei = new Set(Object.values(A.zellen));
  const sortOpt = v => [['', ''], ['ASC', 'Aufsteigend'], ['DESC', 'Absteigend']].map(([k, t]) => `<option value="${k}"${v === k ? ' selected' : ''}>${t}</option>`).join('');
  let h = `<div class="accwrap"><div class="tabfenster klein"><div class="tabkopf">${esc(TAB)}</div><button class="afeld" data-feld="*">*</button>` +
    T.felder.map(f => `<button class="afeld" data-feld="${esc(f.n)}" title="${esc(f.d)}">${/PRIMARY/.test(f.typ) ? '<span class="key">🔑</span>' : ''}${esc(f.n)}</button>`).join('') + '</div>' +
    '<div class="agridbox"><div class="agridw"><table class="agrid"><tr><th>Feld:</th>' +
    A.cols.map((col, i) => `<td><select class="af" data-c="${i}" aria-label="Feld in Spalte ${i + 1}"><option value=""></option><option value="*"${col.f === '*' ? ' selected' : ''}>${esc(TAB)}.*</option>${T.felder.map(f => `<option${col.f === f.n ? ' selected' : ''}>${esc(f.n)}</option>`).join('')}</select></td>`).join('') +
    '</tr><tr><th>Tabelle:</th>' + A.cols.map(col => `<td class="atab">${col.f ? esc(TAB) : ''}</td>`).join('') +
    '</tr><tr><th>Sortierung:</th>' + A.cols.map((col, i) => `<td><select class="as" data-c="${i}" aria-label="Sortierung Spalte ${i + 1}"${col.f ? '' : ' disabled'}>${sortOpt(col.sort)}</select></td>`).join('') +
    '</tr><tr><th>Anzeigen:</th>' + A.cols.map((col, i) => `<td class="ashow"><input type="checkbox" class="ash" data-c="${i}" aria-label="Anzeigen Spalte ${i + 1}"${col.show ? ' checked' : ''}${col.f ? '' : ' disabled'}></td>`).join('') + '</tr>';
  ZEILEN.forEach((lbl, r) => {
    h += `<tr class="krit"><th>${lbl}</th>` + A.cols.map((col, i) => {
      const k = r + '_' + i;
      if (L.krit === 'text') return `<td><input class="ain" data-k="${k}" type="text" autocomplete="off" spellcheck="false" value="${esc(A.zellen[k] || '')}" aria-label="Kriterium Spalte ${i + 1}, Zeile ${r + 1}"></td>`;
      return `<td><div class="acell" data-drop="acell" data-k="${k}">${A.zellen[k] ? accBlock(A.zellen[k]) : ''}</div></td>`;
    }).join('') + '</tr>';
  });
  h += `</table></div><button class="btn klein" id="addCol" title="weitere Spalte">+ Spalte</button></div></div>`;
  if (L.krit !== 'text') h += `<div class="pool" data-drop="apool"><div class="pool-title">Kriterien – in die richtige Zelle ziehen${L.krit === 'falsch' ? ' (nicht alle werden gebraucht)' : ''}</div><div class="pool-items">${A.pool.filter(id => !frei.has(id)).map(accBlock).join('') || '<span class="ph">alle eingesetzt</span>'}</div></div>`;
  else h += `<div class="edhint">Beispiele: ${['"Film"', '>=9', 'Wie "*Mystery*"', 'Zwischen 1960 Und 1969', 'Ist Null', '<=4 Oder >=9'].map(c).join(' · ')}</div>`;
  return h;
}

/* ---------- Bedingung aus Blöcken (UND/ODER verschachteln wie in Scratch) ---------- */
let kid = 0;
function neuKnoten(t){ const id = 'k' + (++kid); S.kn[id] = {id, t, a:null, b:null, f:'', op:'=', v:''}; return id; }
function slotGet(p, k){ return p === 'root' ? S.wurzel : S.kn[p][k]; }
function slotSet(p, k, id){ if (p === 'root') S.wurzel = id; else S.kn[p][k] = id; }
function elternVon(id){
  if (S.wurzel === id) return {p:'root', k:'root'};
  for (const n of Object.values(S.kn)) for (const k of ['a', 'b']) if (n[k] === id) return {p:n.id, k};
  return null;
}
function enthaelt(id, ziel){ if (!id) return false; if (id === ziel) return true; const n = S.kn[id]; return n.t !== 'cmp' && (enthaelt(n.a, ziel) || enthaelt(n.b, ziel)); }
function loesche(id){ const n = S.kn[id]; if (!n) return; if (n.t !== 'cmp'){ loesche(n.a); loesche(n.b); } delete S.kn[id]; }
function baumAblegen(d, p, k){
  const ziel = slotGet(p, k);
  let id = d.id, alt = null;
  if (id){ if (id === ziel || (p !== 'root' && enthaelt(id, p))) return; alt = elternVon(id); slotSet(alt.p, alt.k, null); }
  else id = neuKnoten(d.neu);
  const n = S.kn[id];
  if (ziel){
    if (n.t !== 'cmp' && !n.a) n.a = ziel;          // UND/ODER auf einen Block: umschließt ihn
    else if (n.t !== 'cmp' && !n.b) n.b = ziel;
    else if (alt) slotSet(alt.p, alt.k, ziel);       // sonst tauschen
    else { loesche(id); return; }
  }
  slotSet(p, k, id);
}
function erstesFreies(id){
  if (!id) return null; const n = S.kn[id]; if (n.t === 'cmp') return null;
  if (!n.a) return {p:id, k:'a'}; const x = erstesFreies(n.a); if (x) return x;
  if (!n.b) return {p:id, k:'b'}; return erstesFreies(n.b);
}
function baumTipp(t){
  if (!S.wurzel){ S.wurzel = neuKnoten(t); return; }
  const frei = erstesFreies(S.wurzel);
  if (frei){ slotSet(frei.p, frei.k, neuKnoten(t)); return; }
  if (t !== 'cmp'){ const id = neuKnoten(t); S.kn[id].a = S.wurzel; S.wurzel = id; }
}
function baumSQL(id, eltern){
  const n = S.kn[id];
  if (n.t === 'cmp'){
    if (!n.f) throw {fehlt:'In einem Vergleich ist noch kein Feld gewählt.'};
    if (/NULL/.test(n.op)) return n.f + ' ' + n.op;
    if (!n.v.trim()) throw {fehlt:`Im Vergleich mit ${c(n.f)} fehlt noch der Wert.`};
    if (!istText(n.f) && !/LIKE/.test(n.op) && !/^-?\d+([.,]\d+)?$/.test(n.v.trim())) throw {fehlt:`${c(n.f)} enthält Zahlen. Trage als Vergleichswert eine Zahl ein.`};
    return n.f + ' ' + n.op + ' ' + wertSQL(n.f, n.v);
  }
  const W = n.t === 'und' ? 'AND' : 'OR';
  if (!n.a || !n.b) throw {fehlt:`Im ${W}-Block ist noch eine Lücke frei.`};
  const s = baumSQL(n.a, n.t) + ' ' + W + ' ' + baumSQL(n.b, n.t);
  return eltern && eltern !== n.t ? '(' + s + ')' : s;
}
function slotHTML(p, k){
  const id = slotGet(p, k);
  return `<div class="slot hex bslot" data-drop="bslot" data-p="${p}" data-k="${k}">${id ? knotenHTML(id) : `<span class="ph">${p === 'root' ? 'Bedingung hierher ziehen – oder leer lassen' : 'Bedingung'}</span>`}</div>`;
}
function knotenHTML(id){
  const n = S.kn[id];
  if (n.t === 'cmp'){
    const ops = OPS.map(o => `<option${n.op === o ? ' selected' : ''}>${o}</option>`).join('');
    return `<div class="block hex builder bcmp" data-drag="1" data-id="${id}"><span class="grip" aria-hidden="true" title="hier anfassen und ziehen">⠿</span><select class="opsel bf" data-n="${id}" aria-label="Feld">${feldOptionen(n.f, 'Feld')}</select><select class="opsel bop" data-n="${id}" aria-label="Vergleich">${ops}</select>` +
      (/NULL/.test(n.op) ? '' : `<input class="cvin bv" data-n="${id}" type="text" autocomplete="off" spellcheck="false" placeholder="Wert" value="${esc(n.v)}" size="${Math.max(5, n.v.length + 1)}" aria-label="Wert">`) + '</div>';
  }
  return `<div class="block hex logik ${n.t}" data-drag="1" data-id="${id}">${slotHTML(id, 'a')}<span class="lw">${n.t === 'und' ? 'AND' : 'OR'}</span>${slotHTML(id, 'b')}</div>`;
}
function baumPool(){
  return `<div class="pool" data-drop="bpool"><div class="pool-title">Bausteine – ziehen oder anklicken · zum Löschen hierher zurückziehen</div><div class="pool-items">` +
    `<div class="block hex builder" data-drag="1" data-neu="cmp" title="Vergleich, z. B. jahr &gt;= 1960">Feld <b>=</b> Wert</div>` +
    `<div class="block hex logik und" data-drag="1" data-neu="und" title="beide Bedingungen müssen gelten"><span class="mini"></span><span class="lw">AND</span><span class="mini"></span></div>` +
    `<div class="block hex logik oder" data-drag="1" data-neu="oder" title="mindestens eine Bedingung muss gelten"><span class="mini"></span><span class="lw">OR</span><span class="mini"></span></div></div></div>`;
}

/* ---------- Ziehen (basis.js): Access-Kriterien und Blöcke ---------- */
window.dragData = (b, e) => {
  if (e.target.closest('select,input,option,button')) return null;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  return {id:b.dataset.id, neu:b.dataset.neu, acc:b.dataset.acc, src:!!(b.dataset.id || b.dataset.acc)};
};
window.dropOk = t => { const k = t.dataset.drop; return D.acc ? k === 'acell' || k === 'apool' : k === 'bslot' || k === 'bpool'; };
window.applyDrop = (d, type, idx, t) => {
  if (d.acc){
    const Z = S.acc.zellen, von = Object.keys(Z).find(k => Z[k] === d.acc);
    if (type === 'apool'){ if (von) delete Z[von]; }
    else { const k = t.dataset.k, alt = Z[k]; if (von) delete Z[von]; if (alt && von) Z[von] = alt; Z[k] = d.acc; }
  } else if (type === 'bpool'){ if (d.id){ const e = elternVon(d.id); slotSet(e.p, e.k, null); loesche(d.id); } }
  else baumAblegen(d, t.dataset.p, t.dataset.k);
  neuZeichnen();
};
window.dragTap = d => { if (d.neu){ baumTipp(d.neu); neuZeichnen(); } };
function neuZeichnen(){
  if (S.fb || S.success){ S.fb = null; S.success = false; renderFeedback(); }
  if (stufe().ui === 'access') $('#accbox').innerHTML = accessHTML();
  else { $('#whereinh').innerHTML = slotHTML('root', 'root'); }
  vorschau();
}

/* ---------- Kalender statt Aufgabenliste ---------- */
function tagName(i){ const n = K.kalender.tage.length; return `Woche ${Math.floor(i / n) + 1} · ${K.kalender.tage[i % n]}`; }
function kalenderHTML(){
  const tage = K.kalender.tage, n = (solved[level] || []).length;
  let h = `<button class="dockbtn" id="dockBtn" aria-expanded="${pickerOpen}">📅 ${esc(tagName(pfadIdx))} <span class="sub">· ${n} von ${STD.length} gelöst</span></button>`;
  if (!pickerOpen) return h;
  h += `<div class="picker kal"><div class="ptitle">Zu einem Tag springen – grün = auf Stufe ${level} gelöst</div><table><tr><th></th>${tage.map(t => `<th>${esc(t.slice(0, 2))}</th>`).join('')}</tr>`;
  for (let w = 0; w * tage.length < STD.length; w++){
    h += `<tr><th>W${w + 1}</th>`;
    tage.forEach((t, d) => { const i = w * tage.length + d;
      h += i < STD.length ? `<td><button data-goto="${i}" class="${isSolved(i) ? 'solved' : ''}${i === pfadIdx ? ' cur' : ''}" title="${esc(tagName(i))}">${i + 1}</button></td>` : '<td></td>'; });
    h += '</tr>';
  }
  return h + '</table></div>';
}

/* ---------- Ausführen und Prüfen ---------- */
function zeigeFehler(e, q){
  S.success = false; S.erg = null;
  S.fb = {type:'err', html:e.msg};
  if (q.off != null && e.a != null && ed && e.a >= q.off) markiere(ed, e.a - q.off, e.b - q.off);
  renderFeedback(); renderErgebnis();
}
function ausfuehren(){
  const q = aktSQL();
  if (q.fehlt){ S.fb = {type:'err', html:q.fehlt}; renderFeedback(); return null; }
  const r = fuehreAus(q.sql);
  if (r.err){ zeigeFehler(r.err, q); return null; }
  S.erg = r.res; S.fb = null; S.ergInfo = '';
  renderFeedback(); renderErgebnis();
  return {q, res:r.res};
}
function vergleiche(q, ist, soll, a){
  const ACC = stufe().ui === 'access';
  const iCols = ist.columns.map(x => x.toLowerCase()), sCols = soll.columns.map(x => x.toLowerCase());
  const fehlt = sCols.filter(x => !iCols.includes(x)), zuviel = iCols.filter((x, i) => !sCols.includes(x) || iCols.indexOf(x) !== i);
  if (fehlt.length || zuviel.length){
    let h = 'Die Abfrage läuft, aber die angezeigten Spalten stimmen noch nicht.';
    if (fehlt.length) h += `<br>Es fehlt: ${fehlt.map(c).join(', ')}.`;
    if (zuviel.length) h += `<br>Nicht gefragt ist: ${[...new Set(zuviel)].map(c).join(', ')}.`;
    if (iCols.length === T.felder.length && a.felder[0] !== '*') h += `<br>Mit ${c('*')} werden alle Spalten angezeigt – hier sind nur bestimmte gefragt.`;
    else if (ACC && zuviel.length) h += '<br>Felder, die du nur für Kriterien brauchst, bekommen bei „Anzeigen:“ keinen Haken.';
    return h;
  }
  const idx = sCols.map(x => iCols.indexOf(x));
  const key = z => JSON.stringify(z);
  const sK = soll.values.map(key), iK = ist.values.map(z => key(idx.map(i => z[i])));
  const zaehl = arr => arr.reduce((m, k) => m.set(k, (m.get(k) || 0) + 1), new Map());
  const sM = zaehl(sK), iM = zaehl(iK);
  const extra = iK.filter(k => !sM.has(k)), miss = sK.filter(k => !iM.has(k));
  const where = (q.sql.match(/\bWHERE\b([\s\S]*?)(\bORDER\b|$)/i) || [])[1] || '';
  if (extra.length || miss.length || iK.length !== sK.length){
    let h = `Die Abfrage läuft, aber sie findet ${iK.length === 1 ? 'einen Datensatz' : iK.length + ' Datensätze'} – gesucht ${sK.length === 1 ? 'ist einer' : 'sind ' + sK.length}.`;
    const ti = sCols.indexOf('titel');
    const name = k => { const z = JSON.parse(k); return c(String(z[ti >= 0 ? ti : 0])); };
    if (extra.length && !miss.length) h += `<br>Es sind zu viele dabei, z. B. ${name(extra[0])}. Die Bedingung ist zu weit gefasst.`;
    else if (miss.length && !extra.length) h += `<br>Es fehlen Datensätze, z. B. ${name(miss[0])}. Die Bedingung ist zu eng gefasst.`;
    else if (extra.length) h += `<br>Zum Beispiel gehört ${name(extra[0])} nicht dazu, dafür fehlt ${name(miss[0])}.`;
    const und = /\bAND\b/i.test(where), oder = /\bOR\b/i.test(where);
    if (!where.trim() && a.where) h += ACC ? '<br>Es fehlen noch die Kriterien.' : `<br>Es fehlt noch die Bedingung mit ${c('WHERE')}.`;
    else if (/\*/.test(where) && /LIKE/i.test(where)) h += `<br>Der Platzhalter in SQL ist ${c('%')}, nicht ${c('*')} wie in Access.`;
    else if (/LIKE/i.test(where) && !/%/.test(where)){ const m = where.match(/LIKE\s*'([^']*)'/i), w = m ? m[1] : 'Horror';
      h += ACC ? `<br>${c('Wie')} ohne ${c('*')} vergleicht den ganzen Text. Mit ${c('Wie "*' + w + '*"')} findest du ${esc(w)} an jeder Stelle.`
        : `<br>${c('LIKE')} ohne ${c('%')} vergleicht den ganzen Text. Mit ${c("'%" + w + "%'")} findest du ${esc(w)} an jeder Stelle.`; }
    else if (ACC && (/\bOR\b/i.test(a.where || '') || oder)) h += '<br>Denk daran: Kriterien in <b>derselben Zeile</b> müssen alle gleichzeitig gelten (UND). Kriterien in <b>verschiedenen Zeilen</b> sind Alternativen (ODER) – was in jeder Zeile gelten soll, muss auch in jeder Zeile stehen.';
    else if (!ACC && und && oder && !/\(/.test(where)) h += `<br>Achtung: ${c('AND')} bindet stärker als ${c('OR')}, so wie Punkt vor Strich. Setze Klammern, damit klar ist, was zusammengehört: ${c('(… OR …) AND …')}.`;
    else if (!iK.length && /=\s*'/.test(where)) h += `<br>Bei ${c('=')} muss der Text genau so in der Tabelle stehen. Schau in der Tabelle nach, wie er geschrieben ist.`;
    else if (/[<>]/.test(where) && Math.abs(iK.length - sK.length) <= 5 && (!extra.length || !miss.length)) h += `<br>Prüfe, ob der Grenzwert selbst dazugehören soll: ${c('>')} oder ${c('>=')}, ${c('<')} oder ${c('<=')}.`;
    return h;
  }
  if (a.sort){
    const [sf, sd] = a.sort.split(/\s+/), si = sCols.indexOf(sf.toLowerCase());
    const folge = (vals, i) => JSON.stringify(vals.map(z => z[i]));
    if (si >= 0 && folge(ist.values, idx[si]) !== folge(soll.values, si)){
      const umgekehrt = folge(ist.values.slice().reverse(), idx[si]) === folge(soll.values, si);
      if (ACC) return `Die richtigen Datensätze – aber die Reihenfolge stimmt nicht. Stelle beim Feld ${c(sf)} die Sortierung auf ${/DESC/i.test(sd || '') ? '„Absteigend“' : '„Aufsteigend“'}.`;
      return `Die richtigen Datensätze – aber die Reihenfolge stimmt nicht. Sortiere mit ${c('ORDER BY ' + sf)} ${umgekehrt ? `und achte auf die Richtung: ${c(/DESC/i.test(sd || '') ? 'DESC' : 'ASC')}` : ''}.`.replace(' .', '.');
    }
  }
  return null;
}
function check(){
  if (FREI){ ausfuehren(); return; }
  if (mode === 'lernen' && schrittArt(schritt()) !== 'access') return;
  const r = ausfuehren(); if (!r) return;
  const soll = abfrage(sqlVon(CUR));
  let fehler = vergleiche(r.q, r.res, soll, CUR);
  for (const w of CUR.auch || []) if (fehler && !vergleiche(r.q, r.res, abfrage(sqlVon(Object.assign({}, CUR, {where:w}))), CUR)) fehler = null;
  if (fehler){ S.success = false; S.fb = {type:'err', html:fehler}; renderFeedback(); return; }
  S.success = true;
  if (mode === 'lernen'){
    schrittGeschafft();
    let h = '<b>Richtig! 🎉</b> Deine Abfrage liefert genau die gesuchten Datensätze.' + (schritt().nachher ? '<br>' + schritt().nachher : '');
    h += `<br>In SQL heißt deine Abfrage:<pre class="sqlv cm-s-default">${farbe(r.q.sql)}</pre>`;
    if (canNext()) h += 'Weiter geht es mit „Weiter“.';
    S.fb = {type:'ok', html:h}; renderFeedback(); renderNav(); return;
  }
  const erstmals = countSolved();
  // mit Ansichten: Stufen aller Ansichten durchgezählt, damit die Auswertung sie unterscheiden kann
  const versatz = ANS ? ANS.slice(0, ANS.indexOf(ansicht)).reduce((n, a) => n + K.ansichten[a].stufen.length - 1, 0) : 0;
  if (window.TrainerSync) TrainerSync.event({modus:mode === 'pfad' ? 'uebungen' : 'endlos', stufe:versatz + level,
    aufgabe:mode === 'pfad' ? String(pfadIdx + 1) : 'endlos', titel:CUR.frage, gesamt:mode === 'pfad' ? STD.length : 0, erstmals});
  let h = '<b>Richtig! 🎉</b> Deine Abfrage liefert genau die gesuchten Datensätze.';
  if (stufe().ui !== 'sql') h += `<br>In SQL heißt deine Abfrage:<pre class="sqlv cm-s-default">${farbe(r.q.sql)}</pre>`;
  if (/"[^"]*"/.test(r.q.sql.replace(/'[^']*'/g, ''))) h += `<br>Tipp: Texte schreibt man in SQL üblicherweise in einfache Anführungszeichen ${c("'…'")}.`;
  if (canNext()) h += '<br>Weiter geht es mit „Nächste Aufgabe“.';
  S.fb = {type:'ok', html:h};
  renderFeedback(); renderNav();
}

/* ---------- Darstellung ---------- */
function renderFeedback(){
  $('#workcard').classList.toggle('solved', !!S.success);
  $('#fb').innerHTML = S.fb ? `<div class="fb ${S.fb.type}">${S.fb.html}</div>` : '';
}
function renderNav(){
  if (FREI) return;
  if (mode === 'lernen'){
    navLernen(lernIdx, ER().length, schrittArt(schritt()) !== 'access');
    ['#runBtn', '#tabBtn'].forEach(b => { $(b).style.display = schrittArt(schritt()) === 'access' ? '' : 'none'; });
  } else navPfad();
  renderDock();
}
function renderDock(){ $('#dock').innerHTML = mode === 'lernen' ? lernDock() : K.kalender && mode === 'pfad' ? kalenderHTML() : dockHTML(); }
const fmt = v => v === null ? '<span class="leer">leer</span>' : esc(v);
function tabelleHTML(r, max){
  const n = r.values.length, zeig = r.values.slice(0, max || 500);
  const num = r.columns.map((col, i) => r.values.length && r.values.every(z => z[i] === null || typeof z[i] === 'number'));
  return `<div class="dsw"><table class="ds"><thead><tr>${r.columns.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>` +
    zeig.map(z => '<tr>' + z.map((v, i) => `<td${num[i] ? ' class="z"' : ''}>${fmt(v)}</td>`).join('') + '</tr>').join('') +
    `</tbody></table></div>` + (n > zeig.length ? `<div class="dsinfo">… und ${n - zeig.length} weitere</div>` : '');
}
function renderErgebnis(){
  const E = $('#ergebnis');
  $('#tabBtn').textContent = S.ergInfo ? 'Tabelle ausblenden' : `Tabelle ${TAB} ansehen`;
  if (!S.erg){ E.innerHTML = ''; E.style.display = 'none'; return; }
  E.style.display = '';
  const n = S.erg.values.length;
  E.innerHTML = `<div class="worktitle">${S.ergInfo || 'Ergebnis (Datenblattansicht)'} <span class="wthint">· ${n === 1 ? '1 Datensatz' : n + ' Datensätze'}</span></div>` +
    (S.erg.columns.length ? tabelleHTML(S.erg) : '<p class="ph">Keine Datensätze gefunden.</p>');
}
function feldListe(){
  const sel = new Set(S.sel);
  return `<div class="tabfenster" role="list" aria-label="Felder der Tabelle ${TAB}"><div class="tabkopf">${esc(TAB)}</div>` +
    `<button class="feld${sel.has('*') ? ' on' : ''}" data-feld="*" title="alle Felder">*</button>` +
    T.felder.map(f => `<button class="feld${sel.has(f.n) ? ' on' : ''}" data-feld="${esc(f.n)}" title="${esc(f.d)}">${/PRIMARY/.test(f.typ) ? '<span class="key" aria-label="Primärschlüssel">🔑</span>' : ''}${esc(f.n)}<span class="typ">${esc(f.art)}</span></button>`).join('') + '</div>';
}
function felderHTML(){
  return `<details class="felder"><summary>Felder der Tabelle ${c(TAB)}</summary><table class="ds">` +
    T.felder.map(f => `<tr><td><span class="cm-variable-2">${esc(f.n)}</span></td><td>${esc(f.art)}</td><td>${esc(f.d)}</td></tr>`).join('') + '</table></details>';
}
function feldOptionen(wert, leer){ return `<option value="">${leer}</option>` + T.felder.map(f => `<option value="${esc(f.n)}"${wert === f.n ? ' selected' : ''}>${esc(f.n)}</option>`).join(''); }
function selChips(){
  return S.sel.length ? S.sel.map(f => `<span class="chip sp"><span class="cm-variable-2">${esc(f)}</span><button data-weg="${esc(f)}" aria-label="${esc(f)} entfernen">×</button></span>`).join('<span class="komma">,</span>')
    : '<span class="ph">Klicke links auf die Felder, die angezeigt werden sollen.</span>';
}
function whereBlock(){
  const ops = OPS.map(o => `<option${S.wop === o ? ' selected' : ''}>${o}</option>`).join('');
  const val = /NULL/.test(S.wop) ? '' : `<input class="cvin" id="wv" type="text" autocomplete="off" spellcheck="false" placeholder="Wert" value="${esc(S.wv)}" size="${Math.max(5, S.wv.length + 1)}" aria-label="Vergleichswert">`;
  return `<div class="block hex builder wb"><select class="opsel" id="wf" aria-label="Feld">${feldOptionen(S.wf, '— keine Bedingung —')}</select>` +
    (S.wf ? `<select class="opsel" id="wop" aria-label="Vergleich">${ops}</select>${val}` : '') + '</div>' +
    (S.wf && istText(S.wf) && !/NULL/.test(S.wop) ? '<span class="wthint">Anführungszeichen setzt der Entwurf selbst.</span>' : '');
}
function vorschau(){
  const q = aktSQL();
  $('#sqlv').innerHTML = q.sql ? farbe(q.sql) : `<span class="ph">${q.fehlt.replace(/<[^>]+>/g, '')}</span>`;
}
function render(){
  const L = stufe(), a = CUR;
  renderHeader();
  document.querySelectorAll('[data-ansicht]').forEach(b => b.classList.toggle('on', b.dataset.ansicht === ansicht));
  document.querySelectorAll('[data-mode="lernen"]').forEach(b => { b.hidden = !ER(); });
  const lernen = mode === 'lernen' && !FREI;
  document.body.classList.toggle('breit', L.ui === 'access' && (!lernen || schrittArt(schritt()) === 'access'));
  $('#workcard').style.display = '';
  ['#runBtn', '#tabBtn'].forEach(b => { $(b).style.display = ''; });
  if (lernen){
    renderLernen();
    if (schrittArt(schritt()) !== 'access'){ renderFeedback(); renderErgebnis(); renderNav(); return; }
  }
  else $('#lvlname').textContent = `Stufe ${level}: ${L.name}`;
  if (lernen){ /* Text steht schon (renderLernen) */ }
  else if (FREI){ $('#taskmeta').textContent = ''; $('#tasktext').innerHTML = (K.intro || '') + felderHTML(); }
  else {
    $('#taskmeta').textContent = mode !== 'pfad' ? 'Endlos' : K.kalender ? tagName(pfadIdx) : `Übungen · Aufgabe ${pfadIdx + 1} von ${STD.length}`;
    $('#tasktext').innerHTML = aufgabeText(a) + (a.tipp && level <= 3 ? `<div class="tipp">💡 ${a.tipp}</div>` : '');
  }
  const W = $('#work');
  ed = null;
  if (L.ui === 'access'){
    $('#worktitle').textContent = 'Entwurfsansicht';
    W.innerHTML = `<div id="accbox">${accessHTML()}</div><div class="sqlvbox"><span class="sqlvl">SQL</span><pre class="sqlv cm-s-default" id="sqlv"></pre></div>`;
    vorschau();
  } else if (L.ui === 'sql'){
    $('#worktitle').textContent = 'SQL-Ansicht';
    W.innerHTML = '<div class="edwrap" id="edwrap"></div><div class="edhint">Strg + Enter führt aus · Vorschläge erscheinen beim Tippen (Enter oder Tab übernimmt)</div>';
    let start = '';
    if (S.start) start = S.start;
    else if (L.vorlage !== 'leer') start = ['SELECT ', 'FROM ', ...(FREI || a.where ? ['WHERE '] : []), ...(FREI || a.sort ? ['ORDER BY '] : [])].join('\n');
    ed = editor($('#edwrap'), {value:start, lineNumbers:true});
    if (L.vorlage === 'leer') ed.state.platzhalter = 'Schreibe hier deine Abfrage: SELECT …';
    erklaerungen(ed);
    setTimeout(() => { ed.refresh(); ed.focus(); ed.setCursor(0, ed.getLine(0).length); }, 0);
  } else {
    $('#worktitle').textContent = 'Entwurfsansicht';
    W.innerHTML = `<div class="entwurf">${feldListe()}<div class="klauseln">
      <div class="kl"><span class="kw cm-keyword">SELECT</span><div class="kinh" id="selchips">${selChips()}</div></div>
      <div class="kl"><span class="kw cm-keyword">FROM</span><div class="kinh"><span class="cm-builtin tabn">${esc(TAB)}</span></div></div>
      <div class="kl"><span class="kw cm-keyword">WHERE</span><div class="kinh" id="whereinh">${L.ui === 'block' ? whereBlock() : L.ui === 'baum' ? slotHTML('root', 'root') : '<div class="edwrap eins" id="wherewrap"></div>'}</div></div>
      <div class="kl"><span class="kw cm-keyword">ORDER BY</span><div class="kinh"><select class="sortsel" id="sf" aria-label="Sortieren nach">${feldOptionen(S.sf, '— nicht sortieren —')}</select>
        <select class="sortsel" id="sdir" aria-label="Richtung"${S.sf ? '' : ' hidden'}><option value="ASC"${S.sdir === 'ASC' ? ' selected' : ''}>ASC – aufsteigend</option><option value="DESC"${S.sdir === 'DESC' ? ' selected' : ''}>DESC – absteigend</option></select></div></div>
    </div></div>${L.ui === 'baum' ? baumPool() : ''}
    <div class="sqlvbox"><span class="sqlvl">SQL</span><pre class="sqlv cm-s-default" id="sqlv"></pre></div>`;
    if (L.ui === 'text'){
      ed = editor($('#wherewrap'), {value:S.where, extraKeys:{'Enter':() => ausfuehren(), 'Ctrl-Enter':() => ausfuehren(), 'Shift-Ctrl-Enter':() => check(), 'Ctrl-Space':cm => cm.showHint({hint:hinweisListe, completeSingle:false})}});
      ed.state.platzhalter = 'Bedingung eintippen, z. B. jahr > 2000 – oder leer lassen';
      ed.on('beforeChange', (cm, ch) => { if (ch.update && ch.text.length > 1) ch.update(ch.from, ch.to, [ch.text.join(' ')]); });
      ed.on('change', () => { S.where = ed.getValue(); vorschau(); });
      erklaerungen(ed);
      setTimeout(() => ed.refresh(), 0);
    }
    vorschau();
  }
  renderFeedback(); renderErgebnis(); renderNav();
}
function entwurfGeaendert(){
  if (S.fb || S.success){ S.fb = null; S.success = false; renderFeedback(); }
  $('#selchips').innerHTML = selChips();
  document.querySelectorAll('.feld').forEach(b => b.classList.toggle('on', S.sel.includes(b.dataset.feld)));
  vorschau();
}

/* ---------- Ereignisse ---------- */
document.addEventListener('click', e => {
  const an = e.target.closest('[data-ansicht]');
  if (an){ setAnsicht(an.dataset.ansicht); return; }
  const mg = e.target.closest('[data-mode-go]');
  if (mg){ setMode(mg.dataset.modeGo); return; }
  const sp = e.target.closest('[data-step]');
  if (sp && !sp.disabled){ gotoStep(+sp.dataset.step); return; }
  if (e.target.closest('[data-lernreset]')){ if (confirm('Den Fortschritt der Erarbeitung löschen und von vorne beginnen?')){ lernDone.clear(); gotoStep(0); } return; }
  const af = e.target.closest('.afeld');
  if (af){ const col = S.acc.cols.find(x => !x.f); if (col){ col.f = af.dataset.feld; col.show = true; } else S.acc.cols.push({f:af.dataset.feld, sort:'', show:true}); neuZeichnen(); return; }
  if (e.target.closest('#addCol')){ S.acc.cols.push({f:'', sort:'', show:true}); neuZeichnen(); return; }
  const f = e.target.closest('.feld');
  if (f){
    const n = f.dataset.feld;
    if (S.sel.includes(n)) S.sel = S.sel.filter(x => x !== n);
    else if (n === '*') S.sel = ['*'];
    else S.sel = S.sel.filter(x => x !== '*').concat(n);
    entwurfGeaendert(); return;
  }
  const w = e.target.closest('[data-weg]');
  if (w){ S.sel = S.sel.filter(x => x !== w.dataset.weg); entwurfGeaendert(); return; }
  if (e.target.closest('#tabBtn')){
    if (S.ergInfo){ S.erg = null; S.ergInfo = ''; }
    else { S.erg = abfrage(`SELECT * FROM ${TAB}`); S.ergInfo = `Tabelle ${TAB}`; }
    renderErgebnis(); $('#tabBtn').textContent = S.ergInfo ? 'Tabelle ausblenden' : `Tabelle ${TAB} ansehen`; return;
  }
  navClick(e);
});
document.addEventListener('change', e => {
  const id = e.target.id, cl = e.target.classList, ci = +e.target.dataset.c, kn = S && S.kn[e.target.dataset.n];
  if (cl.contains('af')){ const col = S.acc.cols[ci]; col.f = e.target.value; col.show = true; if (!col.f) col.sort = ''; neuZeichnen(); return; }
  if (cl.contains('as')){ S.acc.cols[ci].sort = e.target.value; neuZeichnen(); return; }
  if (cl.contains('ash')){ S.acc.cols[ci].show = e.target.checked; neuZeichnen(); return; }
  if (kn && cl.contains('bf')){ kn.f = e.target.value; if (kn.f && !istText(kn.f) && /LIKE/.test(kn.op)) kn.op = '='; neuZeichnen(); return; }
  if (kn && cl.contains('bop')){ kn.op = e.target.value; neuZeichnen(); const v = document.querySelector(`.bv[data-n="${kn.id}"]`); if (v) v.focus(); return; }
  if (id === 'wf'){ S.wf = e.target.value; if (S.wf && !istText(S.wf) && S.wop === 'LIKE') S.wop = '='; $('#whereinh').innerHTML = whereBlock(); entwurfGeaendert(); const v = $('#wv'); if (v) v.focus(); }
  else if (id === 'wop'){ S.wop = e.target.value; $('#whereinh').innerHTML = whereBlock(); entwurfGeaendert(); const v = $('#wv'); if (v) v.focus(); }
  else if (id === 'sf'){ S.sf = e.target.value; $('#sdir').hidden = !S.sf; entwurfGeaendert(); }
  else if (id === 'sdir'){ S.sdir = e.target.value; entwurfGeaendert(); }
});
document.addEventListener('input', e => {
  const kn = S && S.kn[e.target.dataset.n];
  if (kn && e.target.classList.contains('bv')){ kn.v = e.target.value; e.target.size = Math.max(5, kn.v.length + 1); if (S.fb){ S.fb = null; renderFeedback(); } vorschau(); return; }
  if (e.target.classList.contains('ain')){ S.acc.zellen[e.target.dataset.k] = e.target.value; if (S.fb){ S.fb = null; S.success = false; renderFeedback(); } vorschau(); return; }
  if (e.target.id === 'wv'){ S.wv = e.target.value; e.target.size = Math.max(5, S.wv.length + 1); entwurfGeaendert(); }
});
document.addEventListener('keydown', e => {
  if ((e.target.id === 'wv' || e.target.matches('.bv,.ain')) && e.key === 'Enter'){ e.preventDefault(); ausfuehren(); }
  else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.target.closest('.CodeMirror')){ e.preventDefault(); e.shiftKey ? check() : ausfuehren(); }
});
$('#runBtn').addEventListener('click', () => ausfuehren());
$('#resetBtn').addEventListener('click', () => setup());
$('#prevBtn').addEventListener('click', () => { if (mode === 'lernen') gotoStep(lernIdx - 1); else gotoTask(pfadIdx - 1); });
$('#tabBtn').textContent = `Tabelle ${TAB} ansehen`;

/* ---------- Start ---------- */
K._test = {accZellen, parseWhere};   // nur für automatische Tests
$('#tasktext').textContent = 'Datenbank wird geladen …';
initSqlJs().then(SQL => {
  baueDB(SQL);
  if (FREI){ CUR = null; setup(); } else starte();
}).catch(e => { $('#tasktext').textContent = 'Die Datenbank konnte nicht geladen werden: ' + e.message; });
})();
