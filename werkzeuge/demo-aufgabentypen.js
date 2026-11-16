// Erzeugt pb_public/IT/tools/demo-aufgabentypen.html (Demo aller Aufgabentypen: Standard, neu und experimentell).
// Aufruf im Hauptordner: node werkzeuge/demo-aufgabentypen.js – Texte und Aufgaben hier ändern, nicht in der erzeugten Seite.
// Eigener Code der Seite (UMSCHALTER unten): Umschalter für die Designs aus lib/designs.js und das Bild des Szenarios aus lib/szenario.js.
// Je Seite ein Typ: Anleitung (wofür, Bedienung, Erstellen im Baukasten und im JSON) und eine Aufgabe, deren Inhalt den Typ erklärt.
const fs = require('fs'), H = __dirname + '/../pb_public/', S = require(H + 'lib/seite.js');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// JSON der Aufgabe als Beispiel (eingebettetes Bild gekürzt)
const json = a => '<pre>' + esc(JSON.stringify(a, (k, v) => k === 'bild' ? 'data:image/svg+xml;base64,…' : v, 1).replace(/\n {2,}/g, ' ').replace(/\n(?=[\]}])/g, ' ')) + '</pre>';
// BEREICH = Abschnitt der Bausteinleiste im Baukasten; vor jeder Gruppe von Seiten gesetzt. baukasten mit „!“ am Anfang = eigener Satz.
let BEREICH = 'Aufgaben';
const WO = t => t[0] === '!' ? `<p><b>Im Baukasten:</b> ${t.slice(1)}</p>` : `<p><b>Im Baukasten:</b> Tools → Übung erstellen, links unter „${BEREICH}“ den Baustein ${t}</p>`;
const seite = (kurz, titel, wofuer, bedienung, baukasten, felder, aufgaben, extra) => ({kurz, titel,
  html: `<h2>${titel}</h2><p class="info">${wofuer}</p><h3>So arbeiten die Schüler</h3><p>${bedienung}</p><h3>So erstellst du die Aufgabe</h3>${WO(baukasten)}`
    + `<p><b>Im JSON:</b></p><ul>${felder.map(f => `<li>${f}</li>`).join('')}</ul>${extra || ''}<details><summary>JSON der ${aufgaben.length > 1 ? 'ersten Aufgabe' : 'Aufgabe'} unten anzeigen</summary>${json(aufgaben[0])}</details><h3>Ausprobieren</h3>`,
  aufgaben});
