# vibe learning mit PocketBase hosten (Manjaro Linux)

Diese Anleitung zeigt, wie du die Übungsplattform „vibe learning“ mit PocketBase auf einem Manjaro-Rechner betreibst. Die Übungen sind nach Bereichen des Lehrplans geordnet (Excel, Python, Datenbanken, Logische Schaltungen …); oben auf jeder Seite ist eine Menüleiste, deren Bereiche beim Darüberfahren mit der Maus ihre Übungen zeigen. Schüler melden sich mit einem Zugangscode an. Ihr Fortschritt wird auf dem Server gespeichert, und du siehst im Lehrerbereich, wer wann wie viele Aufgaben gelöst hat.

Getestet mit **PocketBase 0.40.5**. Nötig ist mindestens Version **0.23**, weil ältere Versionen eine andere Schnittstelle für Erweiterungen haben.

---

## 1. Was ist in dem Ordner?

```
vibe-learning/
├── pb_hooks/              Server-Logik (Anmeldung, Speichern, Auswertung, Verwaltung)
│   ├── trainer.pb.js
│   └── trainer_utils.js
├── pb_migrations/         legt beim ersten Start automatisch die Tabellen an
│   └── 1760860000_trainer_init.js
├── pb_public/             die Webseiten
│   ├── index.html             Startseite: alle Bereiche mit ihren Übungen
│   ├── katalog.js             Liste aller Bereiche und Tools (hier neue Tools eintragen)
│   ├── nav.js                 Menüleiste oben auf jeder Seite
│   ├── seite.css              Aussehen der Übersichtsseiten
│   ├── sync.js                Anmeldung und Speichern auf dem Server
│   ├── lehrer.html            Verwaltung für Lehrkräfte und Admin
│   ├── excel/                 ein Ordner pro Bereich
│   │   ├── index.html             Übersicht des Bereichs
│   │   ├── funktionen.html        SUMME, MITTELWERT, MIN, MAX, ANZAHL, ANZAHL2
│   │   ├── wenn.html
│   │   ├── und-oder.html
│   │   └── bezuege.html           relative und absolute Zellbezüge ($)
│   ├── python/
│   │   ├── index.html             Übersicht des Bereichs
│   │   ├── editor.html            Python-Editor mit Terminal (läuft im Browser)
│   │   ├── bedingungen.html       geführte Übung if/elif/else; Aufgaben und Tests stehen in der Datei
│   │   └── lib/                   Skulpt (Python), CodeMirror (Editor) und pykurs.js (Technik der
│   │                              geführten Übungen, Aufbau einer Aufgabe dort oben beschrieben)
│   ├── datenbanken/
│   │   ├── index.html             Übersicht des Bereichs
│   │   ├── filmdatenbank.html     freie Abfragen an die Filmdatenbank
│   │   ├── abfragen.html          SQL-Abfragen in Stufen (Entwurf wie in Access bis SQL)
│   │   ├── datenight.html         Kriterien mit UND/ODER (Access-Entwurf oder Blöcke/SQL)
│   │   ├── abfragen.js/.css       Technik der Abfrage-Übungen, Aufbau oben in abfragen.js
│   │   ├── filme.js               Daten der Filmdatenbank
│   │   └── lib/                   sql.js (SQLite im Browser) und Autovervollständigung (CodeMirror)
│   └── schaltungen/           noch leer
└── ANLEITUNG.md
```

`pb_data/` (Datenbank, Einstellungen) entsteht beim ersten Start von selbst.

**So funktioniert es:**

