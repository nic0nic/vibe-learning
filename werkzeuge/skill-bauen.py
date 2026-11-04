#!/usr/bin/env python3
"""Baut .claude/skills/vibe-learning-uebung/SKILL.md aus skill-vorlage.md und den Kopfkommentaren der Bibliotheken.

Aufruf im Hauptordner des Repos:  python3 werkzeuge/skill-bauen.py
Neue Bibliothek: unten in BIBLIOTHEKEN eintragen.
"""
import pathlib, re

WURZEL = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = WURZEL / "pb_public"
BIBLIOTHEKEN = [
    ("katalog.js", "Inhaltsverzeichnis: hier wird jede Übung eingetragen"),
    ("sync.js", "Anmeldung und Speichern"),
    ("IT/excel/basis.js", "Excel: Grundlage aller Excel-Übungen (dazu basis.css)"),
    ("IT/excel/bausteine.js", "Excel: Formeln aus Bausteinen (wie WENN, UND/ODER; dazu bausteine.css)"),
    ("IT/excel/tabelle.js", "Excel: Tabellen-Übungen mit Rechenkern (wie Funktionen, Bezüge; dazu tabelle.css)"),
    ("IT/python/lib/pykurs.js", "Geführte Python-Übungen"),
    ("IT/datenbanken/abfragen.js", "Datenbanken: SQL-Abfragen mit Entwurfsansicht und Editor (dazu abfragen.css)"),
    ("IT/datenbanken/filme.js", "Datenbanken: Tabelle filme als Daten"),
    ("IT/tools/struktogramm.js", "Tools: Struktogramme zeichnen und exportieren (dazu struktogramm.css)"),
]


def kopf(pfad):
    text = (PUBLIC / pfad).read_text(encoding="utf-8")
    m = re.match(r"\s*/\*(.*?)\*/", text, re.S)
    if not m:
        raise SystemExit(f"{pfad}: kein Kopfkommentar")
    zeilen = [re.sub(r"^ ?\* ?", "", z) for z in m.group(1).strip("\n").splitlines()]
    return "\n".join(zeilen).strip()


def main():
    vorlage = (WURZEL / "werkzeuge" / "skill-vorlage.md").read_text(encoding="utf-8")
    teile = [f"### {p} – {t}\n\n```text\n{kopf(p)}\n```" for p, t in BIBLIOTHEKEN if (PUBLIC / p).exists()]
    css = (PUBLIC / "seite.css").read_text(encoding="utf-8")
    vars_ = "\n".join(re.findall(r"^(?::root|\[data-theme=dark\])\{[^}]*\}", css, re.M))
    out = vorlage.replace("{{BIBLIOTHEKEN}}", "\n\n".join(teile)).replace("{{SEITE_CSS_VARS}}", vars_)
    ziel = WURZEL / ".claude" / "skills" / "vibe-learning-uebung" / "SKILL.md"
    ziel.parent.mkdir(parents=True, exist_ok=True)
    ziel.write_text(out, encoding="utf-8")
    print(f"{ziel.relative_to(WURZEL)}: {len(out.splitlines())} Zeilen")


if __name__ == "__main__":
    main()
