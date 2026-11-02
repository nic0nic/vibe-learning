#!/usr/bin/env python3
"""Erzeugt pb_public/datenbanken/filme.js aus IMDb-Exporten: Bewertungen und optional Merkliste.

Aufruf im Hauptordner des Repos:
  python3 werkzeuge/filme-aus-csv.py PFAD/Bewertungen.csv [PFAD/Watchlist.csv]
Einträge der Merkliste, die schon bewertet sind, kommen nur einmal vor. Die übrigen haben
keine eigene Bewertung und kein Datum (= noch nicht gesehen).
Die id zählt erst die bewerteten Einträge nach Datum, dann die Merkliste in ihrer Reihenfolge.
Feldnamen und Datentypen stehen unten in FELDER.
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
    ("eigene_bewertung", "INTEGER", "Zahl", "Bewertung von Herrn Maier (1 bis 10), leer = noch nicht gesehen"),
    ("gesehen_am", "DATE", "Datum", "Tag, an dem Herr Maier den Eintrag bewertet hat (JJJJ-MM-TT), leer = noch nicht gesehen"),
]
KOPF = '''/* filme.js – Tabelle „filme“: {n} Filme und Serien von Herrn Maier ({b} bewertet, {m} auf der Merkliste)
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
    if len(sys.argv) not in (2, 3):
        sys.exit(__doc__)
    daten = list(csv.DictReader(open(sys.argv[1], encoding="utf-8")))
    daten.sort(key=lambda x: (x["Date Rated"], x["Const"]))
    bewertet = {x["Const"] for x in daten}
    merk = []
    if len(sys.argv) == 3:
        merk = [x for x in csv.DictReader(open(sys.argv[2], encoding="utf-8")) if x["Const"] not in bewertet]
        merk.sort(key=lambda x: int(x["Position"]))
        for x in merk:
            x["Your Rating"] = x["Date Rated"] = ""
    b = len(daten)
    daten += merk
    zeilen = [[i, x["Title"], x["Original Title"], x["Title Type"], int(x["Year"]), int(x["Runtime (mins)"]),
               liste(x["Genres"]), liste(x["Directors"]) or None, float(x["IMDb Rating"]),
               int(x["Your Rating"]) if x["Your Rating"] else None, x["Date Rated"] or None]
              for i, x in enumerate(daten, 1)]
    felder = ",\n".join("    " + json.dumps(dict(n=n, typ=t, art=a, d=d), ensure_ascii=False) for n, t, a, d in FELDER)
    zeilen_js = ",\n".join("    " + json.dumps(z, ensure_ascii=False) for z in zeilen)
    ZIEL.write_text(KOPF.format(n=len(zeilen), b=b, m=len(merk)) + f'window.DB_FILME = {{\n  name: "filme",\n  felder: [\n{felder}\n  ],\n  zeilen: [\n{zeilen_js}\n  ]\n}};\n', encoding="utf-8")
    print(f"{ZIEL.relative_to(WURZEL)}: {len(zeilen)} Einträge ({b} bewertet, {len(merk)} Merkliste)")


if __name__ == "__main__":
    main()
