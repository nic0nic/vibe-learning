# Fehlerliste für die nächste Version

Gesammelt im Thread „Aufbau der Seite“. Umgesetzt wird erst, wenn die Lehrkraft das ausdrücklich sagt.

## Offen

18. **Vorschlag: gemeinsame Teile in einen Ordner für alle Bereiche** (vorgeschlagen 02.11.)
    Die Datenbank-Seiten (abfragen.html, datenight.html, filmdatenbank.html in `IT/datenbanken/`) binden `../excel/basis.js`/`basis.css` (Stufen, Modi, Dock) und `../python/lib/codemirror.*` ein. Sauberer wäre z. B. `pb_public/lib/` für alles, was mehrere Bereiche nutzen. Seit dem 04.11. gibt es mehrere Fächer: Der Ordner gälte dann auch für BWR-Übungen (z. B. basis.js für Stufen und Modi). Betrifft alle Excel-, Python- und Datenbank-Seiten unter `IT/`.
    Stand 04.11.: `pb_public/lib/` gibt es jetzt (aufgaben.js/.css). basis.js und codemirror liegen noch in den Bereichen.
    Stand 09.11.: Auch der neue Bereich `IT/html/` bindet `../python/lib/codemirror.*` ein (dazu eigene Modi in `IT/html/lib/codemirror-html.js`).


51. **ByCS-Lernplattform: Übungen als SCORM-Pakete mit Auswertung** (gewünscht 12.11., Branch `bycs`)
    Neuer Ordner `bycs/` mit einer SCORM-2004-ZIP je Übung (`werkzeuge/bycs-pakete.py`, nutzt `einzeldateien.py`). `pb_public/scorm.js` ersetzt im Paket `sync.js`: Stand in `cmi.suspend_data` (ersetzt beim Öffnen den Browser-Stand), Bewertung in Prozent wie in lehrer.html gezählt, jede gelöste Aufgabe als Interaktion. Keine eigene JSON-Datei: Moodle exportiert die Interaktionen selbst als CSV/Excel. Option `--scorm12` (4096 Zeichen, mit Komprimierung und Notlösung „nur Gelöstes speichern“).
    Getestet in Chromium mit nachgebauter SCORM-Schnittstelle (2004 und 1.2): Fremder Stand wird gelöscht, Stand kommt nach Neuladen zurück, Bewertung, Status, Interaktionen, Sitzungszeit, Komprimierung (305 Zufallstexte). Simuliert über `TrainerSync.event`, nicht durch echtes Lösen.
    **Offen:** Test in einem echten ByCS-Kurs (Hochladen, als Schüler lösen, Bericht/Bewertung ansehen), danach nach `main`. Später möglich: Moodle-Export in lehrer.html einlesen.

52. **Vollbild-Knopf auf allen Seiten, auch in ByCS** (gewünscht 12.11., Branch `bycs`)
    `nav.js`: Knopf rechts in der Leiste (vor Hell/Dunkel), auf jeder Seite, in Einzeldateien und ByCS-Paketen. Darf die Seite kein Vollbild (iframe ohne Erlaubnis, z. B. Moodle-Player), geht das iframe-Element im übergeordneten Fenster gleichen Ursprungs in Vollbild. Ohne Möglichkeit (iPhone) kein Knopf. Browser beenden Vollbild bei jedem Seitenwechsel, Tooltip nennt F11.
    Getestet in Chromium: Start-, Bereichs- und Übungsseiten (Excel, HTML-/Python-Kurs, BWR) ein/aus, Leiste läuft nicht über, Handybreite; nachgebauter Moodle-Player mit und ohne Vollbild-Erlaubnis. Nicht in Firefox/Safari, nicht in echtem ByCS.

53. **Großansicht neben Vollbild (für ByCS auf dem iPad)** (gewünscht 12.11.)
    `nav.js`: Läuft die Übung in einem iframe gleichen Ursprungs (Moodle-Player), gibt es einen zweiten Knopf „Großansicht“. Er legt das iframe per CSS über das ganze Fenster (fixed, z-index, Scrollen der Moodle-Seite aus); geht auch, wo Vollbild nicht klappt (iPad, Apps). Bleibt für die Sitzung an (sessionStorage `pf-gross`), Esc oder Knopf beendet und stellt den alten Stil wieder her. Auf der Webseite selbst kein Knopf (dort wirkungslos).
    Getestet in Chromium (iPad-Größe 820×1180) im nachgebauten Moodle-Player: an, nach Neuladen weiter an, Esc, an/aus, Webseite ohne Knopf. Nicht auf echtem iPad/ByCS.

64. **Töne bei Antworten** (aus Nr. 62, Design Musik)
    Eigene Option für alle Designs (Standard aus, Web Audio): kurzer Ton bei richtig/falsch. Braucht einen Schalter auf der Seite (auch in Einzeldateien und ByCS), deshalb getrennt von den Designs.

## Erledigt

### Version vom 14.11.

68. **IT: Bereich Grundlagen mit Zahlensystemen (Jgst. 6)** (gewünscht 14.11.)
    Neuer Bereich `IT/grundlagen` (erster Reiter in IT), Seite `zahlensysteme.html` (Tool `zahlensysteme`): Einführung (Stellenwerte im Dezimalsystem, Strom an/aus), Übung Dezimal, Binärsystem mit Bits zum Anklicken (Lampen, Summe live), Merkkästen zum Umrechnen (Werte der Einsen addieren; größten passenden Stellenwert abziehen), Übung Binär, Hexadezimalsystem (A–F, 16er-Stelle, 4 Bit = 1 Hex-Ziffer, Farben in HTML), Übung Hex, Endlos-Modus mit vier Stufen: Auswählen, Auswählen auf Zeit, Eintippen, Eintippen auf Zeit (zufällig dezimal↔binär bis 63, dezimal↔hex und binär↔hex bis 255; Ablenker ±1, ±2, ein Bit, Ziffern vertauscht; Eingabe mit führenden Nullen, Kleinbuchstaben, 0x).
    - `lib/aufgaben.js` Training: je Stufe eigene `antwort` und `zeit`, eigene Aufgaben über `stufe.neu({mc})` (nur Seiten mit Code). `lib/seite.js` und Skill (pruefe.py, typen.md) prüfen `antwort`/`zeit` je Stufe auch im JSON.
    - `Englisch/englisch.css` wird `lib/basis.css` (für handgebaute Seiten aller Fächer, gleich mit BASIS_CSS in lib/seite.js).
    - Endlos-Modus: Schalter Dezimal / Binär / Hexadezimal (mind. zwei an, gemerkt in `zahlensysteme-systeme`); es kommen nur Umrechnungen zwischen eingeschalteten Systemen.
    Getestet in Chromium (Server und Einzeldatei): Bits, Übungen richtig/falsch, alle vier Endlos-Stufen (je 6 richtig, Zeitbalken nur in 2 und 4), Fehler beendet Serie, 300 erzeugte MC-Aufgaben mit 4 verschiedenen Antworten; Vokabel-Demo und Vokabeltrainer weiter in Ordnung.

67. **Design im Kontomenü mit Untermenü** (gewünscht 14.11.)
    sync.js: statt Auswahlliste „Design ›“ mit Untermenü aller Designs, darin „Titelkarte ›“ mit Farbfeldern (wie in Übung erstellen). Öffnet nach links (Menü steht am rechten Rand), bis 760 px Breite eingerückt im Menü. Maus (Darüberfahren), Tippen, Esc.
    Getestet in Chromium mit nachgebautem Server (Anmeldung simuliert): Auswahl, Neuladen mit gewähltem Design, zurück auf Standard, Handy. Nicht mit echtem PocketBase.

66. **Vokabeltrainer für Schüler** (gewünscht 14.11.)
    `Englisch/vokabeltrainer.html` (Tool `vokabeltrainer`; zuerst in Stufe 1/Wortschatz, auf Wunsch für alle Jahrgangsstufen ins Fach verschoben: katalog.js kennt dafür `tools` am Fach, nav.js zeigt sie im Fach-Menü unter den Stufen und auf der Fachseite unter „Für alle Jahrgangsstufen“): 1 Eintragen (Tabelle, Enter springt weiter, neue Zeile entsteht von selbst, Sprachen benennbar und tauschbar, Liste einfügen aus Excel/Quizlet mit Tab, ;, = oder „ - “, Beispiel laden, leeren) → 2 Modus wählen (Richtung, Schreiben/Auswählen ab 4 Paaren, einmal alle/Endlos-Serie, ohne/auf Zeit, beim Schreiben Tippfehler und zweiter Versuch) → 3 Üben („Los geht’s!“, dann Aufgaben.training aus lib/aufgaben.js). Liste und Modus im Browser gespeichert (mit Anmeldung auf dem Server, Datenschutz ergänzt), Bestleistung je Modus. Grundaussehen aus `lib/basis.css` (zuerst als Englisch/englisch.css angelegt).
    Getestet in Chromium (Server und Einzeldatei, auch Handybreite): Tippen mit Enter, Einfügen (vier Trennzeichen, Zeile ohne Trennung wird übergangen), Löschen, Auswählen auf Zeit (6 von 6), Schreiben, Neuladen behält Liste und Modus. Nicht mit PocketBase.