- **Anmelden:** Beim Öffnen der Seite erscheint ein Fenster. Schüler geben ihren Zugangscode ein (z. B. `8B-K7Q2-M4XZ`) oder ihren Benutzernamen und danach ihr Passwort. Alternativ „Seite ohne Anmeldung nutzen“ (oder X): Dann wird nichts auf dem Server gespeichert, und oben rechts steht „Nicht angemeldet“. Über dieses Feld oben rechts kann man sich jederzeit anmelden und abmelden.
- **Rollen:** *Admin* ist das PocketBase-Superuser-Konto (Anmeldung mit der E-Mail-Adresse). Der Admin legt *Lehrkräfte* an. Lehrkräfte sehen nur ihre eigenen Klassen, der Admin sieht alle. Beide melden sich über dasselbe Fenster an und finden oben rechts im Menü den Link zur *Verwaltung*.
- **Was gespeichert wird:** Jede richtig gelöste Aufgabe und jeder erledigte Erarbeitungsschritt landet mit Zeitstempel in der Datenbank. Wer erst als Gast übt und sich dann anmeldet, nimmt seinen Stand mit, solange das Konto bei dieser Übung noch leer ist.
- **Verwaltung:** Unter `/lehrer.html` siehst du pro Klasse, wer im gewählten Zeitraum aktiv war, wie viele Aufgaben gelöst wurden und welche genau. Dort legst du auch Klassen, Codes und Konten an.
- **Ohne Server:** Öffnet man die HTML-Dateien direkt, z. B. per Doppelklick, funktionieren sie wie bisher – dann ohne Anmeldung und ohne Speichern auf dem Server.

---

## 2. PocketBase installieren

Im Terminal:

```bash
pamac search pocketbase        # oder: yay -Ss pocketbase
```

Es gibt mehrere Pakete im AUR (z. B. `pocketbase` oder `pocketbase-bin`). Nimm das mit der aktuellsten Version:

```bash
pamac build pocketbase-bin     # bzw. den Paketnamen aus der Suche
```

Danach prüfen:

```bash
pocketbase --version           # muss 0.23 oder neuer sein
which pocketbase               # Pfad merken, meist /usr/bin/pocketbase
```

Bringt das AUR-Paket eine eigene systemd-Unit mit, nutzen wir sie **nicht**, sondern legen in Schritt 5 eine eigene an. Prüfen kannst du das so:

```bash
pacman -Ql pocketbase-bin | grep systemd
```

---

## 3. Erst einmal lokal ausprobieren

Den Ordner `vibe-learning` z. B. nach `~/vibe-learning` kopieren und dort starten:

```bash
cd ~/vibe-learning
pocketbase serve \
  --dir ./pb_data \
  --hooksDir ./pb_hooks \
  --migrationsDir ./pb_migrations \
  --publicDir ./pb_public
```

> **Wichtig:** Gib die vier Ordner immer ausdrücklich an. Sonst sucht PocketBase z. B. die Webseiten neben der Programmdatei, also in `/usr/pb_public`.

Beim ersten Start legt PocketBase die Tabellen an. Lass das Terminal offen und lege in einem **zweiten Terminal** dein Admin-Konto an (Superuser):

```bash
cd ~/vibe-learning
pocketbase superuser upsert deine@mail.de 'EinLangesSicheresPasswort' --dir ./pb_data
```

Jetzt im Browser:

| Adresse | Was |
|---|---|
| http://127.0.0.1:8090/ | Startseite für Schüler |
| http://127.0.0.1:8090/lehrer.html | Verwaltung (oben rechts mit der Superuser-E-Mail anmelden) |
| http://127.0.0.1:8090/_/ | PocketBase-Verwaltung (Tabellen, Einstellungen, Backups) |

**Testlauf:**

1. Verwaltung → *Klassen und Zugänge* → neue Klasse `test` anlegen → *Schüler und Zugänge* → Anzahl `3` → *Codes erzeugen*.
2. In einem privaten Browserfenster die Startseite öffnen, einen der Codes eingeben, ein paar Aufgaben lösen.
3. In der Verwaltung → *Auswertung* → Klasse `test` → *Anzeigen*.

Beenden mit `Strg+C` im ersten Terminal.

---

## 4. Ordner für den Dauerbetrieb

Für den Dauerbetrieb läuft PocketBase als eigener Systembenutzer ohne Zugriff auf dein Home-Verzeichnis:

