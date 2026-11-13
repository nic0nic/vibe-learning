#!/usr/bin/env node
/* Schreibt den Kontenplan aus pb_public/BWR/kontenplan.js als Markdown (für Chats/Skills, schneller als das PDF).
 * Aufruf im Hauptordner des Repos:  node werkzeuge/kontenplan-md.js ~/austausch/kontenplan.md
 */
const fs = require('fs'), path = require('path');
const KP = require(path.join(__dirname, '..', 'pb_public', 'BWR', 'kontenplan.js'));
const ziel = process.argv[2] || 'kontenplan.md';
let md = `# Kontenplan (IKR) für bayerische Realschulen – LehrplanPLUS\n\n`
  + `Quelle: ISB, „Kontenplan (nach dem IKR) und Abkürzungsverzeichnis zur Verwendung an Bayerischen Realschulen“ (Kontenplan_LehrplanPLUS.pdf, Stand 2022).\n`
  + `Erzeugt aus \`vibe-learning/pb_public/BWR/kontenplan.js\` mit \`node werkzeuge/kontenplan-md.js\` – dort ändern, nicht hier.\n\n`
  + `- Schreibweise ab Jgst. 8: Nummer + Kürzel (\`2800 BK\`), Jgst. 7: nur Kürzel (\`BK\`).\n`
  + `- ${KP.hinweis}\n`
  + `- Gliederung wie im Original (vier Spalten): Kontenart → Kontenklasse → Kontengruppe → Konten.\n\n`;
KP.spalten.forEach((sp, i) => {
  md += `<!-- Spalte ${i + 1} des Originals -->\n`;
  sp.forEach(b => {
    if (b.kopf) md += `\n## ${b.kopf}\n`;
    else if (b.klasse) md += `\n### ${b.klasse}\n`;
    else {
      if (b.gruppe) md += `\n**${b.gruppe}**\n\n`; else md += '\n';
      b.konten.forEach(([nr, kz, name, klr]) => { md += `- ${klr ? '\\* ' : ''}\`${nr} ${kz}\` ${name}\n`; });
    }
  });
});
md += `\n## Alle Konten als Tabelle\n\n| Nr. | Kürzel | Bezeichnung | KLR (*) |\n|---|---|---|---|\n`
  + KP.konten.map(k => `| ${k.nr} | ${k.kz} | ${k.name} | ${k.klr ? '*' : ''} |`).join('\n') + '\n';
fs.writeFileSync(ziel, md);
console.log(`${ziel}: ${KP.konten.length} Konten`);
