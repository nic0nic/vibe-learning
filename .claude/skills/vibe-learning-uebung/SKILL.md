---
name: vibe-learning-uebung
description: Neue Übungsseite für die Plattform „vibe learning“ (IT: Excel, Python, HTML, Datenbanken, Tippen, Tools; BWR Jahrgangsstufe 9) bauen, passend zu Bibliotheken, Katalog und Speicherung.
---

# Neue Übung für vibe learning

Diese Datei wird von `werkzeuge/skill-bauen.py` aus den Kopfkommentaren der Bibliotheken erzeugt. Nicht von Hand ändern, sondern Bibliothek oder Vorlage anpassen und neu bauen.

## Ergebnis

- Eine HTML-Datei im Ordner des Bereichs: `pb_public/<Fach>/<bereich>/` bzw. `pb_public/<Fach>/<Stufe>/<bereich>/`, z. B. `pb_public/IT/excel/sverweis.html` oder `pb_public/BWR/9II/anlagen/abschreibung.html`.
- Die Zeile für `katalog.js` (Tool-Eintrag im passenden Bereich des Fachs).
- Ein Satz, was getestet wurde: Seite mit `python3 -m http.server` im Ordner `pb_public` (ohne Server) bzw. mit `pocketbase serve` (mit Anmeldung) öffnen und durchspielen. Wurde nicht im Browser getestet, das klar sagen.

## Regeln (aus PRINZIPIEN.md)