65. **Fach Englisch mit Vokabel-Demo** (gewünscht 14.11.)
    Neues Fach `Englisch` mit den Jahrgangsstufen 1–5 (`pb_public/Englisch/1` … `/5`, Übersichtsseiten, katalog.js). Stufen 2–5 noch ohne Bereiche. In Stufe 1 Bereich „Wortschatz“ (`wortschatz-1`) mit „Vokabel-Demo“ (`vokabel-demo`): 50 Grundwörter in fünf Themen (Familie, Schule, Tiere, Essen, Farben und Zahlen), erzeugt mit lib/seite.js aus Aufgaben-JSON: Wortliste, Anklicken (Englisch → Deutsch, Runden zu 10, Thema über die Stufen), Schreiben (Deutsch → Englisch, Tippfehler zählen, auch „Alle 50“), gemischt auf Zeit (endlos, Bestleistung). `werkzeuge/einzeldateien.py` kennt das Fach (Einzeldatei und ByCS-Paket).
    Getestet in Chromium: Fach-, Stufen- und Bereichsseiten, alle Übungsteile auf dem Server und als Einzeldatei; nicht mit PocketBase (Speichern, Lehrerbereich).

62. **Weitere Designs** (vorgeschlagen 13.11., umgesetzt 14.11.)
    In `lib/designs.js` 12 neue Einträge (gemeinsame Bausteine `grund`, `schrift`, `flamme`, `eigene`, `ausruf`). Eigene Flammenform nur, wo sie passt; sonst bleibt die Flamme und wird im Stil gezeichnet.
    - Comic (`comic`): Rasterpunkte, dicke Konturen mit hartem Schatten, Rückmeldung als Sprechblase mit „ZACK!“, Flamme mit dicker Kontur. Schriften eingebettet (Bangers, Comic Neue; OFL, ca. 80 KB, nur in Seiten mit diesem Design).
    - Titelkarte (`titelkarte-pink`, `-rosa`, `-mint`, `-senf`, `-himmelblau`, `-bordeaux`; am 14.11. auf Wunsch alle im Stil der Kapitelkarten in `~/austausch/titelkarten`, die erste Serifen-Fassung ersetzt): farbiges Raster, weiße Karte mit cremefarbenen Querstreifen, fette geometrische Versalien (Jost eingebettet, OFL, ca. 28 KB), Briefmarke mit Zähnung schräg an der Ecke (eigenes Motiv), Farbbalken oben an den Karten, Akzentfarbe je Hintergrund. Im Design-Menü als Untermenü „Titelkarte ›“. Hintergrund umschaltbar (14.11., gewünscht): der Hell/Dunkel-Knopf wechselt zwischen Punkten in der Farbe auf Cremeweiß (hell) und dem Raster (dunkel); Seiten ohne diesen Knopf (Einzeldatei, ByCS) bekommen vom Design einen runden Knopf ◐ oben rechts. Die Karten bleiben in beiden Fällen hell.
    - Secondhand (`secondhand`): Sakko-Karo mit blauen und roten Linien, Karten/Antworten als Preisetiketten mit Loch, Knöpfe mit Steppnaht, Zeitbalken als Maßband, Flamme gesteppt.
    - Trattoria (`trattoria`): karierte Tischdecke, Speisekarte (N°, gepunktete Linien, Ornamente), „Perfetto!“.
    - Chemielabor (`chemielabor`): Millimeterpapier, Laborblatt, Reagenzgläser als Stufen, Zeitbalken als Messzylinder.
    - Videothek/Kino (`kino`): Filmstreifen an beiden Rändern, Antworten als DVD-Hüllen, Filmklappen als Stufen (klappen, wenn aktiv). Immer dunkel.
    - Candy Factory (`candy`): Zuckerstangen-Rahmen, laufender Zuckerstangen-Zeitbalken, Lollipops als Stufen.
    - Musik (`musik`): Notenpapier, Knöpfe als Klaviertasten, Noten als Stufen.
    Alle mit festem Hell/Dunkel-Modus. Skill (SKILL.md, pruefe.py) ergänzt. Getestet in Chromium mit einer Testübung (Info, MC, Zahlen, Zuordnen, Chat, Training mit Stufen, Vokabel-MC) und als Konto-Einstellung auf einer Excel-Seite; nicht in Firefox/Safari, nicht auf dem Handy.

### Version vom 13.11.

63. **Designs: Unterbau + Kommandozeile** (gewünscht 13.11.)
    Neu `lib/designs.js`: Design = CSS unter `html[data-design]` (überschreibt die Farbvariablen), Flammen-Vorlage (`window.PF_FLAMME`, genutzt von `aufgaben.js` und Excel `basis.js`), fester Hell/Dunkel-Modus (dann kein Knopf). Erstes Design „Kommandozeile“: schwarz, grüne Monospace-Schrift, Scanlines, `~/ `-Titel mit blinkendem Cursor, `> `-Aufgaben, `[ Knöpfe ]`, Flammen als `[1]`, gestrichelter Zeitbalken, immer dunkel.
    - Aufgaben-JSON: `"design": "kommandozeile"` (oben), `Seite.pruefe` kennt die Designs, `seiteHTML` bettet CSS ein (Vorschau, Download, ByCS, Einreichen). Editor: Auswahl „Design“ neben „Vorschau“ (auch im JSON-Modus). Skill (SKILL.md, pruefe.py) ergänzt.
    - Angemeldete: im Konto-Menü „Design“ mit Hinweis „Experimentell – nicht alle Übungen sind dafür gebaut. Gilt auf diesem Gerät.“ (localStorage `pf-design`, nav.js lädt designs.js nach; Seiten mit eigenem Design behalten es; beim Abmelden zurück auf Standard). Datenschutz ergänzt.
    Getestet in Chromium: Editor-Auswahl → JSON, Vorschau mit Training (Flammen, Zeitbalken), MC, Zahlen, Zuordnen, Buchungssatz, Lückentext; mit PocketBase (leere Testdatenbank, vorgetäuschte Lehrersitzung): Menü, Wechsel, BWR-Erarbeitung, Excel WENN, SQL, Startseite, Abmelden setzt zurück. Nicht auf Touch-Geräten, nicht mit echter Schüleranmeldung.

61. **Training: Eingabe ließ sich in der Vorschau nicht bestätigen** (gemeldet 13.11.)
    Die Vorschau von „Übung erstellen“ läuft im iframe mit `sandbox="allow-scripts"`; dort schickt der Browser kein `<form>` ab, Enter und „OK“ taten nichts (heruntergeladen ging es). Jetzt ohne Formular: Enter im Feld und Klick auf „OK“ direkt verdrahtet – geht auch in anderen abgeschotteten Einbettungen (z. B. Moodle). Getestet in der Vorschau und als Einzeldatei.

60. **Training: Aufgaben auf Zeit und/oder endlos, im Aufgaben-JSON und im Editor** (gewünscht 13.11.)
    Schritt mit `"training"` statt `"aufgaben"` (Format im Kopf von `lib/seite.js`): Antwort eintippen oder Multiple Choice; `anzahl` (Runde mit Ergebnis + Bestleistung) oder endlos (Fehler beendet die Serie, Bestleistung); `zeit` {start, schritt, min} unabhängig davon (Balken läuft ab); `versuche` (Standard aus); optional `stufen` (Flammen). Inhalt: Zahlen-Szenarien (Werte als Bereich/Schritt/Liste/Formel, Bedingung, Lösung, Runden, Einheit, typische falsche Antworten) oder Wörterbuch (Sprachen, Richtung a→b/b→a/beide, mehrere richtige Antworten mit |, Tippfehler optional).
    - Neu `lib/formel.js`: sicherer Ausdrucksparser (ohne eval) + Würfeln, genutzt von `aufgaben.js` (Aufgaben.training, auch in sequenz) und `seite.js` (Prüfung mit deutschen Meldungen, Probewürfeln der Bedingung); `seiteHTML` bindet formel.js ein.
    - Editor: Baustein „⏱ Training“ (neuer Schritt), Formular `vorlage-training.js`: Schalter Zeit/Endlos/Multiple Choice/Mehrere Versuche, Stufen als Reiter, Szenarien mit Werte-Textfeld („a: 1 bis 10“, „c = a * b“), Wörterbuch-Textfeld („house = Haus | Gebäude“), Import (Datei oder Einfügen: Tab aus Excel/Quizlet/Anki, ; oder , CSV mit Anführungszeichen, „ = “; Überschrift erkannt, UTF-8/Windows-1252, Vorschau, Spalten tauschen, ersetzen/anhängen), Export als CSV, „🎲 5 Beispiele würfeln“. Editor-Beispiel und Skill (typen.md, beispiel.json, pruefe.py mit Formel-Prüfung) ergänzt.
    - Ergebnisse: je Runde/Serie TrainerSync-Ereignis modus 'endlos' (Server kennt nur erarbeitung/uebungen/endlos), Schritt erledigt nach erster Runde bzw. Serie ab 10 (`ziel`).
    Getestet in Chromium: Runde mit Zeit (richtig, falsch, Zeit abgelaufen, schneller werdend), Ergebnis/Bestleistung nach Neuladen, Stufenwechsel, endlos MC mit Tasten 1–4, Vokabeln mit Versuchen und Tippfehler, Vokabel-MC beide Richtungen, Handybreite; Editor (Schalter, Werte, Fehler, Würfeln, Stufen, Import Windows-1252-CSV, Textfeld, Vorschau), Einzeldatei; Kombi/Kontenplan/JSON-Editor/SQL-Erarbeitung ohne Fehler. Nicht auf Touch-Geräten, nicht mit PocketBase/Einreichen.

