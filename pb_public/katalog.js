/* Inhaltsverzeichnis der Übungsplattform
 *
 * Das ist die einzige Stelle, an der ein neues Tool eingetragen werden muss.
 * Menüleiste, Startseite, Bereichsseiten, Speichern und Lehrerbereich lesen von hier.
 *
 * Aufbau:   Fach → (Jahrgangsstufe) → Bereich → Tool. Ordner in pb_public: <Fach>/<Bereich>/
 *           bzw. <Fach>/<Stufe>/<Bereich>/, z. B. IT/excel/wenn.html, BWR/9II/anlagen/…
 * Fach:     id      = Ordnername (z. B. IT, BWR), titel = Anzeige im Fach-Menü, text = Untertitel der Startseite
 *           bereiche = [Bereich] oder stufen = [{id (Ordner, z. B. 9II), titel (Fach-Menü), kurz (oben in der
 *           Leiste, z. B. 9), text, bereiche}] für Fächer mit Jahrgangsstufen
 *           tools = optional bei Fächern mit Stufen: Tools für alle Jahrgangsstufen (Datei direkt in <Fach>/, z. B.
 *           Englisch/vokabeltrainer.html), im Fach-Menü unter den Stufen und auf der Fachseite; farbe/farbeHell wie beim Bereich.
 *           Intern ein eigener Bereich (id = Fach klein, fachweit: true, pfad = Fach) ohne Eintrag in KATALOG.gruppen
 * Bereich:  id      = Name des Unterordners (nur a–z, 0–9, -), über alle Fächer eindeutig
 *           titel   = Text in der Menüleiste
 *           farbe   = Akzentfarbe im dunklen Design (Nord-Farben, nordtheme.com),
 *           farbeHell = dunklerer Ton derselben Farbe für das helle Design (sonst schlecht lesbar)
 *           farbeSchrift = optional: hellerer Ton für Schrift im dunklen Design, wenn farbe dort zu wenig Kontrast hat
 *           Ohne farbe bekommt der Bereich das neutrale Nord-Blau.
 * Tool:     id      = Kürzel für Speicherstand und Auswertung, über alle Fächer eindeutig (nie mehr ändern,
 *                     sonst geht der gespeicherte Fortschritt verloren)
 *           datei   = HTML-Datei im Ordner des Bereichs
 *           titel, text = Anzeige im Menü und auf den Übersichtsseiten
 *           bedingt = true: nur sichtbar, wenn der Server es für den angemeldeten Schüler freigibt
 *                     (z. B. Tipp-Aufgabe, siehe /api/trainer/sichtbar in pb_hooks/tippen.pb.js)
 *           stufen  = Stufen der Übungen für die Auswertung (lehrer.html): Anzahl oder Liste
 *                     mit Kurznamen, wenn die Nummern allein missverständlich wären
 *           gruppe  = optional: Untermenü im Menü (aufklappen beim Darüberfahren) und
 *                     Zwischenüberschrift auf der Bereichsseite (Tools derselben Gruppe direkt hintereinander)
 * Bereich mit auswertung: false (z. B. Tools ohne Aufgaben) erscheint nicht im Lehrerbereich.
 *
 * In der HTML-Datei eines Tools steht dieselbe id: <html lang="de" data-trainer="…">.
 * Übersichtsseiten: Bereich <html data-bereich="IT/excel">, Fach bzw. Stufe <html data-gruppe="IT">
 * bzw. data-gruppe="BWR/9II" mit <div id="pf-start">, Fach mit Stufen <html data-fach="BWR"> mit <div id="pf-fach">.
 *
 * Eingereichte Übungen (IT/tools/uebung-erstellen.html → Pull Request) stehen unten zwischen EINREICHUNGEN-ANFANG und -ENDE als
 * reines JSON: [{"bereich": "<Bereich-id>", "tool": {id, datei, titel, text}}]. Der Server (pb_hooks/einreichen.pb.js)
 * ergänzt dort; von Hand nur gültiges JSON eintragen. Sie werden an das Ende des Bereichs angehängt.
 *
 * Am Ende berechnet: KATALOG.gruppen = [{pfad, fach, stufe, titel, text, bereiche}] (Fach bzw. Fach + Stufe)
 * und KATALOG.bereiche = alle Bereiche aller Fächer, jeweils mit pfad (Ordner) und gruppe.
 */
