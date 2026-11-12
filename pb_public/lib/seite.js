/* seite.js – Übungsseiten aus Aufgaben-JSON prüfen und bauen (Browser und PocketBase-Hooks)
 *
 * Wird genutzt von IT/tools/uebung-erstellen.html (Vorschau, Download, ByCS-Paket) und pb_hooks/einreichen.pb.js (Pull Request).
 * Im Browser: <script src="lib/seite.js"></script> → window.Seite; im Hook: require(…/pb_public/lib/seite.js).
 *
 * Aufgaben-JSON (reine Daten, kein JavaScript; Aufgabentypen wie in lib/aufgaben.js):
 *   {"titel": "Kredite bei der Bank", "kurztext": "…",
 *    "schritte": [{"kurz": "5.1", "titel": "…", "html": "<p>Erklärung</p>", "erinnerung": "…", "erinnerungZu": true,
 *                  "material": "…", "aufgaben": [{"typ": "mc", …}, …]}, …]}
 *   Statt "schritte" geht auch "aufgaben": [...] (wird ein einziger Schritt).
 *
 * API
 *   Seite.TYPEN                     Aufgabentypen mit Pflichtfeldern (muss zu lib/aufgaben.js passen)
 *   Seite.normalisiere(json)        → {titel, kurztext, schritte} (Schritte bekommen id und kurz)
 *   Seite.pruefe(json)              → Liste von Fehlern (leer = in Ordnung), deutsch, mit Fundstelle
 *       HTML in Texten nur nach Erlaubtliste (Seite.ERLAUBT): Tags wie p, b, ul, table … mit höchstens class
 *       (td/th auch colspan, rowspan); jedes andere „<“ + Buchstabe, „</“, „<!“ oder „<?“ wird abgelehnt.
 *   Seite.toolId(titel, zufall)     → id für katalog.js (a–z, 0–9, -, höchstens 20 Zeichen)
 *   Seite.seiteHTML(json, opt)      → komplette HTML-Seite
 *       opt = {pfad: 'BWR/9II/finanzierung', toolId, einzeln: false, lib: {aufgabenJs, aufgabenCss, bwrCss}}
 *       einzeln: true → ohne Menü und Server, Bibliotheken eingebettet (Vorschau, Download)
 *       bycs: {scormJs, stufen} (nur mit einzeln) → für ein SCORM-Paket: window.PF_BYCS und scorm.js vor den
 *             Bibliotheken eingebettet, wie in werkzeuge/bycs-pakete.py (dort statt sync.js)
 */
