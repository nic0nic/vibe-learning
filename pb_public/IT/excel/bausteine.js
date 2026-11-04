/* bausteine.js – Ergänzung zu basis.js für Trainer, die Formeln aus Bausteinen bauen (wenn, und-oder)
 * Laden nach basis.js; dazu bausteine.css nach basis.css.
 *
 * API
 *   SEP, CELL, OPS, rank, cmp, opTest, same, fmtNum, fmtVal   Vergleich und Ausgabe nach Excel-Regeln
 *   fx, pickV, SUBJ, DAYS, stripQ                             Aufgabentexte
 *   setLevel(n), newEndless(), gotoTask(i)                    Stufe wechseln, Endlos-Szenario, Übung wählen
 *   role, isPlaced, renderFeedback, clearMarks, updateTip     Darstellung (S.slots, S.row, S.fb, #fb, #workcard)
 *   dragData, dragKind, dropOk, dragTap, shiftPlace           Drag-Hooks für basis.js, Shift+Klick setzt ein
 *   AC_FN                                                     Funktionsliste der Autovervollständigung
 *
 * Die Seite liefert
 *   SCEN, setup(), accepts(target, kind), applyDrop(d, type, idx, t), renderGrid(),
 *   let endScen, endSeed, poolSeed, CUR, S = {items, slots, row, fb, success, result, …}
 *   außerdem für basis.js: setMode, canNext, nextTask, renderNav, renderDock (Pfad/Endlos über dockHTML())
 */

const SEP = '\u0001'; // trennt Bausteine beim Zusammensetzen (außerhalb von Text = Leerraum)
const CELL = /^\$?([A-Za-z]{1,3})\$?([0-9]{1,7})$/;
const OPS = ['=','<>','<','<=','>','>='];
/* Auswertung nach Excel-Regeln: Zahl < Text < Wahrheitswert, Text ohne Groß/Klein */
function rank(v){ return v.t === 'num' ? 1 : v.t === 'str' ? 2 : 3; }
function cmp(a, b){
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  if (a.t === 'str'){ const x = a.v.toLowerCase(), y = b.v.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; }
  if (a.t === 'bool') return (a.v ? 1 : 0) - (b.v ? 1 : 0);
  return Math.abs(a.v - b.v) < 1e-9 ? 0 : a.v - b.v;
}
function opTest(op, c){ return {'=':c===0,'<>':c!==0,'<':c<0,'<=':c<=0,'>':c>0,'>=':c>=0}[op]; }
function same(a, b){ if (a.t !== b.t) return false; if (a.t === 'num') return Math.abs(a.v - b.v) < 1e-9; return a.v === b.v; }
function fmtNum(x){ return String(+x.toFixed(10)).replace('.', ','); }
function fmtVal(v){ if (v.t === 'num') return fmtNum(v.v); if (v.t === 'str') return '"' + v.v + '"'; if (v.t === 'err') return v.v; return v.v ? 'WAHR' : 'FALSCH'; }

/* Aufgabentexte */
const fx = (n, dp) => n.toFixed(dp || 0).replace('.', ',');
const pickV = (V, p) => V[(p.v || 0) % V.length];
const SUBJ = ['Mathematik', 'Deutsch', 'Englisch', 'BwR', 'Physik'];
const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
function stripQ(l){ const m = l.match(/^"(.*)"$/); return m ? m[1].replace(/""/g, '"') : l; }

/* Übungen und Endlos */
function setLevel(n){ level = n; store('level', n); poolSeed = rand(); setup(); }
function newEndless(){ const ids = Object.keys(SCEN).filter(k => k !== endScen); endScen = ids[Math.floor(Math.random() * ids.length)]; endSeed = rand(); endCounted = false; }
function gotoTask(i){ pfadIdx = Math.max(0, Math.min(STD.length - 1, i)); store('idx', pfadIdx); pickerOpen = false; loadTask(); window.scrollTo({top:0, behavior:'smooth'}); }

