# Prinzipien für vibe learning

Ziel: Das Projekt bleibt auf Dauer klein, damit Änderungen und neue Seiten wenig Kontext (Tokens) brauchen. Festgelegt am 20.10.

1. **Gemeinsamer Code steht in Bibliotheken – so allgemein wie nötig, so nah an der Seite wie möglich.** Vier Ebenen:

   | Ebene | Wofür | Bisher |
   |---|---|---|
   | `pb_public/` | Plattform, jede Seite | `katalog.js`, `nav.js`, `sync.js`, `seite.css` |
   | `pb_public/lib/` | ohne Fachbezug, in jedem Fach denkbar: Aufgabenformen, Zahlen- und Datumsformat, Ziehen und Ablegen, fremde Bibliotheken für mehrere Fächer | `aufgaben.js` + `aufgaben.css` (Multiple Choice, Zahlen, Lückentext, Zuordnen, Freitext, Lern-Chat, Buchungssatz, Erarbeitung aus Schritten), `seite.js` (Seiten aus Aufgaben-JSON, auch auf dem Server) |
   | `<Fach>/` | gilt für alle Bereiche eines Fachs | `BWR/bwr.css` (Grundlayout) |
   | `<Fach>/<bereich>/` | nur dieser Bereich (eigene Bedienung, Fachlogik) | Excel: `IT/excel/basis.js` + `bausteine.js` oder `tabelle.js`; Python: `IT/python/lib/pykurs.js` |

   Faustregel: Würde eine Lehrkraft eines anderen Fachs den Baustein mit eigenen Inhalten nutzen (Multiple Choice, Lückentext), gehört er nach `lib/`. Hängt er an der Bedienung oder Fachlogik eines Bereichs (Excel-Formeln und Tabellenblatt, SQL-Editor, Bilanzbild), bleibt er im Bereich. Eine Bibliothek bindet nur Bibliotheken derselben oder einer allgemeineren Ebene ein. Altlast: Die Datenbank-Seiten binden noch `IT/excel/basis.js` und Python-Teile ein (Fehlerliste Nr. 18).
2. **Eine Seite enthält nur ihr Eigenes.** Aufgaben und Level stehen möglichst als Daten in der Seite, nicht als Code.
3. **Jede Bibliothek beginnt mit einer kurzen Beschreibung** ihrer Funktionen und wie man sie aufruft. Wer eine neue Seite baut, liest diese Beschreibung und eine Beispielseite, nicht den Code der Bibliothek. Die Beschreibung steht nur dort; ein Skill für neue Seiten wird daraus erzeugt, nicht von Hand gepflegt.
4. **In eine Bibliothek kommt, was mindestens zwei Seiten gleich brauchen – oder absehbar brauchen werden.** Absehbar heißt: eine allgemeine Aufgabenform oder Hilfsfunktion, die es in anderen Übungen sicher wieder gibt (z. B. eine neue Aufgabenform wie „Reihenfolge ordnen“). Sie wird gleich in der passenden Bibliothek gebaut, nicht erst in der Seite und später umgezogen. Sonderfälle einer Übung (eigene Grafik, Simulation) bleiben in der Übung, keine Schalter für Einzelfälle in der Bibliothek.
5. **Erst die Bibliotheken nutzen, dann Neues bauen.** Vor einer neuen Seite die Kopfkommentare der Bibliotheken lesen (Skill `vibe-learning-uebung`). Standardaufgaben stehen als Daten in der Seite (`lib/aufgaben.js`). Fehlt einem Baustein etwas, das allgemein nützt, wird der Baustein erweitert (mit Kopfkommentar und Test der Seiten, die ihn schon nutzen), statt ihn in der Seite nachzubauen.
6. **Kein Build-Schritt für den Betrieb.** Es bleiben einfache Dateien, die PocketBase direkt ausliefert.
7. **Einzeldateien werden per Skript erzeugt, nie von Hand gepflegt.** Das Skript bettet die eingebundenen JS- und CSS-Dateien in die HTML ein, blendet das Menü aus und startet direkt im Gastmodus (Fortschritt nur im Browser). Es läuft beim Bauen der ZIP mit und legt die Ergebnisse in `standalone/` ab, in denselben Ordnern wie auf der Webseite.

## Werkzeuge

Im Ordner `werkzeuge/`, Aufruf jeweils im Hauptordner des Repos:

- `python3 werkzeuge/einzeldateien.py` erzeugt `standalone/` neu (eine HTML-Datei pro Übung, alles eingebettet, Ordner wie auf der Webseite).
- `python3 werkzeuge/skill-bauen.py` erzeugt `.claude/skills/vibe-learning-uebung/SKILL.md` (der Skill für Claude Code) aus `werkzeuge/skill-vorlage.md` und den Kopfkommentaren der Bibliotheken. Neue Bibliothek: dort in der Liste eintragen.
- Nach Änderungen an Übungen oder Bibliotheken beide Skripte laufen lassen und das Ergebnis mit committen.
