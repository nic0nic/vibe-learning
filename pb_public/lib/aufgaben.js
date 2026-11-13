/* aufgaben.js – Aufgabenbausteine für alle Fächer: Aufgaben als Daten, Prüfung und Rückmeldung eingebaut
 *
 * Einbinden (Pfad zum Ordner pb_public/lib/, z. B. aus BWR/9II/finanzierung/ ../../../lib/):
 *   <link rel="stylesheet" href="../../../lib/aufgaben.css">   <script src="../../../lib/aufgaben.js"></script>
 * Farben kommen aus den Variablen der Seite (--panel, --panel2, --border, --accent, --text, --muted).
 *
 * Aufgabe = Objekt mit typ. Für alle Typen: nr (z. B. '7.1'), frage (Aufgabenstellung, HTML),
 * erinnerung und material (HTML, stehen über der Aufgabe; erinnerungZu:true = Erinnerung startet zugeklappt), ok (Text bei Erfolg),
 * Formeln mit Bruchstrich in jedem HTML-Text: <span class="bruch"><span>Zähler</span><span>Nenner</span></span> (aufgaben.css),
 *   kombi        Kombinierte Aufgabe: teile:[Aufgabe, …] (mindestens zwei, keine Kombi in der Kombi). Teil 2 erscheint
 *                erst, wenn Teil 1 richtig gelöst ist, usw.; erledigt, wenn der letzte Teil gelöst ist (dann ok).
 *                nr, frage, erinnerung, material der Kombi stehen über allen Teilen, jeder Teil hat eigene.
 *                (Früher: danach:{…} an einer Aufgabe – Aufgaben-JSON mit danach wandelt lib/seite.js um.)
 *   mc           options:[Texte], correct:[Indizes] (mehrere = Mehrfachauswahl, oder multi:true), why:{Index: Erklärung},
 *                after (Text nach Erfolg), mono, mischen:false (Reihenfolge behalten), sofort:false
 *                (bei genau einer richtigen Antwort wird sonst beim Antippen sofort geprüft),
 *                html:true (Antworten als HTML, z. B. Bruch; ohne html sind Antworten reiner Text, „A1<5“ bleibt lesbar).
 *                Dasselbe Format wie type:'choice' in den Excel-Erklärungen.
 *   zahlen       felder:[{t (Text), l (Lösung), e (Einheit), h (Hinweis bei Fehler), tol (Toleranz, Std. 0,005)}]
 *                Eingabe im deutschen Format (1.234,50 €), Knopftext über knopf:'…'
 *   luecken      text:'… [[richtig|falsch|falsch]] …' → Auswahllisten (erste Antwort richtig, wird gemischt)
 *                ziehen:true → Wortbank statt Auswahllisten: Wörter in die Lücken ziehen oder erst Wort, dann Lücke
 *                antippen (Wort in der Lücke antippen = zurück). Bank: je Lücke das richtige Wort, dazu die falschen
 *                Antworten der Lücken und extra:['…'] (weitere Ablenker), Doppelte nur einmal. [[Wort]] ohne | reicht hier.
 *   zuordnen     felder:[[id, Titel]], karten:[{t (Text), z (Feld-id)}]; Ziehen mit Maus/Finger oder
 *                erst Karte, dann Feld antippen. Richtige bleiben liegen, falsche gehen zurück.
 *   tabelle      Tabelle zum Ausfüllen (z. B. Tilgungsplan): spalten:['Jahr', 'Zinsen', …],
 *                zeilen:[['1', 40000, {l:2000}, …], …] – Text bzw. Zahl = vorgegeben (Zahlen mit 2 Nachkommastellen),
 *                {l: Lösung} = Eingabefeld; hinweise:{Spaltenindex: 'Zinsen = Restschuld · 5 %'}, tol (Std. 0,005),
 *                einheit (z. B. '€', erscheint im Spaltenkopf). Falsche Felder werden rot, Hinweise je Spalte.
 *   wahrheit     Tabelle mit ja/nein zum Anklicken (z. B. Wahrheitstabelle UND/ODER): spalten:['Titel', 'jahr >= 2000', …]
 *                (HTML erlaubt), zeilen:[['Oben', true, false, {l:false}], …] – true/false = vorgegeben (ja/nein),
 *                Text bzw. Zahl = vorgegeben, {l:true|false} = Feld zum Anklicken (leer → ja → nein → ja …);
 *                werte:['ja', 'nein'] (Beschriftung für true/false), hinweise:{Spaltenindex: 'Text bei Fehler'}.
 *   freitext     felder:['1. Sicherheit', '2. Sicherheit'] (Beschriftungen, je ein Eingabefeld),
 *                antworten:[['Grundschuld'], ['Zession', 'Abtretung von Forderungen'], …] (je Eintrag Schreibweisen);
 *                ein Feld ist richtig, wenn ein Begriff darin vorkommt (Groß/klein, ä/ae egal), jedes Feld braucht
 *                einen anderen Eintrag. Tippfehler (Abstand bis 45 % bei langen, 30 % bei kurzen Wörtern) gelten als
 *                „fast richtig“ mit Hinweis auf die Schreibweise; tippfehler:'ok' zählt sie als richtig.
 *   chat         Lern-Chat wie bei LearningSnacks: name, bild (Emoji), nachrichten:[…], jede Nachricht ist
 *                'Text des Bots' (HTML erlaubt) oder eine Frage {bot:'Frage', …} mit einer Antwortform:
 *                  antworten:[{t:'mehr', ok:true, r:'Genau! …'}, {t:'weniger', r:'Nein, …'}]   (Knöpfe)
 *                  zahl:{l:11900, e:'€', tol}   oder   freitext:{antworten:[…]} (wie Typ freitext)
 *                  dazu r (Antwort des Bots bei richtig) und rFalsch (Erklärung bei falsch)
 *                Bei Fehlern erklärt der Bot und macht weiter; am Ende Punkte und „Noch einmal“.
 *                Gilt als gelöst (fertig), sobald der Chat einmal ganz durchlaufen ist.
 *   buchungssatz konten:['2800 BK', …] (Auswahl), soll:[['0700 MA', 40000], …], haben:[…],
 *                steuer:['2600 VORST', '4800 UST'] (für den Hinweis), nebenrechnung (HTML nach Lösung),
 *                betraege:[['Rechnungsbetrag', 11900], …] → Beträge (z. B. aus einer Kalkulation davor) zum Ziehen
 *                auf die Betragsfelder oder erst Betrag, dann Feld antippen; auch Ablenker, mehrfach nutzbar,
 *                jgst:7 → Konten nur mit Kürzel ohne Nummer (konten:['BK', 'UEFE', 'UST']).
 *                Konto eintippen: Liste filtert nach Nummer oder Kürzel (z. B. „ve“ → 4400 VE).
 *                „an“ steht wie im Heft auf der Zeile des letzten Soll-Kontos neben dem ersten Haben-Konto.
 *                prüft: Konten, Soll/Haben vertauscht, fehlende Steuer, Beträge; Lösung im Skill-Format
 *
 * API
 *   Aufgaben.baue(el, a, {fertig})  Baustein in Element el; fertig(a) nach richtiger Lösung (inkl. danach)
 *   Aufgaben.sequenz({el, key, schritte})  Erarbeitung aus Schritten mit Knöpfen, ✓, Zähler, Zurück/Weiter:
 *       schritt = {id, kurz (Knopf), titel, html (String oder Funktion), erinnerung, erinnerungZu, material,
 *                  aufgaben:[…], nach(el) (nach dem Zeichnen, für eigene Grafiken)}
 *       Schritte mit Aufgaben melden TrainerSync.event (modus 'erarbeitung', aufgabe = schritt.id),
 *       Info-Schritte gelten beim Weitergehen als erledigt. Gespeichert: <key>-stand {schritt, erledigt}.
 *   Aufgaben.endlos({el, key, stufen})  Endlos-Modus wie in den Excel-Übungen: Stufen als Flammen, Serie und Rekord,
 *       „Andere Aufgabe“ (Serie auf 0), „Nächste Aufgabe“ nach richtiger Lösung.
 *       stufe = {name, neu() → Aufgabe (beliebiger Typ, frisch erzeugt; h/ok für Rechenweg nutzen)}
 *       Meldet TrainerSync.event (modus 'endlos', stufe 1…n). Gespeichert: <key>-endlos {stufe, rekord:{stufe: n}}.
 *       Rückgabe {neu() (neue Aufgabe), stufe(n) (Stufe wechseln)}. Vorbild: BWR/9II/finanzierung/zinsrechnung.html
 *   Aufgaben.mc.html(a, auswahl:Set, geprueft, reihenfolge?) / Aufgaben.mc.pruefen(a, auswahl) → {ok, gruende}
 *       für Seiten mit eigenem Ablauf (Excel-Erklärungen: tabelle.js, und-oder.html)
 *   Aufgaben.finde(antworten, text) → {i (Eintrag), wort, fast} oder null   (Freitext-Abgleich, auch einzeln nutzbar)
 *   Helfer: zahl('1.234,50 €') → 1234.5, eur(n) → '1.234,50 €', mischen(liste), esc(text), bsText(soll, haben)
 */
