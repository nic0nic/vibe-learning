/* vorlage-json.js – JSON-Editor für den JSON-Modus von „Übung erstellen“ (IT/tools/uebung-erstellen.html)
 *
 * Braucht CodeMirror 5 mit den Addons matchBrackets, autoCloseBrackets, styleActiveLine
 * (../python/lib/codemirror.min.js + codemirror.css). Farben über CSS-Variablen der Seite (siehe unten .cm-s-vljson).
 *
 *   const je = VorlageJson.editor(textarea, {aenderung(text)})   ersetzt das Textfeld
 *   je.text() / je.setze(text) / je.markiereAlles() / je.refresh() (nach Einblenden) / je.cm (CodeMirror)
 *
 * Was der Editor kann:
 *   - Farben: Feldnamen ("titel":), Texte, HTML-Tags in Texten, Zahlen, true/false/null, Wert von "typ" hervorgehoben
 *   - Klammerpaare in drei Farben je Tiefe; Klammer neben dem Cursor + ihr Gegenstück markiert (matchBrackets),
 *     sonst das Klammerpaar, in dem der Cursor steht, dazu ein Balken in der Zeilenleiste über den ganzen Bereich
 *   - Klammern und Anführungszeichen schließen sich selbst, Enter rückt passend ein, Tab = 2 Leerzeichen
 *   - JSON-Fehler live: Stelle unterkringelt, Zeile markiert, Meldung auf Deutsch unter dem Editor
 */
