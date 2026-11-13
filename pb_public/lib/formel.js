/* formel.js – Rechenausdrücke aus Aufgaben-JSON sicher auswerten (ohne eval) und Zahlen-Aufgaben würfeln
 *
 * Genutzt von lib/aufgaben.js (Training mit Szenarien) und lib/seite.js (Prüfung, auch im PocketBase-Hook).
 * Im Browser: <script src="lib/formel.js"></script> → window.Formel; in Node/Hook: require(…/lib/formel.js).
 *
 * Ausdruck: Zahlen (Punkt als Komma: 2.5), Namen (a, b, preis), + - * / (auch · : und ×), ^ (Potenz), Klammern,
 *   Vergleiche < <= > >= == != (auch = und <>), und / oder / nicht (auch && || !),
 *   Funktionen runden(x, n), abs(x), min(…), max(…), wurzel(x), ganz(x) (abrunden), rest(a, b).
 * API
 *   Formel.pruefe(text, namen?)  → null oder Fehlermeldung (deutsch); namen = erlaubte Namen (Liste), sonst alle
 *   Formel.namen(text)           → verwendete Namen
 *   Formel.wert(text, werte)     → Zahl (Vergleiche: 1/0); wirft Error bei Fehlern
 *   Formel.zahlText(n)           → deutsch: 1.234,5
 *   Formel.pruefeSzenario(sz)    → Liste von Fehlermeldungen (leer = in Ordnung), würfelt zur Probe
 *   Formel.wuerfle(sz, zufall?)  → {frage (HTML), loesung (Zahl), falsch: [Zahlen], werte}
 * Szenario = {frage: '{a} + {b} =', werte: {a: [1, 10], b: [1, 10, 0.5], c: {aus: [2, 5]}, d: 'a*b'},
 *             bedingung: 'b <= a', loesung: 'a + b', runden: 2, einheit: '€', falsch: ['a - b']}
 *   Im Fragetext: {a} = Wert von a, {=a*10} = Wert eines Ausdrucks.
 */