(function(){
'use strict';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]));
const r2 = n => Math.round(n * 100) / 100;
const zahlText = n => r2(n).toLocaleString('de-DE', {minimumFractionDigits:2, maximumFractionDigits:2});
const eur = n => r2(n).toLocaleString('de-DE', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' €';
function zahl(s){
  s = String(s == null ? '' : s).replace(/€|%|Tage?|\s/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  return /^-?\d+(\.\d+)?$/.test(s) ? +s : NaN;
}
function mischen(a){ a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const erinnerungHTML = x => x.erinnerung ? `<details class="erinnerung"${x.erinnerungZu ? '' : ' open'}><summary>Erinnerung${x.erinnerungZu ? ' (zum Aufklappen)' : ''}</summary>${x.erinnerung}</details>` : '';
const fbHTML = fb => fb ? `<div class="af-fb ${fb.ok ? 'ok' : 'falsch'}">${fb.t}</div>` : '';
const nummern = n => [...Array(n).keys()];
// Buchungssatz im Format des BWR-Skills: „an“ auf der letzten Soll-Zeile, weitere Haben-Konten bündig darunter
function bsText(soll, haben){
  const w1 = Math.max(...soll.map(x => x[0].length)), b1 = Math.max(...soll.map(x => eur(x[1]).length));
  const w2 = Math.max(...haben.map(x => x[0].length)), b2 = Math.max(...haben.map(x => eur(x[1]).length));
  const z = (x, w, b) => x[0].padEnd(w) + '  ' + eur(x[1]).padStart(b);
  const zeilen = soll.map((x, i) => z(x, w1, b1) + (i === soll.length - 1 ? '   an   ' + z(haben[0], w2, b2) : ''));
  haben.slice(1).forEach(x => zeilen.push(' '.repeat(w1 + b1 + 10) + z(x, w2, b2)));
  return zeilen.join('\n');
}

/* ---------- Freitext-Abgleich mit Tippfehlern ---------- */
const norm = s => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim();
function abstand(a, b){   // Damerau-Levenshtein (vertauschte Nachbarn zählen 1)
  const d = [];
  for (let i = 0; i <= a.length; i++){ d[i] = [i]; }
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++){
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}
function finde(antworten, text){
  const t = norm(text); if (!t) return null;
  const woerter = t.split(' '), stuecke = [];
  for (let n = 1; n <= 3; n++) for (let i = 0; i + n <= woerter.length; i++) stuecke.push(woerter.slice(i, i + n).join(''));
  let best = null;
  antworten.forEach((eintrag, i) => [].concat(eintrag).forEach(wort => {
    const v = norm(wort), vz = v.replace(/ /g, '');
    if ((' ' + t + ' ').includes(v) || t.replace(/ /g, '').includes(vz)){ if (!best || best.fast) best = {i, wort:[].concat(eintrag)[0], fast:false, d:0}; return; }
    const tol = Math.max(1, Math.floor(vz.length * (vz.length >= 10 ? 0.45 : 0.3)));
    stuecke.forEach(s => { const d = abstand(s, vz); if (d <= tol && (!best || (best.fast && d < best.d))) best = {i, wort:[].concat(eintrag)[0], fast:true, d}; });
  }));
  return best;
}

/* ---------- Typen: zustand(a), html(a, z), pruefen(a, z) → {ok, t} ---------- */
const mehrfach = a => !!a.multi || a.correct.length > 1;
const optText = (a, i) => a.html === true ? String(a.options[i]) : esc(a.options[i]);   // HTML nur mit html:true
const mc = {
  html(a, sel, geprueft, ord){
    return `<div class="opts${a.mono ? ' mono' : ''}">` + (ord || nummern(a.options.length)).map(i => {
      let c = sel.has(i) ? ' sel' : '';
      if (geprueft && sel.has(i)) c += a.correct.includes(i) ? ' good' : ' bad';
      return `<button class="opt${c}" type="button" data-opt="${i}">${optText(a, i)}</button>`;
    }).join('') + `</div><div class="ohint">${mehrfach(a) ? 'Mehrere Antworten möglich.' : 'Genau eine Antwort ist richtig.'}</div>`;
  },
  pruefen(a, sel){
    const falsch = [...sel].filter(i => !a.correct.includes(i)), fehlt = a.correct.filter(i => !sel.has(i));
    const gruende = falsch.map(i => (a.why && a.why[i]) || `„${optText(a, i)}“ passt nicht.`);
    if (!falsch.length && fehlt.length) gruende.push(fehlt.length === 1 ? 'Es fehlt noch eine richtige Antwort.' : `Es fehlen noch ${fehlt.length} richtige Antworten.`);
    return {ok:!falsch.length && !fehlt.length, gruende};
  }
};
const TYPEN = {
  mc:{
    zustand:a => ({sel:new Set(), ord:a.mischen === false ? null : mischen(nummern(a.options.length))}),
    sofort:a => a.sofort !== false && !mehrfach(a),
    html:(a, z) => mc.html(a, z.sel, z.geprueft, z.ord),
    pruefen(a, z){
      if (!z.sel.size) return {ok:false, t:'Wähle zuerst eine Antwort aus.'};
      z.geprueft = true;
      const r = mc.pruefen(a, z.sel);
      return r.ok ? {ok:true, t:'✓ <b>Richtig!</b>' + (a.after ? ' ' + a.after : '')} : {ok:false, t:'Noch nicht ganz.<br>' + r.gruende.join('<br>')};
    }
  },
  zahlen:{
    zustand:() => ({ein:{}, ok:{}}),
    html:(a, z) => '<div class="af-felder">' + a.felder.map((f, i) => {
      const r = z.ok[i];
      return `<div class="af-zeile"><span class="af-t">${f.t}</span><input class="feld af-zahl${r === true ? ' richtig' : r === false ? ' falsch' : ''}" data-f="${i}" value="${esc(z.ein[i] || '')}" inputmode="decimal" autocomplete="off" aria-label="${esc(String(f.t).replace(/<[^>]+>/g, ''))}"${r === true ? ' readonly' : ''}>`
        + `<span class="af-e">${f.e || ''}</span><span class="af-m">${r === true ? '✓' : r === false ? '✗' : ''}</span></div>`
        + (r === false && f.h ? `<div class="af-hinweis">${f.h}</div>` : '');
    }).join('') + '</div>',
    pruefen(a, z){
      a.felder.forEach((f, i) => { z.ok[i] = Math.abs(zahl(z.ein[i]) - f.l) <= (f.tol == null ? 0.005 : f.tol); });
      return a.felder.every((f, i) => z.ok[i]) ? {ok:true, t:'✓ ' + (a.ok || 'Alles richtig!')} : {ok:false, t:'Noch nicht alles richtig. Die rot markierten Felder stimmen nicht.'};
    }
  },
  luecken:{
    zustand(a){
      const teile = String(a.text).split(/\[\[(.*?)\]\]/).map((s, i) => i % 2 ? s.split('|').map(w => w.trim()) : s);
      const z = {teile, wahl:{}, ok:{}, ord:teile.map(t => Array.isArray(t) ? mischen(nummern(t.length)) : null)};
      if (a.ziehen){   // Wortbank: je Lücke das richtige Wort, dazu die falschen Antworten und extra (ohne Doppelte)
        const richtig = teile.filter(Array.isArray).map(t => t[0]);
        const sonst = [...new Set([...teile.filter(Array.isArray).flatMap(t => t.slice(1)), ...(a.extra || [])])].filter(w => w && !richtig.includes(w));
        Object.assign(z, {woerter:[...richtig, ...sonst], platz:{}, fix:{}, weg:[], wahl:null});
        z.ord = mischen(nummern(z.woerter.length));
      }
      return z;
    },
    // Wortbank: Wort i in Lücke 'L<n>' bzw. zurück (zone ''); höchstens ein Wort pro Lücke
    legen(z, i, zone){
      const drin = Object.keys(z.platz).find(k => z.platz[k] === zone);
      if (zone && drin != null){ if (z.fix[drin]) return; delete z.platz[drin]; }
      if (!zone) delete z.platz[i]; else z.platz[i] = zone;
    },
    html(a, z){
      let n = 0;
      if (a.ziehen){
        const karte = i => `<span class="af-karte${z.fix[i] ? ' fix' : ''}${z.wahl === i ? ' gewaehlt' : ''}${z.weg.includes(i) ? ' weg' : ''}" data-karte="${i}" tabindex="0" role="button">${esc(z.woerter[i])}</span>`;
        const frei = z.ord.filter(i => z.platz[i] == null);
        return `<div class="af-pool af-bank" data-zone="">${frei.map(karte).join('') || '<span class="af-leer">Alle Wörter sind verteilt.</span>'}</div>`
          + '<p class="af-luecken af-ziehen">' + z.teile.map(t => {
            if (!Array.isArray(t)) return t;
            const i = n++, w = Object.keys(z.platz).find(k => z.platz[k] === 'L' + i);
            return `<span class="af-zone af-luecke${z.ok[i] === true ? ' richtig' : ''}" data-zone="L${i}" aria-label="Lücke ${i + 1}">${w != null ? karte(+w) : ''}</span>`;
          }).join('') + '</p>';
      }
      return '<p class="af-luecken">' + z.teile.map((t, j) => {
        if (!Array.isArray(t)) return t;
        const i = n++, r = z.ok[i];
        return `<select data-l="${i}" class="${r === true ? 'richtig' : r === false ? 'falsch' : ''}" aria-label="Lücke ${i + 1}"><option value="">– wählen –</option>`
          + z.ord[j].map(k => `<option value="${k}"${String(z.wahl[i]) === String(k) ? ' selected' : ''}>${esc(t[k])}</option>`).join('') + '</select>';
      }).join('') + '</p>';
    },
    pruefen(a, z){
      const n = z.teile.filter(Array.isArray).length;
      if (a.ziehen){
        z.weg = []; z.wahl = null;
        const richtig = z.teile.filter(Array.isArray).map(t => t[0]);
        Object.keys(z.platz).forEach(w => {
          const i = +z.platz[w].slice(1);
          if (z.woerter[w] === richtig[i]){ z.fix[w] = true; z.ok[i] = true; } else { z.weg.push(+w); delete z.platz[w]; }
        });
        const k = nummern(n).filter(i => z.ok[i]).length;
        if (k === n) return {ok:true, t:'✓ ' + (a.ok || 'Alles richtig!')};
        if (!k && !z.weg.length) return {ok:false, t:'Ziehe zuerst Wörter in die Lücken.'};
        return {ok:false, t:`${k} von ${n} Lücken richtig. ${z.weg.length ? `${z.weg.length} ${z.weg.length === 1 ? 'Wort ist' : 'Wörter sind'} zurück in die Wortbank gewandert.` : ''}`};
      }
      for (let i = 0; i < n; i++) z.ok[i] = String(z.wahl[i]) === '0';
      return nummern(n).every(i => z.ok[i]) ? {ok:true, t:'✓ ' + (a.ok || 'Alles richtig!')} : {ok:false, t:'Noch nicht alles richtig. Die rot markierten Lücken stimmen nicht.'};
    }
  },
  wahrheit:{
    zustand:() => ({ein:{}, ok:{}}),
    html(a, z){
      const W = a.werte || ['ja', 'nein'], wort = b => b ? W[0] : W[1];
      const kopf = a.spalten.map(s => `<th>${s}</th>`).join('');
      const zeilen = a.zeilen.map((r, i) => '<tr>' + r.map((c, j) => {
        if (typeof c === 'boolean') return `<td class="af-wv ${c ? 'af-ja' : 'af-nein'}">${esc(wort(c))}</td>`;
        if (!c || typeof c !== 'object') return `<td${j === 0 ? ' class="af-wname"' : ''}>${esc(c == null ? '' : c)}</td>`;
        const k = i + '-' + j, v = z.ein[k], s = z.ok[k];
        return `<td class="af-wfeld"><button type="button" class="af-wb${v == null ? '' : v ? ' af-ja' : ' af-nein'}${s === true ? ' richtig' : s === false ? ' falsch' : ''}" data-w="${k}"${s === true ? ' disabled' : ''} aria-label="${esc(String(a.spalten[j]).replace(/<[^>]+>/g, '') + ', Zeile ' + (i + 1))}: ${v == null ? 'leer' : esc(wort(v))}">${v == null ? '?' : esc(wort(v))}</button></td>`;
      }).join('') + '</tr>').join('');
      const falsch = Object.keys(z.ok).filter(k => z.ok[k] === false).map(k => +k.split('-')[1]);
      const hin = [...new Set(falsch)].filter(j => a.hinweise && a.hinweise[j]).map(j => `<div class="af-hinweis">${a.hinweise[j]}</div>`).join('');
      return `<div class="af-tabelle af-wahrheit"><table><thead><tr>${kopf}</tr></thead><tbody>${zeilen}</tbody></table></div>`
        + `<div class="af-hinweis">Klicke auf die Felder mit <b>?</b>: ${esc(W[0])} oder ${esc(W[1])}.</div>${hin}`;
    },
    pruefen(a, z){
      let alle = 0, richtig = 0, leer = 0;
      a.zeilen.forEach((r, i) => r.forEach((c, j) => {
        if (!c || typeof c !== 'object') return;
        const k = i + '-' + j; alle++;
        if (z.ein[k] == null){ leer++; delete z.ok[k]; return; }
        z.ok[k] = z.ein[k] === c.l; if (z.ok[k]) richtig++;
      }));
      if (richtig === alle) return {ok:true, t:'✓ ' + (a.ok || 'Alles richtig ausgefüllt!')};
      return {ok:false, t:`${richtig} von ${alle} Feldern richtig.${leer ? ` ${leer} ${leer === 1 ? 'Feld ist' : 'Felder sind'} noch leer.` : ''}${richtig < alle - leer ? ' Die rot markierten Felder stimmen nicht.' : ''}`};
    }
  },
  zuordnen:{
    zustand:a => ({platz:{}, fix:{}, ord:mischen(nummern(a.karten.length)), wahl:null, weg:[]}),
    html(a, z){
      const karte = i => `<div class="af-karte${z.fix[i] ? ' fix' : ''}${z.wahl === i ? ' gewaehlt' : ''}${z.weg.includes(i) ? ' weg' : ''}" data-karte="${i}" tabindex="0" role="button">${a.karten[i].t}</div>`;
      const frei = z.ord.filter(i => z.platz[i] == null);
      return `<div class="af-pool" data-zone="">${frei.map(karte).join('') || '<span class="af-leer">Alle Karten sind verteilt.</span>'}</div>`
        + `<div class="af-zonen" style="--n:${a.felder.length}">${a.felder.map(([id, t]) => `<div class="af-zone" data-zone="${esc(id)}"><div class="af-zt">${t}</div>${z.ord.filter(i => z.platz[i] === id).map(karte).join('')}</div>`).join('')}</div>`;
    },
    pruefen(a, z){
      z.weg = []; z.wahl = null;
      a.karten.forEach((k, i) => { if (z.platz[i] != null){ if (z.platz[i] === k.z) z.fix[i] = true; else { z.weg.push(i); delete z.platz[i]; } } });
      const n = a.karten.filter((k, i) => z.fix[i]).length;
      if (n === a.karten.length) return {ok:true, t:`✓ ${a.ok || `Alle ${n} Karten richtig zugeordnet!`}`};
      if (!n && !z.weg.length) return {ok:false, t:'Ziehe zuerst Karten in die Felder.'};
      return {ok:false, t:`${n} von ${a.karten.length} richtig. ${z.weg.length ? `${z.weg.length} ${z.weg.length === 1 ? 'Karte ist' : 'Karten sind'} zurück in den Stapel gewandert. ` : ''}Ordne die übrigen Karten zu.`};
    }
  },
  tabelle:{
    zustand:() => ({ein:{}, ok:{}}),
    html(a, z){
      const fmt = v => typeof v === 'number' ? zahlText(v) : esc(v == null ? '' : v);
      const kopf = a.spalten.map(s => `<th>${esc(s)}${a.einheit && s !== a.spalten[0] ? ` <small>(${esc(a.einheit)})</small>` : ''}</th>`).join('');
      const zeilen = a.zeilen.map((r, i) => '<tr>' + r.map((c, j) => {
        if (!c || typeof c !== 'object') return `<td${typeof c === 'number' ? ' class="zahl"' : ''}>${fmt(c)}</td>`;
        const k = i + '-' + j, s = z.ok[k];
        return `<td><input class="feld af-zahl${s === true ? ' richtig' : s === false ? ' falsch' : ''}" data-f="${k}" value="${esc(z.ein[k] || '')}" inputmode="decimal" autocomplete="off" aria-label="${esc(a.spalten[j] + ', Zeile ' + (i + 1))}"${s === true ? ' readonly' : ''}></td>`;
      }).join('') + '</tr>').join('');
      const falsch = Object.keys(z.ok).filter(k => z.ok[k] === false).map(k => +k.split('-')[1]);
      const hin = [...new Set(falsch)].filter(j => a.hinweise && a.hinweise[j]).map(j => `<div class="af-hinweis"><b>${esc(a.spalten[j])}:</b> ${a.hinweise[j]}</div>`).join('');
      return `<div class="af-tabelle"><table><thead><tr>${kopf}</tr></thead><tbody>${zeilen}</tbody></table></div>${hin}`;
    },
    pruefen(a, z){
      let alle = 0, richtig = 0, leer = 0;
      a.zeilen.forEach((r, i) => r.forEach((c, j) => {
        if (!c || typeof c !== 'object') return;
        const k = i + '-' + j, v = zahl(z.ein[k]); alle++;
        if (isNaN(v)){ leer++; delete z.ok[k]; return; }
        z.ok[k] = Math.abs(v - c.l) <= (a.tol == null ? 0.005 : a.tol); if (z.ok[k]) richtig++;
      }));
      if (richtig === alle) return {ok:true, t:'✓ ' + (a.ok || 'Alles richtig ausgefüllt!')};
      return {ok:false, t:`${richtig} von ${alle} Feldern richtig.${leer ? ` ${leer} ${leer === 1 ? 'Feld ist' : 'Felder sind'} noch leer.` : ''}${richtig < alle - leer ? ' Die rot markierten Felder stimmen nicht.' : ''}`};
    }
  },
  freitext:{
    zustand:() => ({ein:{}, st:{}, msg:{}}),
    html:(a, z) => '<div class="af-felder">' + a.felder.map((f, i) => {
      const s = z.st[i];
      return `<div class="af-zeile"><label class="af-t" for="af-ft-${i}">${f}</label><input class="feld af-text${s === 'ok' ? ' richtig' : s === 'fast' ? ' fast' : s ? ' falsch' : ''}" id="af-ft-${i}" data-f="${i}" value="${esc(z.ein[i] || '')}" autocomplete="off" spellcheck="false"${s === 'ok' ? ' readonly' : ''}>`
        + `<span class="af-m">${s === 'ok' ? '✓' : s === 'fast' ? '≈' : s ? '✗' : ''}</span></div>` + (z.msg[i] ? `<div class="af-hinweis">${z.msg[i]}</div>` : '');
    }).join('') + '</div>',
    pruefen(a, z){
      const belegt = {};
      z.st = {}; z.msg = {};
      a.felder.forEach((f, i) => {
        const r = finde(a.antworten, z.ein[i]);
        if (!norm(z.ein[i])){ z.st[i] = 'leer'; z.msg[i] = 'Dieses Feld ist noch leer.'; }
        else if (!r){ z.st[i] = 'falsch'; z.msg[i] = a.h || 'Das passt nicht. Schau noch einmal in die Erklärung.'; }
        else if (belegt[r.i] != null){ z.st[i] = 'falsch'; z.msg[i] = 'Das hast du schon in einem anderen Feld genannt. Nenne etwas anderes.'; }
        else if (r.fast && a.tippfehler !== 'ok'){ z.st[i] = 'fast'; z.msg[i] = `Fast richtig – meinst du „${esc(r.wort)}“? Prüfe die Schreibweise.`; belegt[r.i] = i; }
        else { z.st[i] = 'ok'; if (r.fast) z.msg[i] = `Richtig. Schreibweise: „${esc(r.wort)}“.`; belegt[r.i] = i; }
      });
      return a.felder.every((f, i) => z.st[i] === 'ok') ? {ok:true, t:'✓ ' + (a.ok || 'Alles richtig!')} : {ok:false, t:'Noch nicht alles richtig.'};
    }
  },
  chat:{
    zustand:() => ({i:0, log:[], warte:null, punkte:0, fragen:0, tippt:false, ende:false}),
    sofort:() => true,
    html(a, z){
      const ava = `<span class="af-ava" aria-hidden="true">${a.bild || '🤖'}</span>`;
      const blase = m => m.wer === 'ich' ? `<div class="af-msg ich"><div class="af-blase">${esc(m.text)}</div></div>`
        : `<div class="af-msg bot">${ava}<div class="af-blase${m.art ? ' ' + m.art : ''}">${m.html}</div></div>`;
      let ein = '';
      const q = z.warte != null ? a.nachrichten[z.warte] : null;
      if (q && q.antworten) ein = `<div class="af-chips">${q.antworten.map((x, j) => `<button class="af-chip" type="button" data-ca="${j}">${esc(x.t)}</button>`).join('')}</div>`;
      else if (q) ein = `<div class="af-chatein"><input class="feld af-chattext" ${q.zahl ? 'inputmode="decimal"' : ''} autocomplete="off" placeholder="${q.zahl ? 'Zahl eingeben' : 'Antwort eingeben'}" aria-label="Deine Antwort">${q.zahl && q.zahl.e ? `<span>${q.zahl.e}</span>` : ''}<button class="btn haupt af-senden" type="button">Senden</button></div>`;
      else if (z.ende) ein = `<div class="af-chatende"><b>Geschafft!</b> Du hast ${z.punkte} von ${z.fragen} Fragen auf Anhieb richtig beantwortet. <button class="btn klein af-neu" type="button">Noch einmal</button></div>`;
      return `<div class="af-chat"><div class="af-chatkopf">${ava}<b>${esc(a.name || 'Lern-Chat')}</b></div><div class="af-verlauf" aria-live="polite">${z.log.map(blase).join('')}`
        + (z.tippt ? `<div class="af-msg bot">${ava}<div class="af-blase af-tippt" aria-label="schreibt …"><i></i><i></i><i></i></div></div>` : '') + `</div>${ein}</div>`;
    },
    start(ctx){ const z = ctx.z; z.ctx = ctx; if (!z.log.length && !z.tippt) chatWeiter(z, ctx.a); },
    nach(el){ const v = el.querySelector('.af-verlauf'); if (v) v.scrollTop = v.scrollHeight; const i = el.querySelector('.af-chattext'); if (i && document.activeElement && el.contains(document.activeElement) === false && el.dataset.fokus) i.focus(); },
    pruefen:() => ({ok:false, t:''})
  },
  buchungssatz:{
    zustand:() => ({soll:[{k:'', b:''}], haben:[{k:'', b:''}]}),
    html(a, z){
      if (z.geloest) return `<pre class="af-bs">${esc(bsText(a.soll, a.haben))}</pre>` + (a.nebenrechnung ? `<div class="af-hinweis">${a.nebenrechnung}</div>` : '');
      const ph = a.jgst === 7 ? 'Konto, z. B. BK' : 'Konto: Nr. oder Kürzel';
      // Raster: Zeile 1 Überschriften, Soll ab Zeile 2; „an“ und das erste Haben-Konto auf der Zeile des letzten Soll-Kontos
      const nS = z.soll.length, nH = z.haben.length, pos = (r, c) => ` style="grid-row:${r};grid-column:${c}"`;
      const zeile = (s, x, i, r, c) => `<div class="af-bz"${pos(r, c)}><span class="af-kwahl"><input class="feld af-konto" data-seite="${s}" data-i="${i}" data-w="k" value="${esc(x.k)}" placeholder="${ph}" autocomplete="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-label="${s === 'soll' ? 'Soll' : 'Haben'}-Konto ${i + 1}"></span>`
        + `<input class="feld af-zahl" data-seite="${s}" data-i="${i}" data-w="b" value="${esc(x.b)}" placeholder="Betrag" inputmode="decimal" autocomplete="off" aria-label="Betrag in €">`
        + (z[s].length > 1 ? `<button class="af-x" type="button" data-weg="${s}" data-i="${i}" aria-label="Zeile entfernen">×</button>` : '') + '</div>';
      const raster = `<div class="af-sk"${pos(1, 1)}>Soll</div>` + z.soll.map((x, i) => zeile('soll', x, i, 2 + i, 1)).join('')
        + `<button class="btn klein af-plus" type="button" data-plus="soll"${pos(2 + nS, 1)}>+ Soll-Konto</button>`
        + `<div class="af-an"${pos(1 + nS, 2)}>an</div>`
        + `<div class="af-sk"${pos(nS, 3)}>Haben</div>` + z.haben.map((x, i) => zeile('haben', x, i, 1 + nS + i, 3)).join('')
        + `<button class="btn klein af-plus" type="button" data-plus="haben"${pos(1 + nS + nH, 3)}>+ Haben-Konto</button>`;
      const bank = a.betraege ? `<div class="af-betraege"><div class="af-sk">Beträge – auf ein Betragsfeld ziehen oder erst Betrag, dann Feld antippen</div><div class="af-bliste">`
        + a.betraege.map(([t, b], i) => `<span class="af-betrag${z.bwahl === i ? ' gewaehlt' : ''}" data-betrag="${i}" tabindex="0" role="button"><small>${esc(t)}</small>${esc(zahlText(b))} €</span>`).join('') + '</div></div>' : '';
      return bank + `<div class="af-builder">${raster}</div>`;
    },
    pruefen(a, z){
      const ein = s => z[s].filter(x => x.k || String(x.b).trim()).map(x => ({k:x.k, b:zahl(x.b)}));
      const s = ein('soll'), h = ein('haben'), alle = [...s, ...h], ks = l => l.map(x => x.k || x[0]).sort().join('|');
      const los = [...a.soll, ...a.haben], n = los.length;
      let t = null;
      if (!s.length || !h.length) t = 'Trage mindestens ein Soll-Konto und ein Haben-Konto ein.';
      else if (alle.some(x => !x.k)) t = 'Wähle zu jedem Betrag ein Konto aus.';
      else if (alle.some(x => !a.konten.includes(x.k))) t = `Das Konto „${esc(alle.find(x => !a.konten.includes(x.k)).k)}“ gibt es hier nicht. Wähle die Konten aus der Liste.`;
      else if (alle.some(x => isNaN(x.b))) t = 'Trage zu jedem Konto einen Betrag ein, z. B. 12.500,00.';
      else if (new Set(alle.map(x => x.k)).size !== alle.length) t = 'Jedes Konto darf nur einmal im Buchungssatz stehen.';
      else if (ks(s) === ks(a.haben) && ks(h) === ks(a.soll)) t = 'Soll und Haben sind vertauscht. Überlege bei jedem Konto: Nimmt es zu oder ab, und auf welcher Seite steht es?';
      else if (ks(s) !== ks(a.soll) || ks(h) !== ks(a.haben)){
        const st = los.find(x => (a.steuer || []).includes(x[0]) && !alle.some(y => y.k === x[0]));
        t = 'Die Konten stimmen noch nicht. ' + (st ? `Denke an das Konto ${st[0]}.` : alle.length > n ? 'Es sind zu viele Konten.' : alle.length < n ? 'Es fehlt ein Konto.' : 'Überlege, welche Konten sich durch den Geschäftsfall verändern.');
      } else {
        const soll = (l, k) => l.find(x => x[0] === k)[1];
        const falsch = [...s.filter(x => Math.abs(x.b - soll(a.soll, x.k)) > 0.005), ...h.filter(x => Math.abs(x.b - soll(a.haben, x.k)) > 0.005)];
        if (falsch.length) t = `Die Konten stimmen. Prüfe den Betrag bei ${falsch.map(x => x.k).join(', ')}.`;
      }
      return t ? {ok:false, t} : {ok:true, t:'✓ ' + (a.ok || 'Richtig!')};
    }
  }
};

/* ---------- Lern-Chat: Ablauf ---------- */
const textVon = m => typeof m === 'string' ? m : m.bot;
function chatSage(z, html, art, dann){
  z.tippt = true; z.ctx.zeichne();
  const fertig = () => { z.tippt = false; z.weiter = null; z.log.push({wer:'bot', html, art}); dann(); };
  z.weiter = fertig;
  z.timer = setTimeout(fertig, Math.min(1600, 350 + String(html).replace(/<[^>]+>/g, '').length * 12));
}
function chatWeiter(z, a){
  if (z.i >= a.nachrichten.length){
    z.ende = true; z.ctx.zeichne();
    if (!z.geloest){ z.geloest = true; if (z.ctx.opt.fertig) z.ctx.opt.fertig(a); }
    return;
  }
  const m = a.nachrichten[z.i];
  chatSage(z, textVon(m), null, () => {
    if (typeof m === 'object' && (m.antworten || m.zahl || m.freitext)){ z.warte = z.i; z.ctx.zeichne(); return; }
    z.i++; z.ctx.zeichne(); chatWeiter(z, a);
  });
}
function chatAntwort(ctx, wert, j){
  const {a, z} = ctx, q = a.nachrichten[z.warte];
  if (!q) return;
  let ok, text, r;
  if (q.antworten){ const x = q.antworten[j]; ok = !!x.ok; text = x.t; r = x.r; }
  else if (q.zahl){ if (!String(wert).trim()) return; ok = Math.abs(zahl(wert) - q.zahl.l) <= (q.zahl.tol == null ? 0.005 : q.zahl.tol); text = wert + (q.zahl.e && !/€|%/.test(wert) ? ' ' + q.zahl.e : ''); }
  else { if (!String(wert).trim()) return; const f = finde(q.freitext.antworten, wert); ok = !!f; text = wert; if (f && f.fast) r = (q.r || 'Richtig!') + ` (Schreibweise: „${esc(f.wort)}“)`; }
  z.fragen++; if (ok) z.punkte++;
  z.log.push({wer:'ich', text}); z.warte = null; z.i++;
  chatSage(z, r || (ok ? q.r || '👍 Richtig!' : q.rFalsch || 'Das stimmt leider nicht.'), ok ? 'ok' : 'falsch', () => chatWeiter(z, a));
}

/* ---------- Baustein zeichnen und bedienen ---------- */
function baue(el, a, opt){
  opt = opt || {};
  if (a.typ === 'kombi') return baueKombi(el, a, opt);
  const typ = TYPEN[a.typ];
  if (!typ) throw new Error('aufgaben.js: unbekannter typ ' + a.typ);
  const z = a._z || (a._z = typ.zustand(a));
  const ctx = {a, z, typ, opt, el, zeichne(){
    const sofort = typ.sofort && typ.sofort(a);
    el.innerHTML = erinnerungHTML(a)
      + (a.material ? `<div class="material">${a.material}</div>` : '')
      + (a.frage ? `<p class="af-frage">${a.nr ? `<span class="af-nr">${a.nr}</span>` : ''}${a.frage}</p>` : '')
      + typ.html(a, z)
      + (!z.geloest && !sofort ? `<div class="af-knoepfe"><button class="btn haupt af-pruefen" type="button">${a.knopf || 'Prüfen'}</button></div>` : '')
      + fbHTML(z.fb);
    if (typ.nach) typ.nach(el, a, z);
  }};
  el.classList.add('af'); el._af = ctx;
  if (typ.start) typ.start(ctx); else ctx.zeichne();
  if (typ.start && !el.innerHTML) ctx.zeichne();
  return ctx;
}
function pruefe(ctx){
  const {a, z, typ, opt} = ctx, r = typ.pruefen(a, z);
  z.fb = {ok:r.ok, t:r.t};
  const neu = r.ok && !z.geloest;
  if (neu) z.geloest = true;
  ctx.zeichne();
  if (neu && opt.fertig) opt.fertig(a);
}
// Kombinierte Aufgabe: Teile nacheinander, der nächste erscheint nach richtiger Lösung des vorigen
function baueKombi(el, a, opt){
  const z = a._z || (a._z = {geloest:false});
  el.classList.add('af-kombi');
  el.innerHTML = erinnerungHTML(a) + (a.material ? `<div class="material">${a.material}</div>` : '')
    + (a.frage ? `<p class="af-frage">${a.nr ? `<span class="af-nr">${a.nr}</span>` : ''}${a.frage}</p>` : '') + '<div class="af-teile"></div><div class="af-kende"></div>';
  const box = el.querySelector('.af-teile'), T = a.teile || [];
  const ende = () => { el.querySelector('.af-kende').innerHTML = a.ok ? fbHTML({ok:true, t:'✓ ' + a.ok}) : ''; };
  function zeige(i){
    const d = document.createElement('div'); d.className = 'af-teil'; box.appendChild(d);
    baue(d, T[i], {fertig:() => weiter(i)});
  }
  function weiter(i){
    if (i + 1 < T.length){ if (box.children.length === i + 1){ zeige(i + 1); const n = box.children[i + 1]; if (n.scrollIntoView) n.scrollIntoView({behavior:'smooth', block:'nearest'}); } return; }
    if (!z.geloest){ z.geloest = true; ende(); if (opt.fertig) opt.fertig(a); }
  }
  // schon gelöste Teile (Zurückblättern): alle bis zum ersten offenen zeigen
  let i = 0; zeige(0);
  while (i + 1 < T.length && T[i]._z && T[i]._z.geloest){ i++; zeige(i); }
  if (z.geloest) ende();
  return {a, z, el};
}
const ctxVon = t => { const w = t.closest && t.closest('.af'); return w && w._af; };

document.addEventListener('click', e => {
  const ctx = ctxVon(e.target); if (!ctx || zieht) return;
  const {a, z} = ctx, t = e.target;
  if (t.closest('.af-pruefen')) return pruefe(ctx);
  if (a.typ === 'chat'){
    const c = t.closest('[data-ca]');
    if (c) return chatAntwort(ctx, null, +c.dataset.ca);
    if (t.closest('.af-senden')){ const i = ctx.el.querySelector('.af-chattext'); ctx.el.dataset.fokus = '1'; return chatAntwort(ctx, i ? i.value : ''); }
    if (t.closest('.af-neu')){ clearTimeout(z.timer); Object.assign(z, TYPEN.chat.zustand(), {geloest:z.geloest, ctx}); return chatWeiter(z, a); }
    if (z.tippt && z.weiter && t.closest('.af-verlauf')){ clearTimeout(z.timer); return z.weiter(); }
    return;
  }
  const w = t.closest('[data-w]');
  if (w && a.typ === 'wahrheit'){
    if (z.geloest || z.ok[w.dataset.w]) return;
    const v = z.ein[w.dataset.w];
    z.ein[w.dataset.w] = v == null ? true : !v; delete z.ok[w.dataset.w]; z.fb = null;
    ctx.zeichne(); const neu = ctx.el.querySelector(`[data-w="${w.dataset.w}"]`); if (neu) neu.focus();
    return;
  }
  const o = t.closest('[data-opt]');
  if (o && a.typ === 'mc'){
    if (z.geloest) return;
    const i = +o.dataset.opt;
    if (mehrfach(a)){ z.sel.has(i) ? z.sel.delete(i) : z.sel.add(i); } else z.sel = new Set([i]);
    z.geprueft = false; z.fb = null;
    return ctx.typ.sofort(a) ? pruefe(ctx) : ctx.zeichne();
  }
  if (a.typ === 'zuordnen' || (a.typ === 'luecken' && a.ziehen)){
    const k = t.closest('[data-karte]'), zo = t.closest('[data-zone]');
    // Lückentext: Wort in einer Lücke antippen (nichts gewählt) → zurück in die Wortbank
    if (k && a.typ === 'luecken' && z.wahl == null && z.platz[+k.dataset.karte] != null && !z.fix[+k.dataset.karte]){ legen(ctx, +k.dataset.karte, ''); return ctx.zeichne(); }
    const inLuecke = k && a.typ === 'luecken' && z.platz[+k.dataset.karte] != null && z.wahl != null && z.wahl !== +k.dataset.karte;
    if (k && !z.fix[+k.dataset.karte] && !inLuecke){ z.wahl = z.wahl === +k.dataset.karte ? null : +k.dataset.karte; z.weg = []; return ctx.zeichne(); }
    if (zo && z.wahl != null){ legen(ctx, z.wahl, zo.dataset.zone); z.wahl = null; return ctx.zeichne(); }
  }
  if (a.typ === 'buchungssatz'){
    const p = t.closest('[data-plus]'), w = t.closest('[data-weg]'), bt = t.closest('[data-betrag]'), feld = t.closest('.af-zahl[data-seite]');
    if (bt){ z.bwahl = z.bwahl === +bt.dataset.betrag ? null : +bt.dataset.betrag; return ctx.zeichne(); }
    if (feld && z.bwahl != null){ betragSetzen(ctx, feld, z.bwahl); return; }
    if (p){ z[p.dataset.plus].push({k:'', b:''}); return ctx.zeichne(); }
    if (w){ z[w.dataset.weg].splice(+w.dataset.i, 1); return ctx.zeichne(); }
  }
});
document.addEventListener('input', e => {
  const ctx = ctxVon(e.target); if (!ctx) return;
  const t = e.target, d = t.dataset;
  if (d.f != null) ctx.z.ein[d.f] = t.value;
  else if (d.seite) ctx.z[d.seite][+d.i][d.w] = t.value;
});
document.addEventListener('change', e => {
  const ctx = ctxVon(e.target); if (!ctx || e.target.dataset.l == null) return;
  ctx.z.wahl[e.target.dataset.l] = e.target.value; delete ctx.z.ok[e.target.dataset.l]; e.target.className = '';
});
document.addEventListener('keydown', e => {
  if (e.target.matches && e.target.matches('.af-konto')) return kwTaste(e);
  if (e.key !== 'Enter') return;
  const ctx = ctxVon(e.target); if (!ctx) return;
  if (e.target.matches('.af-chattext')){ e.preventDefault(); ctx.el.dataset.fokus = '1'; chatAntwort(ctx, e.target.value); }
  else if (e.target.matches('input')){ e.preventDefault(); pruefe(ctx); }
  else if (e.target.matches('[data-karte]')){ e.preventDefault(); e.target.click(); }
});

/* Zuordnen: Ziehen mit Maus, Stift oder Finger */
let zieht = false, zug = null;
function legen(ctx, i, zone){
  const z = ctx.z; if (z.fix[i]) return;
  if (ctx.typ.legen) ctx.typ.legen(z, i, zone); else if (!zone) delete z.platz[i]; else z.platz[i] = zone;
  z.weg = []; z.fb = null;
}
document.addEventListener('pointerdown', e => {
  const k = e.target.closest && e.target.closest('.af-karte'); if (!k || k.classList.contains('fix')) return;
  zug = {ctx:ctxVon(k), i:+k.dataset.karte, el:k, x:e.clientX, y:e.clientY, geist:null};
});
document.addEventListener('pointermove', e => {
  if (!zug) return;
  if (!zug.geist){
    if (Math.hypot(e.clientX - zug.x, e.clientY - zug.y) < 6) return;
    zug.geist = zug.el.cloneNode(true); zug.geist.className = 'af-karte af-geist'; document.body.appendChild(zug.geist);
    zug.el.classList.add('quelle'); zieht = true;
  }
  e.preventDefault();
  zug.geist.style.left = (e.clientX - 110) + 'px'; zug.geist.style.top = (e.clientY - 18) + 'px';
  zug.ctx.el.querySelectorAll('.ziel').forEach(x => x.classList.remove('ziel'));
  const ziel = document.elementFromPoint(e.clientX, e.clientY), zo = ziel && ziel.closest('.af-zone');
  if (zo && zug.ctx.el.contains(zo)) zo.classList.add('ziel');
});
document.addEventListener('pointerup', e => {
  if (!zug) return;
  const g = zug; zug = null;
  if (!g.geist) return;
  g.geist.remove();
  const ziel = document.elementFromPoint(e.clientX, e.clientY), zo = ziel && ziel.closest('[data-zone]');
  if (zo && g.ctx.el.contains(zo)) legen(g.ctx, g.i, zo.dataset.zone);
  g.ctx.zeichne(); setTimeout(() => { zieht = false; }, 0);
});
document.addEventListener('pointercancel', () => { if (zug && zug.geist){ zug.geist.remove(); zug.ctx.zeichne(); } zug = null; zieht = false; });

/* Buchungssatz: Konto suchen – Liste unter dem Feld, gefiltert nach Nummer oder Kürzel */
function kontoTreffer(konten, q){
  q = String(q || '').trim().toLowerCase();
  if (!q) return konten.slice();
  const wert = k => { k = k.toLowerCase(); return k.split(/\s+/).some(w => w.startsWith(q)) ? 0 : k.includes(q) ? 1 : 2; };
  return konten.map(k => [wert(k), k]).filter(x => x[0] < 2).sort((x, y) => x[0] - y[0]).map(x => x[1]);
}
let KW = null;   // offene Liste {inp, l (Treffer), i (markiert), box}
function kwZu(){ if (KW){ KW.box.remove(); KW.inp.setAttribute('aria-expanded', 'false'); KW = null; } }
function kwZeige(inp){
  const ctx = ctxVon(inp); if (!ctx) return;
  const voll = ctx.a.konten.includes(inp.value);   // schon gewähltes Konto: ganze Liste zeigen
  const l = kontoTreffer(ctx.a.konten, voll ? '' : inp.value);
  if (!KW || KW.inp !== inp){ kwZu(); const box = document.createElement('div'); box.className = 'af-kliste'; box.setAttribute('role', 'listbox'); inp.parentNode.appendChild(box); KW = {inp, box}; }
  KW.l = l; KW.i = l.length ? Math.max(0, voll ? l.indexOf(inp.value) : 0) : -1;
  KW.box.innerHTML = l.length ? l.map((k, j) => `<div class="af-kopt${j === KW.i ? ' an' : ''}" role="option" data-konto="${esc(k)}">${esc(k)}</div>`).join('') : '<div class="af-kleer">kein passendes Konto</div>';
  inp.setAttribute('aria-expanded', 'true');
}
function kwWahl(inp, k){
  const ctx = ctxVon(inp); kwZu(); if (!ctx) return;
  const {seite, i} = inp.dataset;
  ctx.z[seite][+i].k = k; ctx.z.fb = null; ctx.zeichne();
  const b = ctx.el.querySelector(`.af-zahl[data-seite="${seite}"][data-i="${i}"]`); if (b) b.focus();
}
function kwTaste(e){
  const inp = e.target;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){
    e.preventDefault(); if (!KW || KW.inp !== inp) return kwZeige(inp);
    if (!KW.l.length) return;
    KW.i = (KW.i + (e.key === 'ArrowDown' ? 1 : -1) + KW.l.length) % KW.l.length;
    KW.box.querySelectorAll('.af-kopt').forEach((o, j) => o.classList.toggle('an', j === KW.i));
    const o = KW.box.children[KW.i]; if (o && o.scrollIntoView) o.scrollIntoView({block:'nearest'});
  } else if (e.key === 'Enter'){
    e.preventDefault(); if (KW && KW.inp === inp && KW.l[KW.i]) kwWahl(inp, KW.l[KW.i]);
  } else if (e.key === 'Escape' && KW){ e.preventDefault(); kwZu(); }
}
document.addEventListener('focusin', e => { if (e.target.matches && e.target.matches('.af-konto')){ e.target.select(); kwZeige(e.target); } });
document.addEventListener('input', e => { if (e.target.matches && e.target.matches('.af-konto')) kwZeige(e.target); });
document.addEventListener('pointerdown', e => {
  const o = e.target.closest && e.target.closest('.af-kopt');
  if (o && KW){ e.preventDefault(); kwWahl(KW.inp, o.dataset.konto); }
});
// Feld verlassen: eindeutige Eingabe („ve“, „4400“) wird zum Konto, sonst bleibt der Text (Prüfen meldet es)
document.addEventListener('focusout', e => {
  const inp = e.target; if (!inp.matches || !inp.matches('.af-konto')) return;
  const ctx = ctxVon(inp); if (KW && KW.inp === inp) kwZu(); if (!ctx) return;
  const v = inp.value.trim(), K = ctx.a.konten, lv = v.toLowerCase(), t = kontoTreffer(K, v);
  const k = !v ? '' : K.find(x => x.toLowerCase() === lv || x.toLowerCase().split(/\s+/).includes(lv)) || (t.length === 1 ? t[0] : null);
  if (k !== null){ inp.value = k; ctx.z[inp.dataset.seite][+inp.dataset.i].k = k; }
});

/* Buchungssatz: Betrag aus der Liste (betraege) in ein Betragsfeld legen – antippen oder ziehen */
function betragSetzen(ctx, feld, i){
  ctx.z[feld.dataset.seite][+feld.dataset.i].b = zahlText(ctx.a.betraege[i][1]);
  ctx.z.bwahl = null; ctx.z.fb = null; ctx.zeichne();
}
let bzug = null;
document.addEventListener('pointerdown', e => {
  const b = e.target.closest && e.target.closest('.af-betrag'); if (!b) return;
  bzug = {ctx:ctxVon(b), i:+b.dataset.betrag, el:b, x:e.clientX, y:e.clientY, geist:null};
});
document.addEventListener('pointermove', e => {
  if (!bzug) return;
  if (!bzug.geist){
    if (Math.hypot(e.clientX - bzug.x, e.clientY - bzug.y) < 6) return;
    bzug.geist = bzug.el.cloneNode(true); bzug.geist.classList.add('af-geist'); document.body.appendChild(bzug.geist);
  }
  e.preventDefault();
  bzug.geist.style.left = (e.clientX - 50) + 'px'; bzug.geist.style.top = (e.clientY - 18) + 'px';
  bzug.ctx.el.querySelectorAll('.af-zahl.ziel').forEach(x => x.classList.remove('ziel'));
  const ziel = document.elementFromPoint(e.clientX, e.clientY), f = ziel && ziel.closest('.af-zahl[data-seite]');
  if (f && bzug.ctx.el.contains(f)) f.classList.add('ziel');
});
document.addEventListener('pointerup', e => {
  if (!bzug) return;
  const g = bzug; bzug = null;
  if (!g.geist) return;
  g.geist.remove();
  const ziel = document.elementFromPoint(e.clientX, e.clientY), f = ziel && ziel.closest('.af-zahl[data-seite]');
  if (f && g.ctx.el.contains(f)) betragSetzen(g.ctx, f, g.i); else g.ctx.zeichne();
  zieht = true; setTimeout(() => { zieht = false; }, 0);   // kein Klick (Antippen) hinterher
});
document.addEventListener('pointercancel', () => { if (bzug && bzug.geist){ bzug.geist.remove(); bzug.ctx.zeichne(); } bzug = null; });

/* ---------- Sequenz (Erarbeitung aus Schritten) ---------- */
function sequenz(cfg){
  const root = typeof cfg.el === 'string' ? document.querySelector(cfg.el) : cfg.el, S = cfg.schritte, KEY = cfg.key + '-stand';
  let stand = {}; try { stand = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
  if (!stand.erledigt) stand.erledigt = {};
  const speichern = () => { try { localStorage.setItem(KEY, JSON.stringify(stand)); } catch (e) {} if (window.TrainerSync) TrainerSync.changed(); };
  const istAufgabe = s => !!(s.aufgaben && s.aufgaben.length), anzahl = S.filter(istAufgabe).length;
  let akt = Math.min(Math.max(stand.schritt || 0, 0), S.length - 1);
  root.innerHTML = '<div class="af-kopf"><nav class="af-schritte" aria-label="Schritte"></nav><span class="af-zaehler"></span></div><main class="karte af-inhalt" aria-live="polite"></main>';
  const nav = root.querySelector('.af-schritte'), inhalt = root.querySelector('.af-inhalt'), zaehler = root.querySelector('.af-zaehler');
  function erledigt(s){
    const erstmals = !stand.erledigt[s.id];
    stand.erledigt[s.id] = true; speichern();
    if (istAufgabe(s) && window.TrainerSync) TrainerSync.event({modus:'erarbeitung', stufe:0, aufgabe:s.id, titel:s.titel || s.kurz, gesamt:anzahl, erstmals});
    leiste();
  }
  function leiste(){
    nav.innerHTML = S.map((x, i) => `<button class="btn${i === akt ? ' on' : ''}${stand.erledigt[x.id] ? ' erl' : ''}" type="button" data-schritt="${i}"${i === akt ? ' aria-current="step"' : ''}>${x.kurz}</button>`).join('');
    zaehler.textContent = anzahl ? `${S.filter(x => istAufgabe(x) && stand.erledigt[x.id]).length} von ${anzahl} Aufgaben gelöst` : '';
  }
  function zeichne(oben){
    const s = S[akt];
    leiste();
    inhalt.innerHTML = (istAufgabe(s) && stand.erledigt[s.id] ? '<p class="af-erledigt">✓ Diesen Schritt hast du schon gelöst. Du kannst ihn noch einmal bearbeiten.</p>' : '')
      + (typeof s.html === 'function' ? s.html() : s.html || '')
      + erinnerungHTML(s)
      + (s.material ? `<div class="material">${s.material}</div>` : '')
      + (s.aufgaben || []).map(() => '<div class="af-aufgabe"></div>').join('')
      + `<div class="af-unten"><button class="btn" type="button" data-weiter="-1"${akt ? '' : ' disabled'}>◀ Zurück</button><button class="btn haupt" type="button" data-weiter="1"${akt < S.length - 1 ? '' : ' disabled'}>Weiter ▶</button></div>`;
    const plaetze = inhalt.querySelectorAll(':scope > .af-aufgabe');
    (s.aufgaben || []).forEach((a, i) => baue(plaetze[i], a, {fertig:() => { if (s.aufgaben.every(x => geloest(x))) erledigt(s); }}));
    if (s.nach) s.nach(inhalt);
    if (oben) window.scrollTo(0, 0);
  }
  const geloest = a => !!(a._z && a._z.geloest);
  function gehe(i){
    if (!istAufgabe(S[akt]) && i > akt && !stand.erledigt[S[akt].id]) erledigt(S[akt]);
    akt = Math.min(Math.max(i, 0), S.length - 1); stand.schritt = akt; speichern(); zeichne(true);
  }
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-schritt], [data-weiter]'); if (!b || !root.contains(b)) return;
    if (b.dataset.schritt != null) gehe(+b.dataset.schritt); else gehe(akt + +b.dataset.weiter);
  });
  zeichne();
  return {gehe, get schritt(){ return akt; }, stand};
}

