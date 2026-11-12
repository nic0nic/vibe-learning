#!/usr/bin/env python3
"""Erzeugt aus jeder Übung ein SCORM-Paket für die ByCS-Lernplattform (Moodle, Aktivität „Lernpaket“).

Aufruf im Ordner vibe-learning:  python3 werkzeuge/bycs-pakete.py            (SCORM 2004, 4. Ausgabe)
                                 python3 werkzeuge/bycs-pakete.py --scorm12   (SCORM 1.2)
SCORM 2004 ist Standard, weil SCORM 1.2 nur 4096 Zeichen Speicherstand erlaubt; das reicht für
die HTML-/Python-Kurse nicht, deren Code mitgespeichert wird. scorm.js kann beides.
Ergebnis: bycs/<Fach>/…/<datei>.zip, gleiche Ordner und Auswahl wie standalone/ (werkzeuge/einzeldateien.py).

Jedes Paket enthält index.html (die Einzeldatei, alles eingebettet) und imsmanifest.xml.
Anstelle von sync.js wird pb_public/scorm.js eingebettet: Es meldet Bewertung, Status und jede gelöste
Aufgabe an Moodle und speichert den Stand dort (cmi.suspend_data). Vorne kommt
window.PF_BYCS = {stufen: n} dazu (Stufen laut katalog.js, für die Prozentzahl).
Dasselbe Paket baut „Übung erstellen“ (IT/tools/uebung-erstellen.html) im Browser für selbst erstellte Übungen:
gleiches Manifest (pb_public/lib/scorm-manifest.xml), scorm.js über lib/seite.js (opt.bycs), ZIP mit lib/zip.js.
Die Dateien in bycs/ nie von Hand ändern, sondern dieses Skript neu laufen lassen.
"""
import html, os, pathlib, re, shutil, sys, zipfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import einzeldateien as ed  # noqa: E402

WURZEL = ed.WURZEL
PUBLIC = ed.PUBLIC
ZIEL = WURZEL / "bycs"
SCORM_JS = PUBLIC / "scorm.js"
ZEIT = (2026, 1, 1, 0, 0, 0)       # feste Zeit in den ZIPs: gleiche Übung → gleiche Datei


def stufen_aus_katalog():
    """Tool-id → Zahl der Stufen (katalog.js: stufen = Anzahl oder Liste)."""
    text = (PUBLIC / "katalog.js").read_text(encoding="utf-8")
    erg = {}
    for m in re.finditer(r"\{id:\s*'([a-z0-9-]+)'([^{}]*)\}", text):
        s = re.search(r"stufen:\s*(\d+|\[[^\]]*\])", m.group(2))
        if not s:
            continue
        wert = s.group(1)
        erg[m.group(1)] = int(wert) if wert.isdigit() else len(re.findall(r"'[^']*'", wert))
    return erg


def manifest(kennung, titel, v12):
    t = html.escape(titel, quote=True)
    if not v12:
        return MANIFEST_2004.read_text(encoding="utf-8").format(kennung=kennung, t=t)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="vibe-learning-{kennung}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org">
    <organization identifier="org">
      <title>{t}</title>
      <item identifier="item" identifierref="res" isvisible="true">
        <title>{t}</title>
        <adlcp:masteryscore>100</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>
"""


# Manifest SCORM 2004: gemeinsam mit „Übung erstellen“ (IT/tools/uebung-erstellen.html, Knopf „Für ByCS herunterladen“)
MANIFEST_2004 = PUBLIC / "lib" / "scorm-manifest.xml"


def paket(seite, stufen):
    scorm = SCORM_JS.read_text(encoding="utf-8")
    alt = ed.lokal

    def lokal(s, url):                        # sync.js durch scorm.js ersetzen, sonst wie Einzeldatei
        if url.split("/")[-1] == "sync.js":
            return scorm
        return alt(s, url)

    ed.lokal = lokal
    try:
        text = ed.einbetten(seite)
    finally:
        ed.lokal = alt
    if "window.TrainerSync = {changed, event, bycs: true" not in text:
        sys.exit(f"{seite.relative_to(PUBLIC)}: bindet sync.js nicht ein, scorm.js fehlt")
    kennung = re.search(r'data-trainer="([^"]*)"', text)
    kennung = kennung.group(1) if kennung else seite.stem
    cfg = "{stufen: %d}" % stufen.get(kennung, 0)
    text = text.replace("<script>window.PF_EINZELDATEI = true;</script>",
                        f"<script>window.PF_EINZELDATEI = true; window.PF_BYCS = {cfg};</script>", 1)
    titel = re.search(r"<title>(.*?)</title>", text, re.S)
    titel = html.unescape(titel.group(1).strip()) if titel else seite.stem
    titel = re.sub(r"\s*[–-]\s*vibe learning$", "", titel)
    return kennung, titel, text


def schreibe_zip(ziel, eintraege):
    with zipfile.ZipFile(ziel, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name, inhalt in eintraege:
            info = zipfile.ZipInfo(name, ZEIT)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, inhalt.encode("utf-8"))


def main():
    os.umask(0o002)   # gruppenbeschreibbar wie in einzeldateien.py
    v12 = "--scorm12" in sys.argv[1:]
    stufen = stufen_aus_katalog()
    if ZIEL.exists():
        shutil.rmtree(ZIEL)
    ZIEL.mkdir()
    for seite in ed.seiten():
        kennung, titel, text = paket(seite, stufen)
        ziel = (ZIEL / seite.relative_to(PUBLIC)).with_suffix(".zip")
        ziel.parent.mkdir(parents=True, exist_ok=True)
        schreibe_zip(ziel, [("imsmanifest.xml", manifest(kennung, titel, v12)), ("index.html", text)])
        print(f"{ziel.relative_to(WURZEL)}  ({ziel.stat().st_size // 1024} KB, {titel})")
    print("SCORM 1.2" if v12 else "SCORM 2004 (4. Ausgabe)")


if __name__ == "__main__":
    main()
