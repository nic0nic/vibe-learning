# vibe learning – Hinweise für Claude

Übungsplattform für den IT-Unterricht (Realschule). Statische Seiten in `pb_public/`, PocketBase (≥ 0.23, getestet 0.40.5) als Backend. Jede Seite muss auch ohne Server per Doppelklick laufen.

## Arbeitsweise

- Antworten knapp und auf Deutsch. Vorschläge der Lehrkraft und eigene Vorschläge kritisch hinterfragen; wenn ein anderer Weg besser ist, das sagen.
- Regeln für Code: [PRINZIPIEN.md](PRINZIPIEN.md). Neue Übungsseite: Skill `vibe-learning-uebung` (`.claude/skills/`).
- Offene Änderungen stehen in [notizen/fehlerliste.md](notizen/fehlerliste.md). Umgesetzt wird nur, was die Lehrkraft ausdrücklich freigibt. Erledigtes dort nach „Erledigt“ verschieben, neue Wünsche mit Datum eintragen.
- Hintergrund zu Unterrichtsmaterial: `notizen/`, Dateien in `material/`.

## Nach jeder Änderung

1. `python3 werkzeuge/einzeldateien.py` (erzeugt `einzeln/`) und bei Änderungen an Bibliotheks-Kopfkommentaren oder der Vorlage `python3 werkzeuge/skill-bauen.py`.
2. Im Browser testen: ohne Server `python3 -m http.server` in `pb_public/`, mit Anmeldung `pocketbase serve --dir ./pb_data --hooksDir ./pb_hooks --migrationsDir ./pb_migrations --publicDir ./pb_public`. Nicht getestet? Dann klar sagen.
3. Committen mit kurzer deutscher Nachricht. `pb_data/` (Schülerdaten) nie committen.

## Betrieb

Produktiv auf TrueNAS (`truenas/docker-compose.yaml`): `pb_hooks/`, `pb_migrations/`, `pb_public/` in den Dataset kopieren und die App neu starten.
