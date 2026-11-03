/* struktogramm.js – Struktogramme (Nassi-Shneiderman, DIN 66261) zeichnen und exportieren
 *
 * Gemeinsam für struktogramm.html (Editor) und python-struktogramm.html (Python → Struktogramm).
 * Alles unter window.Strukto, kein Build-Schritt, läuft auch per file://.
 *
 * Diagramm  {name, breite, kinder: [Element]}
 * Element   {typ: 'anweisung', text}                    einfache Anweisung
 *           {typ: 'aufruf', text}                       Aufruf eines Unterprogramms (doppelte Seitenlinien)
 *           {typ: 'abbruch', text}                      Aussprung (break, return)
 *           {typ: 'wenn', text, ja: [], nein: []}       Verzweigung
 *           {typ: 'fall', text, faelle: [{text, kinder: []}]}   Fallauswahl (letzter Fall z. B. „sonst“)
 *           {typ: 'kopf', text, kinder: []}             kopfgesteuerte Schleife und Zählschleife
 *           {typ: 'fuss', text, kinder: []}             fußgesteuerte Schleife
 *           {typ: 'block', text, kinder: []}            Programm, Funktion oder Block mit Rahmen
 *
 * Strukto.zeichne(diagramm, farben, opt) → {svg, breite, hoehe, treffer, zonen, inhalt: {y, h}}
 *     farben  Strukto.EXPORT (weiß, schwarze Linien) oder Strukto.farbenAusCss() (Seitenfarben)
 *     opt     {leer: 'Text für leere Listen', titel: false (Name nicht zeichnen)}
 *     breite 0 = automatisch (mindestens 400 px, breiter, bis das längste Wort in jede Spalte passt)
 *     treffer [{el, liste, i, x, y, w, h, H}]  h = anklickbare Fläche, H = ganze Höhe; innere Elemente zuletzt
 *     zonen   [{liste, i, x, y, w}]         Einfügestellen (Ziehen und Ablegen); leere Liste: leer, y0, h = Kasten
 * Strukto.exportiere(diagramm, 'svg' | 'html' | 'jpg')   Datei herunterladen, immer weiß mit schwarzen Linien
 * Strukto.TYPEN               [{typ, name}] in der Reihenfolge der Werkzeugleiste
 * Strukto.neu(typ)            neues Element mit Beispieltext
 * Strukto.listen(el)          alle Unterlisten eines Elements
 * Strukto.pruefe(daten)       Diagramm aus fremdem JSON (Datei öffnen, Speicher) bereinigen, sonst null
 * Strukto.BREITEN             wählbare Breiten in Pixeln (0 = automatisch)
 */
