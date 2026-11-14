#!/usr/bin/env python3
"""Erzeugt aus jeder Übung eine eigenständige HTML-Datei (alles eingebettet).

Aufruf im Ordner vibe-learning:  python3 werkzeuge/einzeldateien.py
Ergebnis: standalone/<Fach>/…/<bereich>/<datei>.html, gleiche Ordner wie auf der Webseite,
z. B. standalone/IT/excel/wenn.html oder standalone/BWR/9II/anlagen/….
Alle HTML-Seiten in den Fachordnern außer index.html (Übersichten), Weiterleitungen,
IT/tippen/ (pockettype läuft nur mit Server) und Seiten mit <html … data-einzeldatei="nein">.

Eingebettet wird jede lokale Datei aus <script src="…"> und <link rel="stylesheet" href="…">.
Dateien, die eine Seite nur als Text braucht (z. B. Übung erstellen: Bibliotheken für die erzeugten Seiten),
stehen dort als <script type="application/json" data-einbetten="…"></script> und werden als JSON-Text
eingefüllt (in der Seite: JSON.parse(el.textContent)).
Vorne kommt window.PF_EINZELDATEI = true dazu: nav.js zeigt dann kein Menü,
sync.js keine Anmeldung, der Fortschritt bleibt im Browser.
Die Dateien in standalone/ nie von Hand ändern, sondern dieses Skript neu laufen lassen.
"""
import json, os, pathlib, re, shutil, sys

WURZEL = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = WURZEL / "pb_public"
ZIEL = WURZEL / "standalone"
FAECHER = ("IT", "BWR", "Englisch")     # Ordner in pb_public, siehe katalog.js
OHNE = ("IT/tippen",)                    # Ordner ohne Einzeldateien

# Ein Durchgang für beide, damit Text in schon eingebetteten Dateien (z. B. Beispiele
# in Kommentaren) nicht noch einmal ersetzt wird.
EINBINDEN = re.compile(r'<script\s+src="([^"]+)"\s*>\s*</script>|<link\s+rel="stylesheet"\s+href="([^"]+)"\s*/?>'
                       r'|<script\s+type="application/json"\s+data-einbetten="([^"]+)"\s*>\s*</script>')


def lokal(seite, url):
    if re.match(r"^[a-z]+:|^//", url):
        return None                                  # externe Adresse: bleibt ein Link
    pfad = (seite.parent / url).resolve()
    if not pfad.is_file():
        sys.exit(f"{seite.relative_to(PUBLIC)}: {url} nicht gefunden")
    return pfad.read_text(encoding="utf-8")


def einbetten(seite):
    html = seite.read_text(encoding="utf-8")

    def ersetzen(m):
        url = m.group(1) or m.group(2) or m.group(3)
        code = lokal(seite, url)
        if code is None:
            return m.group(0)
        if m.group(3):                                # als Text: JSON, jedes "<" als \u003c (kein </script, kein <!--)
            text = json.dumps(code, ensure_ascii=False).replace("<", "\\u003c")
            return f'<script type="application/json" data-einbetten="{url}">{text}</script>'
        if m.group(1):
            return f"<script>/* {url} */\n" + code.replace("</script", "<\\/script") + "\n</script>"
        return f"<style>/* {url} */\n" + code.replace("</style", "<\\/style") + "\n</style>"

    html = EINBINDEN.sub(ersetzen, html)
    return re.sub(r"<head>", "<head>\n<script>window.PF_EINZELDATEI = true;</script>", html, count=1)


def seiten():
    for fach in FAECHER:
        for seite in sorted((PUBLIC / fach).rglob("*.html")):
            rel = seite.relative_to(PUBLIC).as_posix()
            if seite.name == "index.html" or any(rel.startswith(o + "/") for o in OHNE) or "/lib/" in rel:
                continue
            text = seite.read_text(encoding="utf-8")
            if 'http-equiv="refresh"' in text or 'data-einzeldatei="nein"' in text:
                continue
            yield seite


def main():
    os.umask(0o002)   # neue Ordner und Dateien gruppenbeschreibbar: Lehrkraft und Claude arbeiten mit verschiedenen Konten
    if ZIEL.exists():
        shutil.rmtree(ZIEL)
    ZIEL.mkdir()
    for seite in seiten():
        ziel = ZIEL / seite.relative_to(PUBLIC)
        ziel.parent.mkdir(parents=True, exist_ok=True)
        ziel.write_text(einbetten(seite), encoding="utf-8")
        print(f"{ziel.relative_to(WURZEL)}  ({ziel.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
