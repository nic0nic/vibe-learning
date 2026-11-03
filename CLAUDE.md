# vibe learning – Hinweise für Claude

Übungsplattform für den IT-Unterricht (Realschule). Statische Seiten in `pb_public/`, PocketBase (≥ 0.23, getestet 0.40.5) als Backend. Jede Seite muss auch ohne Server per Doppelklick laufen.

Ausnahme: **pockettype** (Tipptrainer, eigenes Repo github.com/nic0nic/pockettype, GPL-3.0, basiert auf Monkeytype). Die fertig gebauten Dateien liegen in `pb_public/tippen/` (Seite `pockettype.html`) und werden hier nie von Hand geändert, nur `tippen/index.html` (Bereichsseite) gehört zu vibe learning. Neu bauen im pockettype-Repo mit `scripts/pockettype/nach-vibe-learning.sh ../vibe-learning`. pockettype läuft nur mit Server, es gibt keine Einzeldatei in `standalone/`. Server-Teil: `pb_hooks/tippen.pb.js`.

## Arbeitsweise

- Antworten knapp und auf Deutsch. Vorschläge der Lehrkraft und eigene Vorschläge kritisch hinterfragen; wenn ein anderer Weg besser ist, das sagen.
- Regeln für Code: [PRINZIPIEN.md](PRINZIPIEN.md). Neue Übungsseite: Skill `vibe-learning-uebung` (`.claude/skills/`).
- Offene Änderungen stehen in [notizen/fehlerliste.md](notizen/fehlerliste.md). Umgesetzt wird nur, was die Lehrkraft ausdrücklich freigibt. Erledigtes dort nach „Erledigt“ verschieben, neue Wünsche mit Datum eintragen.
- Hintergrund zu Unterrichtsmaterial: `notizen/`, Dateien in `material/`.

## Nach jeder Änderung

1. `python3 werkzeuge/einzeldateien.py` (erzeugt `standalone/`) und bei Änderungen an Bibliotheks-Kopfkommentaren oder der Vorlage `python3 werkzeuge/skill-bauen.py`.
2. Im Browser testen: ohne Server `python3 -m http.server` in `pb_public/`, mit Anmeldung `pocketbase serve --dir ./pb_data --hooksDir ./pb_hooks --migrationsDir ./pb_migrations --publicDir ./pb_public`. Nicht getestet? Dann klar sagen.
3. Committen mit kurzer deutscher Nachricht. `pb_data/` (Schülerdaten) nie committen.

## Betrieb

Produktiv auf TrueNAS (`truenas/docker-compose.yaml`): `pb_hooks/`, `pb_migrations/`, `pb_public/` in den Dataset kopieren und die App neu starten.
