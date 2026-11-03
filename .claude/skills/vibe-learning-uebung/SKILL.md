---
name: vibe-learning-uebung
description: Neue Übungsseite für die Plattform „vibe learning“ (Excel, Python, Datenbanken, Logische Schaltungen) bauen, passend zu Bibliotheken, Katalog und Speicherung.
---

# Neue Übung für vibe learning

Diese Datei wird von `werkzeuge/skill-bauen.py` aus den Kopfkommentaren der Bibliotheken erzeugt. Nicht von Hand ändern, sondern Bibliothek oder Vorlage anpassen und neu bauen.

## Ergebnis

- Eine HTML-Datei für `pb_public/<bereich>/`, z. B. `pb_public/excel/sverweis.html`.
- Die Zeile für `katalog.js` (Tool-Eintrag im passenden Bereich).
- Ein Satz, was getestet wurde: Seite mit `python3 -m http.server` im Ordner `pb_public` (ohne Server) bzw. mit `pocketbase serve` (mit Anmeldung) öffnen und durchspielen. Wurde nicht im Browser getestet, das klar sagen.

## Regeln (aus PRINZIPIEN.md)

1. Gemeinsamer Code steht in Bibliotheken. Was die Bibliothek des Bereichs kann, wird benutzt und nicht neu geschrieben.
2. Die Seite enthält nur ihr Eigenes. Aufgaben und Level stehen möglichst als Daten in der Seite.
3. Neue Funktionen kommen erst in die Bibliothek, wenn mindestens zwei Seiten sie gleich brauchen. Dann auch den Kopfkommentar der Bibliothek ergänzen.
4. Kein Build-Schritt, keine Module, keine externen Adressen. Die Seite muss auch per Doppelklick (file://) laufen.
5. Einzeldateien erzeugt `werkzeuge/einzeldateien.py`. Nie eine Einzeldatei von Hand bauen.

## Gerüst jeder Übungsseite

```html
<!doctype html>
<html lang="de" data-trainer="TOOL-ID">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Titel – vibe learning</title>
<script src="../katalog.js"></script>
<script src="../nav.js"></script>
<script src="../sync.js"></script>
<script>
(function(){var t=null;try{t=localStorage.getItem('wenn-theme');}catch(e){}
document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');})();
</script>
<!-- danach: Bibliothek des Bereichs (siehe unten) -->
</head>
```

- Die Tool-id (kurz, a–z, 0–9, -) steht in `data-trainer` und in `katalog.js`. Sie wird nie mehr geändert, sonst ist der Fortschritt weg.
- Alles, was im localStorage gespeichert wird, beginnt mit `TOOL-ID-`. Nur dann wird es mit dem Server abgeglichen.
- Nach jeder Änderung am gespeicherten Stand `window.TrainerSync && TrainerSync.changed()`, nach jeder gelösten Aufgabe `TrainerSync.event({...})` (Felder siehe sync.js unten bzw. die Bereichsbibliothek).
- Farben nur über die CSS-Variablen (Nord-Schema, hell und dunkel), nie fest eintragen. Die Akzentfarbe `--accent` setzt nav.js aus `katalog.js`.
- Hell/Dunkel-Knopf heißt `#themeBtn`; fehlt er, legt nav.js einen in die Leiste.

Farbvariablen (aus seite.css):

```css
:root{--bg:#e5e9f0;--panel:#f6f8fb;--panel2:#eceff4;--text:#2e3440;--muted:#5b6578;--border:#cdd3de;--slot:#e5e9f0;--slot-border:#a7b1c2;--accent:#5e81ac;--then:#5e8a45;--else:#a8434d;--err:#a8434d;--mono:ui-monospace,Consolas,"Liberation Mono",monospace}
[data-theme=dark]{--bg:#2e3440;--panel:#3b4252;--panel2:#434c5e;--text:#eceff4;--muted:#a9b3c4;--border:#4c566a;--slot:#434c5e;--slot-border:#616e88;--accent:#88c0d0;--then:#a3be8c;--else:#bf616a;--err:#d4848b}
```

## Bibliotheken

### katalog.js – Inhaltsverzeichnis: hier wird jede Übung eingetragen

```text
Inhaltsverzeichnis der Übungsplattform

Das ist die einzige Stelle, an der ein neues Tool eingetragen werden muss.
Menüleiste, Startseite, Bereichsseiten, Speichern und Lehrerbereich lesen von hier.

Bereich:  id      = Name des Unterordners in pb_public (nur a–z, 0–9, -)
          titel   = Text in der Menüleiste
          farbe   = Akzentfarbe im dunklen Design (Nord-Farben, nordtheme.com),
          farbeHell = dunklerer Ton derselben Farbe für das helle Design (sonst schlecht lesbar)
          farbeSchrift = optional: hellerer Ton für Schrift im dunklen Design, wenn farbe dort zu wenig Kontrast hat
          Ohne farbe bekommt der Bereich das neutrale Nord-Blau.
Tool:     id      = Kürzel für Speicherstand und Auswertung (nie mehr ändern,
                    sonst geht der gespeicherte Fortschritt verloren)
          datei   = HTML-Datei im Ordner des Bereichs
          titel, text = Anzeige im Menü und auf den Übersichtsseiten
          stufen  = Stufen der Übungen für die Auswertung (lehrer.html): Anzahl oder Liste
                    mit Kurznamen, wenn die Nummern allein missverständlich wären

In der HTML-Datei eines Tools steht dieselbe id: <html lang="de" data-trainer="…">
```

### sync.js – Anmeldung und Speichern

```text
vibe learning – Anmeldung und Anbindung an PocketBase

Läuft die Seite über den PocketBase-Server, erscheint beim ersten Öffnen ein
Anmeldefenster: ein Feld für Code oder Benutzername (bei Benutzernamen folgt das
Passwort), alternativ „Seite ohne Anmeldung nutzen“. Oben rechts in der Leiste
steht danach, wer angemeldet ist; dort meldet man sich auch an und ab.

Schüler: Fortschritt wird auf dem Server gespeichert, jede gelöste Aufgabe protokolliert.
Lehrkraft/Admin: Anmeldung gilt bis zum Schließen des Browsers, im Menü steht
der Link zur Verwaltung (lehrer.html).
Wird die HTML-Datei direkt geöffnet (oder läuft kein PocketBase dahinter),
passiert nichts davon – die Seite speichert dann wie bisher nur im Browser.

Die Seite ruft auf:
  TrainerSync.changed()      nach jeder Änderung am gespeicherten Stand
  TrainerSync.event({...})   wenn eine Aufgabe richtig gelöst wurde
```

### excel/basis.js – Excel: Grundlage aller Excel-Übungen (dazu basis.css)

```text
basis.js – gemeinsamer Kern aller Excel-Trainer (wenn, und-oder, funktionen, bezuege)

Einbinden (nach dem Markup, vor den eigenen <script>s), dazu genau eine Ergänzung je Seitenart:
  Formeln aus Bausteinen (wenn, und-oder):   basis.css + bausteine.css, basis.js + bausteine.js
  Tabellenblatt (funktionen, bezuege):       basis.css + tabelle.css,   basis.js + tabelle.js
Alles sind globale Namen, kein Build-Schritt, läuft auch per file://.

API
  $, esc, rand, clamp, rng, shuffle, pick1, ri, C, B, normQuotes, FErr   Helfer und Zufall
  store(k, v), load(k)       localStorage unter KEY + k; store meldet TrainerSync.changed()
  isSolved(i), markSolved()  gelöste Übung je Stufe (solved[level])
  countSolved()              zählt eine gelöste Übung bzw. Endlos-Aufgabe (Serie, Rekord), → „erstmals“
  skipTask()                 Endlos: andere Aufgabe, Serie auf 0
  renderHeader()             Flammen (Stufen 1 … solange LEVELS[n] existiert), Modusknöpfe, Theme-Symbol
  navPfad(), navLernen(idx, n, info)   Knöpfe Prüfen/Zurücksetzen/Zurück/Weiter je Modus
  dockHTML(groups)           Dock für Übungen/Endlos; groups = Gruppennamen (Gruppe = letztes STD-Feld)
  navClick(e)                Flammen, Modi, Aufgabenwahl, Dock – am Ende des Klick-Handlers aufrufen
  Drag & Drop (Maus/Touch)   Ziehen, Ablageziel hervorheben, Einfügemarke in Zeilen (.iw)
  AC                         Autovervollständigung wie in Excel für Eingaben mit Klasse .acin
  Verdrahtet: #themeBtn, #checkBtn → check(), #nextBtn → nextTask(), #skipBtn → skipTask(),
  Escape schließt die Aufgabenwahl.

Die Seite (bzw. bausteine.js/tabelle.js) liefert
  KEY, LEVELS, STD; let mode, level, pfadIdx, solved, streak, best, endCounted, pickerOpen
  check, loadTask, setLevel, setMode, gotoTask, canNext, nextTask, newEndless, renderDock
  Drag-Hooks: dragData(b, e) → Zusatzfelder für D (src:true = Quelle blass) oder null;
    dropOk(t); applyDrop(d, type, idx, t); dragTap(d) bei Klick ohne Ziehen; optional dragGhost(g)
  AC_FN = [{n, v | a, d}]; optional AC.word(before, inp) → getipptes Wort oder null

Gerüst einer Seite
  <link rel="stylesheet" href="basis.css"><link rel="stylesheet" href="tabelle.css"> … Markup
  <script src="basis.js"></script><script src="tabelle.js"></script>
  <script>
    const KEY = 'xy-', LEVELS = [null, {name:'…'}], STD = [[…, 1]];
    let mode = load('mode') || 'pfad', level = 1, pfadIdx = 0, solved = {}, streak = 0,
        best = 0, endCounted = false, pickerOpen = false, …;
    function check(){ … logSolved(countSolved()); … }   function loadTask(){ … }  …
    if (mode === 'endlos') newEndless();
    loadTask();
  </script>
```

### excel/bausteine.js – Excel: Formeln aus Bausteinen (wie WENN, UND/ODER; dazu bausteine.css)

```text
bausteine.js – Ergänzung zu basis.js für Trainer, die Formeln aus Bausteinen bauen (wenn, und-oder)
Laden nach basis.js; dazu bausteine.css nach basis.css.

API
  SEP, CELL, OPS, rank, cmp, opTest, same, fmtNum, fmtVal   Vergleich und Ausgabe nach Excel-Regeln
  fx, pickV, SUBJ, DAYS, stripQ                             Aufgabentexte
  setLevel(n), newEndless(), gotoTask(i)                    Stufe wechseln, Endlos-Szenario, Übung wählen
  role, isPlaced, renderFeedback, clearMarks, updateTip     Darstellung (S.slots, S.row, S.fb, #fb, #workcard)
  dragData, dragKind, dropOk, dragTap, shiftPlace           Drag-Hooks für basis.js, Shift+Klick setzt ein
  AC_FN                                                     Funktionsliste der Autovervollständigung

Die Seite liefert
  SCEN, setup(), accepts(target, kind), applyDrop(d, type, idx, t), renderGrid(),
  let endScen, endSeed, poolSeed, CUR, S = {items, slots, row, fb, success, result, …}
  außerdem für basis.js: setMode, canNext, nextTask, renderNav, renderDock (Pfad/Endlos über dockHTML())
```

### excel/tabelle.js – Excel: Tabellen-Übungen mit Rechenkern (wie Funktionen, Bezüge; dazu tabelle.css)

```text
tabelle.js – Ergänzung zu basis.js für Trainer mit Tabellenblatt (funktionen, bezuege)
Laden nach basis.js; dazu tabelle.css nach basis.css.

API
  Rechenwerk: FUNCS, FDESC, GOAL, ALIAS, ENGLISH, CELLRE, colN, colL, addr, ad, normRef, rangeCells,
    normRange, tokenize, parseFormula, refsOf, cellsOfRefs, fnsOf, numsOf, topCall, refsInText,
    E, toNum, evalAst, callFn, parseCached, Sheet(cells).val(a), same, fmtNum, fmtVal(v, 'eur'|'usd'|'pct')
  Erklärung (learn = {topic, prog:{id:{idx, done}}}): topic, prog, saveLearn, stepDone, markStep,
    firstOpen, stepUnlocked, curStep, gotoStep, openTopic, overview
  setMode, gotoTask, canNext, nextTask, renderNav, renderDock, renderOverview(introHtml),
  renderFeedback, renderChoice(st), checkChoice(), hint(msg)
  topicClick(e)   Antworten, Themen, Schritte, Übersicht, dann navClick – am Ende des Klick-Handlers
  caret, setCaret, focusInp, applyPT, cellAt, endPT, gridEl, trackCaret   Bezüge mit der Maus einfügen
  Verdrahtet: #ovBtn, #prevBtn, #resetBtn, Eingabe in .pin → syncInput, Maus-Ende im #grid

Die Seite liefert
  TOPICS, GROUPS, AC_FN; let learn, endPick, CUR, S, LS, PT
  render, resetS, loadStep, newEndless, setLevel, clearMarks, syncInput(inp, keepSel), logSolved
```

### python/lib/pykurs.js – Geführte Python-Übungen

```text
vibe learning – geführte Python-Übungen mit automatischer Prüfung

Eine Übungsseite (z. B. bedingungen.html) legt window.PYKURS an und bindet danach
codemirror.min.js, skulpt.min.js, skulpt-stdlib.js und diese Datei ein.

PYKURS = {
  id:     'pyif',                  Tool-id aus katalog.js (Speicherstand, Auswertung)
  titel:  'Bedingte Anweisung',
  logo:   'if',                    kurzer Text im Logo
  aufgaben: [{
    titel, stufe (1 einfach, 2 mittel, 3 schwer),
    wissen:   HTML mit Erklärung; <pre class="py">…</pre> wird farbig dargestellt
              und bekommt einen Knopf „Beispiel ausprobieren“
    auftrag:  HTML mit der Aufgabe (genaue Ausgabetexte nennen!)
    start:    Startcode im Editor
    tipps:    ['…', '…']           werden nacheinander aufgedeckt
    tests:    [{ein: ['5'], aus: ['positiv']}]
              ein = Eingaben für input() der Reihe nach
              aus = erwartete letzte Ausgabezeilen; davor darf noch etwas stehen
              zahl: true → es reicht, wenn die Zahl aus aus[0] in der letzten Zeile steht
    muss:     [{re: /…/m, text: 'Meldung, wenn das Muster fehlt'}]   geprüft im Code ohne Kommentare/Texte
    nicht:    [{re: /…/,  text: 'Meldung, wenn das Muster vorkommt'}]
  }]
}

Verglichen wird ohne Groß-/Kleinschreibung, Satzzeichen und doppelte Leerzeichen,
ä/ö/ü/ß zählen wie ae/oe/ue/ss. Texte in input("…") gehören nicht zur Ausgabe.
```

### datenbanken/abfragen.js – Datenbanken: SQL-Abfragen mit Entwurfsansicht und Editor (dazu abfragen.css)

```text
abfragen.js – SQL-Abfragen üben: Entwurf, Blöcke, Access-Entwurfsansicht, SQL-Editor

Läuft komplett im Browser (SQLite über sql.js), auch per file://. Nutzt Kopfzeile, Stufen,
Modi und Dock aus ../excel/basis.js. Einbinden am Ende von <body>, in dieser Reihenfolge:
  <link> ../python/lib/codemirror.css, lib/show-hint.min.css, ../excel/basis.css, abfragen.css
  <script> filme.js (Daten), lib/sql-asm.js, ../python/lib/codemirror.min.js, lib/show-hint.min.js,
           ../excel/basis.js, dann window.SQLKURS = {…}, dann abfragen.js
Markup der Seite: wie abfragen.html (Kopfzeile, #tasktext, #work, #fb, #ergebnis, #dock, Knöpfe).

SQLKURS = {
  id:      'sql'                 Tool-id aus katalog.js (Speicherstand: id + '-…')
  tabelle: DB_FILME              {name, felder:[{n, typ, art, d}], zeilen:[[…]]}
  stufen:  [null, {name, ui}]    ui: 'block'  Felder anklicken, eine Bedingung als Baustein
                                     'baum'   Felder anklicken, Bedingung aus Blöcken (AND/OR verschachtelt)
                                     'text'   Felder anklicken, Bedingung eintippen
                                     'sql'    SQL-Editor; vorlage: 'erklaert' | 'geruest' | 'leer'
                                     'access' Access-Entwurf (Feld, Sortierung, Anzeigen, Kriterien/oder);
                                              krit: 'bloecke' nur die nötigen Kriterien (mit Feldname),
                                              'falsch' dazu falsche, 'text' selbst eintippen (Access-Schreibweise)
  ansichten: {access:{name, stufen}, sql:{name, stufen}}   statt stufen: Umschalter in der Kopfzeile
           (Knöpfe mit data-ansicht="…"); Stufe, Fortschritt und Modus je Ansicht getrennt (id-ansicht-…).
           An den Server wird die Stufe durchgezählt gemeldet (Access 1–3, dann SQL 4–8),
           passend zu stufen in katalog.js
  kalender:{tage:['Montag', …]}  Aufgabenwahl als Kalender (Wochen × Tage) statt Nummern
  aufgaben:[{frage, felder:['titel', …] oder ['*'], where?:"jahr < 1970", sort?:'jahr DESC', tipp?,
            auch?:["…"] gleichwertige Bedingungen, die ebenfalls als richtig zählen}]
  endlos:  [(r, Z) => Aufgabe]   r = Zufall, Z = {pick1, ri, liste(sql) → erste Spalte aller Zeilen}
           Ergebnis mit 1 bis 80 Zeilen wird genommen, sonst neu gewürfelt.
  intro:   HTML über der Abfrage, nur ohne aufgaben
}
Ohne aufgaben: freie Abfragen (wie filmdatenbank.html). Kein Prüfen, keine Modi, kein Dock;
die Knöpfe #checkBtn, #nextBtn, #skipBtn, #prevBtn braucht basis.js trotzdem (hidden).
Beim Stufenwechsel wird die bisherige Abfrage in den SQL-Editor übernommen,
leere WHERE- oder ORDER-BY-Zeilen des Gerüsts werden beim Ausführen ignoriert.
Geprüft wird über das Ergebnis: gleiche Spalten (Reihenfolge egal), gleiche Zeilen,
bei sort gleiche Reihenfolge der Sortierspalte. Fehler werden vor dem Ausführen
selbst gesucht und auf Deutsch erklärt; SQLite-Meldungen nur als Rückfall übersetzt.
Tasten: Strg+Enter führt aus, Strg+Shift+Enter prüft; Autovervollständigung beim Tippen.
```

### datenbanken/filme.js – Datenbanken: Tabelle filme als Daten

```text
filme.js – Tabelle „filme“: 888 Filme und Serien von Herrn Maier (484 bewertet, 404 auf der Merkliste)

Daten für Datenbank-Übungen. abfragen.js baut daraus die SQLite-Tabelle im Browser.
  DB_FILME = {name, felder:[{n, typ, art, d}], zeilen:[[…], …]}
  n = Spaltenname, typ = SQL-Datentyp, art = Anzeige für Schüler, d = Beschreibung
Erzeugt mit werkzeuge/filme-aus-csv.py aus dem IMDb-Export, nicht von Hand ändern.
```