59. **Übung erstellen: Konten für den Buchungssatz aus dem Kontenplan wählen** (gewünscht 13.11.)
    Neu `pb_public/BWR/kontenplan.js`: ISB-Kontenplan LehrplanPLUS (77 Konten, vier Spalten wie im PDF, Kennzeichen * für KLR, `finde('bk'|'2800'|'2800 BK')`, `text(konto, jgst7)`). Daraus `werkzeuge/kontenplan-md.js` → `~/austausch/kontenplan.md` (für Chats; nur in kontenplan.js ändern).
    Editor, Buchungssatz: Konten als Liste (Chips mit ×) statt Textfeld; Feld „Konto hinzufügen“ mit Vorschlägen aus dem Kontenplan („bk“, „2800“ → 2800 BK bzw. in Jgst. 7 BK); Knopf „📒 Konten auswählen …“ öffnet den Kontenplan im Overlay (vier Spalten, Suche, Konten anklicken/abwählen, ausgewählte mit ✓, unten „Weitere Optionen hinzufügen“ für Konten außerhalb des Plans). Liste und Overlay zeigen denselben Stand; Liste nach Kontenplan sortiert. Schalter Jgst. 7 aus: Nummern kommen aus dem Kontenplan zurück. Meldung „Das Konto „…“ steht in der Lösung, aber nicht in der Kontenauswahl“ statt JSON-Sprache (auch pruefe.py).
    Getestet in Chromium: Hinzufügen per Enter/Knopf, Overlay an/ab, Suche, eigene Konten, Jgst. 7 an/aus, Strg+Z, Chip entfernen, Einzeldatei.

58. **Übung erstellen: JSON-Modus mit Syntaxhervorhebung; Beträge ohne Bezeichnung** (gewünscht 13.11.)
    Neues `pb_public/vorlage-json.js`: CodeMirror 5 (aus `IT/python/lib/`) statt Textfeld, eigener Modus `vljson`: Feldnamen, Texte, HTML-Tags in Texten, Zahlen, true/false/null, Wert von "typ" hervorgehoben; Klammern in drei Farben je Tiefe; Klammer am Cursor + Gegenstück markiert, sonst das umschließende Paar (gestrichelt, Balken in der Zeilenleiste); Klammern/Anführungszeichen schließen selbst, Einrückung, Tab = 2 Leerzeichen, aktive Zeile, Zeilennummern, Strg+F des Browsers findet alles (viewportMargin Infinity). Eigener JSON-Prüfer: Stelle unterkringelt, Zeile markiert, deutsche Meldung unter dem Editor zum Anklicken (Komma zu viel/zu wenig, fehlender Doppelpunkt, offener Text, '…' statt "…", 8,5 statt 8.5 …), auch beim Wechsel in den Editor-Modus. Helles und dunkles Thema.
    `betraege`: Bezeichnung darf leer sein (`["", 238]`), dann zeigt die Karte nur den Betrag; Prüfungen in seite.js/pruefe.py angepasst.
    Getestet in Chromium: Farben, Klammerpaare (daneben/umschließend), Fehler mit Sprung, Bearbeiten → Entwurf/Titelfeld, Einrückung/Autoclose, Wechsel in den Editor, Vorschau mit Betrag ohne Bezeichnung, dunkel, Einzeldatei per file://.

57. **Editor: Fehler bei neuer Zuordnen-Karte blieb stehen** (gemeldet 13.11.)
    Der Fehlerkasten im Formular wurde nur beim Neuzeichnen des Panels erneuert – nach dem Eintippen stand der behobene Fehler weiter da. Jetzt wird er nach jeder Eingabe aktualisiert (ohne Fokusverlust). Ortsangabe sauber abgeschnitten (vorher „, Karte 5: …“). Meldungen verständlich: „Karte 3 im Feld „Feld 3“: Die Karte hat noch keinen Text.“ bzw. „Karte „…“: Die Karte gehört zu keinem Feld.“ (auch in `pruefe.py`).

56. **Aufgabentypen: Kombinierte Aufgabe, Buchungssatz mit Beträgen zum Ziehen, Buchungssatz Jgst. 7** (gewünscht 13.11.)
    - Neuer Typ `kombi` (`teile:[…]`, beliebig viele, keine Kombi in der Kombi) ersetzt `danach`. Alle Seiten mit `danach` umgestellt (darlehensarten, kurzfristige-kredite, effektiver-zinssatz, zinsrechnung, und_oder_datenight). Alte JSONs mit `danach` wandelt `Seite.normalisiere`/`Seite.ohneDanach` um (Einreichen, Editor, Vorschau); `pruefe.py` des Skills meldet `danach` als veraltet.
    - Editor: Kombi als Block wie „falls“ in Scratch (Kopf, Teile im Bauch, unten Zone „＋ Teil n“); „＋ Teil 2 anhängen“ an jeder Aufgabe macht daraus eine Kombi; Baustein anklicken bei markierter Kombi = nächster Teil; Teile ↑/↓, „Aus der Kombi lösen“, „Auflösen“. Buchungssatz in der Leiste nur einmal; oben im Formular Schalter „Jgst. 7“ (entfernt beim Einschalten die Kontonummern) und „Beträge ziehen“ (Liste mit „Beträge der Lösung dazu“ / „Ergebnisse der Rechnung davor dazu“). Meldungen zu fehlenden Bezeichnungen der Beträge verständlich.
    - Buchungssatz: `jgst: 7` (Konten nur Kürzel, Prüfung lehnt Nummern ab); Konto-Feld mit Suche nach Nummer oder Kürzel („ve“ → 4400 VE, Enter/Tab/Klick); „an“ steht nach `buchungssatz-syntax.md` auf der Zeile des letzten Soll-Kontos neben dem ersten Haben-Konto, „+ Soll-Konto“/„+ Haben-Konto“ darunter.
    Getestet in Chromium: 7.3 (Suche, Positionen, Lösung, Zurückblättern), Datenight-Kontrollfrage, Darlehensarten, Editor (Ziehen in Kombi, Klick-Anhängen, Varianten, Beträge übernehmen, Jgst-7-Prüfung, Herausziehen, keine Kombi in Kombi, altes danach), Vorschau mit Jgst. 7 und zwei Soll-Konten, Handybreite, SQL-Erarbeitung ohne Fehler. Nicht auf Touch-Geräten, nicht mit PocketBase/Einreichen.

55. **Kurzfristige Kredite 7.3: Buchungssatz für die Zahlung mit Skonto** (gewünscht 13.11.)
    Nach richtiger Kalkulation erscheint (als `danach`) der Buchungssatz `4400 VE 11.900,00 an 2800 BK 11.662,00 / 6002 NR 200,00 / 2600 VORST 38,00`. Die Beträge aus der Kalkulation (Rechnungsbetrag, Bruttoskonto als Ablenker, Nettoskonto, Steuerberichtigung, Überweisungsbetrag) lassen sich auf die Betragsfelder ziehen oder antippen. Rechnung jetzt über „Holz (Mahagoni)“ statt „20 Hälse aus Ahorn“.
    - `lib/aufgaben.js`: Typ `buchungssatz` mit neuer Option `betraege:[[Text, Betrag], …]`; Prüfung in `lib/seite.js`, Skill `vibe-learning-seite-erstellen` (typen.md, pruefe.py). Noch nicht im Baukasten von vorlage.html.
    Getestet in Chromium: Buchungssatz erst nach richtiger Kalkulation, Ziehen und Antippen, fehlende VORST, Lösung, Schritt erledigt. Nicht auf Touch-Geräten.

54. **Datenbanken: Erarbeitung für abfragen.html und Tooltipps** (gewünscht 13.11.)
    `abfragen.html` hat jetzt „Erarbeitung | Übungen | Endlos“. 18 Schritte: Überblick über SELECT/FROM/WHERE/ORDER BY → drei fertige Abfragen ausführen (SELECT+FROM, WHERE, ORDER BY) → Zuordnen der vier Teile → Abfrage lesen (MC) → fünf Abfragen abändern (Feld tauschen, Wert, Vergleichszeichen, Sortierrichtung, Sortierung ergänzen) → Merkkasten Bedingungen → fünf Abfragen mit Bedingung per Drag & Drop aus Bausteinen mit Ablenkern (Text, Grenzwert, mit Sortierung, LIKE, Text ohne Anführungszeichen) → Abschluss. SELECT immer durch Anklicken in der „Übersicht über die Felder der Tabelle“.
    - `abfragen.js`: neuer Schritt `entwurf` mit `ui:'block'|'zieh'`, `vorgabe` (vorausgefüllt), `zeigen` (mit Ausführen erledigt), `bausteine` (Ablenker), `auftrag`.
    - Tooltipps: Schalter `#ttBtn` in der Kopfzeile (nur abfragen.html), Erklärungen zu Begriffen (auch in der SQL-Vorschau), Feldübersicht, Feldern, Bausteinen, Knöpfen; gespeichert unter `sql-tooltipps`. Datenight hat (noch) keinen Schalter, für die Access-Ansicht fehlen Texte.
    Getestet in Chromium: alle 18 Schritte mit Lösung und je einem Fehlversuch (auch echtes Ziehen), Tooltipps an/aus, Neuladen, Übungen Stufe 1 und 5, dunkel, Handybreite, Datenight und Filmdatenbank ohne Fehler, Einzeldatei per file://. Nicht in Firefox, nicht mit PocketBase, nicht auf Touch-Geräten.