window.KATALOG = {
  name: 'vibe learning',
  untertitel: 'Übungen für den Unterricht. Wähle oben Fach und Bereich aus.',
  faecher: [
    {id: 'IT', titel: 'IT', text: 'Informationstechnologie: Tabellenkalkulation, Programmieren, Webseiten, Datenbanken, Tippen und Werkzeuge.',
      bereiche: [
        {id: 'grundlagen', titel: 'Grundlagen', farbe: '#ebcb8b', farbeHell: '#8a6d1f', text: 'Wie Computer Informationen darstellen: Zahlensysteme und mehr.',
          tools: [
            {id: 'zahlensysteme', stufen: ['Auswählen', 'Auswählen auf Zeit', 'Eintippen', 'Eintippen auf Zeit'], datei: 'zahlensysteme.html', titel: 'Zahlensysteme', text: 'Dezimal, binär und hexadezimal: Stellenwerte verstehen, Bits schalten, umrechnen – mit Endlos-Modus in vier Stufen (auswählen oder eintippen, mit oder ohne Zeit).'}
          ]
        },
        {
          id: 'excel', titel: 'Excel', farbe: '#a3be8c', farbeHell: '#5e8a45',
          text: 'Tabellenkalkulation: Funktionen, Bedingungen und Verknüpfungen.',
          tools: [
            {id: 'fn',   stufen: 5, datei: 'funktionen_1_6.html', titel: 'SUMME, MIN, MAX …', text: 'SUMME, MITTELWERT, MIN, MAX, ANZAHL und ANZAHL2 – mit Erklärung, Übungen und Endlos-Modus.'},
            {id: 'wenn', stufen: 9, datei: 'wenn.html',       titel: 'WENN-Funktion',     text: 'Die WENN-Funktion üben – von Bausteinen bis zur eigenen Formel.'},
            {id: 'wbz', stufen: 6, datei: 'wenn-bezuege.html', titel: 'WENN mit $', text: 'WENN-Formeln auf ganze Spalten übertragen: Grenzwerte mit $ festhalten – Zellen in der Tabelle auswählen wie in Excel.'},
            {id: 'uo',   stufen: 9, datei: 'und-oder.html',   titel: 'UND / ODER',        text: 'Bedingungen verknüpfen – mit Erarbeitung, Übungen und Endlos-Modus.'},
            {id: 'uobz', stufen: 6, datei: 'und-oder-bezuege.html', titel: 'UND / ODER mit $', text: 'WENN mit UND/ODER auf ganze Spalten übertragen: Grenzwerte mit $ festhalten – Zellen in der Tabelle auswählen wie in Excel.'},
            {id: 'bz',   stufen: 6, datei: 'bezuege.html',    titel: 'Zellbezüge $',      text: 'Relative und absolute Bezüge: Formeln übertragen und $-Zeichen richtig setzen.'}
          ]
        },
        {id: 'python',      titel: 'Python', farbe: '#b48ead', farbeHell: '#8a5f84', text: 'Programmieren mit Python.',
          tools: [
            {id: 'py', datei: 'editor.html', titel: 'Python-Editor', text: 'Python direkt im Browser schreiben und ausführen – mit Terminal für Ein- und Ausgabe.'},
            {id: 'pyif', stufen: 3, datei: 'bedingungen.html', titel: 'Bedingte Anweisung', text: 'if, elif und else: 10 Aufgaben mit Erklärung und automatischer Prüfung.'},
            {id: 'pyfehler', datei: 'fehlersuche.html', titel: 'Fehlersuche', text: 'Syntax-, Laufzeit- und Logikfehler finden und verbessern: In einer Zeile steckt ein Fehler – endlos neue Aufgaben.'}
          ]
        },
        {id: 'html', titel: 'HTML', farbe: '#e8a5c0', farbeHell: '#ad4c7a', text: 'Webseiten gestalten mit HTML und CSS.',
          tools: [
            {id: 'htmled', datei: 'editor.html', titel: 'HTML-Editor', text: 'HTML und CSS schreiben und sofort die Vorschau sehen – mit Regelprüfung, Handy-Ansicht und Download der fertigen Seite.'},
            {id: 'htmlaufbau', gruppe: 'Kurs', stufen: 3, datei: '01-aufbau-webseite.html', titel: '1 Aufbau einer Webseite', text: 'Tags, Elemente, Attribute und das Grundgerüst: 6 Aufgaben an der Webseite der Band Mouse Rat.'},
            {id: 'htmltext', gruppe: 'Kurs', stufen: 3, datei: '02-text-strukturieren.html', titel: '2 Text strukturieren', text: 'Überschriften, Absätze, Zeilenumbruch, Aufzählung und nummerierte Liste.'},
            {id: 'htmllinks', gruppe: 'Kurs', stufen: 3, datei: '03-links-bilder.html', titel: '3 Links und Bilder', text: 'Hyperlinks, Sprungmarken und Bilder mit Alternativtext.'},
            {id: 'htmlcss', gruppe: 'Kurs', stufen: 3, datei: '04-css-grundlagen.html', titel: '4 CSS-Grundlagen', text: 'Stilvorlagen: Regeln aus Selektor, Attribut und Attributwert – Farbe, Schrift, Ausrichtung.'},
            {id: 'htmlklassen', gruppe: 'Kurs', stufen: 3, datei: '05-klassen-abstaende.html', titel: '5 Klassen und Abstände', text: 'Klassenselektor, Rahmen, Innen- und Außenabstand (Boxmodell).'},
            {id: 'htmldesign', gruppe: 'Kurs', stufen: 3, datei: '06-design-projekt.html', titel: '6 Design und Projekt', text: 'Gute Gestaltung: Inhalt, Bedienbarkeit, Barrierefreiheit, verschiedene Geräte – dann die eigene Seite entwerfen und herunterladen.'},
            {id: 'htmlfehler', datei: 'fehlersuche.html', titel: 'Fehlersuche', text: 'Fehler in HTML und CSS finden und verbessern: In einer Zeile steckt ein Fehler – endlos neue Aufgaben.'}
          ]
        },
        {id: 'datenbanken', titel: 'Datenbanken', farbe: '#bf616a', farbeHell: '#a3434c', farbeSchrift: '#e0959b', text: 'Tabellen, Beziehungen und SQL-Abfragen.',
          tools: [
            {id: 'sqlfrei', datei: 'filmdatenbank.html', titel: 'Film-Datenbank', text: 'Eigene Abfragen an die Filmdatenbank stellen, ohne Aufgaben – mit Entwurfsansicht oder in SQL.'},
            {id: 'sql', stufen: 5, datei: 'abfragen.html', titel: 'SQL-Abfragen', text: 'SELECT, FROM, WHERE und ORDER BY an einer Filmdatenbank – mit Erarbeitung (Abfragen ansehen, abändern, Bedingungen ziehen) und Tooltipps, vom Entwurf bis zur eigenen SQL-Abfrage.'},
            {id: 'sqluo', stufen: ['Access 1', 'Access 2', 'Access 3', 'SQL 1', 'SQL 2', 'SQL 3', 'SQL 4', 'SQL 5'], datei: 'und_oder_datenight.html', titel: 'Datenight: UND / ODER', text: 'Drei Wochen Dates mit immer verrückteren Filmwünschen: Kriterien mit UND und ODER – mit Erarbeitung für Access (Zeilen und Wahrheitstabelle), im Access-Entwurf oder mit Blöcken und SQL.'},
            {id: 'bericht', datei: 'bericht.html', titel: 'Bericht (Versuch)', text: 'Berichte aus einer Abfrage entwerfen wie in Access: als Liste oder eine Seite je Datensatz, mit Seitenansicht als PDF.'}
          ]
        },
        {id: 'tippen', titel: 'Tippen', farbe: '#8db3ee', farbeHell: '#2b579a', text: 'Schnell und sicher tippen mit zehn Fingern.',
          tools: [
            {id: 'tippen', datei: 'pockettype.html', titel: 'pockettype', text: 'Tipptrainer: Wörter und Anschläge pro Minute, Genauigkeit, Bestwerte und Verlauf. Eigenes Projekt auf Basis von Monkeytype (GPL-3.0).'},
            {id: 'lektionen', datei: 'lektionen.html', titel: 'Lektion üben', text: 'Die 17 Lektionen aus TIPP10 in fester Reihenfolge: von der Grundreihe asdf jklö bis zu Ziffern und Sonderzeichen.'},
            {id: 'tippaufgabe', bedingt: true, datei: 'aufgabe.html', titel: 'Aufgabe', text: 'Den Text abschreiben, den deine Lehrkraft aufgegeben hat – so oft du willst.'}
          ]
        },
        {id: 'tools', titel: 'Tools', farbe: '#b4bdcc', farbeHell: '#4c566a', auswertung: false, text: 'Werkzeuge für den Unterricht, ohne Aufgaben.',
          tools: [
            {id: 'strukto', gruppe: 'Struktogramm', datei: 'struktogramm.html', titel: 'Struktogramm-Editor', text: 'Struktogramme mit der Maus zusammensetzen und als SVG, HTML oder JPG exportieren.'},
            {id: 'pystrukto', gruppe: 'Struktogramm', datei: 'python-struktogramm.html', titel: 'Python → Struktogramm', text: 'Python-Code eingeben, das Struktogramm entsteht sofort daneben – zum Export oder zum Weiterbearbeiten im Editor.'},
            {id: 'uebung-erstellen', gruppe: 'Übungen', datei: 'uebung-erstellen.html', titel: 'Übung erstellen', text: 'Eigene Übungen im Baukasten zusammenstellen, testen und als Datei oder als Lernpaket für ByCS herunterladen.'}
          ]
        }
      ]
    },
    {id: 'BWR', titel: 'BWR', text: 'Betriebswirtschaftslehre/Rechnungswesen.',
      stufen: [
        {id: '7II', titel: 'Jahrgangsstufe 7', kurz: '7', text: 'BWR, Jahrgangsstufe 7 (Wahlpflichtfächergruppe II).',
          bereiche: [
            {id: 'aufwand-ertrag', titel: 'Aufwendungen und Erträge', farbe: '#88c0d0', farbeHell: '#3b7f8c', text: 'Aufwands- und Ertragskonten: Einkauf und Verkauf buchen.',
              tools: [
                {id: 'chat-uefe', datei: 'lernchat-verkauf-eigener-erzeugnisse.html', titel: 'Lern-Chat: Verkauf eigener Erzeugnisse', text: 'Im Chat Schritt für Schritt den Buchungssatz für einen Verkauf erarbeiten: BK an UEFE, UST.'}
              ]}
          ]
        },
        {id: '9II', titel: 'Jahrgangsstufe 9', kurz: '9', text: 'BWR, Jahrgangsstufe 9 (Wahlpflichtfächergruppe II).',
          bereiche: [
            {id: 'unternehmensfuehrung', titel: 'Unternehmensführung', farbe: '#81a1c1', farbeHell: '#4f73a3', text: 'Übungen zur Unternehmensführung.', tools: []},
            {id: 'anlagen', titel: 'Anlagen', farbe: '#a3be8c', farbeHell: '#5e8a45', text: 'Übungen zu Anlagen.', tools: []},
            {id: 'finanzierung', titel: 'Finanzierung', farbe: '#ebcb8b', farbeHell: '#8a6d1f', text: 'Übungen zur Finanzierung.',
              tools: [
                {id: 'bilanz', stufen: ['Bilanzposten', 'AV/UV · EK/FK', 'Goldene Regel'], datei: 'bilanz.html', titel: 'Bilanz-Modell', text: 'Wie Buchungen die Bilanz verändern: Aktivtausch, Passivtausch, Aktiv-Passiv-Mehrung und -Minderung – eingeteilt nach Bilanzposten, nach AV/UV und EK/FK oder nach der Goldenen Finanzierungsregel.'},
                {id: 'bankkredit', datei: 'kredite-bank.html', titel: 'Kredite bei der Bank', text: 'Erarbeitung (Heft Kap. 5): Kreditfähigkeit und Kreditwürdigkeit zuordnen, Sicherheiten nennen, Disagio und Auszahlungsbetrag berechnen.'},
                {id: 'zins', datei: 'zinsrechnung.html', titel: 'Zinsrechnung', text: 'Von der Prozentrechnung zur Tageszinsformel: Jahreszinsen, Tageszinsen, Zinstage und Umstellen nach K, p und t selbstständig erarbeiten – mit Endlos-Modus (Heft Zinsrechnung).'},
                {id: 'effzins', datei: 'effektiver-zinssatz.html', titel: 'Effektiver Zinssatz', text: 'Kreditangebote mit Disagio vergleichen: tatsächliche Kreditkosten, effektiven Zinssatz berechnen, Kreditaufnahme buchen – mit Endlos-Modus (Heft Effektiver Zinssatz).'},
                {id: 'darlehen', datei: 'darlehensarten.html', titel: 'Darlehensarten', text: 'Abzahlungs-, Annuitäten- und Festdarlehen: Tilgungspläne als Formular ausfüllen, Zinskosten vergleichen und das passende Darlehen wählen (Heft Darlehensarten).'},
                {id: 'kurzkredit', datei: 'kurzfristige-kredite.html', titel: 'Kontokorrent-, Dispo- und Lieferantenkredit', text: 'Erarbeitung zu kurzfristigen Krediten (Heft Kap. 7): Lieferantenkredit auf der Zeitleiste ausprobieren, Merkmale zuordnen, Skonto berechnen und Kosten vergleichen.'}
              ]},
            {id: 'kapitalanlage', titel: 'Kapitalanlage', farbe: '#b48ead', farbeHell: '#8a5f84', text: 'Übungen zur Kapitalanlage.', tools: []},
            {id: 'forderungen', titel: 'Forderungen', farbe: '#bf616a', farbeHell: '#a3434c', farbeSchrift: '#e0959b', text: 'Übungen zu Forderungen.', tools: []}
          ]
        }
      ]
    },
    {id: 'Englisch', titel: 'Englisch', text: 'Englisch: Wortschatz und mehr.', farbe: '#d08770', farbeHell: '#a65a32',
      tools: [
        {id: 'vokabeltrainer', datei: 'vokabeltrainer.html', titel: 'Vokabeltrainer', text: 'Eigene Vokabeln eintragen oder einfügen, Modus wählen (Richtung, schreiben oder auswählen, einmal alle oder endlos, mit oder ohne Zeit) und los geht’s.'}
      ],
      stufen: [
        {id: '1', titel: 'Jahrgangsstufe 1', kurz: '1', text: 'Englisch, Jahrgangsstufe 1.',
          bereiche: [
            {id: 'wortschatz-1', titel: 'Wortschatz', farbe: '#d08770', farbeHell: '#a65a32', text: 'Vokabeln üben: anklicken, schreiben, auf Zeit.',
              tools: [
                {id: 'vokabel-demo', datei: 'vokabel-demo.html', titel: 'Vokabel-Demo', text: '50 Grundwörter in fünf Themen (Familie, Schule, Tiere, Essen, Farben und Zahlen): erst anklicken, dann schreiben, dann gemischt auf Zeit.'}
              ]}
          ]
        },
        {id: '2', titel: 'Jahrgangsstufe 2', kurz: '2', text: 'Englisch, Jahrgangsstufe 2.',
          bereiche: []
        },
        {id: '3', titel: 'Jahrgangsstufe 3', kurz: '3', text: 'Englisch, Jahrgangsstufe 3.',
          bereiche: []
        },
        {id: '4', titel: 'Jahrgangsstufe 4', kurz: '4', text: 'Englisch, Jahrgangsstufe 4.',
          bereiche: []
        },
        {id: '5', titel: 'Jahrgangsstufe 5', kurz: '5', text: 'Englisch, Jahrgangsstufe 5.',
          bereiche: []
        }
      ]
    }
  ]
};