/* ---------- Endlos (zufällige Aufgaben je Stufe, Serie und Rekord) ---------- */
const FLAMME = n => `<svg viewBox="0 0 32 40" aria-hidden="true"><path d="M16 2C18 9 27 14 27 26C27 33 22 38 16 38C10 38 5 33 5 26C5 20 9 16 11 11C12 15 13 17 15 18C16 13 17 8 16 2Z"/><text x="16" y="32" text-anchor="middle">${n}</text></svg>`;
function endlos(cfg){
  const root = typeof cfg.el === 'string' ? document.querySelector(cfg.el) : cfg.el, ST = cfg.stufen, KEY = cfg.key + '-endlos';
  let stand = {}; try { stand = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
  if (!stand.rekord) stand.rekord = {};
  let stufe = Math.min(Math.max(stand.stufe || 1, 1), ST.length), serie = 0, akt = null, geloest = false;
  const speichern = () => { try { localStorage.setItem(KEY, JSON.stringify(stand)); } catch (e) {} if (window.TrainerSync) TrainerSync.changed(); };
  root.innerHTML = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="af-fg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#d9230f"/><stop offset=".55" stop-color="#ff7a00"/><stop offset="1" stop-color="#ffd23f"/></linearGradient></defs></svg>'
    + '<div class="af-kopf"><nav class="af-flammen" aria-label="Stufen"></nav><span class="af-serie"></span></div>'
    + '<main class="karte af-inhalt" aria-live="polite"><h2 class="af-stufe"></h2><div class="af-aufgabe"></div>'
    + '<div class="af-unten"><button class="btn" type="button" data-anders>↻ Andere Aufgabe</button><button class="btn haupt" type="button" data-naechste>Nächste Aufgabe ▶</button></div></main>';
  const $ = s => root.querySelector(s);
  function kopf(){
    $('.af-flammen').innerHTML = ST.map((x, i) => `<button class="af-flamme${i + 1 === stufe ? ' on' : ''}" type="button" data-stufe="${i + 1}" title="Stufe ${i + 1}: ${esc(x.name)}" aria-label="Stufe ${i + 1}: ${esc(x.name)}" aria-pressed="${i + 1 === stufe}">${FLAMME(i + 1)}</button>`).join('');
    $('.af-serie').innerHTML = `🔥 Serie: <b>${serie}</b> <span class="muted">· Rekord ${stand.rekord[stufe] || 0}</span>`;
    $('.af-stufe').textContent = `Stufe ${stufe}: ${ST[stufe - 1].name}`;
    $('[data-naechste]').disabled = !geloest;
    $('[data-anders]').disabled = geloest;
  }
  function neu(){
    geloest = false; akt = ST[stufe - 1].neu();
    baue($('.af-aufgabe'), akt, {fertig:() => {
      if (geloest) return;
      geloest = true; serie++;
      if (serie > (stand.rekord[stufe] || 0)){ stand.rekord[stufe] = serie; speichern(); }
      if (window.TrainerSync) TrainerSync.event({modus:'endlos', stufe, aufgabe:'s' + stufe, titel:ST[stufe - 1].name, gesamt:0, erstmals:true});
      kopf(); $('[data-naechste]').focus();
    }});
    kopf();
  }
  function setze(n){ stufe = n; stand.stufe = n; serie = 0; speichern(); neu(); }
  root.addEventListener('click', e => {
    const f = e.target.closest('[data-stufe]'); if (f) return setze(+f.dataset.stufe);
    if (e.target.closest('[data-anders]')){ serie = 0; return neu(); }
    if (e.target.closest('[data-naechste]') && geloest) return neu();
  });
  neu();
  return {neu, stufe:setze};
}

window.Aufgaben = {baue, sequenz, endlos, mc, mehrfach, finde, zahl, eur, mischen, esc, bsText, TYPEN};
})();
