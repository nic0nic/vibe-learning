/* vorlage-training.js – Formular für Training-Schritte im Baukasten (vorlage-editor.js), Format: lib/seite.js
 *
 * Baukasten.training = {neu(), kurz(t), form(x, H), tun:{…}}   x = Schritt mit x.training
 * Schalter Zeit / Endlos / Multiple Choice / Mehrere Versuche; Stufen als Reiter; je Stufe Zahlen-Szenarien
 * (Werte als Text: „a: 1 bis 10“, „b: 0,5 bis 5 in Schritten von 0,5“, „c: 2 | 5 | 10“, „d = a * b“)
 * oder ein Wörterbuch (Textfeld „house = Haus | Gebäude“, Import aus CSV/Excel/Quizlet/Anki, Export als CSV).
 * „🎲 Beispiele“ würfelt Probeaufgaben (lib/formel.js). Braucht window.Formel und vorlage-editor.js.
 */
(function () {
  'use strict';
  const B = window.Baukasten;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const zt = n => String(n).replace('.', ',');
  const zl = s => { s = String(s).trim().replace(/\s/g, ''); if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); return /^-?\d+(\.\d+)?$/.test(s) ? +s : NaN; };
  let uiStufe = 0, proben = '';   // gewählte Stufe im Formular, zuletzt gewürfelte Beispiele

  /* ---------- Werte als Text ---------- */
  function werteText(w) {
    return Object.keys(w || {}).map(k => {
      const v = w[k];
      if (Array.isArray(v)) return `${k}: ${zt(v[0])} bis ${zt(v[1])}` + (v[2] != null && v[2] !== 1 ? ` in Schritten von ${zt(v[2])}` : '');
      if (v && v.aus) return `${k}: ${v.aus.map(zt).join(' | ')}`;
      return `${k} = ${v}`;
    }).join('\n');
  }
  // → {werte, fehler:[…]}
  function werteAus(text) {
    const werte = {}, fehler = [], Z = String.raw`-?\d+(?:[.,]\d+)?`;
    String(text || '').split(/\n|;/).map(z => z.trim()).filter(Boolean).forEach(z => {
      const m = z.match(/^([A-Za-zÄÖÜäöüß_][\wÄÖÜäöüß]*)\s*([:=])\s*(.+)$/);
      if (!m) return fehler.push(`„${z}“: so schreiben: a: 1 bis 10 – oder c = a * b`);
      const [, k, art, rest] = m;
      let r;
      if (art === ':' && (r = rest.match(new RegExp(`^(${Z})\\s*(?:bis|–|—|\\.\\.|-)\\s*(${Z})(?:\\s*(?:in Schritten von|Schritt|\\()\\s*(${Z})\\)?)?$`, 'i')))) {
        werte[k] = [zl(r[1]), zl(r[2])]; if (r[3] && zl(r[3]) !== 1) werte[k].push(zl(r[3]));
      } else if (art === ':' && new RegExp(`^${Z}(\\s*\\|\\s*${Z})*$`).test(rest)) werte[k] = {aus: rest.split('|').map(zl)};
      else if (art === ':' && /\d/.test(rest) && !/[a-z]/i.test(rest.replace(/bis|in|schritten|von|schritt/gi, ''))) fehler.push(`„${z}“: Bereich als „1 bis 10“, Liste als „2 | 5 | 10“`);
      else werte[k] = rest.trim();
    });
    return {werte, fehler};
  }

  /* ---------- Vokabellisten lesen (Tab, ;, ',', „ = “, „ - “) ---------- */
  const KOPF = /^(englisch|deutsch|französisch|franzoesisch|spanisch|italienisch|latein|türkisch|russisch|polnisch|english|german|french|spanish|italian|latin|begriff|bedeutung|wort|wörter|vokabel|vokabeln|übersetzung|term|definition|front|back|vorderseite|rückseite|fremdsprache|muttersprache)$/i;
  function csvZeile(z, sep) {   // eine Zeile mit Anführungszeichen ("a;b"; "say ""hi""")
    const out = []; let f = '', q = false;
    for (let i = 0; i < z.length; i++) {
      const c = z[i];
      if (q) { if (c === '"') { if (z[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"' && !f.trim()) q = true;
      else if (z.startsWith(sep, i)) { out.push(f); f = ''; i += sep.length - 1; }
      else f += c;
    }
    out.push(f); return out;
  }
  function vokabelnLesen(text) {
    const zeilen = String(text || '').replace(/^﻿/, '').split(/\r?\n/).map(z => z.replace(/<[^>]+>/g, '').trimEnd()).filter(z => z.trim() && !/^#/.test(z));
    const anteil = s => zeilen.filter(z => z.includes(s)).length / Math.max(1, zeilen.length);
    const sep = anteil('\t') > 0.6 ? '\t' : anteil(';') > 0.6 ? ';' : anteil(' = ') > 0.6 ? ' = ' : anteil('=') > 0.6 ? '=' : anteil(',') > 0.6 ? ',' : anteil(' – ') > 0.6 ? ' – ' : anteil(' - ') > 0.6 ? ' - ' : anteil(':') > 0.6 ? ':' : null;
    const SEPNAME = {'\t': 'Tabulator (Excel, Quizlet, Anki)', ';': 'Semikolon (CSV)', ',': 'Komma (CSV)', ' = ': '„ = “', '=': '„=“', ' – ': '„ – “', ' - ': '„ - “', ':': '„:“'};
    if (!sep) return {eintraege: [], sep: null, info: 'Kein Trennzeichen erkannt. Eine Vokabel pro Zeile, zwei Spalten: getrennt mit Tab, ; , oder =.'};
    const alt = s => s.split(new RegExp(`\\s*(?:\\|${sep === ';' ? '' : '|;'}|\\s/\\s)\\s*`)).map(x => x.trim()).filter(Boolean).join('|');
    let reihen = zeilen.map(z => (sep === ';' || sep === ',' ? csvZeile(z, sep) : z.split(sep)).map(x => x.trim()));
    reihen = reihen.map(r => r.filter(x => x !== '')).filter(r => r.length >= 2);
    let sprachen = null, kopf = false;
    if (reihen.length > 1 && KOPF.test(reihen[0][0]) && KOPF.test(reihen[0][1])) {
      kopf = true; const [a, b] = reihen.shift();
      if (!/^(term|definition|front|back|begriff|bedeutung|wort|vorderseite|rückseite)$/i.test(a)) sprachen = [a, b];
    }
    const eintraege = reihen.map(r => [alt(r[0]), alt(r.slice(1).join(sep === ',' ? ', ' : ' '))]).filter(e => e[0] && e[1]);
    return {eintraege, sprachen, sep, info: `Trennzeichen: ${SEPNAME[sep]}${kopf ? ', erste Zeile als Überschrift erkannt' : ''} · ${eintraege.length} Vokabel${eintraege.length === 1 ? "" : "n"}`};
  }
  const woerterText = E => (E || []).map(e => `${String(e[0]).split('|').join(' | ')} = ${String(e[1]).split('|').join(' | ')}`).join('\n');
  async function dateiText(file) {
    const buf = await file.arrayBuffer();
    try { return new TextDecoder('utf-8', {fatal: true}).decode(buf); } catch (e) { return new TextDecoder('windows-1252').decode(buf); }
  }

  /* ---------- Pfade ---------- */
  const stufenVon = t => Array.isArray(t.stufen) && t.stufen.length ? t.stufen : null;
  const stufeObj = t => { const s = stufenVon(t); uiStufe = s ? Math.min(uiStufe, s.length - 1) : 0; return s ? s[uiStufe] : t; };
  const pfad = t => stufenVon(t) ? `training.stufen.${uiStufe}` : 'training';
  function setze(o, p, v) { const t = p.split('.'), l = t.pop(); const z = t.reduce((x, k) => x[k] == null ? (x[k] = {}) : x[k], o); z[l] = v; }
  function holen(o, p) { return p.split('.').reduce((x, k) => x == null ? x : x[k], o); }

  /* ---------- Beispiele würfeln ---------- */
  function wuerfeln(t) {
    const st = stufeObj(t);
    if (st.woerterbuch) {
      const E = (st.woerterbuch.eintraege || []).slice(0, 200), r = st.woerterbuch.richtung;
      if (!E.length) return '<p class="hinweis warn">Noch keine Vokabeln.</p>';
      return '<ul>' + Array.from({length: Math.min(5, E.length)}, () => E[Math.floor(Math.random() * E.length)]).map(e => {
        const um = r === 'b-a' || (r === 'beide' && Math.random() < 0.5);
        return `<li>${esc(String(e[um ? 1 : 0]).split('|').join(' / '))} → <b>${esc(String(e[um ? 0 : 1]).split('|').join(' / '))}</b></li>`;
      }).join('') + '</ul>';
    }
    const S = (st.szenarien || []).filter(Boolean); if (!S.length) return '<p class="hinweis warn">Noch keine Szenarien.</p>';
    const out = [];
    for (let i = 0; i < 5; i++) {
      const sz = S[i % S.length];
      try { const w = Formel.wuerfle(sz); out.push(`<li>${w.frage} <b>${esc(Formel.zahlText(w.loesung))}${sz.einheit ? ' ' + esc(sz.einheit) : ''}</b>${w.falsch.length ? ` <span class="hinweis">(falsch: ${w.falsch.map(Formel.zahlText).join(', ')})</span>` : ''}</li>`); }
      catch (e) { out.push(`<li class="warn">Szenario ${i % S.length + 1}: ${esc(e.message)}</li>`); }
    }
    return '<ul>' + out.join('') + '</ul>';
  }

  /* ---------- Formular ---------- */
  const schalter = (tun, an, text, titel) => `<label class="schalter" title="${esc(titel)}"><input type="checkbox" data-tun="${tun}"${an ? ' checked' : ''}><span></span> ${text}</label>`;
  const knopf = (tun, text, d, titel) => `<button type="button" class="btn klein" data-tun="${tun}"${Object.entries(d || {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('')}${titel ? ` title="${esc(titel)}"` : ''}>${text}</button>`;
  function form(x, H) {
    const t = x.training, st = stufeObj(t), P = pfad(t), S = stufenVon(t), wb = !!st.woerterbuch;
    let h = `<div class="schalterleiste">
        ${schalter('trZeit', !!t.zeit, 'Zeit', 'Ein Balken läuft ab – danach kommt die nächste Aufgabe')}
        ${schalter('trEndlos', !t.anzahl, 'Endlos', 'Ohne feste Anzahl: ein Fehler beendet die Serie, gezählt wird die Bestleistung')}
        ${schalter('trMc', t.antwort === 'mc', 'Multiple Choice', 'Vier Antworten zur Auswahl statt eintippen (falsche Antworten werden automatisch erzeugt)')}
        ${schalter('trVersuche', !!t.versuche, 'Mehrere Versuche', 'Bei einem Fehler darf man es nochmal versuchen (solange Zeit ist)')}</div>`;
    if (t.zeit) h += `<div class="tr-reihe">${H.feld('training.zeit.start', 'Sekunden am Anfang', {art: 'zahl', pflicht: true})}${H.feld('training.zeit.schritt', 'je richtiger Antwort (z. B. −0,1)', {art: 'zahl', ph: '0'})}${H.feld('training.zeit.min', 'mindestens (Sekunden)', {art: 'zahl', ph: '0,5'})}</div>`;
    h += `<div class="tr-reihe">${t.anzahl ? H.feld('training.anzahl', 'Aufgaben pro Runde', {art: 'zahl', pflicht: true}) : ''}${H.feld('training.ziel', 'Schritt erledigt ab … richtigen', {art: 'zahl', ph: t.anzahl ? 'Runde beendet' : '10'})}</div>`;
    // Stufen
    h += `<label class="klein">Stufen ${S ? '' : '(eine Stufe – weitere z. B. für Zahlenraum 10 / 20 / 100)'}</label><div class="tr-stufen">${S ? S.map((s, i) => `<button type="button" class="btn klein${i === uiStufe ? ' on' : ''}" data-tun="trStufe" data-i="${i}">${i + 1}${s.name ? ' · ' + esc(s.name) : ''}</button>`).join('') : ''}${knopf('trStufePlus', '＋ Stufe')}</div>`;
    if (S) h += `<div class="tr-reihe">${H.feld(`${P}.name`, 'Name der Stufe', {ph: 'z. B. bis 20'})}<span class="tr-knoepfe">${knopf('trStufeVor', '←', {}, 'Stufe nach vorn')}${knopf('trStufeNach', '→', {}, 'Stufe nach hinten')}${S.length > 1 ? knopf('trStufeWeg', '✕ Stufe löschen') : ''}</span></div>`;
    h += `<div class="seg tr-art">${knopf('trArt', '🔢 Zahlen (Szenarien)', {art: 'zahlen'})}${knopf('trArt', '🔤 Wörterbuch (Vokabeln)', {art: 'woerter'})}</div>`.replace(`data-art="${wb ? 'woerter' : 'zahlen'}"`, `data-art="${wb ? 'woerter' : 'zahlen'}" aria-pressed="true"`);
    if (!wb) {
      const L = st.szenarien || [];
      h += L.map((sz, i) => {
        const p = `${P}.szenarien.${i}`;
        return `<div class="tr-szenario"><div class="tr-kopf"><b>Szenario ${i + 1}</b><span>${knopf('trSzKopie', 'Duplizieren', {i})}${knopf('trSzWeg', '✕', {i}, 'Szenario löschen')}</span></div>
          ${H.feld(`${p}.frage`, 'Aufgabe – Werte in {…}', {pflicht: true, ph: '{a} + {b} ='})}
          <label class="klein">Werte (eine Zeile je Wert)</label><textarea class="feld tr-werte" rows="3" data-trpfad="${p}.werte" spellcheck="false" placeholder="a: 1 bis 10&#10;b: 1 bis 10">${esc(werteText(sz.werte))}</textarea><p class="hinweis warn tr-wf"></p>
          <div class="tr-reihe">${H.feld(`${p}.loesung`, 'Lösung (Formel)', {pflicht: true, ph: 'a + b'})}${H.feld(`${p}.bedingung`, 'Bedingung (optional)', {ph: 'b <= a'})}</div>
          <div class="tr-reihe">${H.feld(`${p}.runden`, 'Nachkommastellen', {art: 'zahl', ph: 'auto'})}${H.feld(`${p}.einheit`, 'Einheit', {ph: 'z. B. €'})}</div>
          ${t.antwort === 'mc' ? H.feld(`${p}.falsch`, 'Typische falsche Antworten (optional, je Zeile eine Formel)', {art: 'zeilen', zeilen: 2, ph: 'a - b'}) : ''}</div>`;
      }).join('') + `${knopf('trSzPlus', '＋ Szenario')}
        <p class="hinweis">Werte: <code>a: 1 bis 10</code>, <code>b: 0,5 bis 5 in Schritten von 0,5</code>, <code>c: 2 | 5 | 10</code>, <code>d = a * b</code> (aus anderen Werten). Formeln: <code>+ - * / ( )</code>, <code>^</code>, <code>runden(x, 2)</code>, Kommazahlen mit Punkt (<code>2.5</code>). Bedingung z. B. <code>b &lt;= a</code> oder <code>a + b &lt;= 20</code>.</p>`;
    } else {
      const W = st.woerterbuch, E = W.eintraege || [];
      h += `<div class="tr-reihe">${H.feld(`${P}.woerterbuch.sprachen.0`, 'Sprache links', {ph: 'Englisch'})}${H.feld(`${P}.woerterbuch.sprachen.1`, 'Sprache rechts', {ph: 'Deutsch'})}</div>
        <label class="klein">Abfrage</label><div class="seg">${[['a-b', `${esc((W.sprachen || [])[0] || 'links')} → ${esc((W.sprachen || [])[1] || 'rechts')}`], ['b-a', `${esc((W.sprachen || [])[1] || 'rechts')} → ${esc((W.sprachen || [])[0] || 'links')}`], ['beide', 'beide Richtungen']].map(([r, txt]) => `<button type="button" class="btn klein" data-tun="trRichtung" data-r="${r}"${(W.richtung || 'a-b') === r ? ' aria-pressed="true"' : ''}>${txt}</button>`).join('')}</div>
        <div class="schalterleiste">${schalter('trTipp', !!W.tippfehler, 'Tippfehler zählen als richtig', 'Sonst gilt eine fast richtige Antwort als Fehler (die Schreibweise wird gezeigt)')}</div>
        <label class="klein">Vokabeln (${E.length}) – je Zeile <code>links = rechts</code>, mehrere richtige Antworten mit <code>|</code></label>
        <textarea class="feld tr-woerter" rows="8" data-trpfad="${P}.woerterbuch.eintraege" spellcheck="false" placeholder="house = Haus | Gebäude&#10;to go = gehen">${esc(woerterText(E))}</textarea>
        <div class="reihe wrap"><button type="button" class="btn klein" data-trimport="1">📥 Vokabelliste importieren …</button>${E.length ? '<button type="button" class="btn klein" data-trexport="1">📤 Als CSV speichern</button>' : ''}</div>`;
    }
    h += `<div class="reihe wrap tr-proben-kopf"><button type="button" class="btn klein" data-trwuerfeln="1">🎲 5 Beispiele würfeln</button></div><div class="tr-proben">${proben}</div>`;
    proben = '';
    return h;
  }

  /* ---------- Knöpfe (laufen über aendern: Rückgängig, neu zeichnen) ---------- */
  const tun = {
    trZeit(x) { const t = x.training; if (t.zeit) delete t.zeit; else t.zeit = {start: 5, schritt: -0.1, min: 1.5}; },
    trEndlos(x) { const t = x.training; if (t.anzahl) delete t.anzahl; else t.anzahl = 20; },
    trMc(x) { const t = x.training; if (t.antwort === 'mc') t.antwort = 'eingabe'; else t.antwort = 'mc'; },
    trVersuche(x) { const t = x.training; if (t.versuche) delete t.versuche; else t.versuche = true; },
    trStufe(x, d) { uiStufe = +d.i; },
    trStufePlus(x) {
      const t = x.training;
      if (!stufenVon(t)) { const erste = {name: 'Stufe 1'}; ['szenarien', 'woerterbuch'].forEach(k => { if (t[k]) { erste[k] = t[k]; delete t[k]; } }); t.stufen = [erste]; }
      const vorbild = JSON.parse(JSON.stringify(t.stufen[uiStufe] || t.stufen[0]));
      vorbild.name = 'Stufe ' + (t.stufen.length + 1); t.stufen.push(vorbild); uiStufe = t.stufen.length - 1;
    },
    trStufeWeg(x) {
      const t = x.training; if (!confirm(`Stufe ${uiStufe + 1} löschen?`)) return;
      t.stufen.splice(uiStufe, 1); uiStufe = Math.max(0, uiStufe - 1);
      if (t.stufen.length === 1 && /^Stufe 1$/.test(t.stufen[0].name || '')) { const s = t.stufen[0]; delete t.stufen; ['szenarien', 'woerterbuch'].forEach(k => { if (s[k]) t[k] = s[k]; }); }
    },
    trStufeVor(x) { const s = x.training.stufen; if (uiStufe > 0) { [s[uiStufe - 1], s[uiStufe]] = [s[uiStufe], s[uiStufe - 1]]; uiStufe--; } },
    trStufeNach(x) { const s = x.training.stufen; if (uiStufe < s.length - 1) { [s[uiStufe + 1], s[uiStufe]] = [s[uiStufe], s[uiStufe + 1]]; uiStufe++; } },
    trArt(x, d) {
      const st = stufeObj(x.training), wb = !!st.woerterbuch;
      if ((d.art === 'woerter') === wb) return;
      const voll = wb ? (st.woerterbuch.eintraege || []).length : (st.szenarien || []).length;
      if (voll && !confirm('Die bisherigen ' + (wb ? 'Vokabeln' : 'Szenarien') + ' dieser Stufe werden ersetzt. Weiter?')) return;
      if (d.art === 'woerter') { delete st.szenarien; st.woerterbuch = {sprachen: ['Englisch', 'Deutsch'], richtung: 'a-b', eintraege: [['house', 'Haus'], ['dog', 'Hund'], ['cat', 'Katze'], ['tree', 'Baum']]}; }
      else { delete st.woerterbuch; st.szenarien = [neuSzenario()]; }
    },
    trSzPlus(x) { const st = stufeObj(x.training); (st.szenarien = st.szenarien || []).push(neuSzenario()); },
    trSzWeg(x, d) { stufeObj(x.training).szenarien.splice(+d.i, 1); },
    trSzKopie(x, d) { const L = stufeObj(x.training).szenarien; L.splice(+d.i + 1, 0, JSON.parse(JSON.stringify(L[+d.i]))); },
    trRichtung(x, d) { stufeObj(x.training).woerterbuch.richtung = d.r; },
    trTipp(x) { const W = stufeObj(x.training).woerterbuch; if (W.tippfehler) delete W.tippfehler; else W.tippfehler = true; }
  };
  const neuSzenario = () => ({frage: '{a} + {b} =', werte: {a: [1, 10], b: [1, 10]}, loesung: 'a + b'});

  /* ---------- Textfelder Werte/Vokabeln: beim Verlassen übernehmen ---------- */
  document.addEventListener('change', e => {
    const ta = e.target.closest && e.target.closest('[data-trpfad]'); if (!ta) return;
    const p = ta.dataset.trpfad;
    if (ta.classList.contains('tr-werte')) {   // nur übernehmen, wenn alle Zeilen lesbar sind – sonst Hinweis, Text bleibt stehen
      const r = werteAus(ta.value), wf = ta.nextElementSibling;
      if (r.fehler.length) { if (wf) wf.innerHTML = r.fehler.map(esc).join('<br>'); return; }
      if (ta.nextElementSibling) ta.nextElementSibling.innerHTML = '';
      return B.aendereSchrittStill(x => setze(x, p, r.werte));
    }
    const v = vokabelnLesen(ta.value);
    if (ta.value.trim() && !v.eintraege.length) { const lb = ta.previousElementSibling; if (lb) lb.innerHTML = `<span class="warn">${esc(v.info)}</span>`; return; }
    B.aendereSchrittStill(x => setze(x, p, v.eintraege));
    const lb = ta.previousElementSibling; if (lb) lb.innerHTML = `Vokabeln (${v.eintraege.length}) – je Zeile <code>links = rechts</code>, mehrere richtige Antworten mit <code>|</code>`;
  });
  document.addEventListener('click', e => {
    if (e.target.closest('[data-trwuerfeln]')) { const x = B.schritt(); if (x && x.training) { const el = document.querySelector('.tr-proben'); if (el) el.innerHTML = wuerfeln(x.training); } return; }
    if (e.target.closest('[data-trimport]')) return importDialog();
    if (e.target.closest('[data-trexport]')) return csvExport();
  });

  /* ---------- Import (Datei oder eingefügter Text) ---------- */
  function importDialog() {
    const d = document.createElement('dialog'); d.className = 'tr-dialog';
    d.innerHTML = `<div class="kp-oben"><b>Vokabelliste importieren</b><span class="kp-zahl"></span><button type="button" class="btn" data-x="zu">Abbrechen</button></div>
      <div class="tr-dinnen">
        <p class="hinweis">Eine Vokabel pro Zeile, zwei Spalten. Geht direkt aus Excel oder Google Tabellen (kopieren und einfügen), als CSV-Datei (; oder ,), als Quizlet- oder Anki-Export (Text, Tab-getrennt) oder als Zeilen „house = Haus“. Mehrere richtige Antworten in einer Zelle mit | oder ;.</p>
        <div class="reihe wrap"><label class="btn klein">📄 Datei wählen …<input type="file" accept=".csv,.tsv,.txt,text/plain,text/csv" hidden></label><span class="hinweis tr-datei"></span></div>
        <textarea class="feld tr-roh" rows="7" spellcheck="false" placeholder="house&#9;Haus&#10;dog&#9;Hund&#10;… hier einfügen (Strg+V)"></textarea>
        <p class="tr-info hinweis"></p>
        <div class="tr-vorschau"></div>
        <div class="reihe wrap"><button type="button" class="btn klein" data-x="tausch">⇄ Spalten tauschen</button>
          <label class="hk"><input type="radio" name="tr-wie" value="ersetzen" checked> bisherige ersetzen</label><label class="hk"><input type="radio" name="tr-wie" value="anhaengen"> anhängen</label>
          <span class="spacer"></span><button type="button" class="btn haupt" data-x="ok" disabled>Übernehmen</button></div>
      </div>`;
    document.body.appendChild(d);
    let erg = {eintraege: []}, tausch = false;
    const zeig = () => {
      erg = vokabelnLesen(d.querySelector('.tr-roh').value);
      const E = erg.eintraege.map(e => tausch ? [e[1], e[0]] : e), sp = erg.sprachen ? (tausch ? [erg.sprachen[1], erg.sprachen[0]] : erg.sprachen) : null;
      d.querySelector('.tr-info').textContent = d.querySelector('.tr-roh').value.trim() ? erg.info : '';
      d.querySelector('.tr-vorschau').innerHTML = E.length ? `<table class="tr-tab"><tr><th>${esc(sp ? sp[0] : 'links')}</th><th>${esc(sp ? sp[1] : 'rechts')}</th></tr>${E.slice(0, 12).map(e => `<tr><td>${esc(e[0].split('|').join(' / '))}</td><td>${esc(e[1].split('|').join(' / '))}</td></tr>`).join('')}${E.length > 12 ? `<tr><td colspan="2" class="hinweis">… und ${E.length - 12} weitere</td></tr>` : ''}</table>` : '';
      d.querySelector('[data-x="ok"]').disabled = !E.length;
      d.querySelector('.kp-zahl').textContent = E.length ? `${E.length} Vokabeln` : '';
    };
    d.querySelector('.tr-roh').addEventListener('input', zeig);
    d.querySelector('input[type=file]').addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      d.querySelector('.tr-roh').value = await dateiText(f); d.querySelector('.tr-datei').textContent = f.name; zeig();
    });
    d.addEventListener('click', e => {
      const x = e.target.closest('[data-x]'); if (!x) { if (e.target === d) d.close(); return; }
      if (x.dataset.x === 'zu') return d.close();
      if (x.dataset.x === 'tausch') { tausch = !tausch; return zeig(); }
      if (x.dataset.x === 'ok') {
        const E = erg.eintraege.map(e => tausch ? [e[1], e[0]] : e), sp = erg.sprachen ? (tausch ? [erg.sprachen[1], erg.sprachen[0]] : erg.sprachen) : null;
        const anh = d.querySelector('input[name=tr-wie]:checked').value === 'anhaengen';
        B.aendereSchritt(xx => { const W = stufeObj(xx.training).woerterbuch; W.eintraege = anh ? (W.eintraege || []).concat(E) : E; if (sp) W.sprachen = sp; });
        d.close();
      }
    });
    d.addEventListener('close', () => d.remove());
    d.showModal(); d.querySelector('.tr-roh').focus();
  }
  function csvExport() {
    const x = B.schritt(); if (!x || !x.training) return;
    const W = stufeObj(x.training).woerterbuch; if (!W) return;
    const q = s => /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    const zeilen = [(W.sprachen || ['links', 'rechts']).map(q).join(';'), ...(W.eintraege || []).map(e => [e[0], e[1]].map(s => q(String(s).split('|').join(' | '))).join(';'))];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + zeilen.join('\r\n')], {type: 'text/csv;charset=utf-8'}));
    a.download = (stufeObj(x.training).name || x.titel || 'vokabeln').replace(/[^\wäöüÄÖÜß-]+/g, '_') + '.csv';
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function kurz(t) {
    const S = stufenVon(t) || [t];
    const n = (z, e, m) => `${z} ${z === 1 ? e : m}`;
    const inhalt = S.map(s => s.woerterbuch ? n((s.woerterbuch.eintraege || []).length, 'Vokabel', 'Vokabeln') : n((s.szenarien || []).length, 'Szenario', 'Szenarien')).join(', ');
    return [t.anzahl ? `${t.anzahl} Aufgaben` : 'endlos', t.zeit ? `Zeit ${zt(t.zeit.start)} s${t.zeit.schritt ? ` (${t.zeit.schritt > 0 ? '+' : '−'}${zt(Math.abs(t.zeit.schritt))} s je richtige)` : ''}` : 'ohne Zeit',
      t.antwort === 'mc' ? 'Multiple Choice' : 'eintippen', S.length > 1 ? `${S.length} Stufen: ${inhalt}` : inhalt].join(' · ');
  }

  B.training = {neu: () => ({antwort: 'eingabe', anzahl: 20, zeit: {start: 5, schritt: -0.1, min: 1.5}, szenarien: [neuSzenario()]}), kurz, form, tun,
    _test: {werteAus, werteText, vokabelnLesen}};
})();