(function () {
  'use strict';
  const TYPEN = {
    mc: ['options', 'correct'], zahlen: ['felder'], luecken: ['text'], zuordnen: ['felder', 'karten'],
    freitext: ['felder', 'antworten'], chat: ['nachrichten'], buchungssatz: ['konten', 'soll', 'haben'], tabelle: ['spalten', 'zeilen'], wahrheit: ['spalten', 'zeilen']
  };
  const MAX = 150000;
  // Erlaubtliste für HTML in eingereichten Texten (alles andere wird abgelehnt, auch unvollständige Tags)
  const ERLAUBT = ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'sub', 'sup', 'small', 'mark', 'span', 'div', 'hr',
    'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'code', 'pre', 'blockquote'];
  const TAG = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-z]+="[a-z0-9 _-]*")*)\s*(\/?)>/;
  // Fehler im HTML eines Textes (leer = in Ordnung)
  function htmlFehler(s) {
    const f = [];
    for (let i = s.indexOf('<'); i >= 0; i = s.indexOf('<', i + 1)) {
      const n = s[i + 1] || '';
      if (!/[a-zA-Z\/!?]/.test(n)) continue;                           // „3 < 5“ ist kein Tag
      const m = s.slice(i).match(TAG);
      const name = m && m[2].toLowerCase();
      if (!m || !ERLAUBT.includes(name)) { f.push(`nicht erlaubtes HTML: ${s.slice(i, i + 40)}`); continue; }
      const attrs = (m[3].match(/[a-z]+(?==)/g) || []);
      const ok = attrs.every(a => a === 'class' || ((name === 'td' || name === 'th') && (a === 'colspan' || a === 'rowspan')));
      if (!ok || (m[1] && attrs.length)) f.push(`nicht erlaubtes Attribut: ${m[0].slice(0, 60)}`);
      if (/span="[^"]*[^0-9"]/.test(m[3])) f.push(`colspan/rowspan nur als Zahl: ${m[0].slice(0, 60)}`);
    }
    return f;
  }
  function alleTexte(x, wo, f) {
    if (typeof x === 'string') { htmlFehler(x).forEach(e => f.push(`${wo}: ${e}`)); return; }
    if (Array.isArray(x)) x.forEach((y, i) => alleTexte(y, wo, f));
    else if (x && typeof x === 'object') Object.keys(x).forEach(k => alleTexte(x[k], wo, f));
  }
  const istText = v => typeof v === 'string' && v.trim() !== '';
  const r2 = n => Math.round(n * 100) / 100;

  function normalisiere(j) {
    const schritte = Array.isArray(j.schritte) ? j.schritte : Array.isArray(j.aufgaben) ? [{kurz: 'Aufgaben', titel: j.titel, aufgaben: j.aufgaben}] : [];
    return {titel: j.titel, kurztext: j.kurztext || '', schritte: schritte.map((s, i) => Object.assign({}, s, {id: 's' + (i + 1), kurz: s.kurz || String(i + 1)}))};
  }

  function pruefeAufgabe(a, wo, f) {
    if (!a || typeof a !== 'object') return f.push(`${wo}: keine Aufgabe (Objekt erwartet)`);
    if (!TYPEN[a.typ]) return f.push(`${wo}: unbekannter Aufgabentyp „${a.typ}“ (möglich: ${Object.keys(TYPEN).join(', ')})`);
    TYPEN[a.typ].forEach(k => { if (a[k] == null) f.push(`${wo} (${a.typ}): Feld „${k}“ fehlt`); });
    if (a.typ === 'mc' && Array.isArray(a.options) && Array.isArray(a.correct)) {
      if (a.options.length < 2) f.push(`${wo}: mindestens zwei Antworten nötig`);
      if (!a.correct.length) f.push(`${wo}: „correct“ ist leer`);
      if (a.html != null && typeof a.html !== 'boolean') f.push(`${wo}: „html“ muss true oder false sein`);
      a.correct.forEach(i => { if (!(Number.isInteger(i) && i >= 0 && i < a.options.length)) f.push(`${wo}: „correct“ enthält ${i}, es gibt aber nur die Antworten 0 bis ${a.options.length - 1}`); });
    }
    if (a.typ === 'zahlen' && Array.isArray(a.felder)) a.felder.forEach((x, i) => { if (!x || !istText(x.t) || typeof x.l !== 'number') f.push(`${wo}, Feld ${i + 1}: braucht „t“ (Text) und „l“ (Lösung als Zahl)`); });
    if (a.typ === 'luecken' && typeof a.text === 'string') {
      const l = a.text.match(/\[\[(.*?)\]\]/g) || [];
      if (!l.length) f.push(`${wo}: keine Lücke [[richtig|falsch]] im Text`);
      if (!a.ziehen) l.forEach(x => { if (x.split('|').length < 2) f.push(`${wo}: Lücke ${x} braucht mindestens zwei Antworten, die richtige zuerst`); });
      l.forEach(x => { if (!x.slice(2, -2).split('|')[0].trim()) f.push(`${wo}: Lücke ${x} ohne richtiges Wort`); });
      if (a.extra != null && !(Array.isArray(a.extra) && a.extra.every(istText))) f.push(`${wo}: „extra“ muss eine Liste von Wörtern sein`);
    }
    if (a.typ === 'zuordnen' && Array.isArray(a.felder) && Array.isArray(a.karten)) {
      const ids = a.felder.map(x => Array.isArray(x) ? x[0] : null);
      if (ids.length < 2) f.push(`${wo}: mindestens zwei Felder nötig`);
      a.karten.forEach((k, i) => { if (!k || !istText(k.t) || !ids.includes(k.z)) f.push(`${wo}, Karte ${i + 1}: braucht „t“ und ein „z“ aus ${ids.join(', ')}`); });
    }
    if (a.typ === 'freitext' && Array.isArray(a.felder) && Array.isArray(a.antworten) && a.antworten.length < a.felder.length)
      f.push(`${wo}: weniger mögliche Antworten (${a.antworten.length}) als Felder (${a.felder.length})`);
    if (a.typ === 'chat' && Array.isArray(a.nachrichten)) a.nachrichten.forEach((m, i) => {
      if (typeof m === 'string') return;
      if (!m || !istText(m.bot)) return f.push(`${wo}, Nachricht ${i + 1}: Text oder {"bot": …} erwartet`);
      if (m.antworten && !m.antworten.some(x => x && x.ok)) f.push(`${wo}, Nachricht ${i + 1}: keine Antwort mit "ok": true`);
      if (m.zahl && typeof m.zahl.l !== 'number') f.push(`${wo}, Nachricht ${i + 1}: „zahl“ braucht „l“ (Lösung als Zahl)`);
    });
    if (a.typ === 'buchungssatz' && Array.isArray(a.soll) && Array.isArray(a.haben) && Array.isArray(a.konten)) {
      const summe = l => r2(l.reduce((s, x) => s + (Array.isArray(x) ? Number(x[1]) || 0 : 0), 0));
      [...a.soll, ...a.haben].forEach(x => { if (!Array.isArray(x) || !a.konten.includes(x[0]) || typeof x[1] !== 'number') f.push(`${wo}: Buchungszeile ${JSON.stringify(x)} – Konto muss in „konten“ stehen, Betrag als Zahl`); });
      if (summe(a.soll) !== summe(a.haben)) f.push(`${wo}: Soll (${summe(a.soll)}) und Haben (${summe(a.haben)}) sind nicht gleich groß`);
    }
    if (a.typ === 'tabelle' && Array.isArray(a.spalten) && Array.isArray(a.zeilen)) {
      let felder = 0;
      a.zeilen.forEach((r, i) => {
        if (!Array.isArray(r) || r.length !== a.spalten.length) return f.push(`${wo}, Zeile ${i + 1}: braucht genau ${a.spalten.length} Zellen (wie „spalten“)`);
        r.forEach((c, j) => { if (c && typeof c === 'object') { if (typeof c.l !== 'number') f.push(`${wo}, Zeile ${i + 1}, Spalte ${j + 1}: Eingabefeld braucht „l“ (Lösung als Zahl)`); else felder++; } });
      });
      if (!felder) f.push(`${wo}: keine Eingabefelder ({"l": Lösung}) in der Tabelle`);
    }
    if (a.typ === 'wahrheit' && Array.isArray(a.spalten) && Array.isArray(a.zeilen)) {
      let felder = 0;
      a.zeilen.forEach((r, i) => {
        if (!Array.isArray(r) || r.length !== a.spalten.length) return f.push(`${wo}, Zeile ${i + 1}: braucht genau ${a.spalten.length} Zellen (wie „spalten“)`);
        r.forEach((c, j) => { if (c && typeof c === 'object') { if (typeof c.l !== 'boolean') f.push(`${wo}, Zeile ${i + 1}, Spalte ${j + 1}: Feld braucht „l“ (true oder false)`); else felder++; } });
      });
      if (!felder) f.push(`${wo}: keine Felder zum Anklicken ({"l": true/false}) in der Tabelle`);
      if (a.werte != null && !(Array.isArray(a.werte) && a.werte.length === 2 && a.werte.every(istText))) f.push(`${wo}: „werte“ braucht genau zwei Wörter, z. B. ["ja", "nein"]`);
    }
    if (a.danach) pruefeAufgabe(a.danach, wo + ' → danach', f);
  }

  function pruefe(j) {
    const f = [];
    if (!j || typeof j !== 'object' || Array.isArray(j)) return ['Das ist kein Aufgaben-JSON (Objekt mit „titel“ und „schritte“ erwartet).'];
    const roh = JSON.stringify(j);
    if (roh.length > MAX) f.push(`Zu groß (${Math.round(roh.length / 1000)} kB, höchstens ${MAX / 1000} kB).`);
    if (/<\s*script|\bon[a-z]+\s*=|javascript:|<\s*iframe|<\s*object|<\s*embed/i.test(roh)) f.push('Eigenes JavaScript (script, onclick=, javascript:, iframe …) ist nicht erlaubt.');
    if (j.titel != null) alleTexte(j.titel, 'Titel', f);
    if (j.kurztext != null) alleTexte(j.kurztext, 'Kurztext', f);
    if (!istText(j.titel)) f.push('„titel“ fehlt.');
    const n = normalisiere(j);
    if (!n.schritte.length) f.push('Keine Schritte bzw. Aufgaben gefunden („schritte“ oder „aufgaben“).');
    if (n.schritte.length > 40) f.push('Höchstens 40 Schritte.');
    n.schritte.forEach((s, i) => {
      const wo = `Schritt ${i + 1}`;
      if (!s.html && !(s.aufgaben && s.aufgaben.length)) f.push(`${wo}: weder Erklärung („html“) noch Aufgaben`);
      if (s.aufgaben != null && !Array.isArray(s.aufgaben)) f.push(`${wo}: „aufgaben“ muss eine Liste sein`);
      (s.aufgaben || []).forEach((a, k) => pruefeAufgabe(a, `${wo}, Aufgabe ${k + 1}`, f));
      alleTexte(s, wo, f);
    });
    return f;
  }

  function toolId(titel, zufall) {
    const s = String(titel || 'uebung').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').reduce((s, w) => !s ? w.slice(0, 14) : (s + '-' + w).length <= 14 ? s + '-' + w : s, '') || 'uebung';
    return s + '-' + String(zufall || Math.random().toString(36).slice(2)).replace(/[^a-z0-9]/g, '').slice(0, 4);
  }

  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const BASIS_CSS = ':root{--bg:#e5e9f0;--panel:#f6f8fb;--panel2:#eceff4;--text:#2e3440;--muted:#5b6578;--border:#cdd3de;--accent:#5e81ac;--err:#a8434d;--ok:#5e8a45;--mono:ui-monospace,Consolas,"Liberation Mono",monospace}'
    + '[data-theme=dark]{--bg:#2e3440;--panel:#3b4252;--panel2:#434c5e;--text:#eceff4;--muted:#a9b3c4;--border:#4c566a;--accent:#88c0d0;--err:#d4848b;--ok:#a3be8c}'
    + '*{box-sizing:border-box}html,body{margin:0}body{background:var(--bg);color:var(--text);font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}'
    + '.wrap{width:min(1000px,100%);margin:0 auto;padding:14px 16px 24px}.bar{margin-bottom:12px}.brand{font:800 20px var(--mono)}.brand span{color:var(--accent-text,var(--accent))}'
    + '.karte{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:14px 16px}.karte h2{font-size:18px;margin:0 0 6px}.karte p{margin:0 0 8px}'
    + '.btn{font:600 14px system-ui,sans-serif;background:var(--panel2);color:var(--text);border:1px solid var(--border);border-radius:10px;padding:7px 12px;cursor:pointer}'
    + '.btn.on,.btn.haupt{background:var(--accent);border-color:var(--accent);color:#fff}[data-theme=dark] .btn.on,[data-theme=dark] .btn.haupt{color:#2e3440}.btn:disabled{opacity:.45}'
    + '.btn.klein{font-size:13px;padding:4px 9px}.feld{font:14px system-ui,sans-serif;background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:6px 8px}.muted{color:var(--muted)}';
  const SEITE_CSS = '.info{border-left:4px solid var(--accent);padding:2px 0 2px 12px;margin:0 0 12px}'
    + '.wrap{max-width:1000px}table{border-collapse:collapse}td,th{border:1px solid var(--border);padding:4px 8px}';
  const THEME = "(function(){var t=null;try{t=localStorage.getItem('wenn-theme');}catch(e){}document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');})();";

  function seiteHTML(json, opt) {
    opt = opt || {};
    const n = normalisiere(json), id = opt.toolId || toolId(n.titel), pfad = String(opt.pfad || '').replace(/^\/+|\/+$/g, '');
    const hoch = pfad ? '../'.repeat(pfad.split('/').length) : '';
    const bwr = /^BWR\//.test(pfad), lib = opt.lib || {};
    const daten = JSON.stringify({titel: n.titel, kurztext: n.kurztext, schritte: n.schritte}, null, 1).replace(/<\//g, '<\\/');
    const titel = esc(n.titel);
    const bycs = opt.einzeln && opt.bycs
      ? ` window.PF_BYCS = {stufen: ${Math.max(0, parseInt(opt.bycs.stufen, 10) || 0)}};</script>\n<script>${String(opt.bycs.scormJs || '').replace(/<\/script/g, '<\\/script')}</script>\n<script>` : '';
    const kopf = opt.einzeln
      ? `<script>window.PF_EINZELDATEI = true;${bycs}${THEME}</script>\n<style>${BASIS_CSS}${bwr && lib.bwrCss ? lib.bwrCss : ''}</style>\n<style>${lib.aufgabenCss || ''}</style>\n<script>${String(lib.aufgabenJs || '').replace(/<\/script/g, '<\\/script')}</script>`
      : `<script src="${hoch}katalog.js"></script>\n<script src="${hoch}nav.js"></script>\n<script src="${hoch}sync.js"></script>\n<script>\n${THEME}\n</script>\n`
        + (bwr ? `<link rel="stylesheet" href="${hoch}BWR/bwr.css">` : `<style>${BASIS_CSS}</style>`)
        + `\n<link rel="stylesheet" href="${hoch}lib/aufgaben.css">\n<script src="${hoch}lib/aufgaben.js"></script>`;
    return `<!doctype html>
<html lang="de" data-trainer="${esc(id)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titel} – vibe learning</title>
<!--
  Erzeugt mit lib/seite.js aus Aufgaben-JSON (Übung erstellen${opt.einzeln ? (opt.bycs ? ', ByCS-Paket' : '') : ', eingereicht'}).
  Inhalt bearbeiten: nur DATEN unten ändern (Format: Kopfkommentar von lib/seite.js, Aufgabentypen: lib/aufgaben.js).
  Gespeichert: ${esc(id)}-stand = {schritt, erledigt}.
-->
${kopf}
<style>${SEITE_CSS}</style>
</head>
<body>
<div class="wrap">
  <div class="bar"><div class="brand">${titel}</div>${n.kurztext ? `<div class="muted">${esc(n.kurztext)}</div>` : ''}</div>
  <div id="app"></div>
</div>
<script>
'use strict';
const DATEN = ${daten};
Aufgaben.sequenz({el:'#app', key:${JSON.stringify(id)}, schritte:DATEN.schritte});
</script>
</body>
</html>
`;
  }

  const Seite = {TYPEN, ERLAUBT, normalisiere, pruefe, toolId, seiteHTML, MAX};
  if (typeof module !== 'undefined' && module.exports) module.exports = Seite;
  else window.Seite = Seite;
})();
