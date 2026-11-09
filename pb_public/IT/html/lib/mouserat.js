/* vibe learning – HTML-Kurs: die Seite der Band „Mouse Rat“, wie sie nach den HTML-Kapiteln aussieht
 *
 * Ausgangsstand für die Kursseiten zu CSS und Design (nach htmlwerk.js einbinden, vor der Aufgabenliste):
 *   MOUSERAT.html   ganze Seite; %CSS% steht für die Einbindung von style.css (ersetzt htmlkurs.js)
 *   MOUSERAT.css    Stilvorlage nach dem Kapitel „CSS-Grundlagen“
 * Varianten für einzelne Aufgaben bildet die Kursseite mit .replace(…).
 */
window.MOUSERAT = {
  html: `<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="utf-8">
    <title>Mouse Rat</title>
    %CSS%
  </head>
  <body>
    <img src="bilder/logo.svg" alt="Logo von Mouse Rat" width="120">
    <h1>Mouse Rat</h1>
    <p>Die beste Rockband aus Pawnee.</p>
    <p><a href="#band">Die Band</a> <a href="#konzerte">Konzerte</a> <a href="#musik">Musik</a></p>

    <h2 id="band">Die Band</h2>
    <img src="bilder/band.svg" alt="Die vier Musiker von Mouse Rat auf der Bühne" width="400">
    <p>Wir spielen Rock, wie er sein muss: <strong>laut und mit Gefühl</strong>.</p>
    <ul>
      <li>Andy: Gesang und Gitarre</li>
      <li>Burly: Gitarre</li>
      <li>Chang: Bass</li>
      <li>Rivers: Schlagzeug</li>
    </ul>

    <h2 id="konzerte">Konzerte</h2>
    <p>Nächstes Konzert: Samstag, 20 Uhr, Schlangenloch-Lounge</p>

    <h2 id="musik">Musik</h2>
    <img src="bilder/album.svg" alt="Cover von „Das Hammer-Album“" width="200">
    <ol>
      <li>5000 Kerzen im Wind</li>
      <li>Die Grube</li>
      <li>Fang deinen Traum</li>
    </ol>
    <p>Booking: <a href="mailto:band@mouserat.example">band@mouserat.example</a></p>
  </body>
</html>
`,
  css: `body {
  background-color: #1d1f2b;
  color: white;
  font-family: Arial, sans-serif;
}

h1, h2 {
  color: #f2c94c;
}

h1 {
  font-size: 48px;
  text-align: center;
}

a {
  color: #f2c94c;
}
`
};