```bash
sudo useradd --system --home-dir /srv/vibe-learning --shell /usr/bin/nologin vibe-learning
sudo mkdir -p /srv/vibe-learning
sudo cp -r ~/vibe-learning/pb_hooks ~/vibe-learning/pb_migrations ~/vibe-learning/pb_public /srv/vibe-learning/
sudo chown -R vibe-learning:vibe-learning /srv/vibe-learning
```

Hast du in Schritt 3 schon Codes angelegt und willst sie behalten, kopiere zusätzlich `pb_data`:

```bash
sudo cp -r ~/vibe-learning/pb_data /srv/vibe-learning/
sudo chown -R vibe-learning:vibe-learning /srv/vibe-learning/pb_data
```

Sonst legst du das Lehrerkonto neu an:

```bash
sudo -u vibe-learning pocketbase superuser upsert deine@mail.de 'EinLangesSicheresPasswort' --dir /srv/vibe-learning/pb_data
```

---

## 5. Als Dienst starten (systemd)

Datei anlegen:

```bash
sudo nano /etc/systemd/system/vibe-learning.service
```

Inhalt. Den Pfad in `ExecStart` an die Ausgabe von `which pocketbase` anpassen:

```ini
[Unit]
Description=vibe learning (PocketBase)
After=network-online.target
Wants=network-online.target

[Service]
User=vibe-learning
Group=vibe-learning
WorkingDirectory=/srv/vibe-learning
ExecStart=/usr/bin/pocketbase serve \
  --http 127.0.0.1:8090 \
  --dir /srv/vibe-learning/pb_data \
  --hooksDir /srv/vibe-learning/pb_hooks \
  --migrationsDir /srv/vibe-learning/pb_migrations \
  --publicDir /srv/vibe-learning/pb_public \
  --hooksWatch=false
Restart=on-failure
RestartSec=5

# Absicherung
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/srv/vibe-learning/pb_data

[Install]
WantedBy=multi-user.target
```

Starten und beim Hochfahren automatisch starten:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now vibe-learning
systemctl status vibe-learning          # sollte "active (running)" zeigen
journalctl -u vibe-learning -f          # Live-Protokoll (Beenden mit Strg+C)
```

Mit `--http 127.0.0.1:8090` ist der Trainer zunächst nur auf diesem Rechner erreichbar. Wie er für Schüler erreichbar wird, steht in Schritt 6.

---

## 6. Für Schüler erreichbar machen

Hier musst du dich entscheiden. Die Varianten unterscheiden sich stark in Aufwand und Risiko.

### Variante A: nur im lokalen Netz (Schule oder zu Hause)

In der Service-Datei `--http 127.0.0.1:8090` ersetzen durch:

```
  --http 0.0.0.0:8090 \
```

```bash
sudo systemctl daemon-reload && sudo systemctl restart vibe-learning
ip -4 addr | grep inet                  # eigene IP-Adresse, z. B. 192.168.1.50
```

Schüler im selben Netz öffnen dann `http://192.168.1.50:8090/`. Falls eine Firewall aktiv ist (bei Manjaro meist `ufw`, prüfen mit `sudo ufw status`):

```bash
sudo ufw allow 8090/tcp
```

Einschränkungen dieser Variante:
- **Kein HTTPS.** Die Codes gehen unverschlüsselt durchs Netz. Das ist für einen Test im Heimnetz okay, im Schulnetz nur nach Absprache.
- **Keine Hausaufgaben von zu Hause**, weil der Server nur im lokalen Netz erreichbar ist.
- Im Schulnetz brauchst du meist die Erlaubnis des Netzwerk-Admins.

### Variante B: aus dem Internet mit eigener Domain und HTTPS

PocketBase kann sich selbst ein HTTPS-Zertifikat von Let's Encrypt holen. Dafür brauchst du:

1. **Eine Domain oder Subdomain**, z. B. `trainer.deine-domain.de`, die auf die öffentliche IP-Adresse des Rechners zeigt. Bei wechselnder IP zu Hause brauchst du DynDNS.
2. **Weitergeleitete Ports 80 und 443** im Router zu diesem Rechner.
3. **Einen Rechner, der dauerhaft läuft.**