(function () {
  'use strict';

  const FS = 14, CW = FS * 0.6, LH = 19, PX = 8, PY = 7, MINH = 34;
  const BAR = 22, RAND = 12, ASP = 12, AUF = 6, TITEL = 30;
  const FONT = '"DejaVu Sans Mono",Consolas,Menlo,"Liberation Mono",monospace';
  const BREITEN = [0, 400, 600, 800, 1000];   // 0 = automatisch: so breit, dass kein Wort getrennt wird
  const AUTO_MIN = 400, AUTO_MAX = 2400;

  const TYPEN = [
    {typ: 'anweisung', name: 'Anweisung'},
    {typ: 'wenn', name: 'Verzweigung'},
    {typ: 'fall', name: 'Fallauswahl'},
    {typ: 'kopf', name: 'Kopfgesteuerte Schleife'},
    {typ: 'fuss', name: 'Fußgesteuerte Schleife'},
    {typ: 'aufruf', name: 'Aufruf'},
    {typ: 'abbruch', name: 'Aussprung'},
    {typ: 'block', name: 'Block / Funktion'}
  ];
  const BEISPIEL = {anweisung: 'Anweisung', wenn: 'Bedingung', fall: 'Variable', kopf: 'solange Bedingung',
    fuss: 'solange Bedingung', aufruf: 'Unterprogramm()', abbruch: 'Abbruch', block: 'Programm'};

  const EXPORT = {papier: '#ffffff', kopf: '#ffffff', linie: '#000000', schrift: '#000000', leise: '#000000'};

  function farbenAusCss(el){
    const s = getComputedStyle(el || document.documentElement);
    const v = (n, d) => (s.getPropertyValue(n) || '').trim() || d;
    return {papier: v('--panel', '#fff'), kopf: v('--panel2', '#eee'), linie: v('--text', '#000'),
      schrift: v('--text', '#000'), leise: v('--muted', '#777')};
  }

  function neu(typ){
    const e = {typ, text: BEISPIEL[typ] || ''};
    if (typ === 'wenn'){ e.ja = []; e.nein = []; }
    else if (typ === 'fall') e.faelle = [{text: '1', kinder: []}, {text: '2', kinder: []}, {text: 'sonst', kinder: []}];
    else if (typ === 'kopf' || typ === 'fuss' || typ === 'block') e.kinder = [];
    return e;
  }

  function listen(el){
    if (el.typ === 'wenn') return [el.ja, el.nein];
    if (el.typ === 'fall') return el.faelle.map(f => f.kinder);
    if (el.kinder) return [el.kinder];
    return [];
  }

  function pruefe(d){
    const TYP = new Set(TYPEN.map(t => t.typ));
    const txt = t => String(t == null ? '' : t).slice(0, 2000);
    function liste(a, tiefe){
      if (!Array.isArray(a) || tiefe > 40) return [];
      return a.map(e => element(e, tiefe)).filter(Boolean).slice(0, 2000);
    }
    function element(e, tiefe){
      if (!e || !TYP.has(e.typ)) return null;
      const n = {typ: e.typ, text: txt(e.text)};
      if (e.typ === 'wenn'){ n.ja = liste(e.ja, tiefe + 1); n.nein = liste(e.nein, tiefe + 1); }
      else if (e.typ === 'fall'){
        n.faelle = (Array.isArray(e.faelle) ? e.faelle : []).slice(0, 20)
          .map(f => ({text: txt(f && f.text), kinder: liste(f && f.kinder, tiefe + 1)}));
        if (n.faelle.length < 2) return null;
      }
      else if (e.typ === 'kopf' || e.typ === 'fuss' || e.typ === 'block') n.kinder = liste(e.kinder, tiefe + 1);
      return n;
    }
    if (!d || typeof d !== 'object' || !Array.isArray(d.kinder)) return null;
    return {name: txt(d.name).slice(0, 200), breite: BREITEN.includes(+d.breite) ? +d.breite : 0, kinder: liste(d.kinder, 0)};
  }

  /* ---------- Text ---------- */
  const xml = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

  // Bricht nach Zeichenzahl um (Monospace: Breite = Zeichen · 0,6 · Schriftgröße), harte Umbrüche bleiben
  function umbrechen(text, breite){
    const max = Math.max(1, Math.floor((breite - 2 * PX) / CW));
    const out = [];
    String(text || '').split('\n').forEach(absatz => {
      let zeile = '';
      absatz.split(/\s+/).filter(Boolean).forEach(wort => {
        while (wort.length > max){
          if (zeile){ out.push(zeile); zeile = ''; }
          out.push(wort.slice(0, max)); wort = wort.slice(max);
        }
        if (!wort) return;
        if (!zeile) zeile = wort;
        else if (zeile.length + 1 + wort.length <= max) zeile += ' ' + wort;
        else { out.push(zeile); zeile = wort; }
      });
      out.push(zeile);
    });
    return out.length ? out : [''];
  }

  /* ---------- Höhe messen ---------- */
  function hText(zeilen){ return Math.max(MINH, zeilen.length * LH + 2 * PY); }
  function kopfText(el, w){ return umbrechen(el.text, w); }
  function dreieck(el, w, px){
    const zeilen = umbrechen(el.text, Math.max(4 * CW + 2 * PX, Math.min(px, w - px)));
    return {zeilen, h: 2 * (PY + zeilen.length * LH)};
  }
  function fallMasse(el, w){
    const n = el.faelle.length, sw = w / n, px = sw * (n - 1);
    const d = dreieck(el, w, px);
    const labels = el.faelle.map(f => umbrechen(f.text, sw));
    const lh = Math.max(...labels.map(l => l.length)) * LH + 6;
    return {n, sw, px, zeilen: d.zeilen, h1: d.h, lh, labels};
  }

  function hoeheListe(liste, w){
    if (!liste.length) return MINH;
    return liste.reduce((s, e) => s + hoehe(e, w), 0);
  }
  function hoehe(el, w){
    switch (el.typ){
      case 'wenn': return dreieck(el, w, w / 2).h + Math.max(hoeheListe(el.ja, w / 2), hoeheListe(el.nein, w - w / 2));
      case 'fall': {
        const m = fallMasse(el, w);
        return m.h1 + m.lh + Math.max(...el.faelle.map(f => hoeheListe(f.kinder, m.sw)));
      }
      case 'kopf': case 'fuss': return hText(kopfText(el, w)) + hoeheListe(el.kinder, w - BAR);
      case 'block': return hText(kopfText(el, w)) + hoeheListe(el.kinder, w - 2 * RAND) + RAND;
      case 'aufruf': return hText(umbrechen(el.text, w - 2 * AUF));
      case 'abbruch': return hText(umbrechen(el.text, w - ASP));
      default: return hText(umbrechen(el.text, w));
    }
  }

  /* ---------- Mindestbreite (automatische Breite) ---------- */
  function wort(text, min){
    const n = Math.max(min || 4, ...String(text || '').split(/\s+/).map(w => w.length));
    return n * CW + 2 * PX;
  }
  function bedarfListe(l){ return Math.max(40, ...l.map(bedarf)); }
  function bedarf(el){
    switch (el.typ){
      case 'wenn': return Math.max(2 * wort(el.text), 2 * wort('', 6), 2 * Math.max(bedarfListe(el.ja), bedarfListe(el.nein)));
      case 'fall': return Math.max(2 * wort(el.text), el.faelle.length * Math.max(...el.faelle.map(f => Math.max(wort(f.text), bedarfListe(f.kinder)))));
      case 'kopf': case 'fuss': return Math.max(wort(el.text), BAR + bedarfListe(el.kinder));
      case 'block': return Math.max(wort(el.text), 2 * RAND + bedarfListe(el.kinder));
      case 'aufruf': return wort(el.text) + 2 * AUF;
      case 'abbruch': return wort(el.text) + ASP;
      default: return wort(el.text);
    }
  }

  /* ---------- Zeichnen ---------- */
  function zeichne(d, F, opt){
    opt = opt || {};
    const W = d.breite || Math.ceil(Math.min(AUTO_MAX, Math.max(AUTO_MIN, bedarfListe(d.kinder))));
    const out = [], treffer = [], zonen = [];
    const r = n => Math.round(n * 10) / 10;
    const rect = (x, y, w, h, fill) => out.push(`<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" fill="${fill || F.papier}" stroke="${F.linie}"/>`);
    const linie = (x1, y1, x2, y2) => out.push(`<line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}" stroke="${F.linie}"/>`);
    function text(zeilen, x, y, h, anker, farbe, gross){
      const y0 = y + (h - zeilen.length * LH) / 2 + LH * 0.72;
      zeilen.forEach((z, k) => { if (z) out.push(`<text x="${r(x)}" y="${r(y0 + k * LH)}" text-anchor="${anker || 'start'}" fill="${farbe || F.schrift}"${gross ? ` font-size="${gross}"` : ''}>${xml(z)}</text>`); });
    }

    // Liste von Elementen in die Höhe H strecken: das letzte Element bekommt den Rest
    function liste(l, x, y, w, H){
      if (!l.length){
        rect(x, y, w, H);
        if (opt.leer) text([opt.leer], x + w / 2, y, Math.min(H, MINH), 'middle', F.leise);
        zonen.push({liste: l, i: 0, x, y: y + Math.min(H, MINH) / 2, w, leer: true, y0: y, h: H});
        return;
      }
      let yy = y;
      l.forEach((el, i) => {
        zonen.push({liste: l, i, x, y: yy, w});
        const natur = hoehe(el, w);
        let h = i === l.length - 1 ? y + H - yy : natur;
        if (el.typ === 'abbruch' && h > natur + 0.5){ rect(x, yy + natur, w, h - natur); h = natur; }
        element(el, x, yy, w, h, l, i);
        yy += h;
      });
      zonen.push({liste: l, i: l.length, x, y: y + H, w});
    }

    function element(el, x, y, w, H, l, i){
      const t = {el, liste: l, i, x, y, w, h: H, H};
      treffer.push(t);
      switch (el.typ){
        case 'wenn': {
          const dr = dreieck(el, w, w / 2), wl = w / 2;
          rect(x, y, w, dr.h, F.kopf);
          linie(x, y, x + wl, y + dr.h); linie(x + w, y, x + wl, y + dr.h);
          text(dr.zeilen, x + wl, y + PY / 2, dr.zeilen.length * LH + PY, 'middle');
          text(['wahr'], x + PX / 2, y + dr.h - LH, LH, 'start', F.schrift, 12);
          text(['falsch'], x + w - PX / 2, y + dr.h - LH, LH, 'end', F.schrift, 12);
          t.h = dr.h;
          liste(el.ja, x, y + dr.h, wl, H - dr.h);
          liste(el.nein, x + wl, y + dr.h, w - wl, H - dr.h);
          break;
        }
        case 'fall': {
          const m = fallMasse(el, w), yk = y + m.h1;
          rect(x, y, w, m.h1 + m.lh, F.kopf);
          linie(x, y, x + m.px, yk); linie(x + w, y, x + m.px, yk); linie(x, yk, x + w, yk);
          const mitte = Math.min(Math.max(x + m.px, x + w * 0.25), x + w * 0.75);
          text(m.zeilen, mitte, y + PY / 2, m.zeilen.length * LH + PY, 'middle');
          el.faelle.forEach((f, k) => {
            const fx = x + k * m.sw;
            if (k) linie(fx, yk, fx, yk + m.lh);
            text(m.labels[k], fx + m.sw / 2, yk, m.lh, 'middle');
            liste(f.kinder, fx, yk + m.lh, k === m.n - 1 ? x + w - fx : m.sw, H - m.h1 - m.lh);
          });
          t.h = m.h1 + m.lh;
          break;
        }
        case 'kopf': case 'fuss': {
          const z = kopfText(el, w), hk = hText(z), kopf = el.typ === 'kopf';
          rect(x, y, w, H, F.kopf);
          const yt = kopf ? y : y + H - hk;
          text(z, x + PX, yt, hk);
          liste(el.kinder, x + BAR, kopf ? y + hk : y, w - BAR, H - hk);
          t.kopfY = yt; t.kopfH = hk;
          break;
        }
        case 'block': {
          const z = kopfText(el, w), hk = hText(z);
          rect(x, y, w, H, F.kopf);
          text(z, x + PX, y, hk, 'start', F.schrift);
          liste(el.kinder, x + RAND, y + hk, w - 2 * RAND, H - hk - RAND);
          t.kopfH = hk;
          break;
        }
        case 'aufruf': {
          rect(x, y, w, H);
          linie(x + AUF, y, x + AUF, y + H); linie(x + w - AUF, y, x + w - AUF, y + H);
          text(umbrechen(el.text, w - 2 * AUF), x + AUF + PX, y, H);
          break;
        }
        case 'abbruch': {
          rect(x, y, w, H);
          out.push(`<polyline points="${r(x + ASP)},${r(y)} ${r(x)},${r(y + H / 2)} ${r(x + ASP)},${r(y + H)}" fill="none" stroke="${F.linie}"/>`);
          text(umbrechen(el.text, w - ASP), x + ASP + PX, y, H);
          break;
        }
        default: {
          rect(x, y, w, H);
          text(umbrechen(el.text, w), x + PX, y, H);
        }
      }
    }

    const titel = opt.titel !== false && d.name ? TITEL : 0;
    const H = hoeheListe(d.kinder, W);
    if (titel) out.push(`<text x="0" y="20" font-weight="bold" font-size="16" fill="${F.schrift}">${xml(d.name)}</text>`);
    liste(d.kinder, 0, titel, W, H);
    const B = W + 2, HH = H + titel + 2;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${HH}" viewBox="-1 -1 ${B} ${HH}" font-family='${FONT}' font-size="${FS}" stroke-width="1.5">`
      + `<rect x="-1" y="-1" width="${B}" height="${HH}" fill="${F.papier}"/>` + out.join('') + '</svg>';
    return {svg, breite: B, hoehe: HH, treffer, zonen, inhalt: {y: titel, h: H}};
  }

  /* ---------- Export ---------- */
  function dateiname(d){
    return (String(d.name || '').trim().replace(/[^\wäöüÄÖÜß-]+/g, '_').replace(/^_+|_+$/g, '') || 'struktogramm');
  }
  function laden(blob, name){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  function exportiere(d, art){
    const z = zeichne(d, EXPORT, {});
    const svg = '<?xml version="1.0" encoding="UTF-8"?>\n' + z.svg;
    const name = dateiname(d);
    if (art === 'svg') return laden(new Blob([svg], {type: 'image/svg+xml'}), name + '.svg');
    if (art === 'html'){
      const html = `<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<title>${xml(d.name || 'Struktogramm')}</title>\n`
        + '<style>body{margin:24px;background:#fff}</style>\n</head>\n<body>\n' + z.svg + '\n</body>\n</html>\n';
      return laden(new Blob([html], {type: 'text/html'}), name + '.html');
    }
    // JPG: SVG in doppelter Auflösung auf weißen Hintergrund zeichnen
    return new Promise((ok, fehler) => {
      const img = new Image(), s = 2;
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = z.breite * s; c.height = z.hoehe * s;
        const g = c.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(b => { if (b){ laden(b, name + '.jpg'); ok(); } else fehler(new Error('JPG fehlgeschlagen')); }, 'image/jpeg', 0.95);
      };
      img.onerror = () => fehler(new Error('Bild konnte nicht erzeugt werden'));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(z.svg);
    });
  }

  window.Strukto = {zeichne, exportiere, farbenAusCss, EXPORT, TYPEN, BREITEN, neu, listen, pruefe, umbrechen};
})();