### Version vom 11.11.

50. **Datenbanken: Erarbeitung UND / ODER für Access** (gewünscht 11.11.)
    `datenight.html` hat jetzt den Modus „Erarbeitung | Übungen | Endlos“ (Erarbeitung nur in der Ansicht Access). 15 Schritte nach dem Merkblatt „Kriterien bei Abfragen“ der Lehrkraft: Wiederholung Kriterien (Text/Zahl) → ein Kriterium im Entwurf → UND (Herr Dienstag: ab 2000 und unter 120 Minuten; Filme auswählen, Tabelle ja/nein, Entwurf) → ODER (Frau Montag: eigene Bewertung ≥ 9 oder IMDb ≥ 8,5) → allgemeine Wahrheitstabelle UND/ODER mit Merkkasten → Kontrollfrage zwei Entwürfe (dieselbe Zeile / verschiedene Zeilen) → UND oder ODER zuordnen (Falle „Miniserien und Fernsehserien“) → Kriterien selbst eintippen (UND; ODER mit demselben Feld) → Abschluss mit Ausblick.
    Bewusst weggelassen (Advanced im Merkblatt): Und/Oder in einer Zelle, ein Feld zweimal im Entwurf; nur als Satz im Ausblick, geübt wird es in Woche 2/3 der Übungen.
    - `abfragen.js`: Modus „lernen“ über `erarbeitung` (auch je Ansicht); Schritte als Info, Baustein aus `lib/aufgaben.js` oder Access-Abfrage mit fester Kriterien-Stufe. Stand unter `sqluo-access-lernen`, Meldung modus 'erarbeitung'. Ohne Erarbeitung (abfragen.html, filmdatenbank.html) unverändert.
    - Neuer Aufgabentyp `wahrheit` in `lib/aufgaben.js` (ja/nein-Tabelle zum Anklicken), Prüfung in `lib/seite.js`, Skill `vibe-learning-seite-erstellen` (typen.md, pruefe.py) ergänzt. Noch nicht im Baukasten von vorlage.html (`vorlage-typen.js`) und nicht in Excel `und-oder.html` (dort weiter eigener `truth`-Schritt).
    Getestet in Chromium: alle 15 Schritte mit Musterlösung und je einem Fehlversuch, Fortschritt nach Neuladen, Wechsel Access ↔ Blöcke/SQL und Übungen/Endlos, dunkles Thema, Handybreite; abfragen.html und filmdatenbank.html ohne Fehler. Nicht in Firefox, nicht mit PocketBase.

### Version vom 10.11.

49. **Excel: WENN mit $** (gewünscht 10.11.)
    Wie Nr. 48 für WENN: neue Seite `IT/excel/wenn-bezuege.html` mit „Übungen $“ (10 Aufgaben) und „Endlos $“, Technik `uebertragen.js`. Gruppen: Grenzwert festhalten (Kino, Klassenarbeit, Achterbahn, Lager, Freibad), Beträge aus festen Zellen (Versand, Rabatt, Überstunden), in zwei Richtungen (Prüfungen je Fach `B$4`, Filmabend `$B6>=C$4`). Moduswahl von wenn.html und der neuen Seite verlinkt beide („Übungen | Endlos | Übungen $ | Endlos $“). Eigener Katalogeintrag `wbz`.
    Getestet in Chromium: 400 Zufallsaufgaben (Musterlösung richtig, jeder $-Fehler fällt sofort auf, Ergebnisse gemischt), alle Übungen auf allen 6 Stufen, Endlos, Rückmeldung ohne $, Verlinkung mit wenn.html. Nicht in Firefox.

48. **Excel: UND / ODER mit $** (gewünscht 10.11.)
    Neue Seite `IT/excel/und-oder-bezuege.html` mit „Übungen $“ (10 Aufgaben) und „Endlos $“: WENN mit UND/ODER auf eine Spalte bzw. einen Bereich übertragen, Grenzwerte mit $ festhalten (Pizza-Kette Domi-No’s wie in der Erarbeitung). Bedienung wie bei Zellbezüge/SUMME: Zellen und Bereiche in der Tabelle anklicken bzw. ziehen, F4 für $, Stufen 1–6 ($ setzen … freie Eingabe ohne Hinweise). Die Moduswahl von und-oder.html und der neuen Seite verlinkt beide („Erarbeitung | Übungen | Endlos | Übungen $ | Endlos $“).
    - Technik von bezuege.html nach `uebertragen.js`/`uebertragen.css` ausgelagert (beide Seiten nutzen sie). Neu: Aufgaben werden neu gewürfelt, bis jeder einzelne falsche $-Bezug schon in der gezeigten Tabelle auffällt; die Aufgaben der Zellbezüge-Seite bleiben dabei unverändert (geprüft).
    - `tabelle.js`: `logikAn()` schaltet Vergleiche (= <> < > <= >=, WAHR/FALSCH) und WENN/UND/ODER ein; SUMME/MIN/MAX und Zellbezüge rechnen unverändert.
    - Eigene Seite statt neuer Modi in und-oder.html, weil `tabelle.js` und die Bausteine-Technik dort 19 gleiche globale Namen haben. Eigener Eintrag im Katalog (`uobz`, Auswertung getrennt).
    Getestet in Chromium: 400 Zufallsaufgaben (Musterlösung richtig, jeder $-Fehler fällt auf), alle Übungen auf allen 6 Stufen, Endlos, Rückmeldungen, Klick in die Tabelle und F4; Zellbezüge (Erklärung und Übungen), SUMME/MIN/MAX und UND/ODER weiter in Ordnung. Nicht in Firefox.

47. **Python: Fehlersuche** (gewünscht 10.11.)
    Neue Seite `IT/python/fehlersuche.html` nach dem Vorbild der HTML-Fehlersuche: Endlosmodus, das Skript baut in 15 richtige Programme (Eingabe/Ausgabe, Rechnen, if/elif/else, and) je einen von 22 Fehlerarten ein, rund 340 verschiedene Aufgaben. Schalter Syntax | Laufzeit | Logik | Gemischt; zu jedem Programm steht, was es tun soll (nötig für Logikfehler). Erst Zeile anklicken, dann verbessern; geprüft wird mit Skulpt über Testeingaben (gleiche Ausgabe wie das richtige Programm). „Ausführen“ zeigt Ausgabe bzw. Python-Fehlermeldung, zählt vor dem Anklicken als Hilfe (Serie beginnt neu). Getestet in Chromium (alle Kombinationen, Ablauf je Fehlerart), nicht in Firefox.

### Version vom 09.11.

46. **HTML-Editor: Grenze ziehen, Vorschau ausblenden** (gewünscht 09.11.)
    Die Grenze zwischen Editor und Vorschau lässt sich mit der Maus ziehen (Doppelpfeil als Zeiger, Doppelklick: halb und halb; auch im Kurs, dort nach oben und unten). Das Verhältnis bleibt im Browser gespeichert (`hw-teiler`). Neue Option im Zahnrad: „Vorschau ausblenden“, gilt nur bis zum Neuladen der Seite. Getestet in Chromium.

45. **HTML: Zahnrad mit Editor-Optionen und Fehlersuche** (gewünscht 09.11.)
    Unten rechts im Editor (freier Editor und Kurs) öffnet ein Zahnrad die Optionen: Tags automatisch schließen (aus), lange Zeilen umbrechen (an), große Schrift (aus); gespeichert im Browser unter `hw-optionen`, weitere Optionen in `OPTIONEN` in htmlwerk.js. Neue Seite fehlersuche.html: Endlosmodus, das Skript baut in 16 richtige Beispiele je einen von 21 Fehlerarten ein (über 350 verschiedene Aufgaben); erst Zeile anklicken, dann verbessern. Getestet in Chromium.

44. **Neuer Bereich IT → HTML** (gewünscht 09.11.)
    Freier HTML-Editor (Schalter HTML/CSS, Vorschau beim Tippen, Regelprüfung, Handy-Ansicht, Download als eine Datei) und Kurs in sechs Seiten nach Lehrplan (Aufbau, Text, Links und Bilder, CSS-Grundlagen, Klassen und Abstände, Design und Projekt), je 6 Aufgaben mit automatischer Prüfung. Durchgehendes Beispiel: Webseite der Band Mouse Rat. Aus den „z. B.“-Inhalten des Lehrplans bewusst weggelassen: Audio, Video, Tabellen, Formulare. Getestet in Chromium (36 Aufgaben mit Startcode und Musterlösung, auch als Einzeldatei und über PocketBase), nicht in Firefox.

