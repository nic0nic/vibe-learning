# vibe learning

Übungen für den Unterricht: IT (Excel, Python, HTML, Datenbanken, Tippen und Tools) und BWR (Jahrgangsstufe 9). Mit KI erstellt.

## Einzelne Übung nutzen (ohne Server)

Im Ordner [`standalone/`](standalone/) liegt jede Übung als eine HTML-Datei, in Unterordnern wie auf der Webseite (z. B. `IT/excel/`, `IT/python/`, `IT/datenbanken/`). Datei öffnen, oben rechts auf *Download raw file* klicken und per Doppelklick im Browser starten. Der Fortschritt bleibt im Browser, es gibt keine Anmeldung.

## In der ByCS-Lernplattform (Moodle) mit Auswertung

Im Ordner [`bycs/`](bycs/) liegt jede Übung als SCORM-Paket (ZIP), gleiche Ordner wie in `standalone/`. Im ByCS-Kurs: *Aktivität anlegen → Lernpaket* und die ZIP hochladen. Der Fortschritt wird in ByCS gespeichert, die Lehrkraft sieht Bewertung (Prozent gelöster Aufgaben) und jede gelöste Aufgabe im Bericht des Lernpakets. Einzelheiten: [ANLEITUNG.md](ANLEITUNG.md#bycs).

## Ganze Plattform mit Anmeldung (PocketBase)

Mit PocketBase melden sich Schüler mit Zugangscode an, und Lehrkräfte sehen den Fortschritt ihrer Klassen. Einrichtung: [ANLEITUNG.md](ANLEITUNG.md), für TrueNAS: [truenas/ANLEITUNG-TRUENAS.md](truenas/ANLEITUNG-TRUENAS.md).

## Aufbau

- `pb_public/` Webseiten, `pb_hooks/` Server-Logik, `pb_migrations/` Datenbanktabellen
- `standalone/` erzeugte Einzeldateien (nie von Hand ändern)
- `bycs/` erzeugte SCORM-Pakete für die ByCS-Lernplattform (nie von Hand ändern)
- `werkzeuge/` Skripte zum Erzeugen von `standalone/`, `bycs/` und dem Claude-Code-Skill
- `notizen/` offene Änderungen und Hintergrund
- Regeln für neuen Code: [PRINZIPIEN.md](PRINZIPIEN.md)

## Lizenz

MIT, siehe [LICENSE](LICENSE).
