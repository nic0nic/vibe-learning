/* Inhaltsverzeichnis der Übungsplattform
 *
 * Das ist die einzige Stelle, an der ein neues Tool eingetragen werden muss.
 * Menüleiste, Startseite, Bereichsseiten, Speichern und Lehrerbereich lesen von hier.
 *
 * Bereich:  id      = Name des Unterordners in pb_public (nur a–z, 0–9, -)
 *           titel   = Text in der Menüleiste
 *           farbe   = Akzentfarbe im dunklen Design (Nord-Farben, nordtheme.com),
 *           farbeHell = dunklerer Ton derselben Farbe für das helle Design (sonst schlecht lesbar)
 *           farbeSchrift = optional: hellerer Ton für Schrift im dunklen Design, wenn farbe dort zu wenig Kontrast hat
 *           Ohne farbe bekommt der Bereich das neutrale Nord-Blau.
 * Tool:     id      = Kürzel für Speicherstand und Auswertung (nie mehr ändern,
 *                     sonst geht der gespeicherte Fortschritt verloren)
 *           datei   = HTML-Datei im Ordner des Bereichs
 *           titel, text = Anzeige im Menü und auf den Übersichtsseiten
 *
 * In der HTML-Datei eines Tools steht dieselbe id: <html lang="de" data-trainer="…">
 */
window.KATALOG = {
  name: 'vibe learning',
  untertitel: 'Übungen für den IT-Unterricht. Wähle oben einen Bereich aus.',
  bereiche: [
    {
      id: 'excel', titel: 'Excel', farbe: '#a3be8c', farbeHell: '#5e8a45',
      text: 'Tabellenkalkulation: Funktionen, Bedingungen und Verknüpfungen.',
      tools: [
        {id: 'fn',   datei: 'funktionen.html', titel: 'SUMME, MIN, MAX …', text: 'SUMME, MITTELWERT, MIN, MAX, ANZAHL und ANZAHL2 – mit Erklärung, Übungen und Endlos-Modus.'},
        {id: 'wenn', datei: 'wenn.html',       titel: 'WENN-Funktion',     text: 'Die WENN-Funktion üben – von Bausteinen bis zur eigenen Formel.'},
        {id: 'uo',   datei: 'und-oder.html',   titel: 'UND / ODER',        text: 'Bedingungen verknüpfen – mit Erarbeitung, Übungen und Endlos-Modus.'},
        {id: 'bz',   datei: 'bezuege.html',    titel: 'Zellbezüge $',      text: 'Relative und absolute Bezüge: Formeln übertragen und $-Zeichen richtig setzen.'}
      ]
    },
    {id: 'python',      titel: 'Python', farbe: '#b48ead', farbeHell: '#8a5f84', text: 'Programmieren mit Python.',
      tools: [
        {id: 'py', datei: 'editor.html', titel: 'Python-Editor', text: 'Python direkt im Browser schreiben und ausführen – mit Terminal für Ein- und Ausgabe.'},
        {id: 'pyif', datei: 'bedingungen.html', titel: 'Bedingte Anweisung', text: 'if, elif und else: 10 Aufgaben mit Erklärung und automatischer Prüfung.'}
      ]
    },
    {id: 'datenbanken', titel: 'Datenbanken', farbe: '#bf616a', farbeHell: '#a3434c', farbeSchrift: '#e0959b', text: 'Tabellen, Beziehungen und SQL-Abfragen.',
      tools: [
        {id: 'sql', datei: 'abfragen.html', titel: 'SQL-Abfragen', text: 'SELECT, FROM, WHERE und ORDER BY an einer Filmdatenbank – vom Entwurf wie in Access bis zur eigenen SQL-Abfrage.'},
        {id: 'sqlfrei', datei: 'filmdatenbank.html', titel: 'Film-Datenbank', text: 'Eigene Abfragen an die Filmdatenbank stellen, ohne Aufgaben – mit Entwurfsansicht oder in SQL.'}
      ]
    },
    {id: 'schaltungen', titel: 'Logische Schaltungen', text: 'Gatter, Wahrheitstabellen und Schaltnetze.',  tools: []}
  ]
};
