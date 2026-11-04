# vibe learning

Übungen für den Unterricht: IT (Excel, Python, Datenbanken, Tippen und Tools) und BWR (Jahrgangsstufe 9). Mit KI erstellt.

## Einzelne Übung nutzen (ohne Server)

Im Ordner [`standalone/`](standalone/) liegt jede Übung als eine HTML-Datei, in Unterordnern wie auf der Webseite (z. B. `IT/excel/`, `IT/python/`, `IT/datenbanken/`). Datei öffnen, oben rechts auf *Download raw file* klicken und per Doppelklick im Browser starten. Der Fortschritt bleibt im Browser, es gibt keine Anmeldung.

## Ganze Plattform mit Anmeldung (PocketBase)

Mit PocketBase melden sich Schüler mit Zugangscode an, und Lehrkräfte sehen den Fortschritt ihrer Klassen. Einrichtung: [ANLEITUNG.md](ANLEITUNG.md), für TrueNAS: [truenas/ANLEITUNG-TRUENAS.md](truenas/ANLEITUNG-TRUENAS.md).

## Aufbau

- `pb_public/` Webseiten, `pb_hooks/` Server-Logik, `pb_migrations/` Datenbanktabellen
- `standalone/` erzeugte Einzeldateien (nie von Hand ändern)
- `werkzeuge/` Skripte zum Erzeugen von `standalone/` und dem Claude-Code-Skill
- `notizen/` offene Änderungen und Hintergrund, `material/` Unterrichtsmaterial
- Regeln für neuen Code: [PRINZIPIEN.md](PRINZIPIEN.md)

## Lizenz

MIT, siehe [LICENSE](LICENSE).
