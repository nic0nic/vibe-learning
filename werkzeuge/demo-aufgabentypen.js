// Erzeugt pb_public/IT/tools/demo-aufgabentypen.html (Demo der experimentellen Aufgabentypen und des Szenarios).
// Aufruf im Hauptordner: node werkzeuge/demo-aufgabentypen.js – Texte und Aufgaben hier ändern, nicht in der erzeugten Seite.
// Oben ein Umschalter für die Designs aus lib/designs.js (UMSCHALTER unten, einziger eigener Code der Seite).
// Je Seite ein Typ: Anleitung (wofür, Bedienung, Erstellen im Baukasten und im JSON) und eine Aufgabe, deren Inhalt den Typ erklärt.
const fs = require('fs'), H = __dirname + '/../pb_public/', S = require(H + 'lib/seite.js');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// JSON der Aufgabe als Beispiel (eingebettetes Bild gekürzt)
const json = a => '<pre>' + esc(JSON.stringify(a, (k, v) => k === 'bild' ? 'data:image/svg+xml;base64,…' : v, 1).replace(/\n {2,}/g, ' ').replace(/\n(?=[\]}])/g, ' ')) + '</pre>';
const WO = '<p><b>Im Baukasten:</b> Tools → Übung erstellen, links unter „Experimentell (β)“ den Baustein ';
const seite = (kurz, titel, wofuer, bedienung, baukasten, felder, aufgaben, extra) => ({kurz, titel,
  html: `<h2>${titel}</h2><p class="info">${wofuer}</p><h3>So arbeiten die Schüler</h3><p>${bedienung}</p><h3>So erstellst du die Aufgabe</h3>${WO}${baukasten}</p>`
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

// Szenario als Baum (verschachtelte Liste): Nachrichten der Reihe nach, Antworten als Äste; Sprünge zu schon gezeigten Nachrichten als Verweis
function baum(a) {
  const N = a.nachrichten, kurz = m => { const t = String(typeof m === 'string' ? m : m.bot).replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' '); return esc(t.length > 58 ? t.slice(0, 56).replace(/\s+\S*$/, '') + ' …' : t); };
  const ziel = id => N.findIndex(n => n && typeof n === 'object' && n.id === id), gezeigt = new Set();
  const nach = (m, i, x) => (x && x.ende) || (m && typeof m === 'object' && m.ende && !(x && x.weiter != null)) ? N.length
    : (j => j >= 0 ? j : i + 1)(ziel(x && x.weiter != null ? x.weiter : m && typeof m === 'object' ? m.weiter : null));
  const ENDE = '<li><span class="b-ende">■ Ende</span></li>';
  function folge(i) {
    let h = '';
    for (;;) {
      if (i >= N.length) return h + ENDE;
      const m = N[i], obj = m && typeof m === 'object';
      if (gezeigt.has(i)) return h + `<li><span class="b-sprung">↩ weiter bei „${kurz(m)}“</span></li>`;
      gezeigt.add(i);
      const marke = obj && m.id ? ` <span class="b-marke">⚑ ${esc(m.id)}</span>` : '';
      if (!obj || !(m.antworten || m.zahl || m.freitext)) { h += `<li><span class="b-bot">${kurz(m)}</span>${marke}</li>`; i = nach(m, i); continue; }
      const wahl = m.antworten && !m.antworten.some(x => x.ok);
      const A = m.antworten ? m.antworten.map(x => ({t: `„${esc(x.t)}“` + (wahl ? '' : x.ok ? ' ✓' : ' ✗'), eigen: x.weiter != null || x.ende, x}))
        : [{t: m.zahl ? `Zahl: ${m.zahl.l}${m.zahl.e ? ' ' + esc(m.zahl.e) : ''}` : 'Begriff eintippen', eigen: false}];
      const offen = A.some(y => !y.eigen);
      h += `<li><span class="b-frage">${wahl ? 'Entscheidung' : 'Frage'}: ${kurz(m)}</span>${marke}<ul>`
        + A.map(y => `<li><span class="b-antwort">${y.t}</span>${y.eigen ? `<ul>${folge(nach(m, i, y.x))}</ul>` : ''}</li>`).join('') + '</ul></li>';
      if (!offen) return h;
      i = nach(m, i);
    }
  }
  return `<ul class="baum">${folge(0)}</ul>`;
}

const schritte = [
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
  seite('Verbessern', 'Fehler verbessern (verbessern)',
    'Fehlersuche wie in den Bereichen HTML und Python, aber für beliebige Texte: Rechtschreibung, Grammatik, Code, Buchungssätze.',
    'Erst die Zeile mit dem Fehler anklicken. Dann in dieser Zeile alle falschen Stellen anklicken (nochmal klicken wählt wieder ab) und „Prüfen“. Zum Schluss die Stellen verbessern und wieder „Prüfen“. Bei nur einer Zeile entfällt der erste Schritt.',
    '<b>🩹 Fehler verbessern</b> anklicken und den Text mit den eingebauten Fehlern eintragen.',
    ['<code>text</code>: reiner Text, Zeilen mit <code>\\n</code>, Fehler als <code>[[falsch|richtig]]</code> – das <b>Falsche zuerst</b>, es wird angezeigt', 'weitere richtige Lösungen anhängen: <code>[[falsch|richtig|auch richtig]]</code>; <code>[[zu viel|]]</code> = Stelle löschen', 'Stellen sind Wörter (durch Leerzeichen getrennt); ein Fehler mitten im Wort braucht eine eigene Klammer: <code>Titel[[&lt;/h2&gt;|&lt;/h1&gt;]]</code>', '<code>"mono": true</code>: Code, <code>"gross": false</code>: Groß/klein egal, <code>h</code>: Hinweis'],
    [{typ: 'verbessern', frage: 'In dieser Anleitung stecken drei Fehler. Finde und verbessere sie.',
      text: 'Fehler stehen in [[einfachen|doppelten]] eckigen Klammern.\nIn der Klammer steht zuerst das [[Richtige|Falsche]] und danach die Verbesserung.\nDie Schüler klicken zuerst die Zeile mit dem Fehler an.\nGetrennt wird mit einem senkrechten [[Komma|Strich]].',
      gross: false, h: 'Lies oben unter „Im JSON“ nach.', ok: 'Alle drei Fehler verbessert – so funktioniert der Typ.'}]),
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
  seite('Kreuzwort', 'Kreuzworträtsel (kreuzwort)',
    'Zum Wiederholen von Fachbegriffen. Sparsam einsetzen: Es kostet die Schüler viel Zeit für wenige Begriffe.',
    'Ein Feld oder einen Hinweis anklicken und tippen, der Cursor springt weiter. Leertaste oder nochmaliges Antippen wechselt zwischen waagrecht und senkrecht, die Pfeiltasten bewegen den Cursor. „Prüfen“ färbt falsche Buchstaben rot.',
    '<b>🔠 Kreuzworträtsel</b> anklicken und je Zeile Lösungswort und Hinweis eintragen. Das Gitter entsteht von selbst und sieht immer gleich aus.',
    ['<code>woerter</code>: Liste aus <code>{"w": "Wort", "t": "Hinweis"}</code>, 2 bis 25 Wörter', 'Buchstaben A–Z, Ä, Ö, Ü; ß wird SS, Leerzeichen und Bindestriche entfallen', 'Wörter ohne gemeinsamen Buchstaben stehen einzeln unter dem Gitter'],
    [{typ: 'kreuzwort', frage: 'Löse das Rätsel rund um das Kreuzworträtsel.',
      woerter: [{w: 'Gitter', t: 'Es entsteht von selbst aus der Wortliste'}, {w: 'Hinweis', t: 'Das steht im Feld t'}, {w: 'Leertaste', t: 'Wechselt die Schreibrichtung'},
        {w: 'Baukasten', t: 'Dort stellst du die Aufgabe zusammen'}, {w: 'Senkrecht', t: 'Von oben nach unten'}, {w: 'Umlaut', t: 'Ä, Ö oder Ü: ein … bekommt ein eigenes Feld'}]}]),
  seite('Szenario', 'Szenario (chat mit Verzweigungen)',
    'Der Lern-Chat kann jetzt verzweigen: Entscheidungen führen zu unterschiedlichen Verläufen, zum Beispiel bei einer Kreditberatung oder einem Datenschutz-Fall. Das Szenario ist nicht experimentell, alte Chats laufen unverändert.',
    'Wie im Lern-Chat: Knöpfe antippen oder Antworten eintippen. Je nach Antwort geht das Gespräch anders weiter.',
    '<b>💬 Lern-Chat</b> (oben bei den Aufgaben) anklicken und den Schalter „Szenario (Verzweigungen)“ einschalten. Dann bekommt eine Nachricht eine <b>Marke</b>, und bei Antworten oder Nachrichten wählst du unter „weiter zu“ diese Marke.',
    ['<code>"id": "marke"</code> an einer Nachricht: Sprungziel', '<code>"weiter": "marke"</code> an einem Antwort-Knopf oder einer Nachricht: dorthin springen statt zur nächsten Nachricht', '<code>"ende": true</code>: Der Chat endet hier', 'Hat kein Knopf <code>"ok": true</code>, ist es eine Entscheidung ohne richtig und falsch', 'Text mit Marke als Objekt: <code>{"bot": "Text", "id": "marke"}</code>'],
    [{typ: 'chat', name: 'Szenario-Hilfe', bild: '🧭', nachrichten: [
      'Hallo! Ich bin selbst ein Szenario und zeige dir, wie ich gebaut bin.',
      {id: 'menue', bot: 'Was möchtest du wissen?', antworten: [{t: 'Wie springe ich?', weiter: 'sprung'}, {t: 'Was ist eine Entscheidung?', weiter: 'wahl'}, {t: 'Wie endet ein Chat?', weiter: 'schluss'}]},
      {id: 'sprung', bot: 'Diese Nachricht hat die Marke <code>sprung</code>. Der Knopf, den du gedrückt hast, hat <code>"weiter": "sprung"</code>.'},
      {bot: 'Wohin geht es ohne <code>weiter</code>?', antworten: [{t: 'zur nächsten Nachricht', ok: true, r: 'Genau, einfach der Reihe nach.'}, {t: 'zum Anfang', r: 'Nein: Ohne <code>weiter</code> kommt die nächste Nachricht.'}], weiter: 'menue'},
      {id: 'wahl', bot: 'Die Frage „Was möchtest du wissen?“ ist eine Entscheidung: Kein Knopf hat <code>"ok": true</code>. Sie zählt nicht als Frage und wird nicht als richtig oder falsch gewertet.', weiter: 'menue'},
      {id: 'schluss', bot: 'Eine Nachricht mit <code>"ende": true</code> beendet den Chat – so wie diese. Mit „Noch einmal“ kannst du die anderen Wege gehen.', ende: true}]}],
    '<p><b>Achte darauf:</b> Jeder Zweig braucht ein Ende – entweder eine Nachricht mit „Ende“ oder einen Sprung zu einem gemeinsamen Schluss. Sonst läuft der Chat einfach in den nächsten Zweig weiter.</p>')
];
// Baum des Szenarios vor dem JSON-Beispiel einfügen
{ const s = schritte[schritte.length - 1];
  s.html = s.html.replace('<details>', '<h3>Das Szenario unten als Baum</h3><p>Von oben nach unten: Nachrichten des Bots, darunter eingerückt die Antworten und was auf sie folgt. ⚑ = Marke, ↩ = Sprung zu einer Nachricht, die schon im Baum steht.</p>' + baum(s.aufgaben[0]) + '<details>'); }
const j = {titel: 'Demo Aufgabentypen', kurztext: 'Neue Aufgabentypen (experimentell) und das Szenario: Jede Seite zeigt einen Typ und erklärt, wie du ihn erstellst.', schritte};
const f = S.pruefe(j); if (f.length) { console.log(f.join('\n')); process.exit(1); }
// Umschalter für die Designs (lib/designs.js): gilt nur auf dieser Seite und bis zum Neuladen, die Einstellung im Konto bleibt unberührt
const UMSCHALTER = `<script src="../../lib/designs.js"></script>
<style>.demo-design{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;margin-top:8px;font-size:14px}.demo-design select{max-width:100%}
/* Baum eines Szenarios (verschachtelte Liste mit Verbindungslinien) */
.baum,.baum ul{list-style:none;margin:0;padding:0}.baum{margin:0 0 12px}.baum ul{margin:4px 0 0 14px}
.baum li{position:relative;padding:4px 0 4px 18px;font-size:14px}
.baum li::before{content:"";position:absolute;left:0;top:0;bottom:0;border-left:2px solid var(--border)}
.baum li:last-child::before{bottom:auto;height:17px}
.baum li::after{content:"";position:absolute;left:0;top:17px;width:13px;border-top:2px solid var(--border)}
.baum span{display:inline-block;border:1px solid var(--border);border-radius:8px;padding:1px 8px;background:var(--panel2)}
.baum .b-frage{border-color:var(--accent);font-weight:600}.baum .b-antwort{border-radius:999px;background:var(--panel);border-color:var(--accent);color:var(--accent-text,var(--accent))}
.baum .b-sprung,.baum .b-ende{border-style:dashed;color:var(--muted);background:none}.baum .b-marke{border:0;background:none;padding:0 2px;color:var(--muted);font-size:12.5px}</style>
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
    zeige();
  });
  zeige();
});
</script>
</head>`;
fs.writeFileSync(H + 'IT/tools/demo-aufgabentypen.html', S.seiteHTML(j, {pfad: 'IT/tools', toolId: 'demo-typen'}).replace('(Übung erstellen, eingereicht)', '(werkzeuge/demo-aufgabentypen.js)').replace('Inhalt bearbeiten: nur DATEN unten ändern', 'Inhalt bearbeiten: im Skript ändern und neu erzeugen').replace('</head>', UMSCHALTER));
console.log('geschrieben,', JSON.stringify(j).length, 'Zeichen');
