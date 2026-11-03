#!/usr/bin/env python3
"""Erzeugt aus jeder Übung eine eigenständige HTML-Datei (alles eingebettet).

Aufruf im Ordner vibe-learning:  python3 werkzeuge/einzeldateien.py
Ergebnis: standalone/<bereich>/<datei>.html, gleiche Ordner wie auf der Webseite, z. B. standalone/excel/wenn.html

Eingebettet wird jede lokale Datei aus <script src="…"> und <link rel="stylesheet" href="…">.
Vorne kommt window.PF_EINZELDATEI = true dazu: nav.js zeigt dann kein Menü,
sync.js keine Anmeldung, der Fortschritt bleibt im Browser.
Die Dateien in standalone/ nie von Hand ändern, sondern dieses Skript neu laufen lassen.
"""
import pathlib, re, shutil, sys

WURZEL = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = WURZEL / "pb_public"
ZIEL = WURZEL / "standalone"
BEREICHE = ("excel", "python", "datenbanken", "tools")

# Ein Durchgang für beide, damit Text in schon eingebetteten Dateien (z. B. Beispiele
# in Kommentaren) nicht noch einmal ersetzt wird.
EINBINDEN = re.compile(r'<script\s+src="([^"]+)"\s*>\s*</script>|<link\s+rel="stylesheet"\s+href="([^"]+)"\s*/?>')


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
        url = m.group(1) or m.group(2)
        code = lokal(seite, url)
        if code is None:
            return m.group(0)
        if m.group(1):
            return f"<script>/* {url} */\n" + code.replace("</script", "<\\/script") + "\n</script>"
        return f"<style>/* {url} */\n" + code.replace("</style", "<\\/style") + "\n</style>"

    html = EINBINDEN.sub(ersetzen, html)
    return re.sub(r"<head>", "<head>\n<script>window.PF_EINZELDATEI = true;</script>", html, count=1)


def main():
    if ZIEL.exists():
        shutil.rmtree(ZIEL)
    ZIEL.mkdir()
    for bereich in BEREICHE:
        for seite in sorted((PUBLIC / bereich).glob("*.html")):
            if seite.name == "index.html":
                continue
            text = seite.read_text(encoding="utf-8")
            if 'http-equiv="refresh"' in text:          # Weiterleitung, keine Übung
                continue
            ziel = ZIEL / bereich / seite.name
            ziel.parent.mkdir(exist_ok=True)
            ziel.write_text(einbetten(seite), encoding="utf-8")
            print(f"{ziel.relative_to(WURZEL)}  ({ziel.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