43. **Formeln in Erinnerungen nicht mit „·“ trennen** (gefunden 09.11.)
    Der Trennpunkt zwischen zwei Formeln sah aus wie ein Malpunkt (z. B. „Zinsen = Restschuld · Zinssatz / 100 · Rate = Zinsen + Tilgung“). Jetzt Zeilenumbruch: darlehensarten.html (4 Erinnerungen), zinsrechnung.html (Lückentext Umstellen), kredite-bank.html, kurzfristige-kredite.html.

42. **Übungs-Editor mit Ziehen und Ablegen** (gewünscht 09.11.)
    - `vorlage.html` („Übung erstellen“) mit Umschalter **Editor | JSON**: beide bearbeiten dieselbe Übung; JSON aus dem Claude-Chat einfügen → im Editor weiterbearbeiten → JSON kopieren oder „Speichern“ (.json), „Öffnen“. Vorschau und Herunterladen/Einreichen als Dialog, Einreichen technisch unverändert (Pull Request).
    - Baukasten wie beim Struktogramm-Editor (`vorlage-editor.js`, Formulare je Typ in `vorlage-typen.js`): Bausteine aus der Leiste ziehen oder anklicken, Schritte als Reiter (verschiebbar), Aufgaben als Karten (verschiebbar, auch auf einen anderen Reiter), Folgeaufgabe (`danach`) per Ablegen, Rückgängig/Wiederholen, laufende Prüfung mit Sprung zur Fundstelle. Texteditor mit Fett, Liste, Tabelle, Bruch; Eingefügtes (z. B. aus Word) wird auf die Erlaubtliste bereinigt. Unbekannte Felder aus dem JSON bleiben erhalten.
    - Lückentext im Editor: Wort doppelklicken oder `/Lücke(richtig, falsch, …)` tippen → Lücke als Chip (verschiebbar, anklicken zum Bearbeiten). Zuordnen: Karten in die Felder ziehen. Tabelle: je Zelle Text, Zahl oder Eingabefeld.
    - Neu für Schüler: Lückentext mit Wortbank (`luecken`, `ziehen:true`, optional `extra`) in `lib/aufgaben.js`, Ziehen-Code gemeinsam mit Zuordnen; Prüfung in `lib/seite.js`; Skill `vibe-learning-seite-erstellen` ergänzt.

### Version vom 08.11.

41. **Effektiver Zinssatz (BWR 9, Finanzierung)** (gewünscht 08.11.)
    - `effektiver-zinssatz.html`: drei Angebote mit/ohne Disagio (Saitgig, 30.000,00 €, 240 Tage), Disagio wiederholen, tatsächliche Kreditkosten, Formel aus der Zinssatzformel, berechnen, vergleichen, Laufzeit in Jahren, Kreditaufnahme mit Disagio buchen (7510 ZAW, 4200 KBKV/4250 LBKV), Grenzen; Endlos mit 6 Stufen; dazu Selbstlernheft „Effektiver Zinssatz“.
    - Zinsrechnung: Umstellen nach K, p und t (Erarbeitung, 3 Endlos-Stufen, Heft Kap. 5).

40. **Zinsrechnung (BWR 9, Finanzierung)** (gewünscht 08.11.)
    - `zinsrechnung.html`: Erarbeitung nach dem Unterrichtsentwurf „Einführung Zinsrechnung“ (Jonas, 2.500,00 €, 5,35 %): Prozentrechnung → Jahreszinsen → Begriffe K, p, Z → Jahreszinsformel → Teil des Jahres (Lern-Chat) → Tageszinsformel → Zinstage → Dispo oder Kredit → Überblick; dazu Selbstlernheft „Zinsrechnung“.
    - Endlos-Modus mit 6 Stufen (Prozentrechnung, Jahreszinsen, Tageszinsen, Zinstage, Zinstage und Zinsen, Textaufgaben), Zufallsaufgaben mit Rechenweg.
    - Neu in `lib/aufgaben.js`: `Aufgaben.endlos` (Stufen als Flammen, Serie, Rekord, „Andere Aufgabe“) für weitere Seiten mit Zufallsaufgaben.

39. **Darlehensarten (BWR 9, Finanzierung)** (gewünscht 08.11.)
    - `darlehensarten.html`: Abzahlungs-, Annuitäten- und Festdarlehen (40.000,00 €, 4 Jahre, 5 %), Tilgungspläne als Formular, Säulendiagramme, Vergleich (Zuordnen), Zinskosten und Entscheidungen; dazu Selbstlernheft „Darlehensarten“.
    - Neuer Aufgabentyp `tabelle` in `lib/aufgaben.js` (Zellen vorgegeben oder Eingabefeld, Hinweise je Spalte), Prüfung in `lib/seite.js`, Skill `vibe-learning-seite-erstellen` ergänzt.
    - Formeln mit Bruchstrich: `.bruch` in `lib/aufgaben.css` (alle Fächer, auch im Aufgaben-JSON); Zinsformel in `darlehensarten.html` als Bruch.

### Version vom 06.11.

38. **Übungen aus dem Claude-Chat erstellen und einreichen** (gewünscht 06.11.)
    - `lib/seite.js`: Aufgaben-JSON prüfen und daraus Seiten bauen (Browser und Server). `vorlage.html`: einfügen, prüfen, Vorschau im abgeschotteten iframe, Download; Einreichen für Lehrkräfte. `pb_hooks/einreichen.pb.js`: Pull Request über die GitHub-API (Seite + katalog.js-Abschnitt EINREICHUNGEN), höchstens 10 pro Lehrkraft und Tag, Testmodus `VIBE_GITHUB_DRYRUN=1`.
    - Skill `vibe-learning-seite-erstellen` im Repo vibe-learning-skills; fehlende Aufgabentypen als Issue in vibe-learning.
    - Token (klassisch, Bot-Konto admin-nimals) auf dem VPS hinterlegt, echter Pull Request am 06.11. getestet.
    - Härtung 07.11.: HTML in Einreichungen nur nach Erlaubtliste (`Seite.ERLAUBT`, je `<` geprüft, nur class/colspan/rowspan); der Hook führt keinen Code aus GitHub mehr aus (Bereich wird über `pfad` und die lokale Bereichsseite geprüft). Offen: Branch-Schutz für main und live in GitHub (nur Nico darf mergen/pushen).

### Version vom 05.11.

37. **Impressum und Datenschutzerklärung** (gewünscht 05.11., vor dem Umzug auf den netcup-VPS)
    - `pb_public/impressum.html`, `datenschutz.html`, unten auf jeder Seite verlinkt (nav.js, nicht in Einzeldateien). Kein Cookie-Banner nötig: geprüft am 05.11., keine Cookies und keine Anfragen an fremde Server, auch nicht in pockettype (Firebase-SDK ist nur mitgebaut, startet nicht).
    - E-Mail (admin@nimals.de) und Standort (Nürnberg) eingetragen. Offen: Rechtsgrundlage Einwilligung mit Schulleitung/Datenschutzbeauftragtem abstimmen.

### Version vom 04.11.

36. **Lern-Chat nach dem Vorbild von LearningSnacks** (gewünscht 04.11.)
    - Neuer Aufgabentyp `chat` in `lib/aufgaben.js`: Bot-Nachrichten mit Tipp-Animation (Klick überspringt), Antwortknöpfe, Zahl oder Freitext; bei Fehlern erklärt der Bot und macht weiter; am Ende Punkte und „Noch einmal“.
    - Neue Jahrgangsstufe BWR 7 (`BWR/7II/`) mit Bereich „Aufwendungen und Erträge“ und erstem Chat `verkauf-uefe.html`: Merkkasten UEFE, Buchungssatz BK an UEFE, UST ohne Kontonummern (Jgst. 7).

35. **BWR Finanzierung: Kredite bei der Bank** (gewünscht 04.11., Heft Kap. 5)
    - `BWR/9II/finanzierung/kredite-bank.html`: Kredit (Grafik Kreditablauf), Kreditprüfung, 5.1 Beispiele Kreditfähigkeit/-würdigkeit zuordnen, Sicherheiten, 5.2 zwei Sicherheiten als Freitext, Disagio, 5.3 Disagio und Auszahlungsbetrag, 5.4 Tilgungsbetrag, Überblick als Lückentext mit Auswahllisten.
    - Neuer Aufgabentyp `freitext` in `lib/aufgaben.js`: Begriff muss im Feld vorkommen (Groß/klein und ä/ae egal), jedes Feld ein anderer Begriff, Tippfehler (Damerau-Levenshtein, bis 45 % bei langen Wörtern) gelten als „fast richtig“ mit Hinweis; `tippfehler:'ok'` zählt sie als richtig. Dazu `erinnerungZu` (Erinnerung startet zugeklappt).

