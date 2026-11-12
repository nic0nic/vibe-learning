/* vorlage-editor.js – Baukasten für Übungen (Editor-Modus von vorlage.html)
 *
 * Bearbeitet ein Aufgaben-JSON (Format: lib/seite.js) mit Ziehen und Ablegen wie der Struktogramm-Editor:
 * links die Bausteine, in der Mitte Schritte (Reiter) und Aufgaben (Karten), rechts die Eigenschaften.
 * Formulare der Aufgabentypen: vorlage-typen.js (Baukasten.typ(name, {…})). Nur von vorlage.html genutzt.
 *
 *   <script src="lib/seite.js"></script> <script src="vorlage-editor.js"></script> <script src="vorlage-typen.js"></script>
 *   Baukasten.start({leiste, mitte, panel, fehler, geaendert(doc)})   Elemente; geaendert nach jeder Änderung
 *   Baukasten.setze(doc)        neues Aufgaben-JSON laden (Verlauf wird geleert); "aufgaben" ohne "schritte" wird ein Schritt
 *   Baukasten.daten()           aktuelles Aufgaben-JSON (Kopie)
 *   Baukasten.rueck() / vor()   Rückgängig / Wiederholen (auch Strg+Z / Strg+Y außerhalb von Textfeldern)
 *   Baukasten.fehler()          Fehler aus Seite.pruefe
 *   Baukasten.sauber(html)      HTML auf Seite.ERLAUBT bereinigen (fremde Tags werden ausgepackt, script/style entfernt)
 *
 * Typ registrieren (vorlage-typen.js): Baukasten.typ('mc', {name, symbol, neu() → Aufgabe, kurz(a) → Text,
 *   form(a, H) → HTML, tun: {name(a, dataset)} (Knöpfe data-tun), verschiebe(a, liste, von, nach) (optional)})
 * Formular-Helfer H: H.feld(pfad, label, {art, ph, pflicht, neu}) mit art text|area|zahl|bool|nein|liste|zeilen|gruppen
 *   (gruppen: Zeilen mit Komma-Listen → [[…], …]; neu: Panel nach dem Verlassen neu zeichnen),
 *   H.rt(pfad, label, {klein, ph, knoepfe:'kurz' (nur F, K, Bruch, ⌫), pflicht (leer = '' statt löschen)}) Texteditor mit HTML, H.lt(pfad) Lückentext (Lücken als Chips, /Lücke(richtig, falsch …)),
 *   H.zeile(liste, i, inhalt) ziehbare Zeile (Umsortieren über verschiebe bzw. Liste unter pfad liste),
 *   H.knopf(tun, text, daten), H.wert(a, pfad), H.esc, H.text(html) (nur Text), H.zahl(n) (deutsch).
 *   Werte werden direkt in der Aufgabe gesetzt; leere Felder werden entfernt (pflicht: bleiben als '' bzw. []).
 *
 * Sicherheit: Fremdes HTML (eingefügtes JSON, Zwischenablage) kommt nur bereinigt in die Seite (DOMParser,
 * dann Erlaubtliste), Kurzansichten zeigen nur Text. Die Vorschau läuft weiter im abgeschotteten iframe.
 */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const TYPEN = {};
  let doc = {titel: '', kurztext: '', schritte: []};
  let sel = {s: 0, i: null, tiefe: 0};
  let rueckL = [], vorL = [], letzterKey = null, chip = null;
  let E = {}, cfg = {};

  /* ---------- HTML bereinigen ---------- */
  const WEG = ['script', 'style', 'meta', 'title', 'head', 'link', 'iframe', 'object', 'embed', 'template', 'svg', 'math', 'xml'];
  const LEER = ['br', 'hr'];
  function knoten(n, hook) {
    if (n.nodeType === 3) return esc(n.nodeValue).replace(/&quot;/g, '"').replace(/\u00a0/g, ' ');
    if (n.nodeType !== 1) return '';
    if (hook) { const h = hook(n); if (h != null) return h; }
    const tag = n.tagName.toLowerCase();
    if (WEG.includes(tag) || tag.includes(':')) return '';
    const innen = [...n.childNodes].map(k => knoten(k, hook)).join('');
    let name = tag === 'strong' ? 'b' : tag === 'em' ? 'i' : tag === 'h1' ? 'h2' : /^h[5-6]$/.test(tag) ? 'h4' : tag;
    if (!Seite.ERLAUBT.includes(name)) return innen;
    let attr = '';
    const cls = (n.getAttribute('class') || '').split(/\s+/).filter(c => /^[a-z0-9_-]+$/.test(c)).join(' ');
    if (cls) attr += ` class="${cls}"`;
    if (name === 'td' || name === 'th') ['colspan', 'rowspan'].forEach(a => { const v = n.getAttribute(a); if (/^\d+$/.test(v || '') && v !== '1') attr += ` ${a}="${v}"`; });
    const imBruch = n.parentElement && n.parentElement.classList.contains('bruch');   // Zähler/Nenner: <span> ohne Klasse behalten
    if (name === 'span' && !attr && !imBruch) return innen;
    if (LEER.includes(name)) return `<${name}>`;
    return `<${name}${attr}>${innen}</${name}>`;
  }
  function aufraeumen(s) {
    s = s.replace(/^(\s|<br>)+|(\s|<br>)+$/g, '');
    if (/^<div>[\s\S]*<\/div>$/.test(s) && (s.match(/<div>/g) || []).length === 1) s = s.slice(5, -6);   // erste Zeile
    return s === '<br>' ? '' : s;
  }
  const parse = html => new DOMParser().parseFromString('<body>' + String(html == null ? '' : html) + '</body>', 'text/html').body;
  const sauberRoh = (html, hook) => [...parse(html).childNodes].map(k => knoten(k, hook)).join('');
  const sauber = (html, hook) => aufraeumen(sauberRoh(html, hook));
  const vonEl = (el, hook) => aufraeumen([...el.childNodes].map(k => knoten(k, hook)).join(''));
  const nurText = html => (parse(html).textContent || '').replace(/\s+/g, ' ').trim();

  /* ---------- Pfade und Werte ---------- */
  const teile = p => String(p).split('.').map(x => /^\d+$/.test(x) ? +x : x);
  function wert(o, p) { return teile(p).reduce((x, k) => x == null ? undefined : x[k], o); }
  function setzeWert(o, p, v, weg) {
    const t = teile(p), letzt = t.pop();
    const ziel = t.reduce((x, k) => { if (x[k] == null) x[k] = {}; return x[k]; }, o);
    if (weg && !Array.isArray(ziel)) delete ziel[letzt]; else ziel[letzt] = v;
  }
  function zahlLesen(s) {
    s = String(s).replace(/€|%|\s/g, '');
    if (!s) return NaN;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    return /^-?\d+(\.\d+)?$/.test(s) ? +s : NaN;
  }
  const zahlText = n => typeof n === 'number' ? n.toLocaleString('de-DE', {maximumFractionDigits: 6}) : (n == null ? '' : String(n));

  /* ---------- Modell ---------- */
  const S = () => doc.schritte;
  const schritt = () => S()[sel.s];
  function kette(s, i, tiefe) { let a = S()[s] && (S()[s].aufgaben || [])[i]; for (let d = 0; d < tiefe && a; d++) a = a.danach; return a; }
  const aufgabe = () => sel.i == null ? null : kette(sel.s, sel.i, sel.tiefe);
  function normal(d) {
    d = JSON.parse(JSON.stringify(d || {}));
    if (!Array.isArray(d.schritte)) d.schritte = Array.isArray(d.aufgaben) ? [{titel: d.titel, aufgaben: d.aufgaben}] : [];
    delete d.aufgaben;
    d.schritte.forEach(s => { delete s.id; if (s.aufgaben != null && !Array.isArray(s.aufgaben)) s.aufgaben = []; });
    if (d.titel == null) d.titel = '';
    return d;
  }
  function pruefSel() {
    if (!S().length) return (sel = {s: 0, i: null, tiefe: 0});
    sel.s = Math.min(Math.max(sel.s, 0), S().length - 1);
    if (sel.i != null && !aufgabe()) sel = {s: sel.s, i: null, tiefe: 0};
  }
  // Ort einer Aufgabe (Objekt) suchen
  function ort(obj) {
    for (let s = 0; s < S().length; s++) {
      const l = S()[s].aufgaben || [];
      for (let i = 0; i < l.length; i++) { let a = l[i], t = 0; while (a) { if (a === obj) return {s, i, tiefe: t}; a = a.danach; t++; } }
    }
    return null;
  }

  /* ---------- Verlauf ---------- */
  const zustand = () => JSON.stringify({doc, sel});
  function merke(key) {
    if (key && key === letzterKey) return;
    letzterKey = key || null;
    rueckL.push(zustand()); if (rueckL.length > 150) rueckL.shift();
    vorL = [];
  }
  function laden(z) { const o = JSON.parse(z); doc = o.doc; sel = o.sel; chip = null; letzterKey = null; pruefSel(); alles(); }
  function rueck() { if (!rueckL.length) return; vorL.push(zustand()); laden(rueckL.pop()); }
  function vor() { if (!vorL.length) return; rueckL.push(zustand()); laden(vorL.pop()); }
  function aendern(fn) { merke(); fn(); pruefSel(); alles(); }

  /* ---------- Prüfung ---------- */
  let fehlerListe = [];
  function fehlerOrt(t) { const m = t.match(/^Schritt (\d+)(?:, Aufgabe (\d+))?/); return m ? {s: +m[1] - 1, i: m[2] ? +m[2] - 1 : null} : null; }
  function pruefen() {
    try { fehlerListe = Seite.pruefe(daten()); } catch (e) { fehlerListe = ['Prüfung nicht möglich: ' + e.message]; }
  }
  const fehlerVon = (s, i) => fehlerListe.filter(f => { const o = fehlerOrt(f); return o && o.s === s && (i === undefined || o.i === i); });

  /* ---------- Zeichnen ---------- */
  function alles() { pruefen(); leiste(); mitte(); panel(); fehlerAnzeige(); melden(); }
  function geaendert() { pruefen(); mitte(); fehlerAnzeige(); melden(); }
  let mTimer = null;
  function melden() { clearTimeout(mTimer); mTimer = setTimeout(() => cfg.geaendert && cfg.geaendert(daten()), 150); }

  function leiste() {
    if (E.leiste.childElementCount) return;
    E.leiste.innerHTML = `<button class="teil" type="button" data-baustein="schritt" title="Ziehen oder anklicken"><span class="sym">📄</span><span>Schritt / Erklärung</span></button>`
      + '<div class="leiste-trenn">Aufgaben</div>'
      + Object.keys(TYPEN).map(k => `<button class="teil" type="button" data-baustein="${k}" title="Ziehen oder anklicken"><span class="sym">${TYPEN[k].symbol}</span><span>${esc(TYPEN[k].name)}</span></button>`).join('')
      + '<p class="hinweis">Bausteine in die Mitte ziehen oder anklicken (kommt hinter die markierte Aufgabe).</p>';
  }

  function karte(s, i, a, tiefe) {
    const T = TYPEN[a.typ], f = tiefe === 0 ? fehlerVon(s, i).length : 0;
    const gew = sel.s === s && sel.i === i && sel.tiefe === tiefe;
    const kopf = `<div class="ak-kopf"><span class="sym">${T ? T.symbol : '❓'}</span><b>${tiefe ? 'danach: ' : ''}${esc(T ? T.name : 'Unbekannter Typ „' + a.typ + '“')}</b>${a.nr ? `<span class="ak-nr">${esc(a.nr)}</span>` : ''}${f ? `<span class="ak-f" title="${f} Fehler">⚠ ${f}</span>` : ''}</div>`;
    const frage = a.frage ? `<div class="ak-frage">${esc(nurText(a.frage).slice(0, 160))}</div>` : '';
    let kurz = ''; try { kurz = T ? T.kurz(a) : ''; } catch (e) {}
    let innen = kopf + frage + (kurz ? `<div class="ak-kurz">${esc(kurz)}</div>` : '');
    if (a.danach) innen += karte(s, i, a.danach, tiefe + 1);
    else innen += `<div class="danach-zone${sel.s === s && sel.i === i ? ' zeigen' : ''}" data-ziel="danach" data-s="${s}" data-i="${i}" data-tiefe="${tiefe}">＋ Folgeaufgabe (erscheint nach richtiger Lösung): Baustein hierher ziehen</div>`;
    return `<div class="akarte${tiefe ? ' akdanach' : ''}${gew ? ' gewaehlt' : ''}${f ? ' hatfehler' : ''}" ${tiefe ? '' : `data-ziel="karte" `}data-zieh="aufgabe" data-s="${s}" data-i="${i}" data-tiefe="${tiefe}">${innen}</div>`;
  }
  function mitte() {
    pruefSel();
    const reiter = S().map((x, s) => {
      const f = fehlerVon(s).length, info = !(x.aufgaben && x.aufgaben.length);
      return `<button type="button" class="reiter${s === sel.s ? ' on' : ''}${f ? ' hatfehler' : ''}" data-ziel="reiter" data-zieh="schritt" data-s="${s}" title="${esc(x.titel || '')}">${info ? '📄 ' : ''}${esc(x.kurz || String(s + 1))}</button>`;
    }).join('') + '<button type="button" class="reiter plus" data-ziel="reiterende" data-baustein-klick="schritt" title="Neuer Schritt">＋</button>';
    let inhalt;
    if (!S().length) inhalt = '<div class="leer-start" data-ziel="reiterende">Noch keine Schritte. Ziehe einen Baustein hierher – oder klicke links auf einen.</div>';
    else {
      const x = schritt(), l = x.aufgaben || [];
      const kopfGew = sel.i == null;
      inhalt = `<div class="skopf${kopfGew ? ' gewaehlt' : ''}" data-wahl="schritt">
        <div class="sk-titel"><span class="sk-nr">Schritt ${sel.s + 1}${x.kurz ? ' · ' + esc(x.kurz) : ''}</span> ${esc(nurText(x.titel || '')) || '<i class="muted">ohne Titel</i>'}</div>
        ${x.erinnerung ? `<div class="sk-erinnerung">Erinnerung: ${esc(nurText(x.erinnerung).slice(0, 120))}</div>` : ''}
        ${x.html ? `<div class="sk-html">${sauber(x.html)}</div>` : `<div class="muted sk-leer">Kein Erklärtext. Klicke hier, um einen zu schreiben.</div>`}
        ${x.material ? `<div class="sk-erinnerung">Material: ${esc(nurText(x.material).slice(0, 120))}</div>` : ''}
      </div>
      <div class="aliste">${l.map((a, i) => karte(sel.s, i, a, 0)).join('')}
        <div class="ende" data-ziel="liste" data-s="${sel.s}">${l.length ? '＋ Aufgabe hierher ziehen' : 'Aufgaben aus der Leiste hierher ziehen'}</div></div>`;
    }
    E.mitte.innerHTML = `<div class="reiterleiste">${reiter}</div><div class="schrittflaeche">${inhalt}</div>`;
  }

  function fehlerAnzeige() {
    if (!E.fehler) return;
    E.fehler.innerHTML = !fehlerListe.length ? '<div class="meldung ok">✓ Keine Fehler gefunden. Die Übung kann in die Vorschau.</div>'
      : `<div class="meldung fehler"><b>${fehlerListe.length} ${fehlerListe.length === 1 ? 'Stelle' : 'Stellen'} noch korrigieren</b> (anklicken springt hin):<ul>${fehlerListe.slice(0, 20).map((f, k) => `<li><a href="#" data-fehler="${k}">${esc(f)}</a></li>`).join('')}</ul>${fehlerListe.length > 20 ? `… und ${fehlerListe.length - 20} weitere` : ''}</div>`;
  }

  /* ---------- Formular-Helfer ---------- */
  const H = {
    esc, wert, text: nurText, zahl: zahlText,
    feld(p, label, o) {
      o = o || {};
      const v = wert(H.wurzel, p), art = o.art || 'text', id = 'f' + Math.random().toString(36).slice(2, 8);
      const da = `data-k="${esc(p)}" data-art="${art}"${o.pflicht ? ' data-pflicht="1"' : ''}${o.neu ? ' data-neu="1"' : ''} id="${id}"`;
      if (art === 'bool' || art === 'nein') {
        const an = art === 'bool' ? v === true : v === false;
        return `<label class="hk"><input type="checkbox" ${da}${an ? ' checked' : ''}> ${label}</label>`;
      }
      const lab = label ? `<label class="klein" for="${id}">${label}</label>` : '';
      const ph = o.ph ? ` placeholder="${esc(o.ph)}"` : '';
      let txt = art === 'zahl' ? zahlText(v) : art === 'liste' ? (Array.isArray(v) ? v.join(', ') : '') : art === 'zeilen' ? (Array.isArray(v) ? v.join('\n') : '') : art === 'gruppen' ? (Array.isArray(v) ? v.map(g => [].concat(g).join(', ')).join('\n') : '') : (v == null ? '' : String(v));
      if (art === 'area' || art === 'zeilen' || art === 'gruppen') return lab + `<textarea class="feld" ${da}${ph} rows="${o.zeilen || 3}">${esc(txt)}</textarea>`;
      return lab + `<input class="feld${art === 'zahl' ? ' zahl' : ''}" ${da}${ph} value="${esc(txt)}"${art === 'zahl' ? ' inputmode="decimal"' : ''}${o.titel ? ` title="${esc(o.titel)}"` : ''}>`;
    },
    rt(p, label, o) {
      o = o || {};
      return `${label ? `<label class="klein">${label}</label>` : ''}<div class="rt">
        <div class="rt-leiste">${o.knoepfe === 'kurz' ? RT_KURZ : RT_KNOEPFE}</div>
        <div class="rt-feld${o.klein ? ' klein' : ''}" contenteditable="true" data-rt="${esc(p)}"${o.pflicht ? ' data-pflicht="1"' : ''} data-ph="${esc(o.ph || '')}">${sauber(wert(H.wurzel, p))}</div></div>`;
    },
    lt(p) {
      const v = String(wert(H.wurzel, p) || '');
      const html = v.split(/\[\[(.*?)\]\]/).map((t, k) => k % 2 ? chipHTML(t) : sauberRoh(t)).join('');
      return `<div class="rt"><div class="rt-leiste">${RT_KNOEPFE}<button type="button" class="btn klein" data-lk="neu" title="Markiertes Wort zur Lücke machen">⬚ Lücke</button></div>
        <div class="rt-feld lt" contenteditable="true" data-lt="${esc(p)}">${html}</div></div>
        <p class="hinweis">Lücke: Wort <b>doppelklicken</b> oder markieren und „Lücke“ – oder tippen: <code>/Lücke(richtig, falsch, falsch)</code>. Lücken lassen sich im Text verschieben (ziehen) und per Klick bearbeiten.</p>
        <div class="lk-form"></div>`;
    },
    zeile(liste, i, inhalt) { return `<div class="lz" data-ziel="zeile" data-liste="${esc(liste)}" data-i="${i}"><span class="griff" data-zieh="zeile" title="Ziehen zum Umsortieren">⠿</span>${inhalt}</div>`; },
    knopf(tun, text, d, o) { return `<button type="button" class="btn klein${o && o.weg ? ' weg' : ''}" data-tun="${tun}"${Object.entries(d || {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('')}${o && o.titel ? ` title="${esc(o.titel)}"` : ''}>${text}</button>`; }
  };
  const RT_LISTE = [['bold', '<b>F</b>', 'Fett'], ['italic', '<i>K</i>', 'Kursiv'], ['h3', 'Ü', 'Zwischenüberschrift'], ['insertUnorderedList', '• Liste', 'Aufzählung'],
    ['tabelle', '▦', 'Tabelle einfügen'], ['bruch', '<span class="bruch"><span>a</span><span>b</span></span>', 'Bruch (Formel)'], ['removeFormat', '⌫', 'Formatierung entfernen']];
  const rtKnoepfe = l => l.map(([c, t, ti]) => `<button type="button" class="btn klein" data-cmd="${c}" title="${ti}">${t}</button>`).join('');
  const RT_KNOEPFE = rtKnoepfe(RT_LISTE);
  const RT_KURZ = rtKnoepfe(RT_LISTE.filter(([c]) => ['bold', 'italic', 'bruch', 'removeFormat'].includes(c)));   // kurze Felder, z. B. MC-Antworten
  const chipHTML = raw => { const w = String(raw).split('|').map(x => x.trim()); return `<span class="lk" contenteditable="false" data-w="${esc(w.join('|'))}" title="Lücke – klicken zum Bearbeiten">${esc(w[0] || '?')}</span>`; };
  const chipHook = n => n.classList && n.classList.contains('lk') ? '[[' + String(n.dataset.w || '').replace(/[<>\[\]]/g, '') + ']]' : null;

  /* ---------- Panel ---------- */
  function panel() {
    pruefSel(); chip = null;
    if (!S().length) { E.panel.innerHTML = '<h3>So geht’s</h3><p class="hinweis">Ziehe links einen Baustein in die Mitte. Ein Schritt ist ein Abschnitt der Übung (Knopf oben in der Übung) mit Erklärtext und Aufgaben.</p>'; return; }
    const a = aufgabe();
    if (!a) {
      const x = schritt(); H.wurzel = x;
      E.panel.innerHTML = `<h3>Schritt ${sel.s + 1}</h3>
        <div class="zeile">${H.knopf('s-links', '←', {}, {titel: 'nach vorn'})}${H.knopf('s-rechts', '→', {}, {titel: 'nach hinten'})}${H.knopf('s-kopie', 'Duplizieren')}${H.knopf('s-weg', 'Löschen', {}, {weg: true})}</div>
        ${fehlerHTML(fehlerVon(sel.s, null))}
        ${H.feld('titel', 'Titel des Schritts')}
        ${H.feld('kurz', 'Knopf-Beschriftung (kurz, z. B. 7.1)', {ph: 'automatisch: ' + (sel.s + 1)})}
        ${H.rt('html', 'Erklärtext (optional)')}
        <details${x.erinnerung || x.material ? ' open' : ''}><summary>Erinnerung und Material</summary>
        ${H.rt('erinnerung', 'Erinnerung (aufklappbar über den Aufgaben)', {klein: true})}${H.feld('erinnerungZu', 'Erinnerung startet zugeklappt', {art: 'bool'})}
        ${H.rt('material', 'Material (steht über den Aufgaben)', {klein: true})}</details>`;
      return;
    }
    const T = TYPEN[a.typ]; H.wurzel = a;
    let form = '';
    try { form = T ? T.form(a, H) : `<p class="hinweis">Diesen Typ kennt der Editor nicht. Bearbeite ihn im JSON-Modus.</p>`; } catch (e) { form = `<p class="meldung fehler">Formular nicht möglich: ${esc(e.message)}. Bitte im JSON-Modus prüfen.</p>`; }
    E.panel.innerHTML = `<h3>${T ? T.symbol + ' ' + esc(T.name) : esc(a.typ)}${sel.tiefe ? ' <small>(Folgeaufgabe)</small>' : ''}</h3>
      <div class="zeile">${sel.tiefe ? '' : H.knopf('a-hoch', '↑', {}, {titel: 'nach oben'}) + H.knopf('a-runter', '↓', {}, {titel: 'nach unten'})}${H.knopf('a-kopie', 'Duplizieren')}${H.knopf('a-weg', 'Löschen', {}, {weg: true})}</div>
      ${sel.tiefe ? '' : fehlerHTML(fehlerVon(sel.s, sel.i))}
      ${T && T.ohneFrage ? '' : H.rt('frage', 'Aufgabenstellung', {klein: true})}
      ${form}
      <details${a.nr || a.erinnerung || a.material || a.ok ? ' open' : ''}><summary>Weitere Angaben</summary>
        ${H.feld('nr', 'Nummer (z. B. 7.1)')}
        ${H.feld('ok', 'Text bei richtiger Lösung', {ph: 'Alles richtig!'})}
        ${H.rt('erinnerung', 'Erinnerung (über der Aufgabe)', {klein: true})}${H.feld('erinnerungZu', 'Erinnerung startet zugeklappt', {art: 'bool'})}
        ${H.rt('material', 'Material (über der Aufgabe)', {klein: true})}</details>`;
  }
  const fehlerHTML = f => f.length ? `<div class="meldung fehler"><ul>${f.map(x => `<li>${esc(x.replace(/^Schritt \d+(, Aufgabe \d+)?:?\s*/, ''))}</li>`).join('')}</ul></div>` : '';

  /* ---------- Einfügen, Verschieben, Löschen ---------- */
  function neueAufgabe(typ) { return TYPEN[typ].neu(); }
  function neuerSchritt(erklaerung) { return erklaerung ? {titel: 'Neuer Schritt', html: '<p>Erklärtext</p>', aufgaben: []} : {titel: 'Neuer Schritt', aufgaben: []}; }
  function klickBaustein(b) {
    aendern(() => {
      if (b === 'schritt') { const at = S().length ? sel.s + 1 : 0; S().splice(at, 0, neuerSchritt(true)); sel = {s: at, i: null, tiefe: 0}; return; }
      if (!S().length) S().push(neuerSchritt());
      const l = schritt().aufgaben || (schritt().aufgaben = []);
      const at = sel.i == null ? l.length : sel.i + 1;
      l.splice(at, 0, neueAufgabe(b)); sel = {s: sel.s, i: at, tiefe: 0};
    });
  }
  function holeAufgabe(q) {   // Aufgabe aus ihrer Stelle lösen (mit eigener Folgeaufgabe)
    if (q.tiefe === 0) return S()[q.s].aufgaben.splice(q.i, 1)[0];
    const p = kette(q.s, q.i, q.tiefe - 1), a = p.danach; delete p.danach; return a;
  }
  function ablegen(q, z) {
    if (q.art === 'neu' && q.baustein === 'schritt') {
      if (!['reiter', 'reiterende'].includes(z.art)) return;
      return aendern(() => { const at = z.art === 'reiter' ? z.s + (z.nach ? 1 : 0) : S().length; S().splice(at, 0, neuerSchritt(true)); sel = {s: at, i: null, tiefe: 0}; });
    }
    if (q.art === 'schritt') {
      if (z.art !== 'reiter' && z.art !== 'reiterende') return;
      return aendern(() => {
        const x = S()[q.s], ziel = z.art === 'reiter' ? S()[z.s] : null;
        if (x === ziel) return;
        S().splice(q.s, 1);
        const at = ziel ? S().indexOf(ziel) + (z.nach ? 1 : 0) : S().length;
        S().splice(at, 0, x); sel = {s: at, i: null, tiefe: 0};
      });
    }
    if (q.art !== 'neu' && q.art !== 'aufgabe') return;
    const quelle = q.art === 'aufgabe' ? kette(q.s, q.i, q.tiefe) : null;
    aendern(() => {
      // Ziel als Objekt merken, dann Quelle lösen, dann einfügen
      let liste, vorObj = null, nach = false, eltern = null, neuS = null;
      if (z.art === 'karte') { liste = S()[z.s].aufgaben; vorObj = liste[z.i]; nach = z.nach; }
      else if (z.art === 'liste') liste = S()[z.s].aufgaben || (S()[z.s].aufgaben = []);
      else if (z.art === 'reiter') liste = S()[z.s].aufgaben || (S()[z.s].aufgaben = []);
      else if (z.art === 'reiterende') { neuS = neuerSchritt(); S().push(neuS); liste = neuS.aufgaben; }
      else if (z.art === 'danach') {
        eltern = kette(z.s, z.i, z.tiefe);
        for (let a = quelle; a; a = a.danach) if (a === eltern) return;   // nicht in sich selbst
      } else return;
      if (quelle === vorObj && quelle) return;
      const a = quelle ? holeAufgabe(q) : neueAufgabe(q.baustein);
      if (eltern) eltern.danach = a;
      else { const at = vorObj ? liste.indexOf(vorObj) + (nach ? 1 : 0) : liste.length; liste.splice(at, 0, a); }
      sel = ort(a) || sel;
    });
  }
  const TUN = {
    's-links'() { if (sel.s > 0) aendern(() => { const x = S().splice(sel.s, 1)[0]; S().splice(--sel.s, 0, x); }); },
    's-rechts'() { if (sel.s < S().length - 1) aendern(() => { const x = S().splice(sel.s, 1)[0]; S().splice(++sel.s, 0, x); }); },
    's-kopie'() { aendern(() => { S().splice(sel.s + 1, 0, JSON.parse(JSON.stringify(schritt()))); sel.s++; }); },
    's-weg'() { const x = schritt(); if ((x.aufgaben || []).length && !confirm(`Schritt ${sel.s + 1} mit ${x.aufgaben.length} Aufgabe(n) löschen?`)) return; aendern(() => { S().splice(sel.s, 1); sel = {s: Math.max(0, sel.s - 1), i: null, tiefe: 0}; }); },
    'a-hoch'() { if (sel.i > 0) aendern(() => { const l = schritt().aufgaben, x = l.splice(sel.i, 1)[0]; l.splice(--sel.i, 0, x); }); },
    'a-runter'() { const l = schritt().aufgaben; if (sel.i < l.length - 1) aendern(() => { const x = l.splice(sel.i, 1)[0]; l.splice(++sel.i, 0, x); }); },
    'a-kopie'() { aendern(() => { const k = JSON.parse(JSON.stringify(aufgabe())); if (sel.tiefe) { const p = kette(sel.s, sel.i, sel.tiefe); k.danach = p.danach; p.danach = k; sel.tiefe++; } else { schritt().aufgaben.splice(sel.i + 1, 0, k); sel.i++; } }); },
    'a-weg'() { aendern(() => { const q = Object.assign({}, sel), a = holeAufgabe(q); if (q.tiefe && a.danach) kette(q.s, q.i, q.tiefe - 1).danach = a.danach; sel = q.tiefe ? {s: q.s, i: q.i, tiefe: q.tiefe - 1} : {s: q.s, i: null, tiefe: 0}; }); }
  };

  /* ---------- Eingaben im Panel ---------- */
  function feldWert(el) {
    const art = el.dataset.art, pfl = !!el.dataset.pflicht, v = el.value;
    if (art === 'bool') return el.checked ? [true] : [undefined, true];
    if (art === 'nein') return el.checked ? [false] : [undefined, true];
    if (art === 'zahl') { const n = zahlLesen(v); el.classList.toggle('ungueltig', v.trim() !== '' && isNaN(n)); if (isNaN(n)) return v.trim() || pfl ? null : [undefined, true]; return [n]; }
    if (art === 'gruppen') { const l = v.split('\n').map(z => z.split(',').map(x => x.trim()).filter(Boolean)).filter(g => g.length); return l.length || pfl ? [l] : [undefined, true]; }
    if (art === 'liste' || art === 'zeilen') { const l = v.split(art === 'liste' ? ',' : '\n').map(x => x.trim()).filter(Boolean); return l.length || pfl ? [l] : [undefined, true]; }
    return v === '' && !pfl ? [undefined, true] : [v];
  }
  function panelEingabe(e) {
    const t = e.target, k = t.dataset && t.dataset.k;
    if (k) { const r = feldWert(t); if (!r) return; merke('k:' + k + sel.s + sel.i); setzeWert(H.wurzel, k, r[0], r[1]); return geaendert(); }
    const rt = t.closest && t.closest('[data-rt]');
    if (rt) { merke('rt:' + rt.dataset.rt + sel.s + sel.i); const v = vonEl(rt); setzeWert(H.wurzel, rt.dataset.rt, v, v === '' && !rt.dataset.pflicht); return geaendert(); }
    const lt = t.closest && t.closest('[data-lt]');
    if (lt) { lueckeAusBefehl(lt); ltSpeichern(lt); }
  }
  function ltSpeichern(lt) { merke('lt:' + lt.dataset.lt + sel.s + sel.i); setzeWert(H.wurzel, lt.dataset.lt, vonEl(lt, chipHook)); geaendert(); }

  /* ---------- Lückentext: Chips ---------- */
  function lueckeAusBefehl(lt) {
    const w = document.createTreeWalker(lt, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const m = n.nodeValue.match(/\/l(?:ü|ue)cke\s*\(([^)]*)\)/i);
      if (!m) continue;
      const woerter = m[1].split(',').map(x => x.trim()).filter(Boolean);
      if (!woerter.length) continue;
      const rest = n.splitText(m.index); rest.nodeValue = rest.nodeValue.slice(m[0].length);
      const c = parse(chipHTML(woerter.join('|'))).firstChild;
      n.parentNode.insertBefore(c, rest);
      if (!/^\s/.test(rest.nodeValue)) rest.nodeValue = ' ' + rest.nodeValue;
      const r = document.createRange(); r.setStart(rest, 1); r.collapse(true);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      return chipWaehlen(c);
    }
  }
  function lueckeAusAuswahl(lt) {
    const s = getSelection(); if (!s.rangeCount) return;
    const r = s.getRangeAt(0);
    if (!lt.contains(r.commonAncestorContainer)) return;
    let t = r.toString();
    if (r.endContainer.nodeType === 3) while (t.endsWith(' ') && r.endOffset > 0) { r.setEnd(r.endContainer, r.endOffset - 1); t = r.toString(); }
    t = t.trim();
    if (!t || t.length > 80 || r.cloneContents().querySelector('.lk')) return;
    const c = parse(chipHTML(t)).firstChild;
    r.deleteContents(); r.insertNode(c);
    s.removeAllRanges();
    ltSpeichern(lt); chipWaehlen(c);
  }
  function chipWaehlen(c) {
    chip = c;
    E.panel.querySelectorAll('.lk.on').forEach(x => x.classList.remove('on'));
    const form = E.panel.querySelector('.lk-form'); if (!form) return;
    if (!c) { form.innerHTML = ''; return; }
    c.classList.add('on');
    const w = (c.dataset.w || '').split('|');
    form.innerHTML = `<div class="lk-box"><b>Lücke</b>
      <label class="klein">Richtiges Wort</label><input class="feld" data-lkf="r" value="${esc(w[0])}">
      <label class="klein">Falsche Antworten (mit Komma trennen)</label><input class="feld" data-lkf="f" value="${esc(w.slice(1).join(', '))}" placeholder="bei Wortbank: optional">
      <div class="zeile"><button type="button" class="btn klein" data-lk="aufloesen">Lücke auflösen (Wort bleibt)</button><button type="button" class="btn klein weg" data-lk="loeschen">Lücke löschen</button></div></div>`;
  }
  function chipForm(e) {
    if (!chip || !e.target.dataset.lkf) return;
    const box = e.target.closest('.lk-form'), r = box.querySelector('[data-lkf=r]').value.replace(/[|\[\]]/g, '').trim();
    const f = box.querySelector('[data-lkf=f]').value.split(',').map(x => x.replace(/[|\[\]]/g, '').trim()).filter(Boolean);
    chip.dataset.w = [r, ...f].join('|'); chip.textContent = r || '?';
    ltSpeichern(chip.closest('[data-lt]'));
  }

  /* ---------- Ziehen und Ablegen ---------- */
  let zug = null, zieht = false;
  function zielVon(x, y, q) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    if (q.art === 'chip') { const lt = el.closest('[data-lt]'); return lt === q.lt ? {art: 'text', el: lt} : null; }
    const z = el.closest('[data-ziel]');
    if (!z) return null;
    const d = z.dataset, r = z.getBoundingClientRect(), art = d.ziel;
    const o = {art, el: z, s: +d.s, i: +d.i, tiefe: +d.tiefe, liste: d.liste, f: d.f};
    o.nach = art === 'reiter' ? x > r.left + r.width / 2 : y > r.top + r.height / 2;
    if (q.art === 'zeile') return art === 'zeile' && d.liste === q.liste ? o : null;
    if (q.art === 'karte') return art === 'zspalte' ? o : null;
    if (q.art === 'schritt' || (q.art === 'neu' && q.baustein === 'schritt')) return art === 'reiter' || art === 'reiterende' ? o : null;
    return ['karte', 'liste', 'reiter', 'reiterende', 'danach'].includes(art) ? o : null;
  }
  function markiere(z) {
    document.querySelectorAll('.z-vor,.z-nach,.z-in').forEach(x => x.classList.remove('z-vor', 'z-nach', 'z-in'));
    if (!z || z.art === 'text') return;
    const zwischen = ['karte', 'zeile'].includes(z.art) || (z.art === 'reiter' && zug && (zug.q.art === 'schritt' || zug.q.baustein === 'schritt'));
    z.el.classList.add(zwischen ? (z.nach ? 'z-nach' : 'z-vor') : 'z-in');
  }
  function start(e) {
    if (e.button > 0) return;
    const t = e.target;
    if (t.closest('input,textarea,select,[contenteditable=true]') && !t.closest('.lk')) return;
    let q = null, label = '';
    const b = t.closest('[data-baustein]'), lk = t.closest('.lk'), g = t.closest('[data-zieh]');
    if (b) { q = {art: 'neu', baustein: b.dataset.baustein}; label = b.textContent.trim(); }
    else if (lk) { q = {art: 'chip', el: lk, lt: lk.closest('[data-lt]')}; label = lk.textContent; }
    else if (g) {
      const art = g.dataset.zieh;
      if (art === 'aufgabe') { const k = g.closest('.akarte'); q = {art, s: +k.dataset.s, i: +k.dataset.i, tiefe: +k.dataset.tiefe}; label = k.querySelector('.ak-kopf').textContent; }
      else if (art === 'schritt') { q = {art, s: +g.dataset.s}; label = 'Schritt ' + g.textContent; }
      else if (art === 'zeile') { const z = g.closest('.lz'); q = {art, liste: z.dataset.liste, i: +z.dataset.i}; label = '⠿ Zeile ' + (+z.dataset.i + 1); }
      else if (art === 'karte') { const k = g.closest('.zkarte'), f = k && k.querySelector('input'); q = {art, i: +g.dataset.i}; label = (f && f.value) || 'Karte'; }
    }
    if (!q) return;
    zug = {q, label, x: e.clientX, y: e.clientY, geist: null, ziel: null};
  }
  function bewege(e) {
    if (!zug) return;
    if (!zug.geist) {
      if (Math.hypot(e.clientX - zug.x, e.clientY - zug.y) < 6) return;
      zug.geist = document.createElement('div'); zug.geist.className = 'geist'; zug.geist.textContent = zug.label.slice(0, 50);
      document.body.appendChild(zug.geist); document.body.classList.add('bk-zieht'); zieht = true;
      if (zug.q.art === 'chip') zug.q.el.classList.add('quelle');
    }
    e.preventDefault();
    zug.geist.style.left = e.clientX + 'px'; zug.geist.style.top = e.clientY + 'px';
    zug.ziel = zielVon(e.clientX, e.clientY, zug.q);
    zug.geist.classList.toggle('nein', !zug.ziel);
    markiere(zug.ziel);
  }
  function ende(e) {
    if (!zug) return;
    const z = zug; zug = null;
    if (!z.geist) return;
    z.geist.remove(); document.body.classList.remove('bk-zieht'); markiere(null);
    if (z.q.el) z.q.el.classList.remove('quelle');
    setTimeout(() => { zieht = false; }, 0);
    const ziel = e.type === 'pointerup' ? zielVon(e.clientX, e.clientY, z.q) : null;
    if (!ziel) return;
    if (z.q.art === 'chip') return chipVerschieben(z.q, e);
    if (z.q.art === 'zeile') return zeileVerschieben(z.q.liste, z.q.i, ziel.i + (ziel.nach ? 1 : 0));
    if (z.q.art === 'karte') return aendern(() => { H.wurzel.karten[z.q.i].z = ziel.f; });
    ablegen(z.q, ziel);
  }
  function chipVerschieben(q, e) {
    let r = null;
    if (document.caretRangeFromPoint) r = document.caretRangeFromPoint(e.clientX, e.clientY);
    else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(e.clientX, e.clientY); if (p) { r = document.createRange(); r.setStart(p.offsetNode, p.offset); } }
    if (!r || !q.lt.contains(r.startContainer) || q.el.contains(r.startContainer)) return;
    r.insertNode(q.el);
    ltSpeichern(q.lt); chipWaehlen(q.el);
  }
  function zeileVerschieben(liste, von, nach) {
    const a = H.wurzel, T = TYPEN[a.typ];
    if (nach === von || nach === von + 1) return;
    aendern(() => {
      if (T && T.verschiebe && T.verschiebe(a, liste, von, nach)) return;
      const l = wert(a, liste); if (!Array.isArray(l)) return;
      const x = l.splice(von, 1)[0]; l.splice(nach > von ? nach - 1 : nach, 0, x);
    });
  }

  /* ---------- Ereignisse ---------- */
  function klickMitte(e) {
    if (zieht) return;
    const t = e.target;
    const plus = t.closest('[data-baustein-klick]'); if (plus) return klickBaustein('schritt');
    const r = t.closest('.reiter[data-s]'); if (r) { sel = {s: +r.dataset.s, i: null, tiefe: 0}; mitte(); return panel(); }
    const k = t.closest('.akarte'); if (k) { sel = {s: +k.dataset.s, i: +k.dataset.i, tiefe: +k.dataset.tiefe}; mitte(); return panel(); }
    if (t.closest('[data-wahl=schritt]')) { sel.i = null; sel.tiefe = 0; mitte(); return panel(); }
  }
  function klickPanel(e) {
    const t = e.target;
    const tun = t.closest('[data-tun]');
    if (tun) {
      const n = tun.dataset.tun;
      if (TUN[n]) return TUN[n]();
      const T = TYPEN[(aufgabe() || {}).typ];
      if (T && T.tun && T.tun[n]) return aendern(() => T.tun[n](aufgabe(), tun.dataset, H));
    }
    const lk = t.closest('.lk'); if (lk && !zieht) return chipWaehlen(lk);
    const lkk = t.closest('[data-lk]');
    if (lkk) {
      const lt = E.panel.querySelector('[data-lt]');
      if (lkk.dataset.lk === 'neu') return lueckeAusAuswahl(lt);
      if (!chip) return;
      if (lkk.dataset.lk === 'aufloesen') chip.replaceWith(document.createTextNode(chip.textContent));
      if (lkk.dataset.lk === 'loeschen') chip.remove();
      chip = null; ltSpeichern(lt); chipWaehlen(null);
    }
  }
  function befehl(e) {
    const b = e.target.closest('[data-cmd]'); if (!b) return;
    e.preventDefault();
    const feld = b.closest('.rt').querySelector('[contenteditable=true]');
    if (document.activeElement !== feld && !feld.contains(document.activeElement)) feld.focus();
    const c = b.dataset.cmd;
    if (c === 'h3') document.execCommand('formatBlock', false, 'h3');
    else if (c === 'tabelle') document.execCommand('insertHTML', false, '<table><tr><th>Spalte 1</th><th>Spalte 2</th></tr><tr><td>…</td><td>…</td></tr></table><p></p>');
    else if (c === 'bruch') bruchEinfuegen(feld);
    else document.execCommand(c, false, null);
    feld.dispatchEvent(new Event('input', {bubbles: true}));
  }
  // Bruch per DOM einfügen: execCommand('insertHTML') fasst in Chrome die leeren inneren <span> zusammen („ZählerNenner“)
  function bruchEinfuegen(feld) {
    const s = getSelection(), r = s.rangeCount && feld.contains(s.anchorNode) ? s.getRangeAt(0) : null;
    const br = document.createElement('span'), nach = document.createTextNode('\u00a0');
    br.className = 'bruch'; br.innerHTML = '<span>Zähler</span><span>Nenner</span>';
    if (r) { r.deleteContents(); r.insertNode(nach); r.insertNode(br); } else feld.append(br, nach);
    const z = document.createRange(); z.selectNodeContents(br.firstChild); s.removeAllRanges(); s.addRange(z);   // Zähler gleich überschreiben
  }
  function einfuegen(e) {
    const f = e.target.closest && e.target.closest('[data-rt],[data-lt]'); if (!f) return;
    e.preventDefault();
    const d = e.clipboardData, html = d.getData('text/html');
    const clean = html ? sauber(html.replace(/<!--[\s\S]*?-->/g, '')) : esc(d.getData('text/plain')).replace(/\n/g, '<br>');
    document.execCommand('insertHTML', false, clean);
  }
  function tasten(e) {
    if (!E.mitte || !E.mitte.offsetParent) return;
    const inFeld = e.target.closest && e.target.closest('input,textarea,select,[contenteditable=true]');
    if ((e.ctrlKey || e.metaKey) && !inFeld) {
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); return rueck(); }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); return vor(); }
    }
    if (!inFeld && (e.key === 'Delete') && aufgabe()) { e.preventDefault(); TUN['a-weg'](); }
    if (e.target.closest && e.target.closest('[data-lt]') && e.key === 'Enter') { e.preventDefault(); document.execCommand('insertLineBreak'); }
  }

  function start2(c) {
    cfg = c; E = {leiste: c.leiste, mitte: c.mitte, panel: c.panel, fehler: c.fehler};
    E.leiste.addEventListener('click', e => { const b = e.target.closest('[data-baustein]'); if (b && !zieht) klickBaustein(b.dataset.baustein); });
    E.mitte.addEventListener('click', klickMitte);
    E.panel.addEventListener('click', klickPanel);
    E.panel.addEventListener('input', e => { if (e.target.dataset && e.target.dataset.lkf) return chipForm(e); panelEingabe(e); });
    E.panel.addEventListener('change', e => { if (e.target.type === 'checkbox' && e.target.dataset.k) panelEingabe(e); if (e.target.dataset.neu) panel(); });
    E.panel.addEventListener('focusout', () => { letzterKey = null; });
    E.panel.addEventListener('mousedown', befehl);
    E.panel.addEventListener('dblclick', e => { const lt = e.target.closest('[data-lt]'); if (lt && !e.target.closest('.lk')) setTimeout(() => lueckeAusAuswahl(lt), 0); });
    E.panel.addEventListener('paste', einfuegen);
    if (E.fehler) E.fehler.addEventListener('click', e => {
      const a = e.target.closest('[data-fehler]'); if (!a) return;
      e.preventDefault();
      const o = fehlerOrt(fehlerListe[+a.dataset.fehler]); if (!o) return;
      sel = {s: o.s, i: o.i, tiefe: 0}; pruefSel(); mitte(); panel();
      E.mitte.scrollIntoView({behavior: 'smooth', block: 'start'});
    });
    document.addEventListener('pointerdown', start);
    document.addEventListener('pointermove', bewege, {passive: false});
    document.addEventListener('pointerup', ende);
    document.addEventListener('pointercancel', ende);
    document.addEventListener('keydown', tasten);
    alles();
  }
  function setze(d) { doc = normal(d); sel = {s: 0, i: null, tiefe: 0}; rueckL = []; vorL = []; letzterKey = null; if (E.mitte) alles(); }
  function daten() {
    const d = JSON.parse(JSON.stringify(doc));
    if (!d.kurztext) delete d.kurztext;
    return d;
  }
  // Titel und Kurztext kommen aus der Kopfzeile der Seite
  function kopf(k, v) { merke('kopf:' + k); if (v) doc[k] = v; else if (k === 'titel') doc.titel = ''; else delete doc[k]; geaendert(); }

  window.Baukasten = {start: start2, setze, daten, rueck, vor, kopf, sauber, fehler: () => fehlerListe, kannRueck: () => rueckL.length > 0, kannVor: () => vorL.length > 0,
    typ(name, def) { TYPEN[name] = def; }, TYPEN, zahlLesen};
})();