(function () {
  'use strict';
  const KLAMMER = /[{}\[\]]/;

  CodeMirror.defineMode('vljson', () => ({
    startState: () => ({tiefe: 0, key: null, erwarteWert: false, imText: null}),
    copyState: s => Object.assign({}, s),
    token(st, s) {
      // in einem Wert-Text: HTML-Tags eigens färben, Text endet am nächsten nicht maskierten "
      if (s.imText) {
        const art = s.imText;
        if (st.sol()) { s.imText = null; return null; }   // JSON-Texte gehen nie über eine Zeile
        if (st.match(/^<\/?[a-zA-Z][^<>"]*>/)) return 'string tag';
        while (!st.eol()) {
          const c = st.peek();
          if (c === '<' && /^<\/?[a-zA-Z][^<>"]*>/.test(st.string.slice(st.pos)) && st.current()) return art;
          st.next();
          if (c === '\\') { st.next(); continue; }
          if (c === '"') { s.imText = null; return art; }
        }
        s.imText = null; return art + ' error';   // nicht geschlossen
      }
      if (st.eatSpace()) return null;
      const ch = st.peek();
      if (ch === '"') {
        // Feldname ("titel":) erkennt man am Doppelpunkt hinter dem schließenden "
        const m = st.string.slice(st.pos).match(/^"((?:[^"\\]|\\.)*)"\s*:/);
        if (m) { st.pos += m[1].length + 2; s.key = m[1]; s.erwarteWert = true; return 'property'; }
        st.next();
        s.imText = s.key === 'typ' && s.erwarteWert ? 'string keyword' : 'string';
        s.erwarteWert = false;
        return s.imText;
      }
      if (ch === '{' || ch === '[') { st.next(); const k = 'bracket b' + (s.tiefe % 3); s.tiefe++; s.erwarteWert = false; return k; }
      if (ch === '}' || ch === ']') { st.next(); s.tiefe = Math.max(0, s.tiefe - 1); return 'bracket b' + (s.tiefe % 3); }
      if (ch === ':' || ch === ',') { st.next(); if (ch === ',') s.erwarteWert = false; return 'punctuation'; }
      if (st.match(/^-?\d+(\.\d+)?([eE][+-]?\d+)?/)) { s.erwarteWert = false; return 'number'; }
      if (st.match(/^(true|false|null)\b/)) { s.erwarteWert = false; return 'atom'; }
      st.next(); return 'error';
    },
    indent(s, danach) { return Math.max(0, s.tiefe - (/^\s*[\]}]/.test(danach) ? 1 : 0)) * 2; },
    electricInput: /^\s*[\]}]$/,
    closeBrackets: '{}[]""'
  }));

  // Eigener kleiner JSON-Prüfer: genaue Stelle und deutsche Meldung, unabhängig vom Browser → null oder {pos, was}
  function jsonFehler(text) {
    let i = 0;
    const F = (was, pos) => { throw {pos: pos == null ? i : pos, was}; };
    const leer = () => { while (i < text.length && /[ \t\n\r]/.test(text[i])) i++; };
    const zeigen = c => c === undefined ? 'das Ende' : c === '\n' ? 'ein Zeilenende' : `„${c}“`;
    function wert() {
      leer();
      const c = text[i];
      if (c === '{') return objekt();
      if (c === '[') return liste();
      if (c === '"') return zeichenkette();
      if (c === '-' || (c >= '0' && c <= '9')) return zahl();
      for (const w of ['true', 'false', 'null']) if (text.startsWith(w, i)) { i += w.length; return; }
      if (c === undefined) F('Das JSON endet zu früh – hier fehlt noch ein Wert und eine schließende } oder ].');
      if (c === "'") F('Texte stehen in JSON in doppelten Anführungszeichen "…", nicht in \'…\'.');
      if (c === '„' || c === '“' || c === '”') F('Typografische Anführungszeichen „…“ gehen nicht – in JSON nur gerade "…".');
      if (c === '}' || c === ']') F(`Vor ${zeigen(c)} steht ein Komma zu viel (oder es fehlt ein Wert).`);
      F(`Hier wird ein Wert erwartet: Text in "…", Zahl, true/false, {…} oder […] – nicht ${zeigen(c)}.`);
    }
    function objekt() {
      i++; leer();
      if (text[i] === '}') { i++; return; }
      for (;;) {
        leer();
        if (text[i] === '}') F('Vor } steht ein Komma zu viel.', text.lastIndexOf(',', i));
        if (/\d/.test(text[i] || '') && /\d\s*,\s*$/.test(text.slice(0, i))) F('Kommazahlen schreibt man in JSON mit Punkt, z. B. 8.5 statt 8,5.', text.slice(0, i).search(/,\s*$/));
        if (text[i] !== '"') F(text[i] === undefined ? 'Das JSON endet zu früh – es fehlt eine schließende }.' : `Hier wird ein Feldname in "…" erwartet, nicht ${zeigen(text[i])}.`);
        zeichenkette(); leer();
        if (text[i] !== ':') F(`Nach dem Feldnamen fehlt der Doppelpunkt : (gefunden: ${zeigen(text[i])}).`);
        i++; wert(); leer();
        if (text[i] === ',') { i++; continue; }
        if (text[i] === '}') { i++; return; }
        F(text[i] === undefined ? 'Das JSON endet zu früh – es fehlt eine schließende }.' : text[i] === '"' ? 'Hier fehlt ein Komma vor dem nächsten Feld.' : `Hier fehlt ein Komma oder eine schließende } (gefunden: ${zeigen(text[i])}).`);
      }
    }
    function liste() {
      i++; leer();
      if (text[i] === ']') { i++; return; }
      for (;;) {
        leer();
        if (text[i] === ']') F('Vor ] steht ein Komma zu viel.', text.lastIndexOf(',', i));
        wert(); leer();
        if (text[i] === ',') { i++; continue; }
        if (text[i] === ']') { i++; return; }
        F(text[i] === undefined ? 'Das JSON endet zu früh – es fehlt eine schließende ].' : /["{\[0-9tfn-]/.test(text[i]) ? 'Hier fehlt ein Komma zwischen zwei Einträgen.' : `Hier fehlt ein Komma oder eine schließende ] (gefunden: ${zeigen(text[i])}).`);
      }
    }
    function zeichenkette() {
      const start = i; i++;
      for (;;) {
        const c = text[i];
        if (c === undefined || c === '\n') F('Dieser Text ist nicht geschlossen – es fehlt das schließende ".', start);
        if (c === '"') { i++; return; }
        if (c === '\t' || c < ' ') F('Tabulator oder Steuerzeichen in einem Text – in JSON nicht erlaubt.');
        if (c === '\\') { if (!/["\\\/bfnrtu]/.test(text[i + 1] || '')) F(`Ungültiges Zeichen nach \\ – für ein " im Text \\" schreiben.`); i += text[i + 1] === 'u' ? 6 : 2; continue; }
        i++;
      }
    }
    function zahl() {
      const m = text.slice(i).match(/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/);
      if (!m) F('Ungültige Zahl.');
      i += m[0].length;
    }
    try {
      wert(); leer();
      if (i < text.length) F('Nach dem Ende des JSON (letzte } ) steht noch etwas.');
      return null;
    } catch (e) { if (e && e.was) return {pos: Math.min(e.pos, text.length), was: e.was}; throw e; }
  }

  function editor(ta, opt) {
    opt = opt || {};
    const cm = CodeMirror.fromTextArea(ta, {
      mode: 'vljson', theme: 'vljson', lineNumbers: true, lineWrapping: true, indentUnit: 2, tabSize: 2, indentWithTabs: false,
      matchBrackets: {highlightNonMatching: true, maxScanLines: 100000},   // Klammer vor oder hinter dem Cursor
      autoCloseBrackets: true, styleActiveLine: true, viewportMargin: Infinity,   // alles gezeichnet: Strg+F des Browsers findet auch Unsichtbares
      extraKeys: {Tab: c => c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection('  '), 'Shift-Tab': c => c.indentSelection('subtract')}
    });
    const status = document.createElement('div'); status.className = 'json-status';
    cm.getWrapperElement().after(status);

    /* Klammerpaar um den Cursor (wenn keine Klammer direkt daneben steht) */
    let umMarken = [], umZeilen = [];
    function umschliessend() {
      umMarken.forEach(m => m.clear()); umMarken = [];
      umZeilen.forEach(l => cm.removeLineClass(l, 'gutter', 'json-bereich')); umZeilen = [];
      if (cm.somethingSelected()) return;
      const c = cm.getCursor();
      if (cm.findMatchingBracket(c, {maxScanLines: 100000})) return;   // Klammer direkt am Cursor: macht matchBrackets
      // Tiefe am Cursor aus dem Modus; die öffnende Klammer dieser Tiefe hat die Farbklasse b(tiefe-1) – nur solche zählen
      const tiefe = cm.getTokenAt(c, true).state.tiefe;
      if (!tiefe) return;
      const auf = cm.scanForBracket(c, -1, 'bracket b' + ((tiefe - 1) % 3), {bracketRegex: KLAMMER, maxScanLines: 100000});
      if (!auf) return;
      const paar = cm.findMatchingBracket(CodeMirror.Pos(auf.pos.line, auf.pos.ch + 1), {afterCursor: false, maxScanLines: 100000});
      if (!paar || !paar.match) return;
      [paar.from, paar.to].forEach(p => umMarken.push(cm.markText(p, CodeMirror.Pos(p.line, p.ch + 1), {className: 'json-umschliesst'})));
      const a = Math.min(paar.from.line, paar.to.line), b = Math.max(paar.from.line, paar.to.line);
      if (b - a <= 2000) for (let l = a; l <= b; l++) umZeilen.push(cm.addLineClass(l, 'gutter', 'json-bereich'));
    }

    /* Fehler live markieren */
    let fMarke = null, fZeile = null, uhr = 0;
    function pruefen() {
      if (fMarke) { fMarke.clear(); fMarke = null; }
      if (fZeile != null) { cm.removeLineClass(fZeile, 'wrap', 'json-fehlerzeile'); fZeile = null; }
      const text = cm.getValue();
      if (!text.trim()) { status.innerHTML = ''; return; }
      const f = jsonFehler(text);
      if (!f) { status.innerHTML = '<span class="ok">✓ gültiges JSON</span>'; return; }
      const p = cm.posFromIndex(f.pos), bis = cm.posFromIndex(Math.min(text.length, f.pos + 1));
      fMarke = cm.markText(p.ch === bis.ch && p.line === bis.line ? CodeMirror.Pos(p.line, Math.max(0, p.ch - 1)) : p, bis.line > p.line ? CodeMirror.Pos(p.line, p.ch + 1) : bis, {className: 'json-fehler'});
      fZeile = cm.addLineClass(p.line, 'wrap', 'json-fehlerzeile');
      const esc = s => String(s).replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c]));
      status.innerHTML = `<button type="button" class="fehler" title="Zur Stelle springen">✗ Zeile ${p.line + 1}, Zeichen ${p.ch + 1}: ${esc(f.was)}</button>`;
      status.querySelector('button').onclick = () => { cm.focus(); cm.setCursor(p); cm.scrollIntoView(p, 80); };
    }

    let still = false;
    cm.on('cursorActivity', umschliessend);
    cm.on('change', () => {
      cm.save();
      clearTimeout(uhr); uhr = setTimeout(pruefen, 250);
      if (!still && opt.aenderung) opt.aenderung(cm.getValue());
    });
    pruefen();
    return {
      cm,
      text: () => cm.getValue(),
      setze(t) { still = true; cm.setValue(t); cm.save(); still = false; clearTimeout(uhr); pruefen(); },
      markiereAlles() { cm.focus(); cm.execCommand('selectAll'); },
      refresh() { cm.refresh(); }
    };
  }

  window.VorlageJson = {editor, jsonFehler};
})();