const bild = 'data:image/svg+xml;base64,' + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400" font-family="sans-serif">
<rect width="640" height="400" fill="#f6f8fb"/><rect x="20" y="20" width="600" height="360" rx="14" fill="#fff" stroke="#cdd3de" stroke-width="2"/>
<rect x="44" y="44" width="552" height="60" rx="10" fill="none" stroke="#9aa5b8" stroke-width="2" stroke-dasharray="8 6"/>
<rect x="58" y="58" width="90" height="32" rx="7" fill="#eceff4" stroke="#5e81ac" stroke-width="2"/><rect x="160" y="58" width="110" height="32" rx="7" fill="#eceff4" stroke="#5e81ac" stroke-width="2"/><rect x="282" y="58" width="80" height="32" rx="7" fill="#eceff4" stroke="#5e81ac" stroke-width="2"/>
<rect x="44" y="124" width="360" height="180" rx="10" fill="#dde6f0" stroke="#9aa5b8" stroke-width="2"/><path d="M60 290 L150 190 L220 250 L280 170 L390 290 Z" fill="#a3be8c"/><circle cx="330" cy="160" r="18" fill="#ebcb8b"/>
<circle cx="150" cy="200" r="15" fill="#fff" stroke="#2e3440" stroke-width="2"/><circle cx="330" cy="160" r="15" fill="#fff" stroke="#2e3440" stroke-width="2"/>
<rect x="44" y="324" width="110" height="38" rx="9" fill="#5e81ac"/>
</svg>`).toString('base64');

const standard = [
  seite('Multiple Choice', 'Multiple Choice (mc)',
    'Für schnelle Verständnisfragen mit einer oder mehreren richtigen Antworten.',
    'Antwort antippen. Ist genau eine Antwort richtig, wird sofort geprüft; bei mehreren richtigen Antworten wählen die Schüler aus und drücken „Prüfen“. Zu jeder falschen Antwort kann eine Erklärung erscheinen.',
    '<b>☑ Multiple Choice</b> anklicken, Antworten eintragen und bei den richtigen das Häkchen setzen. Unter jeder falschen Antwort ist Platz für „Warum falsch?“.',
    ['<code>options</code>: die Antworten, <code>correct</code>: Nummern der richtigen (gezählt ab 0)', '<code>why</code>: Erklärung je falscher Antwort, <code>after</code>: Zusatz nach der richtigen Antwort', '<code>"mischen": false</code>: Reihenfolge behalten, <code>"html": true</code>: Antworten mit Formatierung (z. B. Brüche)'],
    [{typ: 'mc', frage: 'Wann wird eine Multiple-Choice-Aufgabe sofort beim Antippen geprüft?', options: ['wenn genau eine Antwort richtig ist', 'immer', 'nie, es braucht immer „Prüfen“'], correct: [0],
      why: {1: 'Bei mehreren richtigen Antworten müssen die Schüler erst alle auswählen.', 2: 'Bei genau einer richtigen Antwort reicht das Antippen.'}, after: 'Mit "sofort": false lässt sich das abschalten.'},
     {typ: 'mc', frage: 'Zweite Variante mit mehreren richtigen Antworten: Welche Felder gehören zu Multiple Choice?', options: ['options', 'correct', 'karten', 'why'], correct: [0, 1, 3], why: {2: '„karten“ gehört zu Zuordnen und Reihenfolge.'}}]),
  seite('Zahlen', 'Zahlen eingeben (zahlen)',
    'Für Rechenaufgaben mit einem oder mehreren Ergebnissen.',
    'Ergebnisse eintippen, auch mit Tausenderpunkt, Komma und Einheit (1.234,50 €). „Prüfen“ oder Enter. Falsche Felder werden rot, dazu kann ein Hinweis erscheinen.',
    '<b>🔢 Zahlen eingeben</b> anklicken und je Feld Beschriftung, Lösung, Einheit und bei Bedarf einen Hinweis eintragen.',
    ['<code>felder</code>: je <code>t</code> (Beschriftung), <code>l</code> (Lösung als Zahl mit Punkt), <code>e</code> (Einheit), <code>h</code> (Hinweis bei Fehler)', '<code>tol</code>: Toleranz, Standard 0,005', '<code>knopf</code>: anderer Text für „Prüfen“'],
    [{typ: 'zahlen', frage: 'Probiere die Eingabe aus.', felder: [{t: 'Schreibe „eintausendzweihundertvierunddreißig Euro fünfzig“ als Zahl', l: 1234.5, e: '€', h: 'Zum Beispiel 1.234,50 oder 1234,5.'},
      {t: 'Dieses Feld hat die Lösung 3,33 und die Toleranz 0,01. Tippe 3,34 ein', l: 3.33, tol: 0.011, h: 'Alles von 3,32 bis 3,34 zählt.'}]}]),
  seite('Lückentext', 'Lückentext (luecken)',
    'Für Merksätze und Regeln: mit Auswahllisten oder mit einer Wortbank zum Ziehen.',
    'In jeder Lücke die richtige Antwort wählen oder ein Wort aus der Wortbank in die Lücke ziehen (oder erst Wort, dann Lücke antippen).',
    '<b>⬚ Lückentext</b> anklicken und den Text schreiben. Ein Wort doppelklicken macht es zur Lücke; danach die falschen Antworten eintragen. Oben zwischen „Auswahllisten“ und „Wortbank“ wählen.',
    ['<code>text</code> mit Lücken <code>[[richtig|falsch|falsch]]</code> – die <b>erste</b> Antwort ist die richtige', '<code>"ziehen": true</code>: Wortbank statt Auswahllisten, dann reicht <code>[[Wort]]</code>', '<code>extra</code>: weitere Ablenker für die Wortbank'],
    [{typ: 'luecken', frage: 'Vervollständige die Anleitung.', text: 'Eine Lücke steht in [[doppelten|einfachen|runden]] eckigen Klammern. Die [[erste|letzte|längste]] Antwort darin ist die richtige. Getrennt wird mit einem [[senkrechten Strich|Komma|Punkt]].'},
     {typ: 'luecken', ziehen: true, frage: 'Zweite Variante mit Wortbank: Ziehe die Wörter in die Lücken.', text: 'Mit "ziehen": true wird aus den Auswahllisten eine [[Wortbank]]. Zusätzliche falsche Wörter stehen im Feld [[extra]].', extra: ['karten', 'Tabelle']}]),
  seite('Zuordnen', 'Zuordnen (zuordnen)',
    'Für Kategorien: Begriffe, Beispiele oder Fälle in Felder sortieren.',
    'Karten in das passende Feld ziehen oder erst die Karte, dann das Feld antippen. Nach „Prüfen“ bleiben richtige Karten liegen, falsche wandern zurück.',
    '<b>🗂 Zuordnen</b> anklicken, die Felder benennen und in jedes Feld seine Karten eintragen.',
    ['<code>felder</code>: <code>[["kennung", "Überschrift"], …]</code>, mindestens zwei', '<code>karten</code>: je <code>t</code> (Text) und <code>z</code> (Kennung des richtigen Feldes)'],
    [{typ: 'zuordnen', frage: 'Welche Angabe gehört zu welchem Aufgabentyp?', felder: [['z', 'Zuordnen'], ['l', 'Lückentext']],
      karten: [{t: 'felder mit Kennung und Überschrift', z: 'z'}, {t: 'karten mit Text und Kennung', z: 'z'}, {t: 'Karten ziehen oder antippen', z: 'z'}, {t: '[[richtig|falsch]]', z: 'l'}, {t: 'Wortbank mit extra', z: 'l'}, {t: 'Auswahllisten', z: 'l'}]}]),
  seite('Begriffe', 'Begriffe eintippen (freitext)',
    'Für Fachbegriffe, die die Schüler selbst wissen und schreiben sollen. Tippfehler werden erkannt.',
    'Begriffe eintippen. Groß- und Kleinschreibung ist egal. Bei einem Tippfehler heißt es „fast richtig“ mit Hinweis auf die Schreibweise. Jedes Feld braucht einen anderen Begriff.',
    '<b>✎ Begriffe eintippen</b> anklicken, die Felder beschriften und die möglichen Antworten eintragen (je Zeile ein Begriff, Schreibweisen mit Komma).',
    ['<code>felder</code>: Beschriftungen, je ein Eingabefeld', '<code>antworten</code>: Liste der richtigen Begriffe, jeder als Liste gleichwertiger Schreibweisen', '<code>"tippfehler": "ok"</code>: Tippfehler zählen als richtig, <code>h</code>: Hinweis bei falscher Antwort'],
    [{typ: 'freitext', frage: 'Nenne die zwei Felder, die jede Aufgabe „Begriffe eintippen“ im JSON braucht. Probiere auch einen Tippfehler aus.', felder: ['1. Feld', '2. Feld'], antworten: [['felder'], ['antworten', 'Antworten-Liste']], h: 'Lies oben unter „Im JSON“ nach.'}]),
  seite('Tabelle', 'Tabelle ausfüllen (tabelle)',
    'Für Rechnungen in Tabellenform: Tilgungsplan, Abschreibung, Kalkulation.',
    'Die leeren Felder ausfüllen und „Prüfen“. Falsche Felder werden rot, je Spalte kann ein Hinweis mit der Rechenregel erscheinen.',
    '<b>▦ Tabelle ausfüllen</b> anklicken. Jede Zelle lässt sich umschalten: <b>T</b> Text, <b>#</b> vorgegebene Zahl, <b>✎</b> Eingabefeld mit Lösung.',
    ['<code>spalten</code>: Spaltenköpfe, <code>zeilen</code>: je Zeile genau so viele Zellen', 'Text oder Zahl = vorgegeben, <code>{"l": Lösung}</code> = Eingabefeld', '<code>hinweise</code>: Rechenregel je Spalte, <code>einheit</code>, <code>tol</code>'],
    [{typ: 'tabelle', frage: 'Fülle die leeren Felder aus. Nur Zellen mit {"l": …} sind Eingabefelder.', einheit: '€', spalten: ['Stück', 'Preis je Stück', 'Gesamt'],
      zeilen: [['3', 2.5, {l: 7.5}], ['4', {l: 1.5}, 6], ['10', 0.99, {l: 9.9}]], hinweise: {1: 'Preis je Stück = Gesamt : Stück', 2: 'Gesamt = Stück · Preis je Stück'}}]),
  seite('Ja/Nein-Tabelle', 'Ja/Nein-Tabelle (wahrheit)',
    'Für Wahrheitstabellen (UND, ODER) und alle Tabellen, in denen je Zelle nur ja oder nein gefragt ist.',
    'Felder mit „?“ anklicken: Jeder Klick wechselt zwischen ja und nein. Dann „Prüfen“.',
    '!Für diesen Typ gibt es noch keinen Baustein. In „Übung erstellen“ oben auf <b>JSON</b> umschalten und die Aufgabe dort eintragen, zum Beispiel das JSON unten kopieren und anpassen.',
    ['<code>spalten</code>, <code>zeilen</code> wie bei der Tabelle', '<code>true</code> / <code>false</code> = vorgegeben, <code>{"l": true}</code> bzw. <code>{"l": false}</code> = Feld zum Anklicken', '<code>werte</code>: zwei eigene Wörter statt ja und nein, <code>hinweise</code> je Spalte'],
    [{typ: 'wahrheit', frage: 'Was bedeutet welche Zelle im JSON?', spalten: ['Zelle im JSON', 'ist vorgegeben', 'wird angeklickt'],
      zeilen: [['true', {l: true}, {l: false}], ['{"l": false}', {l: false}, {l: true}], ['"Text"', {l: true}, {l: false}], ['{"l": true}', {l: false}, {l: true}]], hinweise: {1: 'Vorgegeben ist alles ohne geschweifte Klammer.', 2: 'Angeklickt werden nur Zellen der Form {"l": …}.'}}]),
  seite('Buchungssatz', 'Buchungssatz (buchungssatz)',
    'Für BWR: Buchungssätze bilden, mit Prüfung von Konten, Seiten, Steuer und Beträgen.',
    'Konto über Nummer oder Kürzel suchen (z. B. „ve“ oder „4400“), Betrag eintragen, weitere Konten mit „+ Soll-Konto“ / „+ Haben-Konto“. Die Rückmeldung sagt, ob Konten, Seiten oder Beträge nicht stimmen.',
    '<b>⚖ Buchungssatz</b> anklicken, mit „Konten auswählen …“ die Konten aus dem Kontenplan holen (auch Ablenker) und die Lösung in Soll und Haben eintragen. Schalter: „Jgst. 7“ (Konten ohne Nummer) und „Beträge ziehen“.',
    ['<code>konten</code>: Auswahl für die Schüler, <code>soll</code> / <code>haben</code>: <code>[["Konto", Betrag], …]</code>', '<code>steuer</code>: Steuerkonten für den Hinweis „Denke an …“, <code>nebenrechnung</code>: erscheint nach der Lösung', '<code>betraege</code>: Beträge zum Ziehen, <code>"jgst": 7</code>: Konten nur mit Kürzel'],
    [{typ: 'buchungssatz', frage: 'Kauf einer Maschine auf Ziel, netto 10.000,00 €, 19 % Umsatzsteuer. Bilde den Buchungssatz.', konten: ['0700 MA', '2600 VORST', '2800 BK', '4400 VE', '4800 UST'],
      soll: [['0700 MA', 10000], ['2600 VORST', 1900]], haben: [['4400 VE', 11900]], steuer: ['2600 VORST'], nebenrechnung: 'Vorsteuer: 10.000,00 € · 19 : 100 = 1.900,00 €'}]),
  seite('Lern-Chat', 'Lern-Chat (chat)',
    'Für kleinschrittige Erarbeitung im Gespräch, wie bei LearningSnacks: Der Bot erklärt und fragt nach.',
    'Knöpfe antippen oder Antwort eintippen und senden. Bei Fehlern erklärt der Bot und macht weiter. Am Ende stehen die Punkte, mit „Noch einmal“ beginnt der Chat neu.',
    '<b>💬 Lern-Chat</b> anklicken und die Nachrichten eintragen. Je Nachricht wählst du: Text, Knöpfe, Zahl oder Begriff.',
    ['<code>name</code>, <code>bild</code> (Emoji), <code>nachrichten</code>: Text oder Frage <code>{"bot": "…"}</code> mit einer Antwortform', '<code>antworten</code>: Knöpfe mit <code>t</code>, <code>ok</code> und <code>r</code> (Antwort des Bots)', '<code>zahl</code>: <code>{"l": 200, "e": "€"}</code> oder <code>freitext</code>: <code>{"antworten": [["Begriff"]]}</code>, dazu <code>r</code> und <code>rFalsch</code>'],
    [{typ: 'chat', name: 'Chat-Hilfe', bild: '💡', nachrichten: ['Hallo! Ich zeige dir die drei Antwortformen im Lern-Chat.',
      {bot: 'Erstens Knöpfe. Wie viele davon dürfen richtig sein?', antworten: [{t: 'nur einer', r: 'Es dürfen auch mehrere sein.'}, {t: 'einer oder mehrere', ok: true, r: 'Genau, jeder Knopf mit "ok": true ist richtig.'}]},
      {bot: 'Zweitens eine Zahl. Wie viele Antwortformen gibt es insgesamt?', zahl: {l: 3}, r: 'Richtig: Knöpfe, Zahl und Begriff.', rFalsch: 'Es sind drei: Knöpfe, Zahl und Begriff.'},
      {bot: 'Drittens ein Begriff. In welchem Feld stehen alle Nachrichten?', freitext: {antworten: [['nachrichten']]}, r: 'Stimmt.', rFalsch: 'Sie stehen im Feld „nachrichten“.'},
      'Das war alles. Verzweigungen zeigt die nächste Seite „Szenario“.']}]),
  seite('Szenario', 'Szenario (chat mit Verzweigungen)',
    'Der Lern-Chat kann jetzt verzweigen: Entscheidungen führen zu unterschiedlichen Verläufen, zum Beispiel bei einer Kreditberatung oder einem Datenschutz-Fall. Alte Chats laufen unverändert.',
    'Wie im Lern-Chat: Knöpfe antippen oder Antworten eintippen. Je nach Antwort geht das Gespräch anders weiter.',
    '<b>💬 Lern-Chat</b> anklicken und <b>🗺 Szenario visuell bauen …</b> wählen: Dort setzt du die Nachrichten als Kästen zusammen und ziehst Pfeile zwischen ihnen. Oder den Schalter „Szenario (Verzweigungen)“ einschalten, Nachrichten eine <b>Marke</b> geben und bei Antworten „weiter zu“ dieser Marke wählen.',
    ['<code>"id": "marke"</code> an einer Nachricht: Sprungziel', '<code>"weiter": "marke"</code> an einem Antwort-Knopf oder einer Nachricht: dorthin springen statt zur nächsten Nachricht', '<code>"ende": true</code>: Der Chat endet hier', 'Hat kein Knopf <code>"ok": true</code>, ist es eine Entscheidung ohne richtig und falsch', 'Text mit Marke als Objekt: <code>{"bot": "Text", "id": "marke"}</code>'],
    [{typ: 'chat', name: 'Szenario-Hilfe', bild: '🧭', nachrichten: [
      'Hallo! Ich bin selbst ein Szenario und zeige dir, wie ich gebaut bin.',
      {id: 'menue', bot: 'Was möchtest du wissen?', antworten: [{t: 'Wie springe ich?', weiter: 'sprung'}, {t: 'Was ist eine Entscheidung?', weiter: 'wahl'}, {t: 'Wie endet ein Chat?', weiter: 'schluss'}]},
      {id: 'sprung', bot: 'Diese Nachricht hat die Marke <code>sprung</code>. Der Knopf, den du gedrückt hast, hat <code>"weiter": "sprung"</code>.'},
      {bot: 'Wohin geht es ohne <code>weiter</code>?', antworten: [{t: 'zur nächsten Nachricht', ok: true, r: 'Genau, einfach der Reihe nach.'}, {t: 'zum Anfang', r: 'Nein: Ohne <code>weiter</code> kommt die nächste Nachricht.'}], weiter: 'menue'},
      {id: 'wahl', bot: 'Die Frage „Was möchtest du wissen?“ ist eine Entscheidung: Kein Knopf hat <code>"ok": true</code>. Sie zählt nicht als Frage und wird nicht als richtig oder falsch gewertet.', weiter: 'menue'},
      {id: 'schluss', bot: 'Eine Nachricht mit <code>"ende": true</code> beendet den Chat – so wie diese. Mit „Noch einmal“ kannst du die anderen Wege gehen.', ende: true}]}],
    '<p><b>Achte darauf:</b> Jeder Zweig braucht ein Ende – entweder eine Nachricht mit „Ende“ oder einen Sprung zu einem gemeinsamen Schluss. Sonst läuft der Chat einfach in den nächsten Zweig weiter.</p>'),
  seite('Kombi', 'Kombinierte Aufgabe (kombi)',
    'Für Aufgaben in mehreren Schritten: erst rechnen, dann buchen, dann beurteilen.',
    'Zuerst ist nur Teil 1 zu sehen. Jeder weitere Teil erscheint, sobald der vorige richtig gelöst ist.',
    '<b>🧩 Kombinierte Aufgabe</b> (unter „Kombinieren“) anklicken und Bausteine in die Zone „＋ Teil …“ ziehen. Oder einen Baustein auf eine vorhandene Aufgabe ziehen.',
    ['<code>teile</code>: Liste von mindestens zwei Aufgaben beliebigen Typs (keine Kombi in der Kombi)', '<code>frage</code>, <code>material</code>, <code>ok</code> der Kombi stehen über bzw. unter allen Teilen'],
    [{typ: 'kombi', frage: 'Diese Aufgabe besteht aus zwei Teilen.', ok: 'Beide Teile gelöst.', teile: [
      {typ: 'zahlen', frage: 'Teil 1: Wie viele Teile braucht eine kombinierte Aufgabe mindestens?', felder: [{t: 'Anzahl', l: 2, h: 'Mit nur einem Teil wäre es eine einfache Aufgabe.'}]},
      {typ: 'mc', frage: 'Teil 2: Wann ist dieser zweite Teil erschienen?', options: ['als Teil 1 richtig gelöst war', 'sofort beim Öffnen', 'nach dem ersten Versuch, egal ob richtig'], correct: [0]}]}]),
  seite('Verbessern', 'Fehler verbessern (verbessern)',
    'Fehlersuche wie in den Bereichen HTML und Python, aber für beliebige Texte: Rechtschreibung, Grammatik, Code, Buchungssätze.',
    'Erst die Zeile mit dem Fehler anklicken. Dann in dieser Zeile alle falschen Stellen anklicken (nochmal klicken wählt wieder ab) und „Prüfen“. Zum Schluss die Stellen verbessern und wieder „Prüfen“. Bei nur einer Zeile entfällt der erste Schritt.',
    '<b>🩹 Fehler verbessern</b> anklicken und den Text mit den eingebauten Fehlern eintragen.',
    ['<code>text</code>: reiner Text, Zeilen mit <code>\\n</code>, Fehler als <code>[[falsch|richtig]]</code> – das <b>Falsche zuerst</b>, es wird angezeigt', 'weitere richtige Lösungen anhängen: <code>[[falsch|richtig|auch richtig]]</code>; <code>[[zu viel|]]</code> = Stelle löschen', 'Stellen sind Wörter (durch Leerzeichen getrennt); ein Fehler mitten im Wort braucht eine eigene Klammer: <code>Titel[[&lt;/h2&gt;|&lt;/h1&gt;]]</code>', '<code>"mono": true</code>: Code, <code>"gross": false</code>: Groß/klein egal, <code>h</code>: Hinweis'],
    [{typ: 'verbessern', frage: 'In dieser Anleitung stecken drei Fehler. Finde und verbessere sie.',
      text: 'Fehler stehen in [[einfachen|doppelten]] eckigen Klammern.\nIn der Klammer steht zuerst das [[Richtige|Falsche]] und danach die Verbesserung.\nDie Schüler klicken zuerst die Zeile mit dem Fehler an.\nGetrennt wird mit einem senkrechten [[Komma|Strich]].',
      gross: false, h: 'Lies oben unter „Im JSON“ nach.', ok: 'Alle drei Fehler verbessert – so funktioniert der Typ.'}]),
  seite('Kreuzwort', 'Kreuzworträtsel (kreuzwort)',
    'Zum Wiederholen von Fachbegriffen. Sparsam einsetzen: Es kostet die Schüler viel Zeit für wenige Begriffe.',
    'Ein Feld oder einen Hinweis anklicken und tippen, der Cursor springt weiter. Leertaste oder nochmaliges Antippen wechselt zwischen waagrecht und senkrecht, die Pfeiltasten bewegen den Cursor. „Prüfen“ färbt falsche Buchstaben rot.',
    '<b>🔠 Kreuzworträtsel</b> anklicken und je Zeile Lösungswort und Hinweis eintragen. Das Gitter entsteht von selbst und sieht immer gleich aus.',
    ['<code>woerter</code>: Liste aus <code>{"w": "Wort", "t": "Hinweis"}</code>, 2 bis 25 Wörter', 'Buchstaben A–Z, Ä, Ö, Ü; ß wird SS, Leerzeichen und Bindestriche entfallen', 'Wörter ohne gemeinsamen Buchstaben stehen einzeln unter dem Gitter'],
    [{typ: 'kreuzwort', frage: 'Löse das Rätsel rund um das Kreuzworträtsel.',
      woerter: [{w: 'Gitter', t: 'Es entsteht von selbst aus der Wortliste'}, {w: 'Hinweis', t: 'Das steht im Feld t'}, {w: 'Leertaste', t: 'Wechselt die Schreibrichtung'},
        {w: 'Baukasten', t: 'Dort stellst du die Aufgabe zusammen'}, {w: 'Senkrecht', t: 'Von oben nach unten'}, {w: 'Umlaut', t: 'Ä, Ö oder Ü: ein … bekommt ein eigenes Feld'}]}]),
  (s => { s.training = {antwort: 'eingabe', anzahl: 5, szenarien: [{frage: '{a} · {b} =', werte: {a: [2, 9], b: [2, 9]}, loesung: 'a * b', falsch: ['a + b']}]};
          delete s.aufgaben; s.html = s.html.replace(/<details>[\s\S]*?<\/details>/, '<details><summary>JSON dieses Schritts anzeigen</summary>' + json({kurz: 'Training', titel: 'Training', training: s.training}) + '</details>'); return s; })(
  seite('Training', 'Training (Schritt mit training)',
    'Für Drill: Kopfrechnen oder Vokabeln, eine Aufgabe nach der anderen, auf Wunsch auf Zeit oder endlos mit Serie und Bestleistung.',
    '„Start“ drücken, Antwort eintippen und Enter (oder aus vier Antworten wählen). Am Ende stehen Ergebnis, Bestleistung und die Fehler.',
    '!Tools → Übung erstellen, links ganz oben <b>⏱ Training (Zeit / endlos)</b> anklicken. Das Training ist kein Aufgabentyp, sondern ein eigener Schritt: Es steht allein auf seiner Seite. Zahlen-Aufgaben entstehen aus einer Vorlage mit Zufallswerten, Vokabeln lassen sich aus Excel oder Quizlet einfügen.',
    ['Schritt mit <code>training</code> statt <code>aufgaben</code>', '<code>"antwort"</code>: <code>"eingabe"</code> oder <code>"mc"</code>, <code>anzahl</code>: Aufgaben pro Runde (weglassen = endlos)', '<code>zeit</code>: <code>{"start": 5, "schritt": -0.1, "min": 1.5}</code> (weglassen = ohne Zeit)', '<code>szenarien</code>: Zahlen-Aufgaben mit <code>frage</code>, <code>werte</code>, <code>loesung</code> – oder <code>woerterbuch</code> mit <code>eintraege</code>', '<code>stufen</code>: mehrere Stufen mit eigenem Inhalt, eigener Antwortform und Zeit'],
    [{typ: 'mc', options: ['', ''], correct: [0]}])),
];
BEREICH = 'Experimentell (β)';
const experimentell = [
  seite('Reihenfolge', 'Reihenfolge (reihenfolge)',
    'Für Abläufe und Schemata: Kalkulationsschema, Schritte eines Verfahrens, Zeilen eines Programms.',
    'Die Karten erscheinen gemischt. Sie lassen sich ziehen, mit ▲ ▼ verschieben oder man tippt erst eine Karte und dann die Zielstelle an. „Prüfen“ zeigt, welche Karten schon richtig stehen.',
    '<b>⇅ Reihenfolge</b> anklicken, die Karten in der richtigen Reihenfolge eintragen. Der Schalter „Code“ zeigt die Karten in Schreibmaschinenschrift und behält die Einrückung.',
    ['<code>karten</code>: die Texte in der <b>richtigen</b> Reihenfolge, gemischt wird von selbst', '<code>"mono": true</code>: Karten sind reiner Text (Codezeilen)', '<code>h</code>: Hinweis bei falscher Reihenfolge'],
    [{typ: 'reihenfolge', frage: 'Bringe die Schritte in die richtige Reihenfolge: So entsteht eine Reihenfolge-Aufgabe.',
      karten: ['Tools → Übung erstellen öffnen', 'Links unter „Experimentell (β)“ den Baustein „Reihenfolge“ anklicken', 'Aufgabenstellung eintragen', 'Karten in der richtigen Reihenfolge eintragen', 'Mit „Vorschau“ ausprobieren', 'Herunterladen oder einreichen'],
      h: 'Erst öffnen, dann den Baustein wählen, zuletzt herunterladen.', ok: 'Genau so entsteht die Aufgabe.'}]),
  seite('Offen', 'Offene Antwort (offen)',
    'Für „Begründe“, „Beurteile“, „Erläutere“: Antworten, die sich nicht automatisch prüfen lassen.',
    'Sie schreiben ihre Antwort, lassen sich die Musterlösung zeigen und haken ab, welche Punkte ihre Antwort enthält. Danach können sie die Antwort überarbeiten oder die Selbstkontrolle abschließen.',
    '<b>📝 Offene Antwort</b> anklicken, Musterlösung eintragen und je Zeile ein Kriterium zum Abhaken.',
    ['<code>muster</code>: Musterlösung (Formatierung erlaubt)', '<code>kriterien</code>: Liste zum Abhaken (kann fehlen)', '<code>zeilen</code>: Höhe des Textfelds, <code>min</code>: Mindestzahl Zeichen'],
    [{typ: 'offen', frage: 'Erkläre in zwei Sätzen, wofür sich der Aufgabentyp „Offene Antwort“ eignet und wie die Antwort kontrolliert wird.', min: 30,
      muster: '<p>Der Typ eignet sich für Aufgaben, die eine eigene Formulierung verlangen, zum Beispiel Begründungen und Beurteilungen. Die Antwort wird nicht automatisch bewertet: Die Schüler vergleichen sie mit der Musterlösung und haken Kriterien ab.</p>',
      kriterien: ['nennt Aufgaben mit eigener Formulierung (begründen, beurteilen …)', 'sagt, dass nicht automatisch bewertet wird', 'nennt Musterlösung und Kriterien zum Abhaken']}],
    '<p><b>Wichtig:</b> Die Aufgabe gilt als gelöst, sobald die Selbstkontrolle abgeschlossen ist, egal wie viele Haken gesetzt sind. Der Text wird nicht gespeichert und nicht an die Lehrkraft übertragen.</p>'),
  seite('Markieren', 'Markieren (markieren)',
    'Für „Finde alle …“: Wortarten, Fachbegriffe, Bestandteile eines Belegs, Zeilen eines Programms.',
    'Sie klicken die gesuchten Wörter oder Zeilen an, ein zweiter Klick hebt die Markierung auf. Nach „Prüfen“ bleiben richtige Stellen grün, falsche werden rot und wieder abgewählt.',
    '<b>🖍 Markieren</b> anklicken und den Text eintragen. Jede gesuchte Stelle kommt in doppelte eckige Klammern. Oben wählst du, ob Wörter oder ganze Zeilen angeklickt werden.',
    ['<code>text</code>: reiner Text, gesuchte Stellen als <code>[[so]]</code>, neue Zeile mit <code>\\n</code>', '<code>"einheit": "zeile"</code>: ganze Zeilen anklicken (gesucht ist jede Zeile mit <code>[[</code>)', '<code>"mono": true</code>: Code, <code>"anzahl": false</code>: Anzahl nicht verraten, <code>h</code>: Hinweis'],
    [{typ: 'markieren', frage: 'Markiere alle Feldnamen, die es beim Typ „Markieren“ gibt.',
      text: 'Der Text der Aufgabe steht im Feld [[text]]. Mit [[einheit]] legst du fest, ob Wörter oder Zeilen angeklickt werden. Für Code gibt es [[mono]], und mit [[anzahl]] verschweigst du, wie viele Stellen gesucht sind. Das Feld karten gehört dagegen zu einem anderen Typ.',
      h: 'Gesucht sind vier Feldnamen.'},
     {typ: 'markieren', einheit: 'zeile', mono: true, frage: 'Zweite Variante mit ganzen Zeilen: In welchen Zeilen dieses JSON steht eine gesuchte Stelle?',
      text: '{"typ": "markieren",\n "frage": "Markiere alle Nomen.",\n [["text": "Der [[Hund]] bellt im [[Garten]]."]],\n "anzahl": false}'}]),
  seite('Beschriften', 'Bild beschriften (beschriften)',
    'Für Abbildungen: Bestandteile eines Belegs, Oberfläche eines Programms, Hardware, Diagramme.',
    'Die Begriffe liegen in der Wortbank. Sie werden auf die nummerierten Punkte im Bild gezogen (oder: erst Begriff, dann Punkt antippen). Richtige bleiben liegen, falsche wandern zurück.',
    '<b>🏷 Bild beschriften</b> anklicken, mit „Bild auswählen“ ein Bild hochladen (es wird verkleinert und eingebettet) und für jeden Punkt ins Bild klicken. Den Begriff trägst du in der Liste darunter ein.',
    ['<code>bild</code>: eingebettetes Bild (<code>data:image/…;base64,…</code>, höchstens 600 kB)', '<code>punkte</code>: je <code>x</code> und <code>y</code> in Prozent von links und oben, <code>t</code> = Begriff', '<code>extra</code>: weitere Begriffe als Ablenker, <code>alt</code>: Bildbeschreibung'],
    [{typ: 'beschriften', frage: 'Das Bild zeigt, wie eine Beschriften-Aufgabe aufgebaut ist. Beschrifte die Teile.', alt: 'Schema einer Beschriften-Aufgabe: oben ein gestrichelter Kasten mit Kärtchen, darunter ein Bild mit zwei Kreisen, unten ein Knopf',
      bild, punkte: [{x: 80, y: 18.5, t: 'Wortbank'}, {x: 33, y: 18.5, t: 'Begriff zum Ziehen'}, {x: 51.5, y: 40, t: 'Punkt im Bild'}, {x: 15.5, y: 86, t: 'Knopf „Prüfen“'}], extra: ['Musterlösung', 'Lücke']}]),
  seite('Blöcke', 'Blöcke bauen (bloecke)',
    'Wie beim blockbasierten Programmieren: Formeln, Buchungssätze in Worten oder kurze Programme aus Bausteinen zusammensetzen.',
    'Einen Block antippen setzt ihn ans Ende, ein Block im Feld verschwindet beim Antippen wieder. Durch Ziehen landet ein Block an einer bestimmten Stelle (auf den Block ziehen, vor dem er stehen soll).',
    '<b>🧱 Blöcke bauen</b> anklicken. Je Zeile einen Block für den Vorrat eintragen (auch Ablenker), darunter die Lösung in der richtigen Reihenfolge.',
    ['<code>bloecke</code>: Vorrat, <code>loesung</code>: Blöcke in der richtigen Reihenfolge (oder <code>loesungen</code>: mehrere Listen)', '<code>"gleichwertig": true</code>: jede rechnerisch gleichwertige Formel zählt, z. B. K · p oder p · K', '<code>start</code>: fester Text davor, <code>"einmal": true</code>: jeder Block nur einmal, <code>"senkrecht": true</code>: untereinander, <code>"mono": true</code>: Code'],
    [{typ: 'bloecke', mono: true, frage: 'Baue den Anfang einer Blöcke-Aufgabe, so wie er im JSON steht.', bloecke: ['{', '}', '"typ"', '"bloecke"', '"mc"', ':', ',', '['],
      loesung: ['{', '"typ"', ':', '"bloecke"', '}'], h: 'Erst die geschweifte Klammer, dann Feldname, Doppelpunkt und Wert.'},
     {typ: 'bloecke', frage: 'Zweite Variante mit „gleichwertig“: Baue die Formel für die Tageszinsen. Jede richtige Schreibweise zählt.', start: 'Z =', gleichwertig: true,
      bloecke: ['K', 'p', 't', '·', ':', '(', ')', '100', '360', '+'], loesung: ['K', '·', 'p', '·', 't', ':', '(', '100', '·', '360', ')']}]),
  seite('Karteikarten', 'Karteikarten (karteikarten)',
    'Zum Lernen von Begriffen und Definitionen, wenn die Schüler sich selbst einschätzen sollen.',
    'Karte lesen, umdrehen (Karte anklicken oder Knopf) und ehrlich „Gewusst“ oder „Nicht gewusst“ wählen. Nicht gewusste Karten kommen nach kurzer Zeit wieder. Fertig, wenn alle Karten gewusst sind.',
    '<b>🃏 Karteikarten</b> anklicken und je Karte Vorderseite und Rückseite eintragen.',
    ['<code>karten</code>: Liste aus <code>{"v": "Vorderseite", "r": "Rückseite"}</code> (Formatierung erlaubt)', '<code>"mischen": false</code>: Reihenfolge behalten'],
    [{typ: 'karteikarten', frage: 'Lerne mit den Karten, wie man Karteikarten erstellt.',
      karten: [{v: 'In welchem Feld stehen die Karten?', r: '<code>karten</code>'}, {v: 'Wofür steht <code>v</code>?', r: 'Vorderseite'}, {v: 'Wofür steht <code>r</code>?', r: 'Rückseite'},
        {v: 'Was passiert mit einer Karte, die nicht gewusst wurde?', r: 'Sie kommt nach etwa drei Karten wieder.'}, {v: 'Wann gilt die Aufgabe als gelöst?', r: 'Wenn alle Karten einmal gewusst wurden.'}]}],
    '<p><b>Abgrenzung:</b> Für Vokabeln mit Eintippen oder auf Zeit passt der Baustein „⏱ Training“ besser, dort wird die Antwort geprüft.</p>'),
];
const schritte = [...standard, ...experimentell];
// Experimentelle Seiten kennzeichnen
experimentell.forEach(s => { s.html = s.html.replace('</h2>', ' <small>– experimentell</small></h2><p class="muted">Dieser Typ ist noch im Test: Format und Bedienung können sich ändern.</p>'); });
// Bild des Szenarios vor dem JSON-Beispiel: leerer Platzhalter, den das Skript der Seite mit lib/szenario.js füllt (wie im Baukasten)
{ const s = schritte.find(x => x.kurz === 'Szenario');
  s.html = s.html.replace('<details>', '<h3>Das Szenario unten als Bild</h3><p>So zeigt es auch der Baukasten unter „🗺 Szenario visuell bauen …“: Jeder Kasten ist eine Nachricht, jeder Pfeil führt zur nächsten. ● ist ein Anschluss, ■ ein Ende, ein gestrichelter Pfeil springt zurück.</p><div class="sz-bild"></div><details>'); }
const j = {titel: 'Demo Aufgabentypen', kurztext: 'Alle Aufgabentypen zum Ausprobieren: Jede Seite zeigt einen Typ und erklärt, wie du ihn erstellst.', schritte};
const f = S.pruefe(j); if (f.length) { console.log(f.join('\n')); process.exit(1); }
// Umschalter für die Designs (lib/designs.js): gilt nur auf dieser Seite und bis zum Neuladen, die Einstellung im Konto bleibt unberührt
const UMSCHALTER = `<script src="../../lib/designs.js"></script>
<link rel="stylesheet" href="../../lib/szenario.css">
<script src="../../lib/szenario.js"></script>
<style>.demo-design{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;margin-top:8px;font-size:14px}.demo-design select{max-width:100%}</style>
<script>
document.addEventListener('DOMContentLoaded', function () {
  if (!window.Designs) return;
  var L = Designs.liste().filter(function (d) { return d.id !== 'standard'; }), root = document.documentElement, esc = Aufgaben.esc;
  var opt = function (d) { return '<option value="' + esc(d.id) + '">' + esc(d.gruppe ? d.kurz : d.name) + '</option>'; };
  var gruppen = L.map(function (d) { return d.gruppe; }).filter(function (g, i, a) { return g && a.indexOf(g) === i; });
  var box = document.createElement('div'); box.className = 'demo-design';
  box.innerHTML = '<label for="demoDesign"><b>Design ausprobieren:</b></label> <select class="feld" id="demoDesign"><option value="standard">Standard</option>'
    + L.filter(function (d) { return !d.gruppe; }).map(opt).join('')
    + gruppen.map(function (g) { return '<optgroup label="' + esc(g) + '">' + L.filter(function (d) { return d.gruppe === g; }).map(opt).join('') + '</optgroup>'; }).join('')
    + '</select> <span class="muted" id="demoDesignText"></span>';
  document.querySelector('.bar').appendChild(box);
  var wahl = box.querySelector('select'), text = box.querySelector('#demoDesignText');
  if (root.dataset.design && Designs.hole(root.dataset.design)) wahl.value = root.dataset.design;   // im Konto gewähltes Design
  function zeige() { var d = Designs.hole(wahl.value); text.textContent = d ? d.beschreibung || '' : 'So sieht die Seite ohne Design aus.'; }
  wahl.addEventListener('change', function () {
    Designs.anwenden(wahl.value);
    if (!Designs.hole(wahl.value) || !Designs.hole(wahl.value).modus) {   // Design ohne festes Hell/Dunkel: Wahl des Geräts wiederherstellen
      var t = null; try { t = localStorage.getItem('wenn-theme'); } catch (e) {}
      root.dataset.theme = t || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
    zeige(); bild(true);
  });
  zeige();
  // Bild des Szenarios (lib/szenario.js) in den Platzhalter .sz-bild zeichnen, sobald die Seite „Szenario“ angezeigt wird
  var chat = null; DATEN.schritte.forEach(function (s) { (s.aufgaben || []).forEach(function (a) { if (a.typ === 'chat' && a.nachrichten.some(function (m) { return m && m.id; })) chat = a; }); });
  function bild(neu) { var el = document.querySelector('.sz-bild'); if (el && chat && window.Szenario && (neu || !el.firstChild)) Szenario.zeige(el, chat); }
  new MutationObserver(function () { bild(false); }).observe(document.getElementById('app'), {childList: true, subtree: true});
  bild(false);
});
</script>
</head>`;
fs.writeFileSync(H + 'IT/tools/demo-aufgabentypen.html', S.seiteHTML(j, {pfad: 'IT/tools', toolId: 'demo-typen'}).replace('(Übung erstellen, eingereicht)', '(werkzeuge/demo-aufgabentypen.js)').replace('Inhalt bearbeiten: nur DATEN unten ändern', 'Inhalt bearbeiten: im Skript ändern und neu erzeugen').replace('</head>', UMSCHALTER));
console.log('geschrieben,', JSON.stringify(j).length, 'Zeichen');