/* Darstellung */
function role(r){ return S.success ? r : ''; }
function isPlaced(id){ return Object.values(S.slots).includes(id) || S.row.includes(id); }
function renderFeedback(){ const fb = $('#fb'); $('#workcard').classList.toggle('solved', !!(S.fb && S.fb.type === 'ok')); fb.innerHTML = S.fb ? `<div class="fb ${S.fb.type}">${S.fb.html}</div>` : ''; }
function clearMarks(){
  if (!S.success && !S.fb) return;
  const was = S.success;
  S.success = false; S.fb = null; S.result = null;
  document.querySelectorAll('.r-cond,.r-then,.r-else').forEach(el => el.classList.remove('r-cond', 'r-then', 'r-else'));
  document.querySelectorAll('.fixv').forEach(el => el.classList.remove('c-then', 'c-else'));
  renderFeedback(); if (was) renderGrid();
}
/* Syntax-Hinweis und Autovervollständigung übernimmt acUpdate (wie in Excel) */
function updateTip(){ acUpdate(); }

/* Drag-Hooks: Bausteine haben data-id, Zeichen data-sym; die Seite liefert accepts(t, kind) */
function dragData(b, e){
  if (e.target.closest('select,input,option')) return null;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  return {id:b.dataset.id, sym:b.dataset.sym, shift:e.shiftKey, src:!b.dataset.sym};
}
function dragKind(){ return D.sym ? 'sym' : S.items[D.id].kind; }
const dropOk = t => accepts(t, dragKind());
const dragTap = d => { if (d.shift) shiftPlace(d); };
// Shift+Klick statt Ziehen: Baustein in die erste freie Lücke, in die er passt, sonst hinten an die Formel anhängen
function shiftPlace(d){
  if (!d.sym && isPlaced(d.id)) return;
  const kind = d.sym ? 'sym' : S.items[d.id].kind;
  const t = [...document.querySelectorAll('[data-drop]')].find(t =>
    t.dataset.drop !== 'pool' && !d.el.contains(t) && accepts(t, kind) && (t.dataset.drop !== 'slot' || !S.slots[t.dataset.slot]));
  if (t) applyDrop(d, t.dataset.drop, t.dataset.drop === 'row' ? S.row.length : 0, t);
}

const AC_FN = [
  {n:'ANZAHL',     v:'Wert',           d:'Zählt, wie viele Zellen in einem Bereich Zahlen enthalten.'},
  {n:'MAX',        v:'Zahl',           d:'Gibt den größten Wert aus einer Reihe von Werten zurück.'},
  {n:'MIN',        v:'Zahl',           d:'Gibt den kleinsten Wert aus einer Reihe von Werten zurück.'},
  {n:'MITTELWERT', v:'Zahl',           d:'Berechnet den Durchschnitt (das arithmetische Mittel) der Argumente.'},
  {n:'NICHT',      a:['Wahrheitswert'], d:'Kehrt einen Wahrheitswert um: Aus WAHR wird FALSCH und aus FALSCH wird WAHR.'},
  {n:'ODER',       v:'Wahrheitswert',  d:'Prüft, ob mindestens eines der Argumente WAHR ist. Gibt nur FALSCH zurück, wenn alle Argumente FALSCH sind.'},
  {n:'SUMME',      v:'Zahl',           d:'Addiert alle Zahlen.'},
  {n:'UND',        v:'Wahrheitswert',  d:'Prüft, ob alle Argumente WAHR sind, und gibt nur dann WAHR zurück.'},
  {n:'WENN',       a:['Wahrheitstest', '[Wert_wenn_wahr]', '[Wert_wenn_falsch]'], d:'Prüft, ob eine Bedingung erfüllt ist, und gibt einen Wert zurück, wenn sie WAHR ist, und einen anderen, wenn sie FALSCH ist.'},
  {n:'WENNFEHLER', a:['Wert', 'Wert_falls_Fehler'], d:'Gibt einen anderen Wert zurück, wenn die Formel einen Fehler ergibt.'},
  {n:'WENNS',      a:['Wahrheitstest1', 'Wert_wenn_wahr1', '…'], d:'Prüft mehrere Bedingungen nacheinander und gibt den Wert der ersten erfüllten Bedingung zurück.'}
];
