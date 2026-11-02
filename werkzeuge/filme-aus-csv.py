#!/usr/bin/env python3
"""Erzeugt pb_public/datenbanken/filme.js aus einem IMDb-Export (Bewertungen.csv).

Aufruf im Hauptordner des Repos:  python3 werkzeuge/filme-aus-csv.py PFAD/Bewertungen.csv
Die id zählt nach dem Bewertungsdatum (älteste zuerst). Feldnamen und Datentypen stehen unten in FELDER.
"""
import csv, json, pathlib, sys

WURZEL = pathlib.Path(__file__).resolve().parent.parent
ZIEL = WURZEL / "pb_public" / "datenbanken" / "filme.js"
FELDER = [
    ("id", "INTEGER PRIMARY KEY", "Zahl", "laufende Nummer (Primärschlüssel)"),
    ("titel", "TEXT", "Text", "deutscher Titel"),
    ("originaltitel", "TEXT", "Text", "Titel in der Originalsprache"),
    ("art", "TEXT", "Text", "Film, Fernsehserie, Miniserie, Kurzfilm oder Video"),
    ("jahr", "INTEGER", "Zahl", "Erscheinungsjahr (bei Serien: Jahr der ersten Folge)"),
    ("laufzeit", "INTEGER", "Zahl", "Länge in Minuten (bei Serien: eine Folge)"),
    ("genres", "TEXT", "Text", "ein oder mehrere Genres, mit Komma getrennt"),
    ("regie", "TEXT", "Text", "Regisseur bzw. Regisseure (bei Serien meist leer)"),
    ("imdb_bewertung", "REAL", "Kommazahl", "Durchschnitt der Bewertungen auf IMDb (1 bis 10)"),
    ("eigene_bewertung", "INTEGER", "Zahl", "Bewertung von Herrn Maier (1 bis 10)"),
    ("gesehen_am", "DATE", "Datum", "Tag, an dem Herr Maier den Eintrag bewertet hat (JJJJ-MM-TT)"),
]
KOPF = '''/* filme.js – Tabelle „filme“: {n} Filme und Serien, die Herr Maier auf IMDb bewertet hat
 *
 * Daten für Datenbank-Übungen. abfragen.js baut daraus die SQLite-Tabelle im Browser.
 *   DB_FILME = {{name, felder:[{{n, typ, art, d}}], zeilen:[[…], …]}}
 *   n = Spaltenname, typ = SQL-Datentyp, art = Anzeige für Schüler, d = Beschreibung
 * Erzeugt mit werkzeuge/filme-aus-csv.py aus dem IMDb-Export, nicht von Hand ändern.
 */
'''


def liste(text):
    return ", ".join(t.strip() for t in text.split(",") if t.strip())


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    daten = list(csv.DictReader(open(sys.argv[1], encoding="utf-8")))
    daten.sort(key=lambda x: (x["Date Rated"], x["Const"]))
    zeilen = [[i, x["Title"], x["Original Title"], x["Title Type"], int(x["Year"]), int(x["Runtime (mins)"]),
               liste(x["Genres"]), liste(x["Directors"]) or None, float(x["IMDb Rating"]), int(x["Your Rating"]), x["Date Rated"]]
              for i, x in enumerate(daten, 1)]
    felder = ",\n".join("    " + json.dumps(dict(n=n, typ=t, art=a, d=d), ensure_ascii=False) for n, t, a, d in FELDER)
    zeilen_js = ",\n".join("    " + json.dumps(z, ensure_ascii=False) for z in zeilen)
    ZIEL.write_text(KOPF.format(n=len(zeilen)) + f'window.DB_FILME = {{\n  name: "filme",\n  felder: [\n{felder}\n  ],\n  zeilen: [\n{zeilen_js}\n  ]\n}};\n', encoding="utf-8")
    print(f"{ZIEL.relative_to(WURZEL)}: {len(zeilen)} Einträge")


if __name__ == "__main__":
    main()
