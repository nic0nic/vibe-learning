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
 *                Szenario (verzweigter Chat, alles optional, alte Chats laufen unverändert): Nachricht als Objekt mit
 *                  id:'kredit' (Sprungziel), weiter:'id' (danach dorthin statt zur nächsten), ende:true (Chat endet hier);
 *                  Antwort-Knopf mit weiter:'id' bzw. ende:true (gilt vor weiter/ende der Frage).
 *                  Frage, bei der kein Knopf ok:true hat = Entscheidung: zählt nicht als Frage, r erscheint neutral.
 *   buchungssatz konten:['2800 BK', …] (Auswahl), soll:[['0700 MA', 40000], …], haben:[…],
 *                steuer:['2600 VORST', '4800 UST'] (für den Hinweis), nebenrechnung (HTML nach Lösung),
 *                betraege:[['Rechnungsbetrag', 11900], ['', 238], …] → Beträge (z. B. aus einer Kalkulation davor) zum Ziehen,
 *                Bezeichnung darf leer sein (dann nur der Betrag);
 *                auf die Betragsfelder oder erst Betrag, dann Feld antippen; auch Ablenker, mehrfach nutzbar,
 *                jgst:7 → Konten nur mit Kürzel ohne Nummer (konten:['BK', 'UEFE', 'UST']).
 *                Konto eintippen: Liste filtert nach Nummer oder Kürzel (z. B. „ve“ → 4400 VE).
 *                „an“ steht wie im Heft auf der Zeile des letzten Soll-Kontos neben dem ersten Haben-Konto.
 *                prüft: Konten, Soll/Haben vertauscht, fehlende Steuer, Beträge; Lösung im Skill-Format
 *
 * EXPERIMENTELL (Branch beta, Liste in Aufgaben.EXPERIMENTELL): Format und Bedienung können sich noch ändern.
 *   reihenfolge  karten:['erster Schritt', 'zweiter Schritt', …] in der richtigen Reihenfolge (HTML erlaubt), werden gemischt;
 *                ziehen, ▲ ▼ oder erst Karte, dann Zielstelle antippen. mono:true → Karten sind reiner Text in
 *                Schreibmaschinenschrift (Codezeilen, Einrückung bleibt). h (Hinweis bei Fehler). Gleiche Texte sind austauschbar.
 *   offen        Freie Antwort mit Selbstkontrolle: muster (Musterlösung, HTML), kriterien:['nennt …', 'begründet …'] (zum Abhaken,
 *                optional), zeilen (Höhe des Textfelds, Std. 5), min (Mindestzahl Zeichen, Std. 1). Ablauf: schreiben →
 *                „Musterlösung zeigen“ → abhaken → abschließen (= gelöst, unabhängig von den Haken). Der Text wird nicht gespeichert.
 *   markieren    text:'Der [[Hund]] bellt.' – Stellen in [[…]] sind gesucht; angeklickt werden Wörter (Satzzeichen nicht) oder
 *                mit einheit:'zeile' ganze Zeilen (Zeile mit [[ ist gesucht). Reiner Text, Zeilenumbruch mit \n.
 *                mono:true (Code: Schreibmaschinenschrift, Trennung nur an Leerzeichen), anzahl:false (Anzahl nicht verraten), h.
 *   verbessern   Fehlersuche: text mit Zeilen (\n), Fehler als [[falsch|richtig|auch richtig]] (falsch wird angezeigt;
 *                [[zu viel|]] = Stelle löschen). Ablauf je Fehlerzeile: Zeile anklicken → alle falschen Stellen anklicken
 *                (nochmal = abwählen) → Prüfen → Stellen verbessern → Prüfen. Bei nur einer Zeile entfällt die Zeilenwahl.
 *                Stellen sind durch Leerzeichen getrennte Wörter bzw. die Klammern. mono:true (Code), gross:false (Groß/klein egal), h.
 *   beschriften  bild (Adresse oder data:image/…), alt, punkte:[{x:25, y:40, t:'Begriff'}] (x, y in Prozent des Bildes),
 *                extra:['Ablenker']; Begriffe aus der Wortbank auf die nummerierten Punkte ziehen (oder antippen).
 *   bloecke      Blöcke wie beim blockbasierten Programmieren zu einer Formel oder einem Ablauf zusammensetzen:
 *                bloecke:['Z', '=', 'K', '·', 'p', …] (Vorrat, reiner Text, beliebig oft nutzbar; einmal:true = jeder nur einmal),
 *                loesung:['Z', '=', …] (Reihenfolge) oder loesungen:[[…], […]], start:'Z =' (fester Text davor),
 *                gleichwertig:true → jede rechnerisch gleichwertige Formel zählt (braucht lib/formel.js; „=“ trennt die Seiten),
 *                senkrecht:true (Blöcke untereinander), mono:true, h.
 *   karteikarten karten:[{v:'Vorderseite', r:'Rückseite'}] (HTML), mischen:false; umdrehen, „Gewusst“/„Nicht gewusst“ –
 *                nicht gewusste Karten kommen wieder, gelöst, wenn alle gewusst sind.
 *   kreuzwort    woerter:[{w:'Bilanz', t:'Hinweis'}] – das Gitter entsteht von selbst (immer gleich); Buchstaben A–Z, Ä, Ö, Ü,
 *                ß wird SS, Leerzeichen und Bindestriche entfallen. Wörter ohne gemeinsamen Buchstaben stehen einzeln darunter.
 *   Eigene Typen können klick(ctx, ziel), eingabe(ctx, feld) → true = erledigt, taste(ctx, ereignis) → true = erledigt
 *   und legen(z, karte, zone, a) mitbringen (siehe die experimentellen Typen).
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
 *   Aufgaben.training({el, key, training, titel, fertig})  Aufgaben auf Zeit und/oder endlos (Schritt mit "training" im
 *       Aufgaben-JSON, Format im Kopf von lib/seite.js). Zahlen-Szenarien brauchen lib/formel.js (window.Formel).
 *       Feste Runde (anzahl) → Ergebnis + Bestleistung; ohne anzahl endlos: ein Fehler beendet die Serie.
 *       zeit {start, schritt, min}: Balken läuft ab, Zeit je Aufgabe = max(min, start + richtige · schritt).
 *       versuche:true → falsche Eingabe darf korrigiert werden (sonst sofort Fehler, Lösung kurz sichtbar).
 *       Je Stufe (training.stufen) auch eigene antwort ('mc' | 'eingabe') und zeit (null = ohne Zeit), z. B. vier Stufen
 *       „Auswählen“, „Auswählen auf Zeit“, „Eintippen“, „Eintippen auf Zeit“ mit denselben Aufgaben.
 *       Eigene Aufgaben (nur in Seiten mit eigenem Code, nicht im JSON): stufe.neu({mc}) → {frage (HTML), loesung (Text),
 *       optionen (bei mc: [{t, ok}], genau eine ok), pruefe(text) → 'ok' | 'fast' | 'falsch' (optional, sonst Vergleich mit loesung)}.
 *       Vorbild: IT/grundlagen/zahlensysteme.html
 *       training.variante() → Text (optional, nur mit Code): Bestleistung getrennt je Variante (z. B. „Binär + Dezimal“),
 *       '' = Standard. Ändert die Seite die Variante, schickt sie das Ereignis 'af-variante' an das .af-training-Element:
 *       das Training kehrt zum Startbild zurück (eine laufende Serie zählt dann nicht).
 *       Gespeichert: <key>-training {stufe, best:{stufe: n, "stufe:variante": n}}. Meldet je Runde/Serie TrainerSync.event (modus 'endlos'),
 *       fertig() nach der ersten Runde (bzw. ab training.ziel richtigen) oder einer Serie ab 10 (bzw. ziel).
 *       In Aufgaben.sequenz: schritt.training statt schritt.aufgaben.
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
      if (a.ziehen) return bankPruefen(a, z, z.teile.filter(Array.isArray).map(t => t[0]), 'Lücken', 'Ziehe zuerst Wörter in die Lücken.');
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
      else if (z.ende) ein = `<div class="af-chatende"><b>Geschafft!</b> ${z.fragen ? `Du hast ${z.punkte} von ${z.fragen} Fragen auf Anhieb richtig beantwortet.` : 'Du bist am Ende angekommen.'} <button class="btn klein af-neu" type="button">Noch einmal</button></div>`;
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
        + a.betraege.map(([t, b], i) => `<span class="af-betrag${z.bwahl === i ? ' gewaehlt' : ''}" data-betrag="${i}" tabindex="0" role="button">${t ? `<small>${esc(t)}</small>` : ''}${esc(zahlText(b))} €</span>`).join('') + '</div></div>' : '';
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

/* ---------- Experimentelle Typen (Branch beta): Format kann sich noch ändern ---------- */
const EXPERIMENTELL = ['reihenfolge', 'offen', 'markieren', 'verbessern', 'beschriften', 'bloecke', 'karteikarten', 'kreuzwort'];
// Aufgabe als gelöst melden (für Typen mit eigenem Ablauf statt „Prüfen“)
function loese(ctx, t){
  const z = ctx.z, neu = !z.geloest;
  z.fb = t ? {ok:true, t} : null; z.geloest = true; ctx.zeichne();
  if (neu && ctx.opt.fertig) ctx.opt.fertig(ctx.a);
}
const fokus = (ctx, sel) => { const e = ctx.el.querySelector(sel); if (e) e.focus({preventScroll:true}); };
// Wortbank prüfen (Lückentext mit ziehen, Beschriften): richtige Wörter bleiben liegen, falsche gehen zurück
function bankPruefen(a, z, richtig, was, leer){
  const n = richtig.length;
  z.weg = []; z.wahl = null;
  Object.keys(z.platz).forEach(w => {
    const i = +z.platz[w].slice(1);
    if (z.woerter[w] === richtig[i]){ z.fix[w] = true; z.ok[i] = true; } else { z.weg.push(+w); delete z.platz[w]; }
  });
  const k = nummern(n).filter(i => z.ok[i]).length;
  if (k === n) return {ok:true, t:'✓ ' + (a.ok || 'Alles richtig!')};
  if (!k && !z.weg.length) return {ok:false, t:leer};
  return {ok:false, t:`${k} von ${n} ${was} richtig. ${z.weg.length ? `${z.weg.length} ${z.weg.length === 1 ? 'Wort ist' : 'Wörter sind'} zurück in die Wortbank gewandert.` : ''}`};
}
// Text mit [[…]] in Stücke: {t (Text), teile (Inhalt der Klammer an | getrennt) oder null, leer (nur Leerraum)}
function stuecke(text, trenner){
  const out = [];
  String(text).split(/\[\[([\s\S]*?)\]\]/).forEach((s, i) => {
    if (i % 2){ const teile = s.split('|'); out.push({t:teile[0], teile}); }
    else s.split(trenner).forEach(w => { if (w) out.push({t:w, teile:null, leer:/^\s+$/.test(w)}); });
  });
  return out;
}
const WORT_TRENNER = /(\s+|[.,;:!?()„“”"«»]+)/, CODE_TRENNER = /(\s+)/;
const gleichText = (x, y, gross) => { const n = s => String(s).replace(/\s+/g, ' ').trim(); return gross === false ? n(x).toLowerCase() === n(y).toLowerCase() : n(x) === n(y); };
// Formeln aus Blöcken: gleichwertig, wenn beide Seiten jeder Gleichung für zufällige Werte dasselbe ergeben (lib/formel.js)
function formelGleich(x, y){
  const F = window.Formel; if (!F) return false;
  try {
    const X = x.split('=').map(s => s.trim()), Y = y.split('=').map(s => s.trim());
    if (X.length !== Y.length || X.some(s => !s)) return false;
    const namen = [...new Set([...X, ...Y].flatMap(s => F.namen(s)))];
    for (let k = 0; k < 6; k++){
      const w = {}; namen.forEach(n => { w[n] = 1 + Math.round(Math.random() * 9000) / 100; });
      for (let i = 0; i < X.length; i++){ const p = F.wert(X[i], w), q = F.wert(Y[i], w); if (!isFinite(p) || !isFinite(q) || Math.abs(p - q) > 1e-6 * Math.max(1, Math.abs(q))) return false; }
    }
    return true;
  } catch (e) { return false; }
}
// Kreuzworträtsel: Wort → Großbuchstaben ohne Leerzeichen (ß → SS), Gitter immer gleich aus der Wortliste gebaut
const kwWort = w => String(w == null ? '' : w).toUpperCase().replace(/[^A-ZÄÖÜ]/g, '');
function kwLayout(liste){
  const W = liste.map((x, i) => ({i, w:kwWort(x.w), t:x.t})).filter(x => x.w.length > 1);
  const G = {}, R = {}, liegt = [], k = (r, c) => r + ',' + c;
  let b = null;   // Rahmen {r0, r1, c0, c1}
  function passt(w, r, c, quer){
    const dr = quer ? 0 : 1, dc = quer ? 1 : 0;
    if (G[k(r - dr, c - dc)] || G[k(r + dr * w.length, c + dc * w.length)]) return -1;
    let kreuz = 0;
    for (let n = 0; n < w.length; n++){
      const rr = r + dr * n, cc = c + dc * n, g = G[k(rr, cc)];
      if (g){ if (g !== w[n] || R[k(rr, cc)].includes(quer ? 'q' : 's')) return -1; kreuz++; }
      else if (G[k(rr + dc, cc + dr)] || G[k(rr - dc, cc - dr)]) return -1;
    }
    return kreuz;
  }
  function lege(x, r, c, quer){
    for (let n = 0; n < x.w.length; n++){ const key = k(r + (quer ? 0 : n), c + (quer ? n : 0)); G[key] = x.w[n]; R[key] = (R[key] || '') + (quer ? 'q' : 's'); }
    const r1 = r + (quer ? 0 : x.w.length - 1), c1 = c + (quer ? x.w.length - 1 : 0);
    b = b ? {r0:Math.min(b.r0, r), r1:Math.max(b.r1, r1), c0:Math.min(b.c0, c), c1:Math.max(b.c1, c1)} : {r0:r, r1, c0:c, c1};
    liegt.push({i:x.i, w:x.w, t:x.t, r, c, quer});
  }
  let rest = W.slice().sort((x, y) => y.w.length - x.w.length);
  if (rest.length) lege(rest.shift(), 0, 0, true);
  for (let weiter = true; weiter && rest.length;){
    weiter = false;
    for (const x of rest.slice()){
      let best = null;
      Object.keys(G).forEach(key => {
        const [r, c] = key.split(',').map(Number);
        for (let n = 0; n < x.w.length; n++){
          if (x.w[n] !== G[key]) continue;
          [[r, c - n, true], [r - n, c, false]].forEach(([pr, pc, quer]) => {
            const kreuz = passt(x.w, pr, pc, quer); if (kreuz < 1) return;
            const r1 = pr + (quer ? 0 : x.w.length - 1), c1 = pc + (quer ? x.w.length - 1 : 0);
            const h = Math.max(b.r1, r1) - Math.min(b.r0, pr) + 1, br = Math.max(b.c1, c1) - Math.min(b.c0, pc) + 1;
            const wert = kreuz * 1000 - h * br - Math.abs(h - br) - (br > 14 ? 500 : 0);
            if (!best || wert > best.wert) best = {wert, pr, pc, quer};
          });
        }
      });
      if (best){ lege(x, best.pr, best.pc, best.quer); rest = rest.filter(y => y !== x); weiter = true; }
    }
  }
  rest.forEach(x => lege(x, b.r1 + 2, b.c0, true));   // passt nirgends: eigene Zeile darunter
  if (!b) return {zeilen:0, spalten:0, zellen:{}, eintraege:[]};
  const zellen = {}, eintraege = liegt.map(x => Object.assign({}, x, {r:x.r - b.r0, c:x.c - b.c0})).sort((x, y) => x.r - y.r || x.c - y.c || (y.quer - x.quer));
  let nr = 0;
  eintraege.forEach((e, j) => {
    const vor = eintraege.slice(0, j).find(v => v.r === e.r && v.c === e.c);
    e.nr = vor ? vor.nr : ++nr; e.zellen = [];
    for (let n = 0; n < e.w.length; n++){
      const key = k(e.r + (e.quer ? 0 : n), e.c + (e.quer ? n : 0)), z = zellen[key] || (zellen[key] = {b:e.w[n]});
      z[e.quer ? 'q' : 's'] = j; if (!n) z.nr = e.nr; e.zellen.push(key);
    }
  });
  return {zeilen:b.r1 - b.r0 + 1, spalten:b.c1 - b.c0 + 1, zellen, eintraege};
}
function kwAktiv(ctx){   // aktives Wort im Gitter und in der Liste hervorheben
  const z = ctx.z, c = z.L.zellen[z.akt], j = c ? (z.quer ? c.q : c.s) : null, e = j != null ? z.L.eintraege[j] : null;
  ctx.el.querySelectorAll('.af-kwi').forEach(i => i.classList.toggle('akt', !!e && e.zellen.includes(i.dataset.kw)));
  ctx.el.querySelectorAll('[data-kwe]').forEach(l => l.classList.toggle('akt', +l.dataset.kwe === j));
}
function kwGehe(ctx, key, quer){
  const z = ctx.z, c = z.L.zellen[key]; if (!c) return false;
  if (quer != null) z.quer = quer;
  if ((z.quer ? c.q : c.s) == null) z.quer = c.q != null;
  z.akt = key;
  const i = ctx.el.querySelector(`.af-kwi[data-kw="${key}"]`); if (i){ i.focus({preventScroll:true}); if (i.select) i.select(); }
  kwAktiv(ctx); return true;
}
const kwNeben = (key, quer, d) => { const [r, c] = key.split(',').map(Number); return quer ? r + ',' + (c + d) : (r + d) + ',' + c; };

Object.assign(TYPEN, {
  reihenfolge:{
    zustand(a){
      const n = a.karten.length, sortiert = o => o.every((i, p) => a.karten[i] === a.karten[p]);
      let ord = mischen(nummern(n));
      for (let k = 0; k < 8 && n > 1 && sortiert(ord); k++) ord = mischen(nummern(n));
      if (n > 1 && sortiert(ord)) ord.push(ord.shift());
      return {ord, ok:{}, fix:{}, weg:[], wahl:null};
    },
    legen(z, i, zone){ if (zone[0] !== 'P') return; z.ord.splice(z.ord.indexOf(i), 1); z.ord.splice(+zone.slice(1), 0, i); z.ok = {}; z.wahl = null; },
    html(a, z){
      const n = z.ord.length;
      return `<div class="af-hinweis">Bringe die Karten in die richtige Reihenfolge: ziehen, mit ▲ ▼ verschieben oder erst eine Karte, dann die Zielstelle antippen.</div><ol class="af-reihe${a.mono ? ' mono' : ''}">`
        + z.ord.map((i, p) => `<li class="af-zone af-rzeile${z.ok[p] === true ? ' richtig' : z.ok[p] === false ? ' falsch' : ''}" data-zone="P${p}"><span class="af-rnr">${p + 1}</span>`
          + `<div class="af-karte${z.geloest ? ' fix' : ''}${z.wahl === i ? ' gewaehlt' : ''}" data-karte="${i}" tabindex="0" role="button">${a.mono ? esc(a.karten[i]) : a.karten[i]}</div>`
          + (z.geloest ? '' : `<span class="af-rpfeile"><button type="button" class="af-rp" data-rp="${p}" data-d="-1" aria-label="nach oben"${p ? '' : ' disabled'}>▲</button><button type="button" class="af-rp" data-rp="${p}" data-d="1" aria-label="nach unten"${p < n - 1 ? '' : ' disabled'}>▼</button></span>`) + '</li>').join('') + '</ol>';
    },
    klick(ctx, t){
      const z = ctx.z; if (z.geloest) return;
      const rp = t.closest('[data-rp]'), k = t.closest('[data-karte]');
      if (rp){
        const p = +rp.dataset.rp, q = p + +rp.dataset.d;
        [z.ord[p], z.ord[q]] = [z.ord[q], z.ord[p]]; z.ok = {}; z.fb = null; z.wahl = null; ctx.zeichne();
        return fokus(ctx, `[data-rp="${q}"][data-d="${rp.dataset.d}"]:not(:disabled), [data-rp="${q}"]:not(:disabled)`);
      }
      if (!k) return;
      const i = +k.dataset.karte;
      if (z.wahl == null || z.wahl === i) z.wahl = z.wahl === i ? null : i;
      else legen(ctx, z.wahl, 'P' + z.ord.indexOf(i));
      ctx.zeichne();
    },
    pruefen(a, z){
      z.wahl = null;
      z.ord.forEach((i, p) => { z.ok[p] = a.karten[i] === a.karten[p]; });
      const k = z.ord.filter((i, p) => z.ok[p]).length, n = z.ord.length;
      return k === n ? {ok:true, t:'✓ ' + (a.ok || 'Die Reihenfolge stimmt!')} : {ok:false, t:`${k} von ${n} Karten stehen an der richtigen Stelle.${a.h ? ' ' + a.h : ''}`};
    }
  },
  offen:{
    zustand:() => ({ein:{}, haken:{}, phase:0}),
    sofort:() => true,
    html(a, z){
      const K = a.kriterien || [];
      let h = `<textarea class="feld af-offen" data-f="text" rows="${a.zeilen > 0 ? +a.zeilen : 5}" placeholder="Deine Antwort" aria-label="Deine Antwort"${z.phase ? ' readonly' : ''}>${esc(z.ein.text || '')}</textarea>`;
      if (!z.phase) return h + '<div class="af-knoepfe"><button class="btn haupt" type="button" data-offen="zeigen">Fertig – Musterlösung zeigen</button></div>';
      h += `<div class="af-muster"><div class="af-sk">Musterlösung</div>${a.muster}</div>`;
      if (K.length) h += `<div class="af-kriterien"><div class="af-sk">Selbstkontrolle: Hake ab, was deine Antwort enthält</div>`
        + K.map((k, i) => `<label><input type="checkbox" data-krit="${i}"${z.haken[i] ? ' checked' : ''}${z.phase > 1 ? ' disabled' : ''}> <span>${k}</span></label>`).join('') + '</div>';
      if (z.phase === 1) h += '<div class="af-knoepfe"><button class="btn" type="button" data-offen="zurueck">Antwort überarbeiten</button><button class="btn haupt" type="button" data-offen="fertig">Selbstkontrolle abschließen</button></div>';
      return h;
    },
    klick(ctx, t){
      const {a, z} = ctx, k = t.closest('[data-krit]'), b = t.closest('[data-offen]');
      if (k){ z.haken[k.dataset.krit] = k.checked; return; }
      if (!b) return;
      const tun = b.dataset.offen, min = a.min > 0 ? +a.min : 1;
      if (tun === 'zeigen'){
        if (String(z.ein.text || '').trim().length < min){ z.fb = {ok:false, t:min > 1 ? `Schreibe zuerst deine Antwort (mindestens ${min} Zeichen).` : 'Schreibe zuerst deine Antwort.'}; ctx.zeichne(); return fokus(ctx, '.af-offen'); }
        z.phase = 1; z.fb = null; return ctx.zeichne();
      }
      if (tun === 'zurueck'){ z.phase = 0; ctx.zeichne(); return fokus(ctx, '.af-offen'); }
      const K = a.kriterien || [], n = K.filter((x, i) => z.haken[i]).length;
      z.phase = 2;
      loese(ctx, '✓ ' + (K.length ? `Selbstkontrolle abgeschlossen: ${n} von ${K.length} ${K.length === 1 ? 'Punkt' : 'Punkten'} erfüllt.${n < K.length ? ' Vergleiche die fehlenden Punkte mit der Musterlösung.' : ''}` : (a.ok || 'Mit der Musterlösung verglichen.')));
    },
    pruefen:() => ({ok:false, t:''})
  },
  markieren:{
    zustand(a){
      const zeile = a.einheit === 'zeile';
      const teile = zeile ? String(a.text).split('\n').map(l => ({t:l.replace(/\[\[|\]\]/g, ''), ziel:/\[\[/.test(l), leer:!l.trim()}))
        : stuecke(a.text, a.mono ? CODE_TRENNER : WORT_TRENNER).map(s => ({t:s.t, ziel:!!s.teile, leer:!s.teile && (s.leer || !/[0-9A-Za-zÄÖÜäöüß]/.test(s.t)) && !a.mono || !!s.leer}));
      return {teile, zeile, sel:new Set(), st:{}};
    },
    html(a, z){
      const n = z.teile.filter(x => x.ziel).length, was = z.zeile ? ['Zeile', 'Zeilen'] : ['Stelle', 'Stellen'];
      const teil = (x, i) => x.leer ? esc(x.t) : `<button type="button" class="af-mw${z.sel.has(i) ? ' sel' : ''}${z.st[i] === 'ok' ? ' richtig' : z.st[i] === 'falsch' ? ' falsch' : ''}" data-mw="${i}" aria-pressed="${z.sel.has(i)}">${z.zeile ? `<span class="af-znr">${i + 1}</span><span>${esc(x.t)}</span>` : esc(x.t)}</button>`;
      return `<div class="af-hinweis">Klicke die gesuchten ${was[1]} an (nochmal klicken hebt die Markierung auf).${a.anzahl === false ? '' : ` Gesucht: ${n} ${was[n === 1 ? 0 : 1]}.`}</div>`
        + `<div class="af-mark${a.mono ? ' mono' : ''}${z.zeile ? ' zeilen' : ''}">${z.teile.map((x, i) => z.zeile && x.leer ? '<div class="af-mleer"></div>' : teil(x, i)).join('')}</div>`;
    },
    klick(ctx, t){
      const z = ctx.z, b = t.closest('[data-mw]'); if (!b || z.geloest) return;
      const i = +b.dataset.mw; if (z.st[i] === 'ok') return;
      Object.keys(z.st).forEach(k => { if (z.st[k] === 'falsch') delete z.st[k]; });
      z.sel.has(i) ? z.sel.delete(i) : z.sel.add(i); z.fb = null; ctx.zeichne(); fokus(ctx, `[data-mw="${i}"]`);
    },
    pruefen(a, z){
      if (!z.sel.size) return {ok:false, t:'Markiere zuerst etwas.'};
      let falsch = 0;
      [...z.sel].forEach(i => { if (z.teile[i].ziel) z.st[i] = 'ok'; else { z.st[i] = 'falsch'; z.sel.delete(i); falsch++; } });
      const n = z.teile.filter(x => x.ziel).length, k = z.sel.size;
      if (k === n && !falsch) return {ok:true, t:'✓ ' + (a.ok || 'Alles gefunden!')};
      return {ok:false, t:`${k} von ${n} gefunden.${falsch ? ` ${falsch} ${falsch === 1 ? 'Markierung war' : 'Markierungen waren'} falsch (rot).` : ''}${a.h ? ' ' + a.h : ''}`};
    }
  },
  verbessern:{
    zustand(a){
      const zeilen = String(a.text).split('\n').map(l => stuecke(l, CODE_TRENNER).map(s => ({t:s.t, lsg:s.teile ? s.teile.slice(1) : null, leer:!!s.leer})));
      const z = {zeilen, phase:'zeile', zeile:null, zFalsch:[], fertig:{}, sel:new Set(), wFalsch:[], ein:{}, eOk:{}};
      if (zeilen.length === 1){ z.zeile = 0; z.phase = 'wort'; }
      return z;
    },
    sofort:a => !!a._z && a._z.phase === 'zeile',
    html(a, z){
      const fehlerZ = z.zeilen.map((l, i) => l.some(x => x.lsg) ? i : -1).filter(i => i >= 0), rest = fehlerZ.filter(i => !z.fertig[i]).length, mehr = z.zeilen.length > 1;
      const info = z.geloest ? '' : z.phase === 'zeile' ? `<b>${rest === 1 ? 'In einer Zeile steckt' : `In ${rest} Zeilen stecken`} noch Fehler.</b> Klicke eine fehlerhafte Zeile an.`
        : z.phase === 'wort' ? `${mehr ? `<b>Richtig, in Zeile ${z.zeile + 1} steckt ein Fehler.</b> ` : ''}Klicke alle falschen Stellen an (nochmal klicken wählt wieder ab), dann „Prüfen“.`
        : 'Verbessere die markierten Stellen, dann „Prüfen“.';
      const zeile = (l, i) => {
        const nr = mehr ? `<span class="af-znr">${i + 1}</span>` : '';
        if (z.fertig[i]) return `<div class="af-vz fertig">${nr}<span class="af-vt">${l.map(x => x.lsg ? `<mark>${esc(x.neu)}</mark>` : esc(x.t)).join('')}</span></div>`;
        if (z.zeile !== i){
          const text = esc(l.map(x => x.t).join('')), aus = z.phase !== 'zeile' || z.zFalsch.includes(i) || !text.trim();
          return aus ? `<div class="af-vz${z.zFalsch.includes(i) ? ' falsch' : ''}">${nr}<span class="af-vt">${text}</span></div>` : `<button type="button" class="af-vz wahl" data-vz="${i}" aria-label="Zeile ${i + 1}">${nr}<span class="af-vt">${text}</span></button>`;
        }
        return `<div class="af-vz aktiv">${nr}<span class="af-vt">` + l.map((x, j) => {
          if (x.leer) return esc(x.t);
          if (z.phase === 'wort') return `<button type="button" class="af-mw${z.sel.has(j) ? ' sel' : ''}${z.wFalsch.includes(j) ? ' falsch' : ''}" data-vw="${j}" aria-pressed="${z.sel.has(j)}">${esc(x.t)}</button>`;
          if (!x.lsg) return esc(x.t);
          const v = z.ein[j] != null ? z.ein[j] : x.t;
          return `<input class="feld af-vin${z.eOk[j] === true ? ' richtig' : z.eOk[j] === false ? ' falsch' : ''}" data-f="${j}" value="${esc(v)}" size="${Math.max(4, Math.max(v.length, x.t.length) + 2)}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="„${esc(x.t)}“ verbessern">`;
        }).join('') + '</span></div>';
      };
      return (info ? `<div class="af-hinweis af-vinfo">${info}</div>` : '') + `<div class="af-verb${a.mono ? ' mono' : ''}">${z.zeilen.map(zeile).join('')}</div>`;
    },
    klick(ctx, t){
      const z = ctx.z, vz = t.closest('[data-vz]'), vw = t.closest('[data-vw]');
      if (z.geloest) return;
      if (vz && z.phase === 'zeile'){
        const i = +vz.dataset.vz;
        if (z.zeilen[i].some(x => x.lsg)){ z.zeile = i; z.phase = 'wort'; z.sel = new Set(); z.wFalsch = []; z.zFalsch = []; z.fb = null; }
        else { z.zFalsch.push(i); z.fb = {ok:false, t:`Zeile ${i + 1} ist in Ordnung. Sieh noch einmal genau hin.`}; }
        return ctx.zeichne();
      }
      if (vw && z.phase === 'wort'){
        const j = +vw.dataset.vw;
        z.sel.has(j) ? z.sel.delete(j) : z.sel.add(j); z.wFalsch = []; z.fb = null; ctx.zeichne(); fokus(ctx, `[data-vw="${j}"]`);
      }
    },
    pruefen(a, z){
      const l = z.zeilen[z.zeile], soll = l.map((x, j) => x.lsg ? j : -1).filter(j => j >= 0);
      if (z.phase === 'wort'){
        if (!z.sel.size) return {ok:false, t:'Klicke zuerst die falschen Stellen an.'};
        z.wFalsch = [...z.sel].filter(j => !l[j].lsg); z.wFalsch.forEach(j => z.sel.delete(j));
        const k = z.sel.size;
        if (k < soll.length || z.wFalsch.length) return {ok:false, t:`${k} von ${soll.length} ${soll.length === 1 ? 'Fehler' : 'Fehlern'} gefunden.${z.wFalsch.length ? ` ${z.wFalsch.length === 1 ? 'Eine markierte Stelle ist' : z.wFalsch.length + ' markierte Stellen sind'} in Ordnung (rot).` : ''}`};
        z.phase = 'text'; z.fok = true; z.ein = {}; z.eOk = {}; soll.forEach(j => { z.ein[j] = l[j].t; });
        return {gut:true, t:`✓ Gefunden. Verbessere jetzt ${soll.length === 1 ? 'die Stelle' : 'die Stellen'}.`};
      }
      if (z.phase !== 'text') return {ok:false, t:''};
      soll.forEach(j => { z.eOk[j] = l[j].lsg.some(x => gleichText(x, z.ein[j] == null ? '' : z.ein[j], a.gross)); });
      if (!soll.every(j => z.eOk[j])) return {ok:false, t:'Noch nicht richtig. Die rot markierten Stellen stimmen noch nicht.' + (a.h ? ' ' + a.h : '')};
      soll.forEach(j => { l[j].neu = String(z.ein[j]).trim(); });
      z.fertig[z.zeile] = true; z.zeile = null; z.phase = 'zeile'; z.sel = new Set(); z.zFalsch = [];
      if (z.zeilen.some((x, i) => !z.fertig[i] && x.some(y => y.lsg))) return {gut:true, t:'✓ Zeile verbessert. Suche den nächsten Fehler.'};
      return {ok:true, t:'✓ ' + (a.ok || 'Alle Fehler verbessert!')};
    },
    nach(el, a, z){ if (z.fok){ z.fok = false; const i = el.querySelector('.af-vin'); if (i){ i.focus({preventScroll:true}); i.select(); } } }
  },
  beschriften:{
    zustand(a){
      const richtig = a.punkte.map(p => p.t), sonst = [...new Set(a.extra || [])].filter(w => w && !richtig.includes(w));
      const woerter = [...richtig, ...sonst];
      return {woerter, platz:{}, fix:{}, ok:{}, weg:[], wahl:null, ord:mischen(nummern(woerter.length))};
    },
    legen:(z, i, zone) => TYPEN.luecken.legen(z, i, zone),
    html(a, z){
      const karte = i => `<span class="af-karte${z.fix[i] ? ' fix' : ''}${z.wahl === i ? ' gewaehlt' : ''}${z.weg.includes(i) ? ' weg' : ''}" data-karte="${i}" tabindex="0" role="button">${esc(z.woerter[i])}</span>`;
      const frei = z.ord.filter(i => z.platz[i] == null);
      return `<div class="af-pool af-bank" data-zone="">${frei.map(karte).join('') || '<span class="af-leer">Alle Begriffe sind verteilt.</span>'}</div>`
        + `<div class="af-bild"><img src="${esc(a.bild)}" alt="${esc(a.alt || '')}" draggable="false">` + a.punkte.map((p, i) => {
          const w = Object.keys(z.platz).find(k => z.platz[k] === 'L' + i);
          return `<span class="af-zone af-punkt${z.ok[i] === true ? ' richtig' : ''}${w != null ? ' voll' : ''}" data-zone="L${i}" style="left:${+p.x}%;top:${+p.y}%" aria-label="Punkt ${i + 1}">${w != null ? karte(+w) : `<b>${i + 1}</b>`}</span>`;
        }).join('') + '</div>';
    },
    pruefen:(a, z) => bankPruefen(a, z, a.punkte.map(p => p.t), 'Punkten', 'Ziehe zuerst Begriffe auf die Punkte im Bild.')
  },
  bloecke:{
    zustand:() => ({reihe:[], fix:{}, weg:[], wahl:null}),
    // Karten-Nummern: 0 … = Block im Vorrat, 1000 + Stelle = Block im Feld; Zonen: '' Vorrat, 'W' Feld (ans Ende), 'W<n>' vor Block n
    legen(z, i, zone, a){
      const ziel = zone === 'W' ? z.reihe.length : zone[0] === 'W' ? +zone.slice(1) : -1;
      if (i < 1000){ if (ziel >= 0 && !(a.einmal && z.reihe.includes(i))) z.reihe.splice(ziel, 0, i); return; }
      const j = i - 1000, x = z.reihe.splice(j, 1)[0];
      if (ziel >= 0) z.reihe.splice(ziel > j ? ziel - 1 : ziel, 0, x);
    },
    html(a, z){
      const frei = nummern(a.bloecke.length).filter(i => !(a.einmal && z.reihe.includes(i)));
      return `<div class="af-pool af-bank af-bvorrat${a.mono ? ' mono' : ''}" data-zone="">${frei.map(i => `<span class="af-karte af-block" data-karte="${i}" tabindex="0" role="button">${esc(a.bloecke[i])}</span>`).join('') || '<span class="af-leer">Alle Blöcke sind verbaut.</span>'}</div>`
        + `<div class="af-zone af-bfeld${a.senkrecht ? ' senkrecht' : ''}${a.mono ? ' mono' : ''}${z.geloest ? ' richtig' : ''}" data-zone="W">${a.start ? `<span class="af-bstart">${esc(a.start)}</span>` : ''}`
        + (z.reihe.map((i, j) => `<span class="af-karte af-block${z.geloest ? ' fix' : ''}" data-karte="${1000 + j}" data-zone="W${j}" tabindex="0" role="button">${esc(a.bloecke[i])}</span>`).join('') || '<span class="af-leer">Ziehe Blöcke hierher oder tippe sie an.</span>') + '</div>'
        + (z.geloest ? '' : '<div class="af-hinweis">Block antippen: ans Ende setzen bzw. wieder entfernen. Ziehen: an eine bestimmte Stelle.</div>');
    },
    klick(ctx, t){
      const z = ctx.z, k = t.closest('[data-karte]'); if (!k || z.geloest) return;
      const i = +k.dataset.karte;
      legen(ctx, i, i < 1000 ? 'W' : ''); ctx.zeichne();
    },
    pruefen(a, z){
      const ist = z.reihe.map(i => a.bloecke[i]), L = Array.isArray(a.loesungen) && a.loesungen.length ? a.loesungen : [a.loesung];
      if (!ist.length) return {ok:false, t:'Baue zuerst etwas aus den Blöcken.'};
      const gleich = l => l.length === ist.length && l.every((x, i) => x === ist[i]);
      if (L.some(gleich) || (a.gleichwertig && formelGleich(ist.join(' '), L[0].join(' ')))) return {ok:true, t:'✓ ' + (a.ok || 'Richtig gebaut!')};
      const vorn = Math.max(...L.map(l => { let n = 0; while (n < l.length && n < ist.length && l[n] === ist[n]) n++; return n; }));
      return {ok:false, t:'Noch nicht richtig.' + (!a.gleichwertig && vorn ? ` ${vorn === 1 ? 'Der erste Block stimmt' : `Die ersten ${vorn} Blöcke stimmen`}.` : '') + (a.h ? ' ' + a.h : '')};
    }
  },
  karteikarten:{
    zustand:a => ({stapel:a.mischen === false ? nummern(a.karten.length) : mischen(nummern(a.karten.length)), offen:false, gesehen:{}, sofort:0, ende:false}),
    sofort:() => true,
    html(a, z){
      const n = a.karten.length;
      if (z.ende) return `<div class="af-kk-ende"><button class="btn klein" type="button" data-kk="neu">↻ Noch einmal</button></div>`;
      const k = a.karten[z.stapel[0]];
      return `<div class="af-kk-info">Noch ${z.stapel.length} von ${n} ${n === 1 ? 'Karte' : 'Karten'}</div>`
        + `<div class="af-kk${z.offen ? ' offen' : ''}" data-kk="dreh" tabindex="0" role="button" aria-label="Karte umdrehen"><span class="af-sk">${z.offen ? 'Rückseite' : 'Vorderseite'}</span><div class="af-kk-text">${z.offen ? k.r : k.v}</div></div>`
        + (z.offen ? '<div class="af-knoepfe af-kk-knoepfe"><button class="btn" type="button" data-kk="nein">✗ Nicht gewusst</button><button class="btn haupt" type="button" data-kk="ja">✓ Gewusst</button></div>'
          : '<div class="af-knoepfe af-kk-knoepfe"><button class="btn haupt" type="button" data-kk="dreh">Umdrehen</button></div>');
    },
    klick(ctx, t){
      const {a, z} = ctx, b = t.closest('[data-kk]'); if (!b) return;
      const tun = b.dataset.kk;
      if (tun === 'neu'){ Object.assign(z, TYPEN.karteikarten.zustand(a), {fb:null}); return ctx.zeichne(); }
      if (tun === 'dreh'){ z.offen = !z.offen; ctx.zeichne(); return fokus(ctx, z.offen ? '[data-kk="ja"]' : '[data-kk="dreh"].btn'); }
      const i = z.stapel.shift(), erst = !z.gesehen[i];
      z.gesehen[i] = true; z.offen = false;
      if (tun === 'ja'){ if (erst) z.sofort++; } else z.stapel.splice(Math.min(z.stapel.length, 3), 0, i);   // nicht gewusst: kommt nach drei Karten wieder
      if (z.stapel.length){ ctx.zeichne(); return fokus(ctx, '[data-kk="dreh"].btn'); }
      z.ende = true;
      loese(ctx, `✓ ${a.ok || 'Geschafft!'} Alle ${a.karten.length} Karten gewusst, ${z.sofort} davon beim ersten Mal.`);
    },
    taste(ctx, e){ if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.af-kk')){ e.preventDefault(); e.target.click(); return true; } },
    pruefen:() => ({ok:false, t:''})
  },
  kreuzwort:{
    zustand:a => ({L:kwLayout(a.woerter), ein:{}, ok:{}, quer:true, akt:null}),
    html(a, z){
      const L = z.L;
      let g = '';
      for (let r = 0; r < L.zeilen; r++) for (let c = 0; c < L.spalten; c++){
        const key = r + ',' + c, x = L.zellen[key];
        g += !x ? '<span class="af-kwx"></span>' : `<span class="af-kwz">${x.nr ? `<i>${x.nr}</i>` : ''}<input class="af-kwi${z.ok[key] === true ? ' richtig' : z.ok[key] === false ? ' falsch' : ''}" data-kw="${key}" value="${esc(z.ein[key] || '')}" maxlength="2" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" aria-label="Zeile ${r + 1}, Spalte ${c + 1}"${z.geloest ? ' readonly' : ''}></span>`;
      }
      const liste = quer => L.eintraege.map((e, j) => e.quer === quer ? `<li data-kwe="${j}"><b>${e.nr}</b> ${e.t} <small>(${e.w.length})</small></li>` : '').join('');
      return `<div class="af-kw"><div class="af-kw-gitter" style="--kc:${L.spalten}">${g}</div><div class="af-kw-listen">`
        + [[true, 'Waagrecht →'], [false, 'Senkrecht ↓']].map(([q, t]) => liste(q) ? `<div><div class="af-sk">${t}</div><ul>${liste(q)}</ul></div>` : '').join('') + '</div></div>'
        + (z.geloest ? '' : '<div class="af-hinweis">Umlaute als Ä, Ö, Ü; ß als SS. Leertaste oder nochmal antippen wechselt die Schreibrichtung.</div>');
    },
    klick(ctx, t){
      const z = ctx.z, i = t.closest('.af-kwi'), e = t.closest('[data-kwe]');
      if (e){ const x = z.L.eintraege[+e.dataset.kwe]; return kwGehe(ctx, x.zellen[0], x.quer); }
      if (!i) return;
      const c = z.L.zellen[i.dataset.kw];
      kwGehe(ctx, i.dataset.kw, z.akt === i.dataset.kw && c.q != null && c.s != null ? !z.quer : z.quer);
    },
    eingabe(ctx, t){
      const key = t.dataset.kw, z = ctx.z; if (key == null) return false;
      const v = (String(t.value).toUpperCase().replace(/ß/g, 'S').match(/[A-ZÄÖÜ]/g) || []).pop() || '';
      t.value = v; z.ein[key] = v; delete z.ok[key]; z.fb = null; t.classList.remove('richtig', 'falsch');
      if (z.akt !== key) kwGehe(ctx, key);
      if (v) kwGehe(ctx, kwNeben(key, z.quer, 1));
      return true;
    },
    taste(ctx, e){
      const t = e.target, z = ctx.z, key = t.dataset && t.dataset.kw; if (key == null || z.geloest) return false;
      const pfeil = {ArrowLeft:[true, -1], ArrowRight:[true, 1], ArrowUp:[false, -1], ArrowDown:[false, 1]}[e.key];
      if (pfeil){ e.preventDefault(); const n = kwNeben(key, pfeil[0], pfeil[1]); if (z.L.zellen[n]) kwGehe(ctx, n, pfeil[0]); return true; }
      if (e.key === ' '){ e.preventDefault(); kwGehe(ctx, key, !z.quer); return true; }
      if (e.key === 'Backspace' && !t.value){
        e.preventDefault(); const n = kwNeben(key, z.quer, -1);
        if (z.L.zellen[n]){ z.ein[n] = ''; delete z.ok[n]; const i = ctx.el.querySelector(`.af-kwi[data-kw="${n}"]`); if (i){ i.value = ''; i.classList.remove('richtig', 'falsch'); } kwGehe(ctx, n); }
        return true;
      }
      return false;
    },
    pruefen(a, z){
      const Z = z.L.zellen, E = z.L.eintraege;
      let leer = 0;
      Object.keys(Z).forEach(k => { if (!z.ein[k]){ leer++; delete z.ok[k]; } else z.ok[k] = z.ein[k] === Z[k].b; });
      const gut = E.filter(e => e.zellen.every(k => z.ok[k] === true)).length;
      if (gut === E.length) return {ok:true, t:'✓ ' + (a.ok || 'Das Rätsel ist gelöst!')};
      const falsch = Object.keys(Z).filter(k => z.ok[k] === false).length;
      return {ok:false, t:`${gut} von ${E.length} Wörtern richtig.${falsch ? ` ${falsch} ${falsch === 1 ? 'Buchstabe stimmt' : 'Buchstaben stimmen'} nicht (rot).` : ''}${leer ? ` ${leer} ${leer === 1 ? 'Feld ist' : 'Felder sind'} noch leer.` : ''}`};
    }
  }
});

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
    z.i = chatZiel(a, m, z.i); z.ctx.zeichne(); chatWeiter(z, a);
  });
}
// Szenario: nächste Nachricht nach m (Stelle i) – ende:true beendet, weiter:'id' springt zur Nachricht mit dieser id
function chatZiel(a, m, i, x){
  if (x && x.ende || (m && typeof m === 'object' && m.ende && !(x && x.weiter != null))) return a.nachrichten.length;
  const id = x && x.weiter != null ? x.weiter : m && typeof m === 'object' ? m.weiter : null;
  const j = id == null ? -1 : a.nachrichten.findIndex(n => n && typeof n === 'object' && n.id === id);
  return j >= 0 ? j : i + 1;
}
function chatAntwort(ctx, wert, j){
  const {a, z} = ctx, q = a.nachrichten[z.warte];
  if (!q) return;
  let ok, text, r, x = null;
  const wahl = !!q.antworten && !q.antworten.some(y => y.ok);   // Entscheidung ohne richtig/falsch (Szenario)
  if (q.antworten){ x = q.antworten[j]; ok = !!x.ok; text = x.t; r = x.r; }
  else if (q.zahl){ if (!String(wert).trim()) return; ok = Math.abs(zahl(wert) - q.zahl.l) <= (q.zahl.tol == null ? 0.005 : q.zahl.tol); text = wert + (q.zahl.e && !/€|%/.test(wert) ? ' ' + q.zahl.e : ''); }
  else { if (!String(wert).trim()) return; const f = finde(q.freitext.antworten, wert); ok = !!f; text = wert; if (f && f.fast) r = (q.r || 'Richtig!') + ` (Schreibweise: „${esc(f.wort)}“)`; }
  z.log.push({wer:'ich', text}); z.i = chatZiel(a, q, z.warte, x); z.warte = null;
  if (wahl) return r ? chatSage(z, r, null, () => chatWeiter(z, a)) : chatWeiter(z, a);
  z.fragen++; if (ok) z.punkte++;
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
  z.fb = r.t ? {ok:r.ok || !!r.gut, t:r.t} : null;   // gut: richtiger Zwischenschritt, noch nicht gelöst
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
  if (ctx.typ.klick) return ctx.typ.klick(ctx, t);
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
  const bank = (a.typ === 'luecken' && a.ziehen) || a.typ === 'beschriften';   // Wortbank: höchstens ein Wort je Lücke bzw. Punkt
  if (a.typ === 'zuordnen' || bank){
    const k = t.closest('[data-karte]'), zo = t.closest('[data-zone]');
    // Wortbank: Wort in einer Lücke antippen (nichts gewählt) → zurück in die Wortbank
    if (k && bank && z.wahl == null && z.platz[+k.dataset.karte] != null && !z.fix[+k.dataset.karte]){ legen(ctx, +k.dataset.karte, ''); return ctx.zeichne(); }
    const inLuecke = k && bank && z.platz[+k.dataset.karte] != null && z.wahl != null && z.wahl !== +k.dataset.karte;
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
  if (ctx.typ.eingabe && ctx.typ.eingabe(ctx, t)) return;
  if (d.f != null) ctx.z.ein[d.f] = t.value;
  else if (d.seite) ctx.z[d.seite][+d.i][d.w] = t.value;
});
document.addEventListener('change', e => {
  const ctx = ctxVon(e.target); if (!ctx || e.target.dataset.l == null) return;
  ctx.z.wahl[e.target.dataset.l] = e.target.value; delete ctx.z.ok[e.target.dataset.l]; e.target.className = '';
});
document.addEventListener('keydown', e => {
  if (e.target.matches && e.target.matches('.af-konto')) return kwTaste(e);
  const ctx = ctxVon(e.target); if (!ctx) return;
  if (ctx.typ.taste && ctx.typ.taste(ctx, e)) return;
  if (e.key !== 'Enter') return;
  if (e.target.matches('.af-chattext')){ e.preventDefault(); ctx.el.dataset.fokus = '1'; chatAntwort(ctx, e.target.value); }
  else if (e.target.matches('input')){ e.preventDefault(); pruefe(ctx); }
  else if (e.target.matches('[data-karte]')){ e.preventDefault(); e.target.click(); }
});

/* Zuordnen: Ziehen mit Maus, Stift oder Finger */
let zieht = false, zug = null;
function legen(ctx, i, zone){
  const z = ctx.z; if (z.fix[i]) return;
  if (ctx.typ.legen) ctx.typ.legen(z, i, zone, ctx.a); else if (!zone) delete z.platz[i]; else z.platz[i] = zone;
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
  const istAufgabe = s => !!(s.aufgaben && s.aufgaben.length) || !!s.training, anzahl = S.filter(istAufgabe).length;
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
      + (s.training ? '<div class="af-training"></div>' : '')
      + `<div class="af-unten"><button class="btn" type="button" data-weiter="-1"${akt ? '' : ' disabled'}>◀ Zurück</button><button class="btn haupt" type="button" data-weiter="1"${akt < S.length - 1 ? '' : ' disabled'}>Weiter ▶</button></div>`;
    const plaetze = inhalt.querySelectorAll(':scope > .af-aufgabe');
    (s.aufgaben || []).forEach((a, i) => baue(plaetze[i], a, {fertig:() => { if (s.aufgaben.every(x => geloest(x))) erledigt(s); }}));
    if (s.training) training({el:inhalt.querySelector('.af-training'), key:cfg.key + '-' + s.id, training:s.training, titel:s.titel || s.kurz, fertig:() => erledigt(s)});
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
// Flamme einer Stufe; ein Design (lib/designs.js) kann sie über window.PF_FLAMME ersetzen ({n} = Stufe)
const FLAMME = n => window.PF_FLAMME ? String(window.PF_FLAMME).replace(/\{n\}/g, n) : `<svg viewBox="0 0 32 40" aria-hidden="true"><path d="M16 2C18 9 27 14 27 26C27 33 22 38 16 38C10 38 5 33 5 26C5 20 9 16 11 11C12 15 13 17 15 18C16 13 17 8 16 2Z"/><text x="16" y="32" text-anchor="middle">${n}</text></svg>`;
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

/* ---------- Training: Aufgaben auf Zeit und/oder endlos ---------- */
const trStufen = T => Array.isArray(T.stufen) && T.stufen.length ? T.stufen : [{name:'', szenarien:T.szenarien, woerterbuch:T.woerterbuch}];
const alternativen = s => String(s == null ? '' : s).split('|').map(x => x.trim()).filter(Boolean);
// Ablenker für Zahlen: eigene falsche Formeln zuerst, dann typische Fehler (±1, ±2, ±10, Ziffern vertauscht)
function zahlAblenker(l, falsch, runden){
  const d = Number.isInteger(l) ? 1 : runden ? Math.pow(10, -Math.max(0, runden - 1)) : 0.1;
  const r = x => Math.round(x * 1e9) / 1e9;
  const tausch = Number.isInteger(l) && Math.abs(l) >= 10 ? +String(Math.abs(l)).split('').reverse().join('') * Math.sign(l) : null;
  const kand = [...falsch, ...mischen([l + d, l - d, l + 2 * d, l - 2 * d, l + 10 * d, l - 10 * d, tausch].filter(x => x != null))].map(r);
  const aus = [];
  kand.forEach(x => { if (Math.abs(x - l) > 1e-9 && (l < 0 || x >= 0) && !aus.some(y => Math.abs(y - x) < 1e-9) && aus.length < 3) aus.push(x); });
  return aus;
}
// Aufgabengeber einer Stufe → () => {frage (HTML), loesung (Text), optionen (MC: [{t, ok}]), pruefe(text) → 'ok' | 'fast' | 'falsch', zahl}
function trGeber(st, T){
  const mc = (st.antwort || T.antwort) === 'mc';
  if (typeof st.neu === 'function') return () => {
    const a = st.neu({mc});
    if (!a.pruefe) a.pruefe = s => alternativen(a.loesung).some(n => norm(n) === norm(s)) ? 'ok' : 'falsch';
    return a;
  };
  if (Array.isArray(st.szenarien) && st.szenarien.length){
    if (!window.Formel) throw new Error('aufgaben.js: Training mit Szenarien braucht lib/formel.js');
    return () => {
      const sz = st.szenarien[Math.floor(Math.random() * st.szenarien.length)], w = Formel.wuerfle(sz);
      const txt = x => Formel.zahlText(x) + (sz.einheit ? ' ' + sz.einheit : '');
      const tol = sz.runden != null ? 0.5 * Math.pow(10, -sz.runden) + 1e-9 : 1e-6;
      return {frage:w.frage, loesung:txt(w.loesung), zahl:true,
        optionen:mc ? mischen([{t:txt(w.loesung), ok:true}, ...zahlAblenker(w.loesung, w.falsch, sz.runden).map(x => ({t:txt(x), ok:false}))]) : null,
        pruefe:s => { const z = zahl(String(s).replace(/−/g, '-')); return !isNaN(z) && Math.abs(z - w.loesung) <= tol ? 'ok' : 'falsch'; }};
    };
  }
  const W = st.woerterbuch || {}, E = (W.eintraege || []).filter(x => Array.isArray(x) && alternativen(x[0]).length && alternativen(x[1]).length);
  const sp = Array.isArray(W.sprachen) ? W.sprachen : [];
  let stapel = [], zuletzt = -1;
  return () => {
    if (!stapel.length){ stapel = mischen(E.map((_, i) => i)); if (stapel.length > 1 && stapel[stapel.length - 1] === zuletzt) stapel.unshift(stapel.pop()); }
    const i = zuletzt = stapel.pop(), rueck = W.richtung === 'b-a' || (W.richtung === 'beide' && Math.random() < 0.5);
    const von = alternativen(E[i][rueck ? 1 : 0]), nach = alternativen(E[i][rueck ? 0 : 1]);
    const kopf = sp[0] || sp[1] ? `<span class="tr-sprache">${esc(sp[rueck ? 1 : 0] || '')} → ${esc(sp[rueck ? 0 : 1] || '')}</span>` : '';
    let optionen = null;
    if (mc){
      const andere = [];
      mischen(E.filter((_, j) => j !== i)).forEach(x => { const t = alternativen(x[rueck ? 0 : 1])[0]; if (!nach.some(n => norm(n) === norm(t)) && !andere.some(a => norm(a) === norm(t))) andere.push(t); });
      optionen = mischen([{t:nach[0], ok:true}, ...andere.slice(0, 3).map(t => ({t, ok:false}))]);
    }
    return {frage:kopf + `<span class="tr-wort">${esc(von.join(' / '))}</span>`, loesung:nach.join(' / '), optionen,
      pruefe(s){
        const t = norm(s); if (!t) return 'falsch';
        if (nach.some(n => norm(n) === t)) return 'ok';
        const nah = nach.some(n => { const v = norm(n).replace(/ /g, ''); return abstand(t.replace(/ /g, ''), v) <= Math.max(1, Math.floor(v.length * 0.2)); });
        return nah ? (W.tippfehler ? 'ok' : 'fast') : 'falsch';
      }};
  };
}
function training(cfg){
  const root = typeof cfg.el === 'string' ? document.querySelector(cfg.el) : cfg.el, T = cfg.training || {}, ST = trStufen(T), KEY = cfg.key + '-training';
  let stand = {}; try { stand = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
  if (!stand.best) stand.best = {};
  const speichern = () => { try { localStorage.setItem(KEY, JSON.stringify(stand)); } catch (e) {} if (window.TrainerSync) TrainerSync.changed(); };
  const anzahl = T.anzahl > 0 ? Math.round(T.anzahl) : 0, endlos = !anzahl;
  // Antwortform und Zeit: je Stufe, sonst vom Training
  const zeitVon = z => z && z.start > 0 ? {start:+z.start, schritt:+z.schritt || 0, min:z.min > 0 ? +z.min : 0.5} : null;
  let mc = false, Z = null;
  const modusVon = i => { const st = ST[i]; mc = (st.antwort || T.antwort) === 'mc'; Z = zeitVon('zeit' in st ? st.zeit : T.zeit); };
  let stufe = Math.min(Math.max(stand.stufe || 0, 0), ST.length - 1), gib = null, phase = 'start', akt = null, richtige = 0, nr = 0, fehler = [];
  let raf = 0, warte = 0, t0 = 0, dauer = 0;
  root.innerHTML = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="af-fg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#d9230f"/><stop offset=".55" stop-color="#ff7a00"/><stop offset="1" stop-color="#ffd23f"/></linearGradient></defs></svg>'
    + '<div class="tr"><div class="af-kopf"><nav class="af-flammen" aria-label="Stufen"></nav><span class="tr-info"></span></div><div class="tr-karte" aria-live="polite"></div></div>';
  root.classList.add('af-training');
  const $ = s => root.querySelector(s), karte = $('.tr-karte'), lebt = () => root.isConnected;
  const variante = () => typeof T.variante === 'function' ? String(T.variante() || '') : '';
  const bestKey = () => { const v = variante(); return v ? stufe + ':' + v : stufe; };
  const best = () => stand.best[bestKey()] || 0;
  const zeitText = s => String(Math.round(s * 100) / 100).replace('.', ',') + ' s';
  function kopf(){
    $('.af-flammen').innerHTML = ST.length > 1 ? ST.map((x, i) => `<button class="af-flamme${i === stufe ? ' on' : ''}" type="button" data-trstufe="${i}" title="Stufe ${i + 1}${x.name ? ': ' + esc(x.name) : ''}" aria-label="Stufe ${i + 1}${x.name ? ': ' + esc(x.name) : ''}" aria-pressed="${i === stufe}">${FLAMME(i + 1)}</button>`).join('') : '';
    const v = variante() ? ` <span class="muted">(${esc(variante())})</span>` : '';
    $('.tr-info').innerHTML = phase === 'start' || phase === 'ende' ? `Bestleistung${v}: <b>${best()}</b>${endlos ? '' : ' von ' + anzahl}`
      : endlos ? `🔥 Serie: <b>${richtige}</b> <span class="muted">· Bestleistung ${best()}</span>` : `Aufgabe ${nr} von ${anzahl} <span class="muted">· ✓ ${richtige}</span>`;
  }
  function halt(){ cancelAnimationFrame(raf); clearTimeout(warte); }
  function startBild(){
    halt(); phase = 'start'; modusVon(stufe);
    try { gib = trGeber(ST[stufe], T); } catch (e) { karte.innerHTML = `<p class="af-fb falsch">${esc(e.message)}</p>`; return; }
    const name = ST[stufe].name ? `<h2 class="tr-titel">${ST.length > 1 ? `Stufe ${stufe + 1}: ` : ''}${esc(ST[stufe].name)}</h2>` : '';
    const zeit = Z ? `Für jede Aufgabe hast du <b>${zeitText(Z.start)}</b>${Z.schritt < 0 ? `, nach jeder richtigen Antwort ${zeitText(-Z.schritt)} weniger (mindestens ${zeitText(Z.min)})` : Z.schritt > 0 ? `, nach jeder richtigen Antwort ${zeitText(Z.schritt)} mehr` : ''}.` : 'Ohne Zeitdruck.';
    karte.innerHTML = name + `<ul class="tr-regeln"><li>${endlos ? 'Endlos: Wie lang wird deine Serie? Ein Fehler beendet sie.' : `${anzahl} Aufgaben – wie viele schaffst du?`}</li><li>${zeit}</li><li>${mc ? 'Klicke die richtige Antwort an (oder Taste 1–4).' : 'Tippe die Antwort ein und drücke Enter.'}${T.versuche ? ' Bei einem Fehler darfst du es nochmal versuchen.' : ''}</li></ul>`
      + `<button class="btn haupt tr-start" type="button">▶ Start</button>`;
    kopf(); const b = $('.tr-start'); if (b && document.activeElement && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) b.focus({preventScroll:true});
  }
  function starte(){ halt(); richtige = 0; nr = 0; fehler = []; phase = 'laeuft'; naechste(); }
  function naechste(){
    halt();
    if (!lebt()) return;
    if (!endlos && nr >= anzahl) return ende();
    nr++; phase = 'laeuft';
    try { akt = gib(); } catch (e) { karte.innerHTML = `<p class="af-fb falsch">${esc(e.message)}</p>`; return; }
    karte.innerHTML = (Z ? '<div class="tr-zeit" aria-hidden="true"><div class="tr-balken"></div></div>' : '') + `<div class="tr-frage">${akt.frage}</div>`
      + (mc ? `<div class="tr-mc">${akt.optionen.map((o, i) => `<button class="tr-opt" type="button" data-tropt="${i}"><span class="tr-taste">${i + 1}</span>${esc(o.t)}</button>`).join('')}</div>`
        : `<div class="tr-form"><input class="feld tr-ein" ${akt.zahl ? 'inputmode="decimal" ' : ''}autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="send" aria-label="Antwort"><button class="btn haupt tr-ok" type="button">OK</button></div>`)
      + `<div class="tr-rueck"></div>` + (Z ? '' : '<button class="btn klein tr-weiss" type="button">Weiß ich nicht</button>');
    kopf();
    const ein = $('.tr-ein'); if (ein) ein.focus({preventScroll:true});
    if (Z){ dauer = Math.max(Z.min, Z.start + richtige * Z.schritt); t0 = performance.now(); raf = requestAnimationFrame(tick); }
  }
  function tick(){
    if (!lebt() || phase !== 'laeuft') return;
    const rest = 1 - (performance.now() - t0) / (dauer * 1000), b = $('.tr-balken');
    if (b){ b.style.width = Math.max(0, rest * 100) + '%'; b.classList.toggle('knapp', rest < 0.3); }
    if (rest <= 0) return falsch('zeit', '');
    raf = requestAnimationFrame(tick);
  }
  function antwort(text, opt){
    if (phase !== 'laeuft') return;
    const r = opt != null ? (akt.optionen[opt].ok ? 'ok' : 'falsch') : akt.pruefe(text);
    if (r === 'ok') return gut();
    if (T.versuche){
      const rk = $('.tr-rueck'); rk.className = 'tr-rueck falsch'; rk.textContent = r === 'fast' ? 'Fast – achte auf die Schreibweise. Nochmal!' : 'Nicht ganz – nochmal!';
      karte.classList.remove('tr-wackeln'); void karte.offsetWidth; karte.classList.add('tr-wackeln');
      if (opt != null){ const b = root.querySelector(`[data-tropt="${opt}"]`); if (b){ b.disabled = true; b.classList.add('falsch'); } }
      else { const e = $('.tr-ein'); e.value = ''; e.focus(); }
      return;
    }
    falsch(r, opt != null ? akt.optionen[opt].t : text);
  }
  function gut(){
    halt(); richtige++; phase = 'pause';
    karte.classList.add('tr-gut'); const rk = $('.tr-rueck'); rk.className = 'tr-rueck ok'; rk.textContent = '✓ Richtig';
    kopf(); warte = setTimeout(() => { karte.classList.remove('tr-gut'); naechste(); }, 450);
  }
  function falsch(grund, eingabe){
    halt(); phase = 'loesung';
    fehler.push({frage:akt.frage, loesung:akt.loesung, eingabe, zeit:grund === 'zeit'});
    const rk = $('.tr-rueck'); rk.className = 'tr-rueck falsch';
    rk.innerHTML = `${grund === 'zeit' ? '⏱ Zeit abgelaufen.' : grund === 'fast' ? 'Fast – achte auf die Schreibweise.' : '✗ Leider falsch.'} Richtig ist: <b>${esc(akt.loesung)}</b> <span class="muted">(Enter: weiter)</span>`;
    if (mc) root.querySelectorAll('[data-tropt]').forEach(b => { b.disabled = true; if (akt.optionen[+b.dataset.tropt].ok) b.classList.add('richtig'); else if (akt.optionen[+b.dataset.tropt].t === eingabe) b.classList.add('falsch'); });
    const e = $('.tr-ein'); if (e) e.readOnly = true;
    const w = $('.tr-weiss'); if (w) w.remove();
    warte = setTimeout(weiter, grund === 'zeit' ? 1800 : 2200);
  }
  function weiter(){ if (phase !== 'loesung') return; if (endlos) ende(); else naechste(); }
  function ende(){
    halt(); phase = 'ende';
    const alt = best(), neu = richtige > alt;
    if (neu){ stand.best[bestKey()] = richtige; speichern(); }
    const titel = (cfg.titel || 'Training') + (ST[stufe].name ? ' · ' + ST[stufe].name : '') + (variante() ? ' · ' + variante() : '');
    if (window.TrainerSync) TrainerSync.event({modus:'endlos', stufe:stufe + 1, aufgabe:'training', titel:`${titel}: ${endlos ? 'Serie ' + richtige : richtige + ' von ' + anzahl}`, gesamt:0, erstmals:true});
    const liste = fehler.length ? `<details class="tr-fehler"${endlos ? ' open' : ''}><summary>${endlos ? 'Daran lag es' : `Fehler (${fehler.length})`}</summary><table><tr><th>Aufgabe</th><th>deine Antwort</th><th>richtig</th></tr>${fehler.slice(-12).map(f => `<tr><td>${f.frage}</td><td>${f.zeit ? '⏱' : f.eingabe ? esc(f.eingabe) : '–'}</td><td><b>${esc(f.loesung)}</b></td></tr>`).join('')}</table></details>` : '';
    karte.innerHTML = `<h2 class="tr-ergebnis">${endlos ? `Serie: ${richtige}` : `${richtige} von ${anzahl} richtig`}</h2>`
      + `<p>${neu ? '🎉 <b>Neue Bestleistung!</b>' : `Bestleistung: ${alt}${endlos ? '' : ' von ' + anzahl}`}</p>` + liste
      + `<button class="btn haupt tr-start" type="button">↻ ${endlos ? 'Neue Serie' : 'Nochmal'}</button>`;
    kopf(); $('.tr-start').focus({preventScroll:true});
    if (cfg.fertig && richtige >= (T.ziel != null ? T.ziel : endlos ? 10 : 0)) cfg.fertig();
  }
  root.addEventListener('click', e => {
    const f = e.target.closest('[data-trstufe]'); if (f){ stufe = +f.dataset.trstufe; stand.stufe = stufe; speichern(); return startBild(); }
    if (e.target.closest('.tr-start')) return starte();
    const o = e.target.closest('[data-tropt]'); if (o && !o.disabled) return antwort(null, +o.dataset.tropt);
    if (e.target.closest('.tr-weiss')) return falsch('weiss', '');
    if (e.target.closest('.tr-ok')) return absenden();
  });
  // kein <form>: in abgeschotteten iframes (Vorschau, Moodle) schickt der Browser Formulare nicht ab
  function absenden(){ const e = $('.tr-ein'); if (!e) return; if (phase === 'loesung') return weiter(); if (e.value.trim()) antwort(e.value); }
  function taste(e){
    if (!lebt()){ document.removeEventListener('keydown', taste); return; }
    if (e.target.closest && e.target.closest('input,textarea,select') && !e.target.closest('.af-training')) return;
    if (phase === 'loesung' && e.key === 'Enter'){ e.preventDefault(); return weiter(); }
    if (phase === 'laeuft' && e.key === 'Enter' && e.target.matches && e.target.matches('.tr-ein')){ e.preventDefault(); return absenden(); }
    if (mc && phase === 'laeuft' && /^[1-4]$/.test(e.key) && akt.optionen[+e.key - 1]){ const b = root.querySelector(`[data-tropt="${+e.key - 1}"]`); if (b && !b.disabled){ e.preventDefault(); antwort(null, +e.key - 1); } }
  }
  document.addEventListener('keydown', taste);
  root.addEventListener('af-variante', startBild);
  startBild();
  return {stop:halt, start:starte};
}

window.Aufgaben = {baue, sequenz, endlos, training, mc, mehrfach, finde, zahl, eur, mischen, esc, bsText, TYPEN, EXPERIMENTELL};
})();