(function () {
  'use strict';
  const FUNK = {
    runden: (x, n) => { const f = Math.pow(10, n || 0); return Math.round(x * f + (x >= 0 ? 1e-9 : -1e-9)) / f; },
    abs: Math.abs, min: Math.min, max: Math.max, wurzel: Math.sqrt, ganz: Math.floor, rest: (a, b) => a % b
  };
  const WORT = {und: '&&', oder: '||', nicht: '!'};

  function lex(s) {
    const t = []; let i = 0, m;
    s = String(s);
    while (i < s.length) {
      const r = s.slice(i);
      if ((m = r.match(/^\s+/))) { i += m[0].length; continue; }
      if ((m = r.match(/^\d+(\.\d+)?/))) { t.push({t: 'zahl', v: +m[0], p: i}); i += m[0].length; continue; }
      if ((m = r.match(/^[A-Za-zÄÖÜäöüß_][A-Za-z0-9ÄÖÜäöüß_]*/))) {
        const w = m[0].toLowerCase();
        t.push(WORT[w] ? {t: 'op', v: WORT[w], p: i} : {t: 'name', v: m[0], p: i}); i += m[0].length; continue;
      }
      if ((m = r.match(/^(<=|>=|==|!=|<>|&&|\|\||[-+*\/^()<>=,!·:×])/))) {
        const v = {'·': '*', '×': '*', ':': '/', '<>': '!=', '=': '=='}[m[0]] || m[0];
        t.push({t: 'op', v, p: i}); i += m[0].length; continue;
      }
      throw new Error(`Das Zeichen „${r[0]}“ kann ich nicht rechnen`);
    }
    return t;
  }
  // Baum: {z} Zahl, {n} Name, {f, a:[…]} Funktion, {o, a, b} Rechenzeichen, {u, a} einstellig
  function parse(s) {
    const t = lex(s); let i = 0;
    const ist = v => t[i] && t[i].t === 'op' && t[i].v === v;
    const fehl = was => { throw new Error(was); };
    function oder() { let a = und(); while (ist('||')) { i++; a = {o: '||', a, b: und()}; } return a; }
    function und() { let a = vergleich(); while (ist('&&')) { i++; a = {o: '&&', a, b: vergleich()}; } return a; }
    function vergleich() {
      const a = summe();
      for (const v of ['<=', '>=', '==', '!=', '<', '>']) if (ist(v)) { i++; return {o: v, a, b: summe()}; }
      return a;
    }
    function summe() { let a = produkt(); while (ist('+') || ist('-')) { const o = t[i++].v; a = {o, a, b: produkt()}; } return a; }
    function produkt() { let a = einst(); while (ist('*') || ist('/')) { const o = t[i++].v; a = {o, a, b: einst()}; } return a; }
    function einst() { if (ist('-')) { i++; return {u: '-', a: einst()}; } if (ist('!')) { i++; return {u: '!', a: einst()}; } if (ist('+')) { i++; return einst(); } return potenz(); }
    function potenz() { const a = atom(); if (ist('^')) { i++; return {o: '^', a, b: einst()}; } return a; }
    function atom() {
      const x = t[i];
      if (!x) fehl('Der Ausdruck endet zu früh');
      if (x.t === 'zahl') { i++; return {z: x.v}; }
      if (x.t === 'name') {
        i++;
        if (ist('(')) {
          const f = x.v.toLowerCase(); if (!FUNK[f]) fehl(`Die Funktion „${x.v}“ gibt es nicht (möglich: ${Object.keys(FUNK).join(', ')})`);
          i++; const a = [];
          if (!ist(')')) for (;;) { a.push(oder()); if (ist(',')) { i++; continue; } break; }
          if (!ist(')')) fehl(`Bei „${x.v}(…)“ fehlt die schließende Klammer`);
          i++; return {f, a};
        }
        return {n: x.v};
      }
      if (ist('(')) { i++; const e = oder(); if (!ist(')')) fehl('Es fehlt eine schließende Klammer )'); i++; return e; }
      fehl(`„${x.v}“ steht hier an der falschen Stelle`);
    }
    if (!t.length) fehl('Der Ausdruck ist leer');
    const e = oder();
    if (i < t.length) fehl(`„${t[i].v}“ steht hier an der falschen Stelle` + (t[i].v === ',' ? ' – Kommazahlen mit Punkt schreiben (2.5)' : ''));
    return e;
  }
  const CACHE = new Map();
  function baum(s) { s = String(s); if (!CACHE.has(s)) CACHE.set(s, parse(s)); return CACHE.get(s); }
  function namenIn(e, out) {
    if (e.n) out.add(e.n);
    ['a', 'b'].forEach(k => { if (e[k] && typeof e[k] === 'object' && !Array.isArray(e[k])) namenIn(e[k], out); });
    if (Array.isArray(e.a)) e.a.forEach(x => namenIn(x, out));
    return out;
  }
  function rechne(e, w) {
    if (e.z !== undefined) return e.z;
    if (e.n !== undefined) { if (!(e.n in w)) throw new Error(`„${e.n}“ ist kein Wert`); return w[e.n]; }
    if (e.f) return FUNK[e.f](...e.a.map(x => rechne(x, w)));
    if (e.u) { const a = rechne(e.a, w); return e.u === '-' ? -a : a ? 0 : 1; }
    const a = rechne(e.a, w), b = rechne(e.b, w);
    switch (e.o) {
      case '+': return a + b; case '-': return a - b; case '*': return a * b; case '/': return a / b; case '^': return Math.pow(a, b);
      case '<': return +(a < b); case '<=': return +(a <= b); case '>': return +(a > b); case '>=': return +(a >= b);
      case '==': return +(Math.abs(a - b) < 1e-9); case '!=': return +(Math.abs(a - b) >= 1e-9);
      case '&&': return +(a && b); case '||': return +(a || b);
    }
  }
  function pruefe(text, namen) {
    try {
      const e = baum(text);
      if (namen) { const fremd = [...namenIn(e, new Set())].filter(n => !namen.includes(n)); if (fremd.length) return `„${fremd[0]}“ ist kein festgelegter Wert` + (namen.length ? ` (festgelegt: ${namen.join(', ')})` : ''); }
      return null;
    } catch (x) { return x.message; }
  }
  const namen = text => [...namenIn(baum(text), new Set())];
  const wert = (text, w) => { const v = rechne(baum(text), w || {}); if (typeof v !== 'number' || !isFinite(v)) throw new Error('Das Ergebnis ist keine Zahl (z. B. durch 0 geteilt)'); return v; };
  const sauber = n => Math.round(n * 1e9) / 1e9;   // 0.1 + 0.2 → 0.3
  function zahlText(n) {
    n = sauber(n);
    const [g, k] = String(Math.abs(n)).split('.');
    return (n < 0 ? '−' : '') + g.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (k ? ',' + k : '');
  }

  /* ---------- Szenarien ---------- */
  function wertBeschreibung(v) {   // Fehler in einer Wert-Angabe oder null
    if (Array.isArray(v)) {
      if (v.length < 2 || v.length > 3 || v.some(x => typeof x !== 'number')) return 'braucht [von, bis] oder [von, bis, Schritt] mit Zahlen';
      if (v[0] > v[1]) return '„von“ ist größer als „bis“';
      if (v.length === 3 && !(v[2] > 0)) return 'der Schritt muss größer als 0 sein';
      return null;
    }
    if (v && typeof v === 'object') return Array.isArray(v.aus) && v.aus.length && v.aus.every(x => typeof x === 'number') ? null : 'braucht {"aus": [Zahlen]}';
    if (typeof v === 'string') return null;
    return 'muss [von, bis], {"aus": […]} oder eine Formel sein';
  }
  function einWert(v, w, r) {
    if (Array.isArray(v)) {
      const s = v[2] || 1, n = Math.floor((v[1] - v[0]) / s + 1e-9);
      return sauber(v[0] + Math.floor(r() * (n + 1)) * s);
    }
    if (v && v.aus) return v.aus[Math.floor(r() * v.aus.length)];
    return wert(v, w);
  }
  function rund(sz, x) { return sz.runden != null ? FUNK.runden(x, sz.runden) : sauber(x); }
  function wuerfle(sz, r) {
    r = r || Math.random;
    for (let n = 0; n < 200; n++) {
      const w = {};
      Object.keys(sz.werte || {}).forEach(k => { w[k] = einWert(sz.werte[k], w, r); });
      if (sz.bedingung && !wert(sz.bedingung, w)) continue;
      const loesung = rund(sz, wert(sz.loesung, w));
      const frage = String(sz.frage || '').replace(/\{=([^}]+)\}|\{([A-Za-zÄÖÜäöüß_][\wÄÖÜäöüß]*)\}/g, (_, aus, nm) => zahlText(aus ? wert(aus, w) : w[nm]));
      const falsch = (sz.falsch || []).map(f => rund(sz, wert(f, w))).filter(x => Math.abs(x - loesung) > 1e-9);
      return {frage, loesung, falsch, werte: w};
    }
    throw new Error('Die Bedingung ist auch nach 200 Versuchen nicht erfüllt – Wertebereiche oder Bedingung anpassen');
  }
  function pruefeSzenario(sz) {
    const f = [];
    if (!sz || typeof sz !== 'object') return ['Szenario muss ein Objekt sein'];
    if (typeof sz.frage !== 'string' || !sz.frage.trim()) f.push('Der Fragetext fehlt (z. B. „{a} + {b}“)');
    const werte = sz.werte && typeof sz.werte === 'object' && !Array.isArray(sz.werte) ? sz.werte : null;
    if (!werte) f.push('„werte“ fehlt (z. B. {"a": [1, 10], "b": [1, 10]})');
    const bekannt = [];
    Object.keys(werte || {}).forEach(k => {
      if (!/^[A-Za-zÄÖÜäöüß_][\wÄÖÜäöüß]*$/.test(k)) f.push(`Der Name „${k}“ geht nicht – nur Buchstaben, Ziffern und _`);
      const fb = wertBeschreibung(werte[k]);
      if (fb) f.push(`Wert ${k}: ${fb}`);
      else if (typeof werte[k] === 'string') { const e = pruefe(werte[k], bekannt); if (e) f.push(`Wert ${k} = ${werte[k]}: ${e}`); }
      bekannt.push(k);
    });
    if (typeof sz.loesung !== 'string' && typeof sz.loesung !== 'number') f.push('Die Lösung fehlt (Formel, z. B. „a + b“)');
    else { const e = pruefe(String(sz.loesung), bekannt); if (e) f.push(`Lösung „${sz.loesung}“: ${e}`); }
    if (sz.bedingung != null) { const e = pruefe(sz.bedingung, bekannt); if (e) f.push(`Bedingung „${sz.bedingung}“: ${e}`); }
    (Array.isArray(sz.falsch) ? sz.falsch : sz.falsch == null ? [] : [null]).forEach(x => { const e = typeof x === 'string' ? pruefe(x, bekannt) : 'muss eine Formel sein'; if (e) f.push(`Falsche Antwort „${x}“: ${e}`); });
    if (sz.runden != null && !(Number.isInteger(sz.runden) && sz.runden >= 0 && sz.runden <= 6)) f.push('„runden“ = Anzahl Nachkommastellen (0 bis 6)');
    String(sz.frage || '').replace(/\{=([^}]+)\}|\{([^}]*)\}/g, (_, aus, nm) => {
      if (aus) { const e = pruefe(aus, bekannt); if (e) f.push(`Im Fragetext {=${aus}}: ${e}`); }
      else if (!bekannt.includes(nm)) f.push(`Im Fragetext steht {${nm}}, aber „${nm}“ ist kein festgelegter Wert`);
    });
    if (!f.length) { try { for (let i = 0; i < 30; i++) wuerfle(sz); } catch (x) { f.push(x.message); } }
    return f;
  }

  const Formel = {pruefe, namen, wert, zahlText, wuerfle, pruefeSzenario, FUNKTIONEN: Object.keys(FUNK)};
  if (typeof module !== 'undefined' && module.exports) module.exports = Formel; else window.Formel = Formel;
})();
