/* vorlage-typen-beta.js – Formulare der experimentellen Aufgabentypen für den Baukasten (vorlage-editor.js)
 *
 * Wie vorlage-typen.js, für die Typen aus Aufgaben.EXPERIMENTELL (lib/aufgaben.js): reihenfolge, offen, markieren,
 * verbessern, beschriften, bloecke, karteikarten, kreuzwort. experimentell:true setzt sie in der Leiste unter
 * „Experimentell“. Einbinden nach vorlage-typen.js. Format und Formulare können sich noch ändern.
 */
(function () {
  'use strict';
  const B = window.Baukasten;
  const weg = (tun, d) => `<button type="button" class="btn klein x" data-tun="${tun}"${Object.entries(d).map(([k, v]) => ` data-${k}="${v}"`).join('')} title="Entfernen">✕</button>`;
  const plus = (tun, text) => `<button type="button" class="btn klein plus" data-tun="${tun}">＋ ${text}</button>`;
  const n = (z, eins, mehr) => `${z} ${z === 1 ? eins : mehr}`;
  const schalter = (tun, an, text, titel) => `<label class="schalter" title="${titel || ''}"><input type="checkbox" data-tun="${tun}"${an ? ' checked' : ''}><span></span> ${text}</label>`;
  const um = k => a => { if (a[k]) delete a[k]; else a[k] = true; };
  const typ = (name, def) => B.typ(name, Object.assign({experimentell: true}, def));

  typ('reihenfolge', {
    name: 'Reihenfolge', symbol: '⇅',
    neu: () => ({typ: 'reihenfolge', frage: 'Bringe die Schritte in die richtige Reihenfolge.', karten: ['erster Schritt', 'zweiter Schritt', 'dritter Schritt']}),
    kurz: a => n((a.karten || []).length, 'Karte', 'Karten') + (a.mono ? ', Code' : ''),
    form(a, H) {
      return `<div class="schalterleiste">${schalter('mono', a.mono, 'Code', 'Karten als reiner Text in Schreibmaschinenschrift, Einrückung bleibt erhalten')}</div>
        <label class="klein">Karten in der richtigen Reihenfolge (⠿ ziehen zum Sortieren) – die Schüler sehen sie gemischt</label>
        ${(a.karten || []).map((k, i) => H.zeile('karten', i, `<div class="reihe">${H.feld(`karten.${i}`, '', {pflicht: true, ph: `${i + 1}. Karte`})}${weg('kweg', {i})}</div>`)).join('')}${plus('kplus', 'Karte')}
        ${H.feld('h', 'Hinweis bei falscher Reihenfolge (optional)')}`;
    },
    tun: {mono: um('mono'), kplus(a) { a.karten.push(''); }, kweg(a, d) { a.karten.splice(+d.i, 1); }}
  });

  typ('offen', {
    name: 'Offene Antwort', symbol: '📝',
    neu: () => ({typ: 'offen', frage: 'Begründe …', muster: '<p>Musterlösung</p>', kriterien: ['nennt …', 'begründet mit …']}),
    kurz: a => `Musterlösung, ${n((a.kriterien || []).length, 'Kriterium', 'Kriterien')} zur Selbstkontrolle`,
    form(a, H) {
      return `${H.rt('muster', 'Musterlösung (erscheint, wenn die Schüler fertig sind)', {pflicht: true})}
        ${H.feld('kriterien', 'Kriterien zum Abhaken – je Zeile eines (optional)', {art: 'zeilen', zeilen: 4, ph: 'nennt …'})}
        <div class="reihe">${H.feld('zeilen', 'Höhe des Textfelds (Zeilen)', {art: 'zahl', ph: '5'})}${H.feld('min', 'Mindestens so viele Zeichen', {art: 'zahl', ph: '1'})}</div>
        <p class="hinweis">Die Antwort wird nicht automatisch bewertet und nicht gespeichert. Die Aufgabe gilt als gelöst, wenn die Selbstkontrolle abgeschlossen ist.</p>`;
    },
    tun: {}
  });

  typ('markieren', {
    name: 'Markieren', symbol: '🖍',
    neu: () => ({typ: 'markieren', frage: 'Markiere alle Nomen.', text: 'Der [[Hund]] bellt im [[Garten]].'}),
    kurz: a => `${n((String(a.text).match(/\[\[/g) || []).length, 'gesuchte Stelle', 'gesuchte Stellen')}, ${a.einheit === 'zeile' ? 'Zeilen' : 'Wörter'} anklicken`,
    form(a, H) {
      const z = a.einheit === 'zeile';
      return `<div class="schalterleiste">${schalter('mono', a.mono, 'Code', 'Schreibmaschinenschrift, Trennung nur an Leerzeichen')}${schalter('anzahl', a.anzahl === false, 'Anzahl nicht verraten')}</div>
        <label class="klein">Angeklickt werden …</label>
        <div class="seg">${H.knopf('einheit', 'Wörter', {m: ''}).replace('btn klein', 'btn klein' + (z ? '' : ' on'))}${H.knopf('einheit', 'ganze Zeilen', {m: 'zeile'}).replace('btn klein', 'btn klein' + (z ? ' on' : ''))}</div>
        ${H.feld('text', 'Text – gesuchte Stellen in doppelte eckige Klammern: [[so]]', {art: 'area', pflicht: true, zeilen: 6})}
        <p class="hinweis">${z ? 'Eine Zeile ist gesucht, wenn irgendwo darin [[…]] steht.' : 'Mehrere Wörter in einer Klammer werden zusammen angeklickt.'} Reiner Text ohne Formatierung.</p>
        ${H.feld('h', 'Hinweis bei Fehlern (optional)')}`;
    },
    tun: {mono: um('mono'), anzahl(a) { if (a.anzahl === false) delete a.anzahl; else a.anzahl = false; }, einheit(a, d) { if (d.m) a.einheit = 'zeile'; else delete a.einheit; }}
  });

  typ('verbessern', {
    name: 'Fehler verbessern', symbol: '🩹',
    neu: () => ({typ: 'verbessern', frage: 'Finde und verbessere die Fehler.', text: 'Gestern [[gehe|ging]] ich in die Schule.\nDort traf ich meine Freunde.'}),
    kurz: a => `${n((String(a.text).match(/\[\[/g) || []).length, 'Fehler', 'Fehler')} in ${n(String(a.text).split('\n').length, 'Zeile', 'Zeilen')}`,
    form(a, H) {
      return `<div class="schalterleiste">${schalter('mono', a.mono, 'Code', 'Schreibmaschinenschrift')}${schalter('gross', a.gross === false, 'Groß/klein egal')}</div>
        ${H.feld('text', 'Text mit Fehlern: [[falsch|richtig]]', {art: 'area', pflicht: true, zeilen: 7})}
        <p class="hinweis">Angezeigt wird das Falsche. Weitere richtige Schreibweisen mit <code>|</code> anhängen: <code>[[falsch|richtig|auch richtig]]</code>. <code>[[zu viel|]]</code> = Stelle soll gelöscht werden.
          Ablauf: Zeile anklicken → falsche Stellen anklicken → verbessern. Stellen sind Wörter (durch Leerzeichen getrennt) und die Klammern.</p>
        ${H.feld('h', 'Hinweis bei falscher Verbesserung (optional)')}`;
    },
    tun: {mono: um('mono'), gross(a) { if (a.gross === false) delete a.gross; else a.gross = false; }}
  });

  /* ---------- Beschriften: Bild einbetten (verkleinert), Punkte durch Klick ins Bild ---------- */
  const LEERBILD = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360"><rect width="600" height="360" fill="#eceff4"/><text x="300" y="186" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#5b6578">Hier erscheint dein Bild</text></svg>');   // nur ASCII (btoa)
  typ('beschriften', {
    name: 'Bild beschriften', symbol: '🏷',
    neu: () => ({typ: 'beschriften', frage: 'Beschrifte das Bild.', bild: LEERBILD, punkte: [{x: 30, y: 40, t: 'Begriff 1'}, {x: 70, y: 60, t: 'Begriff 2'}]}),
    kurz: a => n((a.punkte || []).length, 'Punkt', 'Punkte') + ((a.extra || []).length ? `, ${n(a.extra.length, 'Ablenker', 'Ablenker')}` : ''),
    form(a, H) {
      return `<div class="reihe wrap"><label class="btn klein">🖼 Bild auswählen …<input type="file" accept="image/*" data-bs-bild hidden></label><span class="hinweis">Das Bild wird verkleinert und in die Übung eingebettet (${Math.round(String(a.bild || '').length / 1000)} kB).</span></div>
        ${H.feld('alt', 'Bildbeschreibung (für Screenreader)')}
        <label class="klein">Ins Bild klicken = neuer Punkt</label>
        <div class="bs-bild" data-bs-klick style="position:relative;display:block;width:fit-content;min-width:min(100%,300px);max-width:100%;cursor:crosshair">
          <img src="${H.esc(a.bild || '')}" alt="" draggable="false" style="display:block;width:100%;max-width:100%;border:1px solid var(--border);border-radius:8px">
          ${(a.punkte || []).map((p, i) => `<b style="position:absolute;left:${+p.x}%;top:${+p.y}%;transform:translate(-50%,-50%);display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--accent);color:#fff;font:700 12px system-ui;pointer-events:none">${i + 1}</b>`).join('')}</div>
        <label class="klein">Punkte</label>
        ${(a.punkte || []).map((p, i) => `<div class="reihe"><b>${i + 1}</b>${H.feld(`punkte.${i}.t`, '', {pflicht: true, ph: 'Begriff'})}${H.feld(`punkte.${i}.x`, '', {art: 'zahl', pflicht: true, titel: 'von links in %', ph: 'x %'})}${H.feld(`punkte.${i}.y`, '', {art: 'zahl', pflicht: true, titel: 'von oben in %', ph: 'y %'})}${weg('pweg', {i})}</div>`).join('') || '<p class="hinweis warn">Noch keine Punkte.</p>'}
        ${H.feld('extra', 'Weitere Begriffe als Ablenker (mit Komma trennen)', {art: 'liste'})}`;
    },
    tun: {pweg(a, d) { a.punkte.splice(+d.i, 1); }}
  });
  document.addEventListener('click', e => {
    const box = e.target.closest && e.target.closest('[data-bs-klick]'); if (!box) return;
    const r = box.getBoundingClientRect(), x = Math.round((e.clientX - r.left) / r.width * 1000) / 10, y = Math.round((e.clientY - r.top) / r.height * 1000) / 10;
    B.aendere(a => { if (a.typ === 'beschriften') (a.punkte = a.punkte || []).push({x, y, t: 'Begriff ' + (a.punkte.length + 1)}); });
  });
  document.addEventListener('change', e => {
    const inp = e.target; if (!inp.matches || !inp.matches('[data-bs-bild]') || !inp.files[0]) return;
    const datei = inp.files[0], lies = new FileReader();
    lies.onload = () => {
      if (datei.type === 'image/svg+xml' && lies.result.length < 200000) return B.aendere(a => { a.bild = lies.result; });
      const img = new Image();
      img.onload = () => {   // auf höchstens 1000 px Breite verkleinern, als JPEG (Fotos) – bleibt unter Seite.MAX_BILD
        let q = 0.82, w = Math.min(1000, img.naturalWidth), url = '';
        for (let k = 0; k < 6; k++) {
          const c = document.createElement('canvas'); c.width = w; c.height = Math.round(img.naturalHeight * w / img.naturalWidth);
          const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
          url = c.toDataURL('image/jpeg', q);
          if (url.length <= Seite.MAX_BILD * 0.9) break;
          w = Math.round(w * 0.8); q = Math.max(0.6, q - 0.06);
        }
        B.aendere(a => { a.bild = url; });
      };
      img.onerror = () => alert('Das Bild konnte nicht gelesen werden.');
      img.src = lies.result;
    };
    lies.readAsDataURL(datei);
  });

  typ('bloecke', {
    name: 'Blöcke bauen', symbol: '🧱',
    neu: () => ({typ: 'bloecke', frage: 'Baue die Formel für die Zinsen.', start: 'Z =', bloecke: ['K', 'p', 't', '·', ':', '(', ')', '100', '360'], loesung: ['K', '·', 'p', '·', 't', ':', '(', '100', '·', '360', ')'], gleichwertig: true}),
    kurz: a => `${n((a.bloecke || []).length, 'Block', 'Blöcke')} im Vorrat` + (a.gleichwertig ? ', gleichwertige Formeln zählen' : ''),
    form(a, H) {
      const mehr = Array.isArray(a.loesungen);
      return `<div class="schalterleiste">${schalter('gleichwertig', a.gleichwertig, 'Formel: gleichwertig zählt', 'Jede rechnerisch gleichwertige Formel ist richtig (z. B. K · p oder p · K)')}${schalter('einmal', a.einmal, 'jeder Block nur einmal')}
          ${schalter('senkrecht', a.senkrecht, 'untereinander', 'Blöcke untereinander wie Programmzeilen')}${schalter('mono', a.mono, 'Code')}</div>
        ${H.feld('bloecke', 'Blöcke im Vorrat – je Zeile ein Block (auch Ablenker)', {art: 'zeilen', pflicht: true, zeilen: 6, neu: true})}
        ${H.feld('start', 'Fester Text vor dem Feld (optional)', {ph: 'Z ='})}
        ${mehr ? H.feld('loesungen', 'Lösungen – je Zeile eine, Blöcke mit Komma getrennt', {art: 'gruppen', pflicht: true, zeilen: 3})
          : H.feld('loesung', 'Lösung – je Zeile ein Block, in der richtigen Reihenfolge', {art: 'zeilen', pflicht: true, zeilen: 6})}
        <div class="reihe">${H.knopf('mehr', mehr ? 'Nur eine Lösung' : 'Mehrere Lösungen angeben')}</div>
        ${a.gleichwertig ? '<p class="hinweis">Gerechnet wird mit · : + − ( ) und Zahlen; Buchstaben sind Größen. „=“ trennt die Seiten einer Gleichung.</p>' : ''}
        ${H.feld('h', 'Hinweis bei Fehlern (optional)')}`;
    },
    tun: {
      gleichwertig: um('gleichwertig'), einmal: um('einmal'), senkrecht: um('senkrecht'), mono: um('mono'),
      mehr(a) { if (Array.isArray(a.loesungen)) { a.loesung = a.loesungen[0] || []; delete a.loesungen; } else { a.loesungen = [a.loesung || []]; delete a.loesung; } }
    }
  });

  typ('karteikarten', {
    name: 'Karteikarten', symbol: '🃏',
    neu: () => ({typ: 'karteikarten', frage: 'Lerne die Begriffe.', karten: [{v: 'Begriff', r: 'Erklärung'}, {v: 'Begriff 2', r: 'Erklärung 2'}]}),
    kurz: a => n((a.karten || []).length, 'Karte', 'Karten'),
    form(a, H) {
      return `<label class="klein">Karten: Vorderseite – Rückseite (⠿ ziehen zum Sortieren)</label>
        ${(a.karten || []).map((k, i) => H.zeile('karten', i, `<div class="reihe">${H.feld(`karten.${i}.v`, '', {pflicht: true, ph: 'Vorderseite'})}${H.feld(`karten.${i}.r`, '', {pflicht: true, ph: 'Rückseite'})}${weg('kweg', {i})}</div>`)).join('')}${plus('kplus', 'Karte')}
        ${H.feld('mischen', 'Reihenfolge behalten (nicht mischen)', {art: 'nein'})}
        <p class="hinweis">Nicht gewusste Karten kommen wieder. Gelöst, wenn alle Karten gewusst sind.</p>`;
    },
    tun: {kplus(a) { a.karten.push({v: '', r: ''}); }, kweg(a, d) { a.karten.splice(+d.i, 1); }}
  });

  typ('kreuzwort', {
    name: 'Kreuzworträtsel', symbol: '🔠',
    neu: () => ({typ: 'kreuzwort', frage: 'Löse das Kreuzworträtsel.', woerter: [{w: 'Bilanz', t: 'Gegenüberstellung von Vermögen und Kapital'}, {w: 'Inventur', t: 'Bestandsaufnahme'}, {w: 'Aktiva', t: 'linke Seite der Bilanz'}]}),
    kurz: a => n((a.woerter || []).length, 'Wort', 'Wörter'),
    form(a, H) {
      return `<label class="klein">Wörter: Lösungswort – Hinweis</label>
        ${(a.woerter || []).map((k, i) => H.zeile('woerter', i, `<div class="reihe">${H.feld(`woerter.${i}.w`, '', {pflicht: true, ph: 'Wort'})}${H.feld(`woerter.${i}.t`, '', {pflicht: true, ph: 'Hinweis'})}${weg('wweg', {i})}</div>`)).join('')}${plus('wplus', 'Wort')}
        <p class="hinweis">Das Gitter entsteht von selbst (Vorschau). Buchstaben A–Z, Ä, Ö, Ü; ß wird SS, Leerzeichen entfallen. Wörter ohne gemeinsamen Buchstaben stehen einzeln darunter.</p>`;
    },
    tun: {wplus(a) { a.woerter.push({w: '', t: ''}); }, wweg(a, d) { a.woerter.splice(+d.i, 1); }}
  });
})();
