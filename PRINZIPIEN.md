# Prinzipien für vibe learning

Ziel: Das Projekt bleibt auf Dauer klein, damit Änderungen und neue Seiten wenig Kontext (Tokens) brauchen. Festgelegt am 20.10.

1. **Gemeinsamer Code steht in Bibliotheken.**
   - Für alle Seiten: `katalog.js`, `nav.js`, `sync.js`, `seite.css`.
   - Pro Bereich eine eigene. Excel: `IT/excel/basis.js` für alle Übungen, dazu `bausteine.js` (Formeln aus Bausteinen) oder `tabelle.js` (Tabellen mit Rechenkern), jeweils mit gleichnamiger CSS-Datei. Python: `IT/python/lib/pykurs.js`. BWR: `BWR/bwr.css` (Grundlayout aller BWR-Seiten).
2. **Eine Seite enthält nur ihr Eigenes.** Aufgaben und Level stehen möglichst als Daten in der Seite, nicht als Code.
3. **Jede Bibliothek beginnt mit einer kurzen Beschreibung** ihrer Funktionen und wie man sie aufruft. Wer eine neue Seite baut, liest diese Beschreibung und eine Beispielseite, nicht den Code der Bibliothek. Die Beschreibung steht nur dort; ein Skill für neue Seiten wird daraus erzeugt, nicht von Hand gepflegt.
4. **In eine Bibliothek kommt nur, was mindestens zwei Seiten gleich brauchen.** Sonderfälle einer Übung bleiben in der Übung, keine Schalter für Einzelfälle in der Bibliothek.
5. **Kein Build-Schritt für den Betrieb.** Es bleiben einfache Dateien, die PocketBase direkt ausliefert.
6. **Einzeldateien werden per Skript erzeugt, nie von Hand gepflegt.** Das Skript bettet die eingebundenen JS- und CSS-Dateien in die HTML ein, blendet das Menü aus und startet direkt im Gastmodus (Fortschritt nur im Browser). Es läuft beim Bauen der ZIP mit und legt die Ergebnisse in `standalone/` ab, in denselben Ordnern wie auf der Webseite.

## Werkzeuge

Im Ordner `werkzeuge/`, Aufruf jeweils im Hauptordner des Repos:

- `python3 werkzeuge/einzeldateien.py` erzeugt `standalone/` neu (eine HTML-Datei pro Übung, alles eingebettet, Ordner wie auf der Webseite).
- `python3 werkzeuge/skill-bauen.py` erzeugt `.claude/skills/vibe-learning-uebung/SKILL.md` (der Skill für Claude Code) aus `werkzeuge/skill-vorlage.md` und den Kopfkommentaren der Bibliotheken. Neue Bibliothek: dort in der Liste eintragen.
- Nach Änderungen an Übungen oder Bibliotheken beide Skripte laufen lassen und das Ergebnis mit committen.