Service-Datei anpassen: Die Zeile `--http 127.0.0.1:8090 \` ersetzen durch die Domain direkt nach `serve`:

```ini
ExecStart=/usr/bin/pocketbase serve trainer.deine-domain.de \
  --dir /srv/vibe-learning/pb_data \
  ...
```

und im Abschnitt `[Service]` ergänzen, damit der Dienst die Ports 80 und 443 benutzen darf:

```ini
AmbientCapabilities=CAP_NET_BIND_SERVICE
```

```bash
sudo systemctl daemon-reload && sudo systemctl restart vibe-learning
sudo ufw allow 80/tcp && sudo ufw allow 443/tcp     # falls ufw aktiv ist
```

> **Ehrliche Einschätzung zu Variante B auf einem Rechner zu Hause:**
> - Viele deutsche Internetanschlüsse (Kabel, teils Glasfaser) haben **keine eigene öffentliche IPv4-Adresse** („DS-Lite“). Dann ist eine Portweiterleitung nicht möglich. Das lässt sich im Router oder beim Anbieter prüfen.
> - Der Rechner muss **immer an** sein, und du stellst einen Dienst ins Internet. Updates sind dann Pflicht (Schritt 8).
>
> **Für den echten Schulbetrieb empfehle ich einen kleinen Server bei einem deutschen Hoster** (ein paar Euro im Monat). Die Schritte 4–8 sind dort fast identisch. Unterschied: Auf Debian/Ubuntu gibt es kein AUR, dort lädt man PocketBase als ZIP von der GitHub-Release-Seite und legt die Datei nach `/usr/local/bin/pocketbase`.

---

## 7. Im Unterricht verwenden

**Klasse anlegen:** Verwaltung → *Klassen und Zugänge* → *Neue Klasse*. Als Admin wählst du dabei, welcher Lehrkraft die Klasse gehört; später lässt sie sich in der Klassenliste umhängen.

**Zugänge: Codes oder Konten** (beides in derselben Klasse möglich), jeweils über *Schüler und Zugänge*:

1. **Codes:** Anzahl eingeben → *Codes erzeugen*. Der Code ist Benutzername und Passwort in einem.
2. **Konten mit Benutzername und Passwort:** CSV-Datei wählen oder Liste einfügen → *Konten anlegen*. Die CSV braucht eine Überschriftenzeile: Die Spalte mit „name“ im Titel (z. B. „Benutzername“) wird der Benutzername, die Spalte mit „pass“ (z. B. „Passwort“) das Passwort. Andere Spalten werden ignoriert. Gibt es mehrere Spalten mit „name“ (z. B. „Vorname“), wird die mit „Nutzer“, „User“ oder „Login“ genommen. Trennzeichen `;` oder `,` werden erkannt.
   - Leeres Passwort: wird automatisch erzeugt und **nur direkt danach** in der Tabelle angezeigt. Danach ist es verschlüsselt gespeichert und nicht mehr lesbar, nur neu vergebbar (*Passwort neu*).
   - Benutzernamen: 3–40 Zeichen, a–z, Ziffern, `.` `-` `_`, keine echten Namen (Datenschutz liegt bei der Lehrkraft). Sie dürfen nicht wie ein Code aussehen.
3. *Zugangszettel drucken* gibt Zettel zum Ausschneiden aus: bei Codes der Code, bei Konten Benutzername und – falls gerade erzeugt – das Passwort.
4. **Namen werden nur in deinem Browser gespeichert**, nie auf dem Server. Sichere die Zuordnung über *Namensliste importieren/exportieren* (z. B. in eine Datei auf deinem Dienstgerät).

**Sperren, Passwort neu, Löschen:** direkt in der Schülerliste einer Klasse. Löschen entfernt auch Fortschritt und Protokoll. Eine ganze Klasse löschst du in der Klassenliste.

**Lehrkräfte verwalten (nur Admin):** Verwaltung → *Lehrkräfte*: anlegen (Passwort leer = wird erzeugt), Anzeigename oder Passwort ändern, löschen. Die Klassen einer gelöschten Lehrkraft gehen an den Admin. Ein zweites Superuser-Konto wäre ebenfalls Admin – Kolleginnen und Kollegen deshalb als Lehrkraft anlegen und überzählige Superuser in `/_/` → `_superusers` löschen.

**Hausaufgaben kontrollieren:**

- Verwaltung → *Auswertung* → Klasse und Zeitraum wählen (z. B. „letzte 7 Tage“) → *Anzeigen*.
- **Rot** markiert: im Zeitraum keine Aktivität.
- **Eine Zeile anklicken** zeigt jede gelöste Aufgabe mit Datum und Uhrzeit.
- **CSV exportieren** öffnet die Liste in Excel bzw. LibreOffice.

**Hinweise für Schüler:**

- **An gemeinsam genutzten Schul-PCs nach dem Üben abmelden**: oben rechts auf den eigenen Namen bzw. Code klicken → *Abmelden*. Sonst arbeitet der nächste Schüler unter dem falschen Zugang. Lehrkräfte und Admin werden beim Schließen des Browsers automatisch abgemeldet.
- Ohne Internetverbindung speichert die Seite lokal weiter und überträgt den Stand, sobald wieder Verbindung besteht. Der Punkt neben dem Code zeigt den Status: grün = gespeichert, gelb = wird gespeichert, rot = keine Verbindung.

**Neues Schuljahr:** alte Klassen in der Verwaltung → *Klassen und Zugänge* löschen.

---

## 8. Wartung

**Updates:**

```bash
sudo cp "$(which pocketbase)" /srv/vibe-learning/pocketbase.vorher   # alte Version sichern
pamac upgrade                       # bzw. yay -Syu
sudo systemctl restart vibe-learning
journalctl -u vibe-learning -n 50   # nach dem Neustart: Fehler?
```

Läuft nach dem Update etwas nicht, in der Service-Datei bei `ExecStart` vorübergehend `/srv/vibe-learning/pocketbase.vorher` statt `/usr/bin/pocketbase` eintragen, dann `sudo systemctl daemon-reload && sudo systemctl restart vibe-learning`. Eine Einschränkung: Die Datenbank wird beim Start der neuen Version eventuell schon angepasst, deshalb vorher immer ein Backup machen (siehe unten).

PocketBase ist noch in Version 0.x. Größere Sprünge (z. B. 0.40 → 0.41) können Änderungen mitbringen. **Vorher ein Backup machen** und kurz in die Änderungsliste („Changelog“) auf GitHub schauen. Sicherheitsupdates solltest du zeitnah einspielen, gerade bei Variante B.

**Backup:**

- **Einfach:** `/_/` → *Settings* → *Backups* → *Initialize new backup*. Dort lassen sich auch automatische Backups einstellen, z. B. täglich. Backups regelmäßig herunterladen.
- **Komplett von Hand:**

  ```bash
  sudo systemctl stop vibe-learning
  sudo tar czf ~/vibe-learning-backup-$(date +%F).tar.gz -C /srv vibe-learning
  sudo systemctl start vibe-learning
  ```

**Neue Version einspielen** (z. B. aus einer neuen ZIP): vorher ein Backup machen (siehe unten), dann `pb_hooks`, `pb_migrations` und `pb_public` ersetzen und PocketBase **neu starten** (`sudo systemctl restart vibe-learning` bzw. Strg+C und neu starten). Neue Tabellen legt PocketBase beim Start selbst an, bestehende Klassen, Codes und Fortschritte bleiben erhalten.

**Übungen ohne Server weitergeben:** Im Ordner `standalone/` liegt jede Übung als eine einzige HTML-Datei, sortiert wie auf der Webseite, z. B. `standalone/excel/wenn.html`. Sie läuft per Doppelklick, ohne Menü und ohne Anmeldung; der Fortschritt bleibt im Browser. Die Dateien werden mit `python3 werkzeuge/einzeldateien.py` erzeugt und nie von Hand geändert (siehe PRINZIPIEN.md).

**Umstieg vom alten Ordnernamen `excel-trainer`:** Der Ordner heißt jetzt `vibe-learning`. Bei einer Installation im Benutzerordner PocketBase beenden, `mv ~/excel-trainer ~/vibe-learning`, dann wie oben `pb_hooks`, `pb_migrations` und `pb_public` ersetzen und neu starten; `pb_data` wandert mit und bleibt erhalten. Läuft der Dienst unter `/srv/excel-trainer`, kann alles so bleiben, wie es ist: Name von Ordner, Dienst und Systembenutzer spielt für die Seite keine Rolle. In diesem Fall in den Befehlen dieser Anleitung `vibe-learning` durch `excel-trainer` ersetzen.

**Webseiten aktualisieren** (z. B. neue Version eines Trainers): einfach die Datei in `/srv/vibe-learning/pb_public/` ersetzen. Ein Neustart ist nicht nötig.

```bash
sudo cp neue/und-oder.html /srv/vibe-learning/pb_public/excel/
sudo chown -R vibe-learning:vibe-learning /srv/vibe-learning/pb_public
```

> Ändert sich bei einem Trainer die **Anzahl oder Reihenfolge der Schritte bzw. Aufgaben**, passt der gespeicherte Fortschritt nicht mehr genau dazu. Größere Umbauten deshalb am besten zwischen zwei Themen machen.

---

## 9. Sicherheit und Datenschutz

**Schon eingestellt** (durch die Datei in `pb_migrations`):
- Schüler kommen nur über die Trainer-Schnittstellen an ihre **eigenen** Daten, Lehrkräfte nur an ihre eigenen Klassen. Alle Tabellen sind direkt nur für den Superuser zugänglich. Passwörter von Schülern und Lehrkräften werden nur verschlüsselt (bcrypt) gespeichert.
- Begrenzung der Anfragen pro IP-Adresse gegen massenhaftes Durchprobieren von Codes. Die Grenzen sind bewusst großzügig, weil eine ganze Klasse oft über **eine** Schul-IP ins Netz geht.
- Server-Protokolle werden nur 7 Tage aufbewahrt, **ohne IP-Adressen**. Ändern unter `/_/` → *Logs* → Zahnrad (Einstellungen).

**Empfohlen:**
- **Langes Superuser-Passwort.** Optional lässt sich eine Zwei-Faktor-Anmeldung einrichten: `/_/` → Collection `_superusers` → Zahnrad → Optionen *OTP* und *MFA*. Dafür muss unter *Settings* → *Mail settings* der E-Mail-Versand eingerichtet sein.
- Die Verwaltung `/_/` ist bei Variante B aus dem Internet erreichbar. Wenn du immer aus demselben Netz arbeitest, kannst du Superuser-Anmeldungen auf bestimmte IP-Adressen beschränken:

  ```bash
  sudo -u vibe-learning pocketbase superuser ips 203.0.113.10 --dir /srv/vibe-learning/pb_data
  ```

**Datenschutz:**
- Auf dem Server liegen **keine Namen**: nur Codes bzw. Benutzernamen, Klassenbezeichnung, Fortschritt und Zeitstempel der gelösten Aufgaben. Die Zuordnung zu echten Namen hast nur du. Das gilt nur, solange die Benutzernamen keine echten Namen enthalten.
- Das sind trotzdem **pseudonyme** (keine anonymen) Daten, weil du sie zuordnen kannst. Stimme den Einsatz deshalb vorher kurz mit dem **Datenschutzbeauftragten deiner Schule** ab. Bei Variante B mit gemietetem Server braucht es außerdem einen Vertrag zur Auftragsverarbeitung mit dem Hoster. Seriöse deutsche Hoster bieten den als Standard an.
- Informiere die Schüler (und ggf. Eltern), was gespeichert wird: welche Aufgaben wann gelöst wurden, nicht wie lange jemand auf der Seite war und keine falschen Versuche.

**Grenze der Kontrolle:** Ob eine Aufgabe richtig ist, prüft der Browser. Technisch versierte Schüler könnten über die Entwicklerwerkzeuge „gelöst“ melden. Auffällig wäre das an den Zeitstempeln, z. B. 30 Lösungen in einer Minute. Für Hausaufgaben-Kontrolle halte ich das für vertretbar, für Noten nicht.

---

## 10. Fehlersuche

| Problem | Ursache / Lösung |
|---|---|
| Startseite zeigt „404“ | `--publicDir` fehlt oder zeigt auf den falschen Ordner. |
| Trainer zeigt keine Anmeldung | Seite wurde nicht über den Server geöffnet (z. B. als Datei), oder `sync.js` fehlt in `pb_public`. Die Trainer liegen in Unterordnern und laden `../sync.js`. |
| „Diesen Code oder Benutzernamen gibt es nicht“ | Tippfehler (Groß-/Kleinschreibung ist egal), Zugang gesperrt oder gelöscht. |
| Verwaltung: „Anmeldung abgelaufen“ | Neu anmelden. Nach einer Passwortänderung durch den Admin sind Lehrkräfte überall abgemeldet. |
| Codes erzeugen meldet „not found“ | Nach dem Austauschen von `pb_hooks` PocketBase einmal von Hand neu starten. |
| Dienst startet nicht | `journalctl -u vibe-learning -n 50` ansehen. Häufig: falscher Pfad zu `pocketbase` in `ExecStart`, oder `pb_data` gehört nicht dem Benutzer `vibe-learning` (`sudo chown -R vibe-learning:vibe-learning /srv/vibe-learning`). |
| Fehler in `pb_hooks` nach PocketBase-Update | Die Schnittstelle für Erweiterungen hat sich geändert. Die vor dem Update gesicherte Programmdatei wieder verwenden (siehe Schritt 8) und ggf. das Backup zurückspielen. Melde dich dann mit der Fehlermeldung aus `journalctl`. |
| HTTPS-Zertifikat wird nicht ausgestellt | Domain zeigt nicht auf die richtige IP, Ports 80/443 nicht weitergeleitet, oder kein öffentliches IPv4 (DS-Lite). |

---

## 11. Anpassen

- **Link zur Verwaltung im Menü:** in `pb_public/sync.js` oben bei `verwaltung`.
- **Neues Tool hinzufügen** (z. B. eine Python-Übung):
  1. Die HTML-Datei in den Ordner des Bereichs legen, z. B. `pb_public/python/schleifen.html`.
  2. Im `<html>`-Tag ein eindeutiges Kürzel setzen: `<html lang="de" data-trainer="py-schleifen">` (nur Kleinbuchstaben, Ziffern und `-`, höchstens 20 Zeichen; später nicht mehr ändern, sonst passt der gespeicherte Fortschritt nicht mehr).
  3. Im `<head>` einbinden:
     ```html
     <script src="../katalog.js"></script>
     <script src="../nav.js"></script>
     <script src="../sync.js"></script>
     ```
  4. Bei Änderungen am gespeicherten Stand `TrainerSync.changed()` aufrufen, bei gelösten Aufgaben `TrainerSync.event({modus, stufe, aufgabe, titel, gesamt, erstmals})`. Gespeichert wird alles im `localStorage`, dessen Schlüssel mit dem Kürzel und `-` beginnen (z. B. `py-schleifen-stand`). `modus` ist `erarbeitung`, `uebungen` oder `endlos`.
  5. Das Tool in `pb_public/katalog.js` beim passenden Bereich eintragen. Menüleiste, Startseite, Bereichsseite und Lehrerbereich übernehmen es von dort. Am Server muss nichts geändert werden.
- **Neuen Bereich anlegen:** in `katalog.js` einen Eintrag bei `bereiche` ergänzen (mit `farbe`/`farbeHell` als Akzentfarbe, siehe Kommentar dort) und einen gleichnamigen Ordner mit einer `index.html` anlegen (am einfachsten `python/index.html` kopieren und dort `data-bereich` anpassen).
- **Name der Plattform:** in `katalog.js` bei `name` und `untertitel`.
