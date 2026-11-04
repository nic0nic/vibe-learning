---
name: vibe-learning-uebung
description: Neue Übungsseite für die Plattform „vibe learning“ (IT: Excel, Python, Datenbanken, Tippen, Tools; BWR Jahrgangsstufe 9) bauen, passend zu Bibliotheken, Katalog und Speicherung.
---

# Neue Übung für vibe learning

Diese Datei wird von `werkzeuge/skill-bauen.py` aus den Kopfkommentaren der Bibliotheken erzeugt. Nicht von Hand ändern, sondern Bibliothek oder Vorlage anpassen und neu bauen.

## Ergebnis

- Eine HTML-Datei im Ordner des Bereichs: `pb_public/<Fach>/<bereich>/` bzw. `pb_public/<Fach>/<Stufe>/<bereich>/`, z. B. `pb_public/IT/excel/sverweis.html` oder `pb_public/BWR/9II/anlagen/abschreibung.html`.
- Die Zeile für `katalog.js` (Tool-Eintrag im passenden Bereich des Fachs).
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
<script src="../../katalog.js"></script>
<script src="../../nav.js"></script>
<script src="../../sync.js"></script>
<script>
(function(){var t=null;try{t=localStorage.getItem('wenn-theme');}catch(e){}
document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');})();
</script>
<!-- danach: Bibliothek des Bereichs (siehe unten) -->
</head>
```

- Pfade zu `katalog.js`, `nav.js`, `sync.js` führen zum Hauptordner `pb_public/`: bei IT-Seiten (`IT/excel/…`) `../../`, bei BWR-Seiten (`BWR/9II/anlagen/…`) `../../../`. Bibliotheken anderer Bereiche desselben Fachs wie gewohnt relativ (`../excel/basis.js`).
- Die Tool-id (kurz, a–z, 0–9, -) steht in `data-trainer` und in `katalog.js` und ist über alle Fächer eindeutig. Sie wird nie mehr geändert, sonst ist der Fortschritt weg.
- Alles, was im localStorage gespeichert wird, beginnt mit `TOOL-ID-`. Nur dann wird es mit dem Server abgeglichen.
- Nach jeder Änderung am gespeicherten Stand `window.TrainerSync && TrainerSync.changed()`, nach jeder gelösten Aufgabe `TrainerSync.event({...})` (Felder siehe sync.js unten bzw. die Bereichsbibliothek).
- Farben nur über die CSS-Variablen (Nord-Schema, hell und dunkel), nie fest eintragen. Die Akzentfarbe `--accent` setzt nav.js aus `katalog.js`.
- Hell/Dunkel-Knopf heißt `#themeBtn`; fehlt er, legt nav.js einen in die Leiste.

Farbvariablen (aus seite.css):

```css
{{SEITE_CSS_VARS}}
```

## Aufgaben aus Daten (lib/aufgaben.js)

Standardaufgaben nicht neu programmieren, sondern als Daten an `Aufgaben.baue` bzw. `Aufgaben.sequenz` geben (Typen und Felder: Kopfkommentar unten). Eigener Code nur für Besonderes (Grafiken, Simulationen) als `html`/`nach` eines Schritts. Beispiel einer Erarbeitungsseite (Vorbild: `BWR/9II/finanzierung/kurzfristige-kredite.html`):

```js
Aufgaben.sequenz({el:'#app', key:'TOOL-ID', schritte:[
  {id:'info', kurz:'Einführung', html:'<h2>…</h2><p>…</p>'},
  {id:'a1', kurz:'1.1', erinnerung:'<p>…</p>', material:'<div class="mt">Material</div>…', aufgaben:[
    {typ:'mc', nr:'1.1', frage:'…', options:['richtig', 'falsch'], correct:[0], why:{1:'Warum falsch'}},
    {typ:'zahlen', frage:'…', felder:[{t:'Bruttoskonto', l:238, e:'€', h:'Hinweis'}], danach:{typ:'mc', …}},
    {typ:'luecken', text:'Der Kredit ist [[kurzfristig|langfristig]].'},
    {typ:'zuordnen', felder:[['a', 'Feld A'], ['b', 'Feld B']], karten:[{t:'…', z:'a'}]},
    {typ:'buchungssatz', konten:['2800 BK', '4250 LBKV'], soll:[['2800 BK', 80000]], haben:[['4250 LBKV', 80000]]}]}
]});
```

Einbinden: `<link rel="stylesheet" href="…/lib/aufgaben.css">` und `<script src="…/lib/aufgaben.js"></script>` (Pfad zum Ordner `pb_public/lib/`). Excel-Erklärungen nutzen davon nur `Aufgaben.mc` (Multiple Choice in `tabelle.js` und `und-oder.html`).

## Bibliotheken

{{BIBLIOTHEKEN}}