34. **Aufgabenbausteine für alle Fächer** (gewünscht 04.11.)
    - `pb_public/lib/aufgaben.js` + `aufgaben.css`: Multiple Choice (Format der Excel-Erklärungen), Zahlenfelder, Lückentext mit Auswahllisten, Zuordnen per Ziehen/Antippen, Buchungssatz mit Prüfung (Drehfehler, fehlende Steuer, Betrag), Erarbeitung aus Schritten. Aufgaben stehen als Daten in der Seite.
    - kurzfristige-kredite.html darauf umgestellt (496 → 247 Zeilen, Verhalten gleich). Excel funktionen/bezuege/und-oder zeichnen und prüfen Multiple Choice über `Aufgaben.mc` (Daten unverändert). bilanz.html noch mit eigenem Buchungssatz-Baukasten.

33. **BWR Finanzierung: Erarbeitung kurzfristige Kredite** (gewünscht 04.11., Ergänzung zum Heft Kap. 7)
    - `BWR/9II/finanzierung/kurzfristige-kredite.html`: Kontokorrentkredit (Grafik Kontostand mit Kreditlinie), Dispositionskredit, Lieferantenkredit mit interaktiver Zeitleiste (Zahlungsdatum eingeben oder Regler → Dauer von Lieferanten- und Kontokorrentkredit, drei Ablesefragen).
    - 7.1 Merkmale zuordnen (Ziehen oder Antippen), 7.2 Multiple Choice, 7.3 Skonto-Ergebnisse prüfen, 7.4 Kostenvergleich und danach Handlungsempfehlung (Multiple Choice), 7.5 Lückentext mit Auswahllisten. Vor jeder Aufgabe eine Erinnerung, alle Werte auf derselben Seite.
    - Gemeinsames Grundlayout der BWR-Seiten in `BWR/bwr.css` (auch für bilanz.html).

32. **BWR Finanzierung: Bilanz-Modell** (gewünscht 04.11.)
    - `BWR/9II/finanzierung/bilanz.html`: Bilanz von Saitgig (Selbstlernheft Finanzierung, Kap. 2) verändert sich mit jeder Buchung, Tabelle mit +/− und maßstäbliches Bild.
    - 19 Geschäftsfälle: 7 Aktiv-Passiv-Mehrungen (Schwerpunkt), 3 Minderungen, 4 Aktivtausch, 2 Passivtausch, teils mit Vorsteuer.
    - „Komplexere Buchungen“: Verkauf von Anlagegütern zum Buchwert mit Umsatzsteuer (Maschine bar, Maschine auf Ziel, Lieferwagen per Bank), z. B. 2880 KA an 0700 MA, 4800 UST. In b) werden beide Arten gewählt (Aktivtausch und Aktiv-Passiv-Mehrung). 4800 UST steht als kurzfristiges FK in der Bilanz. Keine Aufwand/Ertrag, keine Teilzahlungen (Wunsch der Lehrkraft).
    - Einteilungen: Bilanzposten, AV/UV · EK/FK (mit Eigenkapitalquote), Goldene Regel (langfristig/kurzfristig, Prüfung AV ≤ EK + langfr. FK).
    - Erkunden (buchen, zurücknehmen) und Üben: a) Buchungssatz bilden, b) Art der Bilanzveränderung angeben, c) je nach Einteilung Bilanzsumme, Eigenkapitalquote oder Goldene Regel.
    - Offen zur Prüfung durch die Lehrkraft: Kontennummer 0530 BVG, Einlage des Inhabers direkt auf 3000 EK (ohne 3001 P).

13. **Funktionen: Erarbeitung MITTELWERT neu ordnen** (gewünscht 22.10.)
    Aufgabe „MITTELWERT nach unten“ direkt nach der Einführung, danach erst „Leere Zellen“ mit Extrazeile =SUMME(B4:B9)/5 neben /6 und MITTELWERT. Schrittzahl gleich (7), Schritt 3 und 4 haben die Plätze getauscht.

14. **Funktionen: Aufgabe 24 akzeptierte =8-ANZAHL(B4:B11)** (gefunden 20.10.)
    Szenario-Option `leer:true` (Sponsorenlauf): In den Prüfvarianten fehlen 1–3 ganze Zeilen, die abgeschriebene 8 fällt jetzt auf.

15. **Verknüpfte Aufgaben mit Funktionen** (gewünscht 22.10.)
    - Funktionen: Übungen 26 Spannweite =MAX(…)-MIN(…) (Bundesjugendspiele) und 27 Abweichung einer Zeile =B6-MITTELWERT(B4:B9) (Wetterstation), auch im Endlos-Modus.
    - Zellbezüge: Übung 19 „Weitsprung ohne Durchschnitt“ =B5-MITTELWERT($B$5:$B$10).

30. **Versuch: Berichte im Browser** (gewünscht 04.11., bleibt als Versuch in main)
    - `IT/datenbanken/bericht.html` („Bericht (Versuch)“ im Menü): Bericht aus einer Abfrage an `filme`, Entwurf mit pdfme (MIT, `lib/pdfme.min.js`, gebaut mit `werkzeuge/pdfme/bauen.sh`), Seitenansicht als PDF.
    - Arten: Liste (Tabelle, Seitenumbruch automatisch) und eine Seite je Datensatz (Textfelder mit Feldname = Spalte).
    - Bekannte Grenzen: keine Gruppierung, pdfme.min.js 7,5 MB (2,5 MB gepackt), PDF mit 888 Zeilen dauert etwa 13 s, keine Einzeldatei (`data-einzeldatei="nein"`).

31. **Fächer: IT und BWR** (gewünscht 04.11.)
    - Vorne in der Menüleiste das Fach-Menü (IT, BWR › Jahrgangsstufe 9), danach nur die Bereiche dieses Fachs. Das zuletzt gewählte Fach merkt sich der Browser für die Startseite.
    - Ordner: alles Bisherige nach `pb_public/IT/` und `standalone/IT/`; neu `BWR/9II/` mit Unternehmensführung, Anlagen, Finanzierung, Kapitalanlage, Forderungen (noch ohne Übungen).
    - katalog.js mit `faecher`/`stufen`, `KATALOG.gruppen` und `KATALOG.bereiche` (mit `pfad`); Tool-ids unverändert, gespeicherter Fortschritt bleibt.
    - Alte Adressen leitet `pb_hooks/weiterleitung.pb.js` weiter. Skripte (einzeldateien.py, skill-bauen.py, filme-aus-csv.py, pdfme/bauen.sh, pockettype nach-vibe-learning.sh) angepasst. `bericht.html` bekommt keine Einzeldatei (`data-einzeldatei="nein"`).

### Version vom 03.11.

29. **Struktogramm-Editor: Einfügemarke und Tastatur** (gewünscht 03.11.)
    - Beim Ziehen pulsierende orange Marke an der künftigen Stelle (leeres Feld: gestrichelter Kasten), das verschobene Bauteil gestrichelt; Marken in eigener Farbe `--marke`.
    - Tastatur: ↑ ↓ abwechselnd Lücken und Bauteile (in Verzweigung/Fallauswahl links), ← → Spalte wechseln; in einer Lücke A V F K U R X B fügen ein; Enter bearbeitet den Text, nochmal Enter zurück; Entf löscht, danach ist die Lücke ausgewählt.
    - Fußgesteuerte Schleife hat U (F ist die Fallauswahl).
    - Nachbesserung: Schreibzustand sichtbar (Bauteil gestrichelt, Textfeld orange umrandet, Hinweis „Du schreibst gerade“), Enter/Esc in den Textfeldern zentral abgefangen, Doppelklick öffnet das Textfeld, D dupliziert.
    Betrifft tools/struktogramm.html, struktogramm.css.