window.KATALOG.einreichungen = /* EINREICHUNGEN-ANFANG */ [] /* EINREICHUNGEN-ENDE */;

// Gruppen (Fach bzw. Fach + Jahrgangsstufe) und alle Bereiche mit Ordner, für nav.js, sync.js und lehrer.html
(function (K) {
  K.gruppen = [];
  K.faecher.forEach(f => (f.stufen
    ? f.stufen.map(s => ({pfad: f.id + '/' + s.id, fach: f, stufe: s, titel: f.titel + ' ' + (s.kurz || s.titel), text: s.text || f.text, bereiche: s.bereiche}))
    : [{pfad: f.id, fach: f, stufe: null, titel: f.titel, text: f.text, bereiche: f.bereiche}]).forEach(g => K.gruppen.push(g)));
  K.bereiche = [].concat(...K.gruppen.map(g => g.bereiche.map(b => Object.assign(b, {pfad: g.pfad + '/' + b.id, gruppe: g}))));
  // Tools eines Fachs für alle Jahrgangsstufen (Fach.tools): eigener Bereich mit Ordner = Fach
  K.faecher.forEach(f => {
    if (!f.stufen || !f.tools || !f.tools.length) return;
    const g = {pfad: f.id, fach: f, stufe: null, titel: f.titel, text: f.text, bereiche: []};
    K.bereiche.push({id: f.id.toLowerCase(), titel: f.titel, text: f.text, farbe: f.farbe, farbeHell: f.farbeHell, farbeSchrift: f.farbeSchrift,
      tools: f.tools, pfad: f.id, gruppe: g, fachweit: true});
  });
  (K.einreichungen || []).forEach(e => {
    const b = K.bereiche.find(x => x.id === e.bereich);
    if (b && e.tool && !b.tools.some(t => t.id === e.tool.id)) b.tools.push(e.tool);
  });
})(window.KATALOG);
