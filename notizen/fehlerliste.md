# Fehlerliste für die nächste Version

Gesammelt im Thread „Aufbau der Seite“. Umgesetzt wird erst, wenn die Lehrkraft das ausdrücklich sagt.

## Offen

13. **Funktionen: Erarbeitung MITTELWERT neu ordnen** (gewünscht 22.10., Thread „Funktionen-Trainer“)
    - Zuerst nur die MITTELWERT-Funktion bilden.
    - Danach erst den Teil „leere Zellen zählen nicht mit“.
    - Dort in der Excel-Tabelle eine Extrazeile mit =SUMME(…)/5 neben =MITTELWERT(…) zeigen, damit man den Unterschied sieht. Bisher steht das nur im Erklärtext.
    Betrifft excel/funktionen.html.

14. **Funktionen: Aufgabe 24 akzeptiert =8-ANZAHL(B4:B11)** (gefunden 20.10., Thread „Funktionen-Trainer“)
    Die abgeschriebene 8 fällt nicht auf, weil die Prüftabellen die Länge der Namensliste nicht verändern. Prüfvarianten so ändern, dass die Zahl der Namen variiert.
    Betrifft excel/funktionen.html.

15. **Verknüpfte Aufgaben mit Funktionen** (gewünscht 22.10., Thread „Funktionen-Trainer“)
    - Funktionen, Übungen am Ende: Funktionen in einer Formel verknüpfen, z. B. Spannweite =MAX(B4:B10)-MIN(B4:B10) oder Abweichung vom Mittelwert für eine einzelne Zeile =B4-MITTELWERT(B4:B10), ohne $. Bisher rechnen die Kombi-Aufgaben nur mit Zellen, in denen das Ergebnis schon steht (z. B. =D14-D13).
    - Zellbezüge, späte Übung: dieselbe Abweichung, aber zum Übertragen, also Funktion mit festem Bereich in der Formel, z. B. =B5-MITTELWERT($B$5:$B$10). Bisher steht der Mittelwert dort immer schon in einer eigenen Zelle (=B5-$B$12).
    Betrifft excel/funktionen.html und excel/bezuege.html.

17. **SQL mit UND/ODER: Übung „Datenight“** (gewünscht 02.11.)
    Aufgaben aus `notizen/datenight.md` (Herr Maier sucht für jeden Wochentag einen Film fürs Date) als zweite SQL-Seite mit derselben Tabelle `filme` und `abfragen.js`. Dafür muss der Entwurf (Stufe 1–2) mehrere Bedingungen mit AND/OR erlauben. Achtung: Die Aufgaben „noch nicht gesehen“ (keine eigene Bewertung) gehen mit dem IMDb-Export nicht, dort hat jeder Eintrag eine Bewertung.

18. **Vorschlag: gemeinsame Teile in einen Ordner für alle Bereiche** (vorgeschlagen 02.11.)
    datenbanken/abfragen.html bindet `../excel/basis.js`/`basis.css` (Stufen, Modi, Dock) und `../python/lib/codemirror.*` ein. Sauberer wäre z. B. `pb_public/lib/` für alles, was mehrere Bereiche nutzen. Betrifft alle Excel-, Python- und Datenbank-Seiten.

## Erledigt

### Version vom 02.11.

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
