# vibe learning – Hinweise für Claude

Übungsplattform für den Unterricht (Realschule): IT und BWR (Jahrgangsstufe 9). Statische Seiten in `pb_public/<Fach>/…` (`IT/excel/…`, `BWR/9II/anlagen/…`, Aufbau in `katalog.js`), PocketBase (≥ 0.23, getestet 0.40.5) als Backend. Jede Seite muss auch ohne Server per Doppelklick laufen.

Ausnahme: **pockettype** (Tipptrainer, eigenes Repo github.com/nic0nic/pockettype, GPL-3.0, basiert auf Monkeytype). Die fertig gebauten Dateien liegen in `pb_public/IT/tippen/` (Seite `pockettype.html`) und werden hier nie von Hand geändert, nur `IT/tippen/index.html` (Bereichsseite) gehört zu vibe learning. Neu bauen im pockettype-Repo mit `scripts/pockettype/nach-vibe-learning.sh ../vibe-learning`. pockettype läuft nur mit Server, es gibt keine Einzeldatei in `standalone/`. Server-Teil: `pb_hooks/tippen.pb.js`.

## Arbeitsweise

- Antworten knapp und auf Deutsch. Vorschläge der Lehrkraft und eigene Vorschläge kritisch hinterfragen; wenn ein anderer Weg besser ist, das sagen.
- Regeln für Code: [PRINZIPIEN.md](PRINZIPIEN.md), dort auch, auf welcher Ebene neuer gemeinsamer Code landet (`lib/`, Fach, Bereich). Neue Übungsseite: Skill `vibe-learning-uebung` (`.claude/skills/`); Standardaufgaben als Daten mit `lib/aufgaben.js`.
- Offene Änderungen stehen in [notizen/fehlerliste.md](notizen/fehlerliste.md). Umgesetzt wird nur, was die Lehrkraft ausdrücklich freigibt. Erledigtes dort nach „Erledigt“ verschieben, neue Wünsche mit Datum eintragen.
- Neuer Aufgabentyp in `lib/aufgaben.js`: auch `lib/seite.js` (TYPEN, Prüfung) und den Skill `vibe-learning-seite-erstellen` im Repo github.com/nic0nic/vibe-learning-skills anpassen.
- Ändert sich, was gespeichert wird (pb_migrations/, sync.js, Speicher im Browser, externe Dienste), `pb_public/datenschutz.html` mitpflegen.
- Hintergrund zu Unterrichtsmaterial: `notizen/`.

## Nach jeder Änderung

1. `python3 werkzeuge/einzeldateien.py` (erzeugt `standalone/`), `python3 werkzeuge/bycs-pakete.py` (erzeugt `bycs/`, SCORM-Pakete mit `pb_public/scorm.js` statt `sync.js`) und bei Änderungen an Bibliotheks-Kopfkommentaren oder der Vorlage `python3 werkzeuge/skill-bauen.py`.
2. Im Browser testen: ohne Server `python3 -m http.server` in `pb_public/`, mit Anmeldung `pocketbase serve --dir ./pb_data --hooksDir ./pb_hooks --migrationsDir ./pb_migrations --publicDir ./pb_public`. Nicht getestet? Dann klar sagen.
3. Committen mit kurzer deutscher Nachricht. `pb_data/` (Schülerdaten) nie committen.

## Betrieb

Produktiv auf TrueNAS (`truenas/docker-compose.yaml`): `pb_hooks/`, `pb_migrations/`, `pb_public/` in den Dataset kopieren und die App neu starten.