1. Gemeinsamer Code steht in Bibliotheken. Was `lib/aufgaben.js` oder die Bibliothek des Fachs bzw. Bereichs kann, wird benutzt und nicht neu geschrieben.
2. Die Seite enthält nur ihr Eigenes. Aufgaben und Level stehen möglichst als Daten in der Seite.
3. Neue Funktionen kommen in eine Bibliothek, wenn mindestens zwei Seiten sie brauchen oder absehbar brauchen werden (allgemeine Aufgabenform, Hilfsfunktion). Ebene: ohne Fachbezug → `lib/`, für ein Fach → `<Fach>/`, Bedienung oder Fachlogik eines Bereichs → `<Fach>/<bereich>/`. Kopfkommentar ergänzen und die Seiten testen, die die Bibliothek schon nutzen.
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
:root{--bg:#e5e9f0;--panel:#f6f8fb;--panel2:#eceff4;--text:#2e3440;--muted:#5b6578;--border:#cdd3de;--slot:#e5e9f0;--slot-border:#a7b1c2;--accent:#5e81ac;--then:#5e8a45;--else:#a8434d;--err:#a8434d;--mono:ui-monospace,Consolas,"Liberation Mono",monospace}
[data-theme=dark]{--bg:#2e3440;--panel:#3b4252;--panel2:#434c5e;--text:#eceff4;--muted:#a9b3c4;--border:#4c566a;--slot:#434c5e;--slot-border:#616e88;--accent:#88c0d0;--then:#a3be8c;--else:#bf616a;--err:#d4848b}
```

## Aufgaben aus Daten (lib/aufgaben.js)

Standardaufgaben nicht neu programmieren, sondern als Daten an `Aufgaben.baue` bzw. `Aufgaben.sequenz` geben (Typen und Felder: Kopfkommentar unten). Eigener Code nur für Besonderes (Grafiken, Simulationen) als `html`/`nach` eines Schritts. Beispiel einer Erarbeitungsseite (Vorbilder: `BWR/9II/finanzierung/kurzfristige-kredite.html`, Lern-Chat allein: `BWR/7II/aufwand-ertrag/verkauf-uefe.html`):

```js
Aufgaben.sequenz({el:'#app', key:'TOOL-ID', schritte:[
  {id:'info', kurz:'Einführung', html:'<h2>…</h2><p>…</p>'},
  {id:'a1', kurz:'1.1', erinnerung:'<p>…</p>', material:'<div class="mt">Material</div>…', aufgaben:[
    {typ:'mc', nr:'1.1', frage:'…', options:['richtig', 'falsch'], correct:[0], why:{1:'Warum falsch'}},
    {typ:'zahlen', frage:'…', felder:[{t:'Bruttoskonto', l:238, e:'€', h:'Hinweis'}], danach:{typ:'mc', …}},
    {typ:'luecken', text:'Der Kredit ist [[kurzfristig|langfristig]].'},
    {typ:'zuordnen', felder:[['a', 'Feld A'], ['b', 'Feld B']], karten:[{t:'…', z:'a'}]},
    {typ:'buchungssatz', konten:['2800 BK', '4250 LBKV'], soll:[['2800 BK', 80000]], haben:[['4250 LBKV', 80000]]},
    {typ:'freitext', felder:['1. Sicherheit', '2. Sicherheit'], antworten:[['Grundschuld'], ['Zession', 'Abtretung von Forderungen']]}]},
  {id:'chat', kurz:'Chat', aufgaben:[{typ:'chat', name:'BWR-Coach', nachrichten:['Hallo!',
    {bot:'Wird das Bankkonto mehr oder weniger?', antworten:[{t:'mehr', ok:true, r:'Genau!'}, {t:'weniger', r:'Nein, …'}]},
    {bot:'Welcher Betrag?', zahl:{l:11900, e:'€'}, r:'Richtig!', rFalsch:'Erklärung …'}]}]}
]});
```

Einbinden: `<link rel="stylesheet" href="…/lib/aufgaben.css">` und `<script src="…/lib/aufgaben.js"></script>` (Pfad zum Ordner `pb_public/lib/`). Excel-Erklärungen nutzen davon nur `Aufgaben.mc` (Multiple Choice in `tabelle.js` und `und-oder.html`).

## Bibliotheken

### katalog.js – Inhaltsverzeichnis: hier wird jede Übung eingetragen

```text
Inhaltsverzeichnis der Übungsplattform

Das ist die einzige Stelle, an der ein neues Tool eingetragen werden muss.
Menüleiste, Startseite, Bereichsseiten, Speichern und Lehrerbereich lesen von hier.

Aufbau:   Fach → (Jahrgangsstufe) → Bereich → Tool. Ordner in pb_public: <Fach>/<Bereich>/
          bzw. <Fach>/<Stufe>/<Bereich>/, z. B. IT/excel/wenn.html, BWR/9II/anlagen/…
Fach:     id      = Ordnername (z. B. IT, BWR), titel = Anzeige im Fach-Menü, text = Untertitel der Startseite
          bereiche = [Bereich] oder stufen = [{id (Ordner, z. B. 9II), titel (Fach-Menü), kurz (oben in der
          Leiste, z. B. 9), text, bereiche}] für Fächer mit Jahrgangsstufen
Bereich:  id      = Name des Unterordners (nur a–z, 0–9, -), über alle Fächer eindeutig
          titel   = Text in der Menüleiste
          farbe   = Akzentfarbe im dunklen Design (Nord-Farben, nordtheme.com),
          farbeHell = dunklerer Ton derselben Farbe für das helle Design (sonst schlecht lesbar)
          farbeSchrift = optional: hellerer Ton für Schrift im dunklen Design, wenn farbe dort zu wenig Kontrast hat
          Ohne farbe bekommt der Bereich das neutrale Nord-Blau.
Tool:     id      = Kürzel für Speicherstand und Auswertung, über alle Fächer eindeutig (nie mehr ändern,
                    sonst geht der gespeicherte Fortschritt verloren)
          datei   = HTML-Datei im Ordner des Bereichs
          titel, text = Anzeige im Menü und auf den Übersichtsseiten
          bedingt = true: nur sichtbar, wenn der Server es für den angemeldeten Schüler freigibt
                    (z. B. Tipp-Aufgabe, siehe /api/trainer/sichtbar in pb_hooks/tippen.pb.js)
          stufen  = Stufen der Übungen für die Auswertung (lehrer.html): Anzahl oder Liste
                    mit Kurznamen, wenn die Nummern allein missverständlich wären
          gruppe  = optional: Untermenü im Menü (aufklappen beim Darüberfahren) und
                    Zwischenüberschrift auf der Bereichsseite (Tools derselben Gruppe direkt hintereinander)
Bereich mit auswertung: false (z. B. Tools ohne Aufgaben) erscheint nicht im Lehrerbereich.

In der HTML-Datei eines Tools steht dieselbe id: <html lang="de" data-trainer="…">.
Übersichtsseiten: Bereich <html data-bereich="IT/excel">, Fach bzw. Stufe <html data-gruppe="IT">
bzw. data-gruppe="BWR/9II" mit <div id="pf-start">, Fach mit Stufen <html data-fach="BWR"> mit <div id="pf-fach">.

Eingereichte Übungen (vorlage.html → Pull Request) stehen unten zwischen EINREICHUNGEN-ANFANG und -ENDE als
reines JSON: [{"bereich": "<Bereich-id>", "tool": {id, datei, titel, text}}]. Der Server (pb_hooks/einreichen.pb.js)
ergänzt dort; von Hand nur gültiges JSON eintragen. Sie werden an das Ende des Bereichs angehängt.

Am Ende berechnet: KATALOG.gruppen = [{pfad, fach, stufe, titel, text, bereiche}] (Fach bzw. Fach + Stufe)
und KATALOG.bereiche = alle Bereiche aller Fächer, jeweils mit pfad (Ordner) und gruppe.
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

Bedingte Menüpunkte (katalog.js: bedingt) blendet das Skript nach der Anmeldung ein,
wenn der Server sie für diesen Schüler freigibt (/api/trainer/sichtbar).

Die Seite ruft auf:
  TrainerSync.changed()      nach jeder Änderung am gespeicherten Stand
  TrainerSync.event({...})   wenn eine Aufgabe richtig gelöst wurde
```

### lib/seite.js – Übungsseiten aus Aufgaben-JSON prüfen und bauen (vorlage.html, Einreichen)

```text
seite.js – Übungsseiten aus Aufgaben-JSON prüfen und bauen (Browser und PocketBase-Hooks)

Wird genutzt von vorlage.html (Vorschau, Download) und pb_hooks/einreichen.pb.js (Pull Request).
Im Browser: <script src="lib/seite.js"></script> → window.Seite; im Hook: require(…/pb_public/lib/seite.js).

Aufgaben-JSON (reine Daten, kein JavaScript; Aufgabentypen wie in lib/aufgaben.js):
  {"titel": "Kredite bei der Bank", "kurztext": "…",
   "schritte": [{"kurz": "5.1", "titel": "…", "html": "<p>Erklärung</p>", "erinnerung": "…", "erinnerungZu": true,
                 "material": "…", "aufgaben": [{"typ": "mc", …}, …]}, …]}
  Statt "schritte" geht auch "aufgaben": [...] (wird ein einziger Schritt).

API
  Seite.TYPEN                     Aufgabentypen mit Pflichtfeldern (muss zu lib/aufgaben.js passen)
  Seite.normalisiere(json)        → {titel, kurztext, schritte} (Schritte bekommen id und kurz)
  Seite.pruefe(json)              → Liste von Fehlern (leer = in Ordnung), deutsch, mit Fundstelle
      HTML in Texten nur nach Erlaubtliste (Seite.ERLAUBT): Tags wie p, b, ul, table … mit höchstens class
      (td/th auch colspan, rowspan); jedes andere „<“ + Buchstabe, „</“, „<!“ oder „<?“ wird abgelehnt.
  Seite.toolId(titel, zufall)     → id für katalog.js (a–z, 0–9, -, höchstens 20 Zeichen)
  Seite.seiteHTML(json, opt)      → komplette HTML-Seite
      opt = {pfad: 'BWR/9II/finanzierung', toolId, einzeln: false, lib: {aufgabenJs, aufgabenCss, bwrCss}}
      einzeln: true → ohne Menü und Server, Bibliotheken eingebettet (Vorschau, Download)
```

### lib/aufgaben.js – Aufgabenbausteine für alle Fächer: Multiple Choice, Zahlen, Lückentext, Zuordnen, Buchungssatz, Erarbeitung (dazu aufgaben.css)

```text
aufgaben.js – Aufgabenbausteine für alle Fächer: Aufgaben als Daten, Prüfung und Rückmeldung eingebaut

Einbinden (Pfad zum Ordner pb_public/lib/, z. B. aus BWR/9II/finanzierung/ ../../../lib/):
  <link rel="stylesheet" href="../../../lib/aufgaben.css">   <script src="../../../lib/aufgaben.js"></script>
Farben kommen aus den Variablen der Seite (--panel, --panel2, --border, --accent, --text, --muted).

Aufgabe = Objekt mit typ. Für alle Typen: nr (z. B. '7.1'), frage (Aufgabenstellung, HTML),
erinnerung und material (HTML, stehen über der Aufgabe; erinnerungZu:true = Erinnerung startet zugeklappt), ok (Text bei Erfolg),
Formeln mit Bruchstrich in jedem HTML-Text: <span class="bruch"><span>Zähler</span><span>Nenner</span></span> (aufgaben.css),
danach (weitere Aufgabe, erscheint erst nach richtiger Lösung, z. B. Handlungsempfehlung).
  mc           options:[Texte], correct:[Indizes] (mehrere = Mehrfachauswahl, oder multi:true), why:{Index: Erklärung},
               after (Text nach Erfolg), mono, mischen:false (Reihenfolge behalten), sofort:false
               (bei genau einer richtigen Antwort wird sonst beim Antippen sofort geprüft).
               Dasselbe Format wie type:'choice' in den Excel-Erklärungen.
  zahlen       felder:[{t (Text), l (Lösung), e (Einheit), h (Hinweis bei Fehler), tol (Toleranz, Std. 0,005)}]
               Eingabe im deutschen Format (1.234,50 €), Knopftext über knopf:'…'
  luecken      text:'… [[richtig|falsch|falsch]] …' → Auswahllisten (erste Antwort richtig, wird gemischt)
               ziehen:true → Wortbank statt Auswahllisten: Wörter in die Lücken ziehen oder erst Wort, dann Lücke
               antippen (Wort in der Lücke antippen = zurück). Bank: je Lücke das richtige Wort, dazu die falschen
               Antworten der Lücken und extra:['…'] (weitere Ablenker), Doppelte nur einmal. [[Wort]] ohne | reicht hier.
  zuordnen     felder:[[id, Titel]], karten:[{t (Text), z (Feld-id)}]; Ziehen mit Maus/Finger oder
               erst Karte, dann Feld antippen. Richtige bleiben liegen, falsche gehen zurück.
  tabelle      Tabelle zum Ausfüllen (z. B. Tilgungsplan): spalten:['Jahr', 'Zinsen', …],
               zeilen:[['1', 40000, {l:2000}, …], …] – Text bzw. Zahl = vorgegeben (Zahlen mit 2 Nachkommastellen),
               {l: Lösung} = Eingabefeld; hinweise:{Spaltenindex: 'Zinsen = Restschuld · 5 %'}, tol (Std. 0,005),
               einheit (z. B. '€', erscheint im Spaltenkopf). Falsche Felder werden rot, Hinweise je Spalte.
  freitext     felder:['1. Sicherheit', '2. Sicherheit'] (Beschriftungen, je ein Eingabefeld),
               antworten:[['Grundschuld'], ['Zession', 'Abtretung von Forderungen'], …] (je Eintrag Schreibweisen);
               ein Feld ist richtig, wenn ein Begriff darin vorkommt (Groß/klein, ä/ae egal), jedes Feld braucht
               einen anderen Eintrag. Tippfehler (Abstand bis 45 % bei langen, 30 % bei kurzen Wörtern) gelten als
               „fast richtig“ mit Hinweis auf die Schreibweise; tippfehler:'ok' zählt sie als richtig.
  chat         Lern-Chat wie bei LearningSnacks: name, bild (Emoji), nachrichten:[…], jede Nachricht ist
               'Text des Bots' (HTML erlaubt) oder eine Frage {bot:'Frage', …} mit einer Antwortform:
                 antworten:[{t:'mehr', ok:true, r:'Genau! …'}, {t:'weniger', r:'Nein, …'}]   (Knöpfe)
                 zahl:{l:11900, e:'€', tol}   oder   freitext:{antworten:[…]} (wie Typ freitext)
                 dazu r (Antwort des Bots bei richtig) und rFalsch (Erklärung bei falsch)
               Bei Fehlern erklärt der Bot und macht weiter; am Ende Punkte und „Noch einmal“.
               Gilt als gelöst (fertig), sobald der Chat einmal ganz durchlaufen ist.
  buchungssatz konten:['2800 BK', …] (Auswahlliste), soll:[['0700 MA', 40000], …], haben:[…],
               steuer:['2600 VORST', '4800 UST'] (für den Hinweis), nebenrechnung (HTML nach Lösung)
               prüft: Konten, Soll/Haben vertauscht, fehlende Steuer, Beträge; Lösung im Skill-Format

API
  Aufgaben.baue(el, a, {fertig})  Baustein in Element el; fertig(a) nach richtiger Lösung (inkl. danach)
  Aufgaben.sequenz({el, key, schritte})  Erarbeitung aus Schritten mit Knöpfen, ✓, Zähler, Zurück/Weiter:
      schritt = {id, kurz (Knopf), titel, html (String oder Funktion), erinnerung, erinnerungZu, material,
                 aufgaben:[…], nach(el) (nach dem Zeichnen, für eigene Grafiken)}
      Schritte mit Aufgaben melden TrainerSync.event (modus 'erarbeitung', aufgabe = schritt.id),
      Info-Schritte gelten beim Weitergehen als erledigt. Gespeichert: <key>-stand {schritt, erledigt}.
  Aufgaben.endlos({el, key, stufen})  Endlos-Modus wie in den Excel-Übungen: Stufen als Flammen, Serie und Rekord,
      „Andere Aufgabe“ (Serie auf 0), „Nächste Aufgabe“ nach richtiger Lösung.
      stufe = {name, neu() → Aufgabe (beliebiger Typ, frisch erzeugt; h/ok für Rechenweg nutzen)}
      Meldet TrainerSync.event (modus 'endlos', stufe 1…n). Gespeichert: <key>-endlos {stufe, rekord:{stufe: n}}.
      Rückgabe {neu() (neue Aufgabe), stufe(n) (Stufe wechseln)}. Vorbild: BWR/9II/finanzierung/zinsrechnung.html
  Aufgaben.mc.html(a, auswahl:Set, geprueft, reihenfolge?) / Aufgaben.mc.pruefen(a, auswahl) → {ok, gruende}
      für Seiten mit eigenem Ablauf (Excel-Erklärungen: tabelle.js, und-oder.html)
  Aufgaben.finde(antworten, text) → {i (Eintrag), wort, fast} oder null   (Freitext-Abgleich, auch einzeln nutzbar)
  Helfer: zahl('1.234,50 €') → 1234.5, eur(n) → '1.234,50 €', mischen(liste), esc(text), bsText(soll, haben)
```

### IT/excel/basis.js – Excel: Grundlage aller Excel-Übungen (dazu basis.css)

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

### IT/excel/bausteine.js – Excel: Formeln aus Bausteinen (wie WENN, UND/ODER; dazu bausteine.css)

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

### IT/excel/tabelle.js – Excel: Tabellen-Übungen mit Rechenkern (wie Funktionen, Bezüge; dazu tabelle.css)

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

Vergleiche und WENN/UND/ODER: logikAn() einmal aufrufen (vor dem ersten Rechnen). Dann gibt es = <> < > <= >=
  (Ergebnis WAHR/FALSCH, Texte ohne Groß-/Kleinschreibung) und die Funktionen WENN, UND, ODER.

Braucht ../../lib/aufgaben.js (Multiple Choice: Aufgaben.mc), vor basis.js einbinden.

Die Seite liefert
  TOPICS, GROUPS, AC_FN; let learn, endPick, CUR, S, LS, PT
  render, resetS, loadStep, newEndless, setLevel, clearMarks, syncInput(inp, keepSel), logSolved
```

### IT/excel/uebertragen.js – Excel: Formeln übertragen und $ setzen (wie Bezüge, WENN mit $, UND/ODER mit $; dazu uebertragen.css)

```text
uebertragen.js – Formeln übertragen und $-Zeichen setzen, wie in Excel (Seiten: bezuege, wenn-bezuege, und-oder-bezuege)
Laden nach basis.js, tabelle.js und dem Skript der Seite; dazu basis.css + tabelle.css.
Markup: wie in bezuege.html (#taskcard, #sheetcard mit #fbar/#pools/#grid/#chips, #workcard, #actions, #fb, #dock).

Stufen (fest, LEVELS): 1 $-Zeichen setzen · 2 Zellen auswählen und $ setzen · 3 Rechnung aus Bausteinen ·
  4 Zeichen als Bausteine · 5 freie Eingabe mit Hinweisen · 6 freie Eingabe ohne Hinweise.
Modi: pfad (Übungen aus STD), endlos (Zufall aus GENS), lernen (nur wenn TOPICS nicht leer).
  Ein Modus lässt sich über die Adresse wählen: seite.html#pfad bzw. #endlos.
Geprüft wird, ob die Formel nach dem Übertragen in allen Zellen dasselbe ergibt wie die Musterlösung,
  auch mit 8 veränderten Zahlentabellen (abgeschriebene Zahlen fallen auf). Hinweise nennen falsche $-Zeichen.

Die Seite liefert (vor dieser Datei)
  KEY = 'bz-'                      Speicherschlüssel
  GENS = {id: {title, make(r)}}    Aufgaben-Generator; make(r) mit Zufall r() liefert
    {intro, cells: {A4:'Name', B5:12, C5:'=…'}, fmt: {B2:'eur'|'usd'|'pct'}, ffmt (Format der Ergebnisse),
     fill: ['D5', 'D9'] (Formel in D5, übertragen bis D9), ref: '=B5*$B$2' (Musterlösung),
     what: '… berechnet' (ergänzt „Schreibe in D5 eine Formel, die …“), tip (optional, bis Stufe 4)}
  STD = [[gid, seed, gruppe]]      Übungen; GROUPS = [null, 'Gruppenname', …]
  TOPICS = [{id, name, desc, steps}] Erklärung (oder []), OV_INTRO (Text der Übersicht)
  HILFE    HTML, das bis Stufe 5 unter der Aufgabe steht (z. B. <details> zum $)
  SYM4     Zeichen-Bausteine auf Stufe 4, z. B. ['=', '+', '(', ')', 'SUMME(']; Zahlen und Texte der Lösung kommen dazu
  AC_FN    Funktionen für die Autovervollständigung (siehe basis.js)
Hilfen für Generatoren: rd(r, a, b, Stellen), pickN(r, liste, n), cols('B', 5) → ['B', … 'F']
```

### IT/python/lib/pykurs.js – Geführte Python-Übungen

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

### IT/html/lib/htmlkurs.js – Geführte HTML- und CSS-Übungen

```text
vibe learning – geführte HTML- und CSS-Übungen mit Vorschau und automatischer Prüfung

Eine Übungsseite (z. B. aufbau.html) legt window.HTMLKURS an und bindet danach ein:
../python/lib/codemirror.min.js (+ .css), lib/codemirror-html.js, lib/mediathek.js,
lib/htmlwerk.js und diese Datei.

HTMLKURS = {
  id:     'htmlaufbau',            Tool-id aus katalog.js (Speicherstand, Auswertung)
  titel:  'Aufbau einer Webseite',
  logo:   'Aufbau',                kurzer Text im Logo
  css:    true,                    Schalter HTML/CSS zeigen (Standard: nein, nur HTML)
  bilder: true,                    Knopf „Bilder“ zeigen (Standard: nein)
  datei:  'css',                   welche Datei beim Öffnen einer Aufgabe zu sehen ist (Standard: 'html');
                                   auch je Aufgabe möglich
  aufgaben: [{
    titel, stufe (1 einfach, 2 mittel, 3 schwer),
    wissen:   Erklärung, auftrag: Aufgabe (beide HTML, dazu die Kurzformen unten)
    start:    HTML im Editor, startCss: CSS im Editor
              Mit css: true steht in start an der Stelle der Einbindung von style.css das Kürzel %CSS%.
              (Die Zeile selbst darf nicht in der Seite stehen, sonst stolpert einzeldateien.py.)
    tipps:    ['…', '…']           werden nacheinander aufgedeckt
    tests:    [{…, text: 'Anzeige'}]   Arten siehe htmlwerk.js; zusätzlich müssen alle Regeln
              von HTML und CSS eingehalten sein (Regelprüfung des Editors)
    projekt:  true                 freie Abschlussaufgabe: zusätzlich Knopf „Herunterladen“
  }]
}

Kurzformen in wissen und auftrag (Code muss dort nicht mit &lt; geschrieben werden):
  {{<h1>}}                         Code im Satz
  ~~~html                          Beispiel: Code und darunter das Ergebnis im Browser.
  <h1>Hallo</h1>                   Die Zeilen ~~~ stehen allein am Zeilenanfang.
  ~~~css                           optional: CSS zum Beispiel
  h1 { color: red; }
  ~~~
  ~~~html nur   bzw.   ~~~css      nur Code zeigen, ohne Ergebnis
```

### IT/html/lib/htmlwerk.js – HTML: Editor mit Vorschau, Regelprüfung und Tests (Grundlage von htmlkurs.js und editor.html)

```text
vibe learning – HTML und CSS im Browser: Editor mit Vorschau, Regelprüfung und Bildern

Grundlage für editor.html (freier Editor) und htmlkurs.js (geführte Übungen).
Vorher einbinden: ../python/lib/codemirror.css, ../python/lib/codemirror.min.js,
lib/codemirror-html.js, lib/mediathek.js (window.HTML_BILDER), dann diese Datei.

const w = HtmlWerk.arbeitsplatz(host, {
  anordnung: 'unten' | 'neben',      Vorschau unter oder neben dem Editor
  onChange(html, css) {}             nach jeder Eingabe (zum Speichern)
});
w.lade({html, css, mitCss, bilder})  neuen Inhalt zeigen; mitCss: Schalter HTML/CSS sichtbar,
                                     bilder: Knopf „Bilder“ sichtbar
w.html(), w.css()                    aktueller Inhalt
w.links, w.rechts                    Plätze in der Leiste für eigene Knöpfe
w.pruefe(tests)                      → Promise {ok, regeln: [{datei, zeile, text}], tests: [{ok, text}]}
w.download('seite.html')             eine Datei, CSS und Bilder eingebettet
Unten rechts im Editor öffnet ein Zahnrad die Optionen (OPTIONEN weiter unten: Tags automatisch
schließen, Zeilen umbrechen, große Schrift). Sie gelten für alle HTML-Seiten und stehen im Browser
unter dem Schlüssel hw-optionen. Neue Option: Eintrag in OPTIONEN ergänzen.
„Vorschau ausblenden“ (z. B. für den Beamer) gilt nur bis zum Neuladen der Seite.
Die Grenze zwischen Editor und Vorschau lässt sich mit der Maus ziehen (Doppelklick: wieder halb und halb);
das Verhältnis steht im Browser unter hw-teiler, getrennt für „neben“ und „unten“.
HtmlWerk.themaKnopf(button)          Hell/Dunkel-Knopf
HtmlWerk.dokument(html, css)         fertige Seite als Text (für Vorschau und Download)
HtmlWerk.pruefeHtml(html), HtmlWerk.pruefeCss(css, doc)   Regelprüfung → [{zeile, text, art}]

Die CSS-Datei heißt immer style.css. Die Zeile <link rel="stylesheet" href="style.css">
im HTML ist gesperrt und lässt sich nicht ändern oder löschen.
Bilder: src="bilder/<name>" mit einem Namen aus mediathek.js.
Die Vorschau führt kein JavaScript aus; Links öffnen sich dort nicht.

Tests (Daten, jeweils mit text = Anzeige in der Rückmeldung):
  {sel: 'ul li', min: 3}                 Elemente zum Selektor; min (Standard 1), anzahl (genau) oder keine: true
  {sel: 'h1', enthaelt: 'Mouse Rat'}     … deren Text das enthält (Groß-/Kleinschreibung egal)
  {stil: 'h1', attribut: 'color', wert: 'red'}    berechneter Stil aller Treffer; statt wert auch
                                         ungleich: 'black', minPx: 18, maxPx: 40
  {regel: '.mitglied', attribut: 'border'}        CSS-Regel mit diesem Selektor (auch /RegExp/), attribut optional
  {quelle: /…/}, {quelleNicht: /…/}      Muster im HTML-Text
  {css: /…/}, {cssNicht: /…/}            Muster im CSS-Text (ohne Kommentare)
  {kontrast: 'p', min: 4.5}              Kontrast Schrift zu Hintergrund
  {passt: 375}                           kein Querrollen bei dieser Breite in px
  {test: (doc, html, css) => true}       Sonderfall als Funktion
```

### IT/html/lib/mediathek.js – HTML: Bilder für Editor und Kurs

```text
vibe learning – Bilder für den HTML-Editor und den HTML-Kurs (Band „Mouse Rat“)

window.HTML_BILDER = {'<dateiname>': {titel, svg}}. Im HTML der Schüler heißt die Datei bilder/<dateiname>.
Eigene Zeichnungen als SVG, damit alles ohne Server und in der Einzeldatei läuft.
Neues Bild: hier ergänzen, es erscheint dann von selbst unter „Bilder“.
```

### IT/html/lib/mouserat.js – HTML: Beispielseite des Kurses als Ausgangsstand

```text
vibe learning – HTML-Kurs: die Seite der Band „Mouse Rat“, wie sie nach den HTML-Kapiteln aussieht

Ausgangsstand für die Kursseiten zu CSS und Design (nach htmlwerk.js einbinden, vor der Aufgabenliste):
  MOUSERAT.html   ganze Seite; %CSS% steht für die Einbindung von style.css (ersetzt htmlkurs.js)
  MOUSERAT.css    Stilvorlage nach dem Kapitel „CSS-Grundlagen“
Varianten für einzelne Aufgaben bildet die Kursseite mit .replace(…).
```

### IT/datenbanken/abfragen.js – Datenbanken: SQL-Abfragen mit Entwurfsansicht und Editor (dazu abfragen.css)

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

### IT/datenbanken/filme.js – Datenbanken: Tabelle filme als Daten

```text
filme.js – Tabelle „filme“: 888 Filme und Serien von Herrn Maier (484 bewertet, 404 auf der Merkliste)

Daten für Datenbank-Übungen. abfragen.js baut daraus die SQLite-Tabelle im Browser.
  DB_FILME = {name, felder:[{n, typ, art, d}], zeilen:[[…], …]}
  n = Spaltenname, typ = SQL-Datentyp, art = Anzeige für Schüler, d = Beschreibung
Erzeugt mit werkzeuge/filme-aus-csv.py aus dem IMDb-Export, nicht von Hand ändern.
```

### IT/tools/struktogramm.js – Tools: Struktogramme zeichnen und exportieren (dazu struktogramm.css)

```text
struktogramm.js – Struktogramme (Nassi-Shneiderman, DIN 66261) zeichnen und exportieren

Gemeinsam für struktogramm.html (Editor) und python-struktogramm.html (Python → Struktogramm).
Alles unter window.Strukto, kein Build-Schritt, läuft auch per file://.

Diagramm  {name, breite, kinder: [Element]}
Element   {typ: 'anweisung', text}                    einfache Anweisung
          {typ: 'aufruf', text}                       Aufruf eines Unterprogramms (doppelte Seitenlinien)
          {typ: 'abbruch', text}                      Aussprung (break, return)
          {typ: 'wenn', text, ja: [], nein: []}       Verzweigung
          {typ: 'fall', text, faelle: [{text, kinder: []}]}   Fallauswahl (letzter Fall z. B. „sonst“)
          {typ: 'kopf', text, kinder: []}             kopfgesteuerte Schleife und Zählschleife
          {typ: 'fuss', text, kinder: []}             fußgesteuerte Schleife
          {typ: 'block', text, kinder: []}            Programm, Funktion oder Block mit Rahmen

Strukto.zeichne(diagramm, farben, opt) → {svg, breite, hoehe, treffer, zonen, inhalt: {y, h}}
    farben  Strukto.EXPORT (weiß, schwarze Linien) oder Strukto.farbenAusCss() (Seitenfarben)
    opt     {leer: 'Text für leere Listen', titel: false (Name nicht zeichnen)}
    breite 0 = automatisch (mindestens 400 px, breiter, bis das längste Wort in jede Spalte passt)
    treffer [{el, liste, i, x, y, w, h, H}]  h = anklickbare Fläche, H = ganze Höhe; innere Elemente zuletzt
    zonen   [{liste, i, x, y, w}]         Einfügestellen (Ziehen und Ablegen); leere Liste: leer, y0, h = Kasten
Strukto.exportiere(diagramm, 'svg' | 'html' | 'jpg')   Datei herunterladen in den Exportfarben
    (Standard weiß mit schwarzen Linien, gegen Dunkelmodus von Browser und Erweiterungen gesperrt)
Strukto.zahnrad(knopf)      Knopf öffnet die Einstellung der Exportfarben (Hintergrund, Linien und Schrift),
                            gespeichert pro Gerät unter struktofarben
Strukto.TYPEN               [{typ, name}] in der Reihenfolge der Werkzeugleiste
Strukto.neu(typ)            neues Element mit Beispieltext
Strukto.listen(el)          alle Unterlisten eines Elements
Strukto.pruefe(daten)       Diagramm aus fremdem JSON (Datei öffnen, Speicher) bereinigen, sonst null
Strukto.BREITEN             wählbare Breiten in Pixeln (0 = automatisch)
```

### BWR/bwr.css – BWR: Grundlayout aller BWR-Seiten (Farben, Leiste, Karten, Knöpfe, Material, Erinnerung)

```text
bwr.css – Grundlayout der BWR-Seiten (Nord-Farben, hell und dunkel)

Einbinden im <head> nach den Skripten, Pfad zum Ordner BWR/, z. B. aus BWR/9II/finanzierung/:
  <link rel="stylesheet" href="../../bwr.css">
Danach eigene <style>-Regeln der Seite (nur, was keine andere BWR-Seite braucht).

Farben:   --bg --panel --panel2 --text --muted --border --accent --err --ok --mono,
          --plus/--plus-bg (richtig, Zunahme), --minus/--minus-bg (falsch, Abnahme)
Gerüst:   .wrap > .bar (.brand mit <span>, .gruppe, .hint, .spacer) und darunter .karte (h2, h3, p)
Knöpfe:   .btn, .btn.on (gewählt), .btn.haupt (Hauptaktion), .btn.klein; Eingaben .feld
Texte:    .muted, .tag (kleines Etikett), .nr (Nebenrechnung, klein und grau)
Rückmeldung: <div class="fb ok|falsch">…</div>; Knopfzeile .knoepfe; Beleg-Tabelle .beleg (tr.summe)
Erinnerung, Material und Aufgabenbausteine: lib/aufgaben.css und lib/aufgaben.js
```
