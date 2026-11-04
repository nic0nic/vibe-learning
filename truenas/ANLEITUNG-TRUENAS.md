# IT-Tools auf TrueNAS SCALE 25.10 installieren

Ziel: PocketBase mit den Unterrichtstools läuft als App `it-tools` auf dem Pool **Software**, erreichbar im Heimnetz unter `http://<NAS-IP>:8090/`.

## 1. Dataset anlegen

1. *Datasets* → Pool **Software** anklicken → *Add Dataset*.
2. Name: `it-tools`, Dataset Preset: **Generic** → *Save*.

Ergebnis: Ordner `/mnt/Software/it-tools`.

## 2. Dateien auf das NAS kopieren

Auf dem NAS muss SSH laufen: *System* → *Services* → **SSH** einschalten. Beim Admin-Benutzer (*Credentials* → *Users* → `truenas_admin`) muss „SSH password login enabled“ aktiv sein, falls du keinen Schlüssel hinterlegt hast.

PocketBase auf dem Manjaro-Rechner vorher mit `Strg+C` beenden, dann dort:

```bash
cd ~/vibe-learning
scp -r pb_hooks pb_migrations pb_public pb_data truenas_admin@<NAS-IP>:/mnt/Software/it-tools/
```

`pb_data` mitzukopieren ist optional. Dann sind Lehrerkonto und Zugangscodes vom Test schon da.

Falls `scp` „Permission denied“ beim Schreiben meldet: Dataset `it-tools` → *Permissions* → *Edit* → Owner auf `truenas_admin` setzen, „Apply recursively“ → *Save*. Danach erneut kopieren.

## 3. App installieren

1. *Apps* → *Discover Apps* → oben rechts **⋮** → **Install via YAML**.
2. Name: `it-tools`.
3. Inhalt von `docker-compose.yaml` komplett einfügen → *Save*.

Beim ersten Start lädt der Container PocketBase 0.40.5 herunter. Das dauert ein paar Sekunden.

## 4. Prüfen

1. *Apps* → `it-tools` sollte **Running** zeigen.
2. Browser: `http://<NAS-IP>:8090/` (Schülerseite) und `http://<NAS-IP>:8090/lehrer.html`.

**Ohne mitkopiertes `pb_data`:** In *Apps* → `it-tools` → *Logs* steht ein Link wie `http://0.0.0.0:8090/_/#/pbinstal/...`. `0.0.0.0` durch die NAS-IP ersetzen, öffnen, Lehrerkonto anlegen.

## 5. Später Tools aktualisieren

Neue Dateien nach `/mnt/Software/it-tools/pb_public` (bzw. `pb_hooks`, `pb_migrations`) kopieren, dann *Apps* → `it-tools` → *Restart*. Seit dem 04.11. liegen die IT-Seiten in `pb_public/IT/`: beim ersten Einspielen danach die alten Ordner `excel`, `python`, `datenbanken`, `tippen` und `tools` direkt in `pb_public` löschen (alte Adressen leitet `pb_hooks/weiterleitung.pb.js` weiter). `pb_data` dabei **nicht** überschreiben, sonst sind Fortschritte und Codes weg.

## Wenn etwas nicht klappt

App steht auf **Crashed** oder Seite lädt nicht: *Apps* → `it-tools` → *Logs* kopieren und im Thread schicken.