28. **Menü, Farben, Exportfarben** (gewünscht 03.11.)
    - Untermenü: Tools mit `gruppe` (katalog.js) stehen in nav.js in einem Untermenü, das beim Darüberfahren aufklappt (z. B. Tools → Struktogramm → Editor / Python).
    - Tools grau (#4c566a / #b4bdcc), Tippen blau wie Textverarbeitung (#2b579a / #8db3ee), auch in pockettype selbst. Tippen soll später auch Textverarbeitung aufnehmen.
    - Logische Schaltungen vorerst entfernt (leere Bereichsseite, aus dem Katalog).
    - Struktogramm-Export: ⚙ für Hintergrund- und Linienfarbe (Standard weiß/schwarz, pro Gerät), Export gegen Dunkelmodus von Browser/Erweiterungen gesperrt.
    Betrifft katalog.js, nav.js, tools/struktogramm.*, pockettype (themes.ts).

27. **Tools → Struktogramm: Editor und Python-Renderer** (gewünscht 03.11.)
    - Neuer Bereich „Tools“ (katalog.js `auswertung: false`, nicht im Lehrerbereich) mit Untergruppe „Struktogramm“ (katalog.js `gruppe`, nav.js zeigt Zwischenüberschriften).
    - `tools/struktogramm.html`: Editor nach dem Vorbild von strukto.io, eigene Umsetzung ohne Build-Schritt. Elemente ziehen oder anklicken, verschieben, Text im Feld rechts, Fallauswahl mit beliebig vielen Fällen, Rückgängig, als .json speichern/öffnen. Stand im Browser und über sync.js auf dem Server.
    - `tools/python-struktogramm.html`: Python-Code (wie render.py) → Struktogramm, live; Fehler mit Zeilennummer; „Im Editor bearbeiten“.
    - Export SVG, HTML, JPG immer weiß mit schwarzen Linien; am Bildschirm Nord-Farben hell/dunkel. Breite automatisch (kein Wort wird getrennt) oder fest.
    Betrifft tools/, katalog.js, nav.js, seite.css, lehrer.html, werkzeuge/.

26. **Tipp-Aufgabe: Fortschritt speichern, kein versehentlicher Neustart** (gewünscht 03.11.)
    - Fortschritt nach jedem Wort (localStorage `tippaufgabe-stand`, über sync.js auf dem Server); weiter beim nächsten Wort nach Verlassen, Neuladen oder an einem anderen Rechner. Die Teile ergeben zusammen einen Durchgang.
    - Neustart während des Durchgangs gesperrt (Hinweis), Tab ohne Wirkung, Neustart-Hinweis ausgeblendet. Nach dem vollständigen Text nur „Verbesserungsversuch starten“.
    Betrifft pockettype (aufgabe.ts, test-logic.ts, test-result.html).

25. **Tippen: Aufgabe zum Abschreiben** (gewünscht 03.11.)
    - Verwaltung → Auswertung → Tippen → Übung „Aufgabe“: Aufgaben der Klasse anlegen (Titel, Text, Abgabe bis), beenden/wieder öffnen, löschen. Statistik je Schüler: fertig, Durchgänge, Bestwert und Ø Wörter/min, Bestwert Anschläge/min, Genauigkeit, schnellste Zeit, rechtzeitig, erster Durchgang, abgebrochen.
    - Menüpunkt „Aufgabe“ unter Tippen nur, wenn die Klasse eine aktive Aufgabe hat: katalog.js `bedingt: true`, nav.js blendet aus, sync.js fragt /api/trainer/sichtbar.
    - pockettype `aufgabe.html`: Text einmal komplett, beliebig oft; Zeilenumbruch = Enter; mehrere Aufgaben über den Hinweis über dem Text wechseln.
    - Fehler behoben: neue Felder im Ergebnis mit `undefined` haben das Speichern verhindert.
    Betrifft pockettype, katalog.js, nav.js, sync.js, lehrer.html, pb_hooks/tippen.pb.js, pb_migrations/1793720000_tippen_aufgaben.js.

24. **Tippen: Lektion üben (TIPP10)** (gewünscht 03.11.)
    - Lektionen 1–17 (Deutsch, QWERTZ) aus dem Quellcode von TIPP10 2.1.0, Inhalt und Reihenfolge wie dort (ohne „intelligente“ Auswahl): Wortlektionen 1–6 mit Zeilenumbruch nach 35 Zeichen, Satzlektionen ab 7 mit Enter nach jedem Satz; danach wieder von vorn. Dauer 1/2/5/10 min oder ganze Lektion (Standard 5 min wie TIPP10).
    - Neue Seite `tippen/lektionen.html` („Lektion üben“ im Menü), gleiche Oberfläche, Titel „pockettype Lektionen“; Lektion wählen über den Hinweis über dem Text wie die Sprache.
    - Ergebnis merkt die Lektion (Feld `lektion`); Auswertung Tippen mit Auswahl pockettype/Lektion üben und Spalte „Lektionen“.
    - Lizenz: TIPP10 ist GPL-2.0 (ohne „oder später“), die Lektionen liegen deshalb als eigene Datendatei mit eigener Lizenz in `tippen/lektionen/`.
    Betrifft pockettype, katalog.js, lehrer.html, pb_hooks/tippen.pb.js, pb_migrations/1793710000_tippen_lektion.js.

23. **Auswertung nach Bereichen, Bestenliste Tippen, Stand je Stufe** (gewünscht 03.11.)
    - Auswertung mit Auswahl Bereich (und Übung): „alle“ = Aktivität im Zeitraum je Bereich; Excel/Python/Datenbanken = Stand je Übung und Stufe über den gesamten Zeitraum (✓ = alle Aufgaben der Stufe, Erarbeitung, Endlos) plus Lösungen im Zeitraum; Tippen = Bestenliste im Zeitraum (Tests, Zeit getippt, Anschläge gesamt, Bestwerte, Durchschnitt, Genauigkeit). Alle Spalten sortierbar, CSV je Ansicht.
    - Server liefert alle Ereignisse der Klasse (bis 50 000), gefiltert wird in lehrer.html.
    - katalog.js: `stufen` je Übung; Bereich „Tastaturschreiben“ heißt jetzt „Tippen“.
    - pykurs.js meldet `gesamt` = Aufgaben der Stufe; abfragen.js zählt bei Ansichten die Stufen durch (Datenight: Access 1–3, SQL 4–8).
    Betrifft lehrer.html, katalog.js, pb_hooks/, python/lib/pykurs.js, datenbanken/abfragen.js.

22. **Tipptrainer pockettype** (gewünscht 03.11.)
    Eigenes Repo auf Basis von Monkeytype (GPL-3.0), ohne Monkeytype-Backend; Ergebnisse, Bestwerte und Auswertung über PocketBase. Wenig Einstellungen, festes Nord-Farbschema hell/dunkel, Rangliste später. Gebaute Dateien nach `pb_public/tippen/`, Ausnahme von der Doppelklick-Regel (siehe CLAUDE.md).
    Betrifft neues Repo pockettype, später katalog.js, lehrer.html, pb_hooks/.
    - 03.11. Schritt 3 erledigt: Tabellen `tipp_ergebnisse`/`tipp_stand` (pb_migrations/1793700000_tippen.js), Schnittstellen in pb_hooks/tippen.pb.js. Gast-Ergebnisse werden beim Anmelden übernommen, wenn das Konto leer ist. Keine Löschfrist: Ergebnisse hängen am Schüler und gehen mit ihm oder der Klasse.
    - 03.11. Schritt 4 erledigt: pockettype in `pb_public/tippen/pockettype.html` mit Menüleiste und Anmeldung, Bereich „Tippen“ in katalog.js, Auswertung in lehrer.html (Seite *pockettype*: Tests, Bestwerte, Ø Wörter/Anschläge pro Minute, Genauigkeit; Details pro Test; CSV), Schüler in eine andere Klasse verschieben (Fortschritt und Ergebnisse ziehen mit).

21. **Alte Weiterleitungen entfernt, ANLEITUNG aktualisiert** (gewünscht 03.11.)
    `wenn-trainer.html`, `und-oder-trainer.html` und `funktionen-trainer.html` gelöscht (nur noch Weiterleitungen nach `excel/`, nichts verlinkte sie mehr). Ordnerübersicht in ANLEITUNG.md um `excel/bezuege.html` und den Bereich Datenbanken ergänzt.
    Betrifft pb_public/, ANLEITUNG.md.

17. **Datenight: SQL mit UND/ODER** (gewünscht 02.11., erweitert 03.11.)
    - Drei Wochen Dates: jeden Tag dieselbe Person wie im Access-Arbeitsblatt der Lehrkraft, Woche 1 sind die Originalwünsche, Woche 2 und 3 werden schwieriger und absurder. Auswahl der Tage in einem Kalender. Dazu Endlos.
    - Zwei Ansichten neben Übungen | Endlos: **Access** (Feld, Tabelle, Sortierung, Anzeigen, Kriterien/oder; gleiche Zeile = UND, verschiedene Zeilen = ODER; Stufe 1 nur nötige Kriterien als Bausteine mit Feldname, 2 mit falschen Bausteinen, 3 eintippen in deutscher Access-Schreibweise) und **Blöcke/SQL** (Stufe 1 UND/ODER-Blöcke spitz wie in Scratch verschachteln, 2–5 wie in der SQL-Übung). Stand je Ansicht getrennt.
    - Tabelle `filme` um die IMDb-Merkliste ergänzt (888 Einträge, ungesehen = keine eigene Bewertung). Texte der SQL-Übung angepasst („in der Sammlung“), Aufgabe 4 jetzt David Fincher.
    - Gleichwertige Lösungen zählen (`auch:`), z. B. Ko-Regie bei Kubrick (Spartacus) und „dieses Jahrtausend“ ab 2000 oder 2001.
    Betrifft datenbanken/datenight.html, abfragen.js, abfragen.css, filme.js, abfragen.html, filmdatenbank.html, werkzeuge/filme-aus-csv.py, katalog.js.

### Version vom 02.11.

20. **Einzeldateien: Ordner `standalone/`, sortiert wie die Webseite** (gewünscht 02.11.)
    Statt `einzeln/excel-wenn.html` jetzt `standalone/excel/wenn.html`. Angepasst: werkzeuge/einzeldateien.py, README, ANLEITUNG, PRINZIPIEN, CLAUDE.md.

19. **Film-Datenbank: freie Abfragen ohne Aufgaben** (gewünscht 02.11.)
    Eigene Seite mit den fünf Stufen der SQL-Übung, Ergebnis als Tabelle, kein Prüfen. Beim Stufenwechsel wird die Abfrage in den SQL-Editor übernommen; leere WHERE/ORDER-BY-Zeilen des Gerüsts werden ignoriert. Auch GROUP BY, LIMIT, Funktionen wie COUNT gehen.
    Betrifft datenbanken/filmdatenbank.html, abfragen.js (Modus ohne aufgaben), abfragen.css, katalog.js.

16. **SQL-Abfragen an einer Filmdatenbank** (gewünscht 02.11.)
    - Tabelle `filme` aus dem IMDb-Export der Lehrkraft (484 Einträge, `werkzeuge/filme-aus-csv.py`), SQLite im Browser (sql.js), läuft auch per Doppelklick.
    - Einfache Abfragen ohne UND/ODER: SELECT, FROM, WHERE (=, <>, <, >, LIKE, IS NULL), ORDER BY. 22 Übungen und Endlos-Modus.
    - Stufen wie bei Excel: 1 Entwurf wie in Access, Bedingung als Baustein · 2 Bedingung eintippen · 3 SQL mit Gerüst und grauer Erklärung · 4 Gerüst ohne Erklärung · 5 leer.
    - Syntaxhervorhebung und Autovervollständigung in jeder SQL-Eingabe, Fehlermeldungen auf Deutsch.
    Betrifft datenbanken/abfragen.html, abfragen.js, abfragen.css, filme.js, katalog.js.

### Version vom 20.10., 23:00

10. **Umbau auf Bibliotheken nach PRINZIPIEN.md** (gewünscht 20.10.)
    - `excel/basis.js` und `excel/basis.css` anlegen. Zuerst die sicher gleichen Teile der vier Excel-Übungen auslagern (Parser, Formatierung, Autovervollständigung, Drag & Drop, CSS), danach den Rest pro Übung. Gleich benannte Funktionen vorher einzeln vergleichen, sie sind teils je Übung angepasst.
    - Jede Bibliothek bekommt oben ihre Kurzbeschreibung.
    - Skript für Einzeldateien (einbetten, Menü aus, Gastmodus), läuft beim ZIP-Bau mit, Ausgabe in `einzeln/`.
    - Skill für neue Seiten, erzeugt aus den Bibliotheksbeschreibungen und einer Beispielseite.
    - Vorher mit dem Thread „Funktionen-Trainer“ abstimmen, damit dort nichts offen ist (betrifft funktionen.html und bezuege.html).

11. **Menüleiste: Hover in der Farbe des jeweiligen Bereichs** (gewünscht 20.10.)
    Bisher färbt der Hover jeden Menüpunkt in der Akzentfarbe der aktuellen Seite (in Excel wird „Python“ grün, in Python wird „Excel“ lila). Künftig hat jeder Bereich beim Hover seine eigene Farbe aus katalog.js. Nur beim Hover, sonst bleibt die Leiste neutral. Betrifft nav.js.

12. **Farbe für Datenbanken: Rot wie Access, passend zu Nord** (gewünscht 20.10.)
    Entschieden 20.10.: Nord-Rot #bf616a im Dunkelmodus und #a3434c im Hellmodus (Kontrast 5,7:1 auf hellem Panel). Im Dunkelmodus hat #bf616a als Schrift nur 2,5:1. Wo es Schrift ist, auf #e0959b aufhellen (4,3:1). Betrifft katalog.js.

### Version vom 20.10., 18:30

5. **Bausteine per Klick statt Ziehen einsetzen** (gewünscht 20.10.)
   Shift+Linksklick auf einen Baustein (entschieden 20.10.: nur Shift+Klick, Geräte sind PCs):
   - Stufen mit Lücken: Baustein in die erste Lücke, in die er passt.
   - Freie Stufen (z. B. UND/ODER Stufe 7): Baustein hinten anhängen, so entsteht z. B. =WENN( durch drei Klicks.
   Betrifft alle drei Excel-Übungen (funktionen.html liegt beim Thread „Funktionen-Trainer“).

6. **Hell/Dunkel-Umschalter nicht spammbar** (gewünscht 20.10.)
   Nach einem Umschalten ist der Knopf 1 Sekunde gesperrt, der Wechsel blendet weich über (ca. 0,3 s). Damit sind höchstens ein Wechsel pro Sekunde möglich, also kein Stroboskop-Effekt (WCAG: max. 3 Blitze pro Sekunde). Betrifft nav.js, lehrer.html und die drei Excel-Übungen.

7. **Anmeldung mit Nutzername und Passwort als Option** (gewünscht 20.10.)
   - Pro Klasse wählbar: Zugangscode (wie bisher) oder Nutzername + Passwort.
   - Nutzernamen legt die Lehrkraft fest und ist selbst dafür verantwortlich, dass keine personenbezogenen Daten darin stehen.
   - CSV-Import: Spalte mit „name“ im Titel = Nutzername, Spalte mit „pass“ im Titel = Passwort (Groß-/Kleinschreibung egal, z. B. „Benutzername“, „Passwort“). Weitere Spalten ignorieren. Trennzeichen ; oder , automatisch erkennen (Excel speichert mit ;).
   - Passen mehrere Spalten auf „name“ (z. B. Vorname, Nachname, Benutzername): die mit „nutzer“/„user“/„login“ nehmen, sonst Import mit Hinweis abbrechen.
   - Leere Passwort-Zelle: Passwort automatisch erzeugen.
   - Passwörter nur gehasht speichern; Lehrkraft kann einzelne Passwörter zurücksetzen.

8. **Rolle Admin: Lehrkräfte anlegen und verwalten** (gewünscht 20.10.)
   - Admin legt Lehrkräfte im Lehrerbereich (UI) an, bearbeitet und löscht sie und kann deren Passwörter ändern.
   - Lehrkräfte: eigene Tabelle `lehrer` (Auth-Collection), sehen nur ihre eigenen Klassen.
   - Admin = PocketBase-Superuser (Konto der Lehrkraft, gmail-Adresse). Sieht alle Klassen, gruppiert nach Lehrkraft, filterbar nach Lehrkraft.
   - Bestehende Klassen werden beim Umbau dem Admin zugeordnet. Admin kann eine Klasse einer anderen Lehrkraft zuordnen.
   - Zweites Superuser-Konto (Kollege), entschieden 20.10.: Kollege bekommt ein Lehrkraft-Konto, das Superuser-Konto löscht die Lehrkraft danach selbst im PocketBase-Dashboard (nicht automatisch).

9. **Anmeldefenster beim Öffnen, Menü oben rechts, Nutzung ohne Account** (gewünscht 20.10.)
   - Beim Öffnen ein Fenster: ein Feld „Code oder Benutzername“. Ist es ein gültiger Code → angemeldet. Ist es ein Benutzername (oder E-Mail einer Lehrkraft/Admin) → im zweiten Schritt Passwort abfragen.
   - Darunter großer Knopf „Seite ohne Anmeldung nutzen“, X oben rechts hat dieselbe Funktion.
   - Benutzernamen dürfen nicht wie ein Code aussehen (Prüfung beim Anlegen/CSV-Import), damit es keine Verwechslung gibt.
   - Menü oben rechts in der Leiste: Anmelden (öffnet dasselbe Fenster); angemeldet als Dropdown mit Abmelden; Lehrkraft/Admin zusätzlich Link zur Verwaltungsseite.
   - Gast sieht in der Leiste deutlich „Nicht angemeldet – Fortschritt wird nicht gespeichert“.
   - Gast-Fortschritt beim Anmelden: übernehmen, wenn das Konto bei dieser Übung noch leer ist (bestätigt 20.10.).

### Version vom 19.10., 20:45

1. **Darkmode: Code-Eingabe bei der Anmeldung kaum lesbar** (gemeldet 19.10.)
   Helle Schrift auf hellem Feld. Ursache: `seite.css` (Start- und Bereichsseiten) definiert `--slot` und `--slot-border` nicht, `sync.js` fällt dann auf das helle `#eef0f5` zurück. Behebung: Farben in `seite.css` ergänzen und in `sync.js` keine hellen Fallbacks für das Eingabefeld.

2. **Farben nach Nord-Theme** (gewünscht 19.10., Vorschau abgenommen 19.10.)
   - Ganze Oberfläche in Nord (Polar Night dunkel, Snow Storm hell), Hellmodus bleibt, darf leicht bläulich sein.
   - Akzent je Bereich: Excel #a3be8c, Python #b48ead; im Hellmodus dunklere Töne derselben Farbe (Lesbarkeit).
   - „Richtig“ wird über den Hintergrund signalisiert.
   - Farben weiterer Bereiche werden bei deren Entwicklung festgelegt.
   - Knöpfe nur mit leichtem Farbstich des Bereichs (keine Signalfarbe), siehe vorschau/nord-farben.png.

3. **Name der Seite: „vibe learning“** (gewünscht 19.10., ersetzt „IT-Trainer“)
   In `katalog.js` bei `name`. Mitändern: Text auf den Code-Zetteln in `lehrer.html` („Dein Zugangscode für vibe learning“), Hervorhebung im Logo in `nav.js` (bisher Teil vor dem Bindestrich), Titel der ANLEITUNG.

4. **„Trainer“ aus den Übungsnamen entfernen** (gewünscht 19.10.)
   Überschrift oben links und Tab-Titel: „Funktionen“ statt „Funktionen-Trainer“, „WENN“ statt „WENN-Trainer“, „UND/ODER“ statt „UND/ODER-Trainer“. Betrifft excel/funktionen.html (Thread „Funktionen-Trainer“), excel/wenn.html, excel/und-oder.html.
