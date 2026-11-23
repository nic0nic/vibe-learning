/* arbeitsblatt.js – Markdown → Arbeitsblatt im Layout der Selbstlernhefte (A4, schwarz-weiß)
 *
 * Arbeitsblatt.lesen(md)            → doc = {meta: {fach, fuss, kopf}, bloecke: [{typ, titel, text, name, attr}]}
 * Arbeitsblatt.schreiben(doc)       → Markdown (Umkehrung von lesen, für den Block-Editor)
 * Arbeitsblatt.seite(doc, modus, o) → komplettes HTML-Dokument (A4-Seiten, Umbruch per Skript beim Laden)
 *                                     modus 's' Schüler (Lücken leer), 'l' Lehrkraft (Lösungen blau), 'lb' Lösungsblätter
 *                                     o.vorschau = true: Klick auf einen Block meldet {blatt:'wahl', i} an das Elternfenster,
 *                                     o.zoom = Verkleinerung am Bildschirm; nach dem Umbruch kommt {blatt:'fertig', seiten, zuGross}
 * Arbeitsblatt.TYPEN                → [{typ, name, md}] für die Blockleiste
 * Arbeitsblatt.leer(typ)            → neuer Block
 *
 * Markdown:
 *   Vorspann     ---\nfach: BwR 9 · Finanzierung\nfuss: Fußzeile\nkopf: nein\n---   (alles optional)
 *   # Titel      Kopfzeile Name/Klasse/Datum + Überschrift      ## Kapitel (nummeriert)      ### Zwischenüberschrift
 *   ---          Seitenumbruch          normaler Text → Info-Block (Linie links)
 *   > [!TYP|attr|attr] Titel            Warnungsblock, Inhalt in den folgenden >-Zeilen
 *       TYP: AUFTRAG, ALLTAG, BEISPIEL, UEBERBLICK (MERKE), AUFGABEN, MATERIAL, FORMEL, HINWEIS, CHECK, PLAN,
 *            LEGENDE, INFO, HTML (roh); GitHub: NOTE=Info, TIP=Beispiel, IMPORTANT=Überblick, WARNING=Auftrag,
 *            CAUTION=Hinweis; unbekannte Namen werden ein grauer Kasten mit diesem Namen
 *       attr: 2spaltig, zusammen (nie trennen), neue-seite, nr=3 (Lösungsblatt), klasse=…, stil=… (CSS)
 *   ## Titel {neue-seite|stil=…}        Attribute für Überschriften
 *   [[Antwort]] [[Antwort|30mm]]        Lücke (Schüler leer, Lehrkraft blau)
 *   [[linien 3]] [[karo 4]]             Schreibplatz auf dem Blatt (eigene Zeile)
 *   |||                                 eigene Zeile: Spaltenumbruch (zwei feste Spalten)
 *   ![Text|60%](bild.png)               Bild mit Breite
 *   Aufgaben: nummerierte Liste in [!AUFGABEN], Zeile „Lösung: …“ im Punkt erscheint nur in der Lehrkraftfassung
 *   Rohes HTML (Zeile beginnt mit <div, <table, <svg, <style …) bleibt erhalten.
 */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

  const TYPEN = [
    {typ: 'titel', name: 'Titel', md: '#'},
    {typ: 'kap', name: 'Kapitel', md: '##'},
    {typ: 'h3', name: 'Zwischentitel', md: '###'},
    {typ: 'info', name: 'Info', md: 'INFO'},
    {typ: 'auftrag', name: 'Auftrag', md: 'AUFTRAG'},
    {typ: 'alltag', name: 'Alltag', md: 'ALLTAG'},
    {typ: 'beispiel', name: 'Beispiel', md: 'BEISPIEL'},
    {typ: 'ueberblick', name: 'Überblick', md: 'UEBERBLICK'},
    {typ: 'aufgaben', name: 'Aufgaben', md: 'AUFGABEN'},
    {typ: 'material', name: 'Material', md: 'MATERIAL'},
    {typ: 'formel', name: 'Formel', md: 'FORMEL'},
    {typ: 'hinweis', name: 'Hinweis', md: 'HINWEIS'},
    {typ: 'check', name: 'Lösung vergleichen', md: 'CHECK'},
    {typ: 'plan', name: 'Arbeitsplan', md: 'PLAN'},
    {typ: 'legende', name: 'Legende', md: 'LEGENDE'},
    {typ: 'html', name: 'Eigenes HTML', md: 'HTML'},
    {typ: 'seite', name: 'Seitenumbruch', md: '---'}
  ];
  const MD = Object.fromEntries(TYPEN.map(t => [t.typ, t.md]));
  const norm = s => String(s).trim().toUpperCase().replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE').replace(/ß/g, 'SS').replace(/[^A-Z0-9]/g, '');
  const ALIAS = Object.assign(Object.fromEntries(TYPEN.filter(t => /^[A-Z]/.test(t.md)).map(t => [t.md, t.typ])), {
    NOTE: 'info', TIP: 'beispiel', IMPORTANT: 'ueberblick', WARNING: 'auftrag', CAUTION: 'hinweis',
    MERKE: 'ueberblick', MERKKASTEN: 'ueberblick', UBERBLICK: 'ueberblick', AUFGABE: 'aufgaben', ARBEITSAUFTRAG: 'aufgaben',
    SZENARIO: 'auftrag', KONTROLLE: 'check', ARBEITSPLAN: 'plan', ROH: 'html'
  });
  const OHNE_INHALT = ['seite', 'plan', 'legende', 'titel', 'kap', 'h3'];
  const MIT_TITEL = ['titel', 'kap', 'h3', 'auftrag', 'alltag', 'beispiel', 'ueberblick', 'aufgaben', 'material', 'box'];
  const MIT_NR = ['ueberblick', 'aufgaben', 'check'];

  const leer = typ => ({typ, titel: '', text: '', name: '', attr: {}});

  /* ---------- Attribute ---------- */
  function attrLesen(s) {
    const a = {};
    String(s || '').split('|').map(x => x.trim()).filter(Boolean).forEach(x => {
      const m = /^([\w-]+)\s*=\s*(.*)$/.exec(x);
      const k = (m ? m[1] : x).toLowerCase();
      if (['2spaltig', 'zweispaltig', 'spalten', 'cols'].includes(k)) a.spalten = true;
      else if (['zusammen', 'keep'].includes(k)) a.zusammen = true;
      else if (['neue-seite', 'neueseite', 'pb', 'umbruch'].includes(k)) a.seite = true;
      else if (m && k === 'nr') a.nr = m[2];
      else if (m && ['klasse', 'class'].includes(k)) a.klasse = m[2];
      else if (m && ['stil', 'style'].includes(k)) a.stil = m[2];
      else (a.rest = a.rest || []).push(x);
    });
    return a;
  }
  function attrText(a) {
    a = a || {};
    return [a.spalten && '2spaltig', a.zusammen && 'zusammen', a.seite && 'neue-seite', a.nr && 'nr=' + a.nr,
      a.klasse && 'klasse=' + a.klasse, a.stil && 'stil=' + a.stil].concat(a.rest || []).filter(Boolean).join('|');
  }
  const hatAttr = a => !!attrText(a);

  /* ---------- Markdown → Blöcke ---------- */
  const HTML_START = /^<(div|table|svg|section|figure|style|aside|details|article|header|footer|p|ul|ol|img|hr|!--)\b/i;

  function lesen(md) {
    const z = String(md || '').replace(/\r\n?/g, '\n').split('\n');
    const meta = {};
    let i = 0;
    if (z[0] === '---') {
      const j = z.indexOf('---', 1);
      if (j > 1 && z.slice(1, j).every(l => /^[\w-]+\s*:/.test(l) || !l.trim())) {
        z.slice(1, j).forEach(l => { const m = /^([\w-]+)\s*:\s*(.*)$/.exec(l); if (m) meta[m[1].toLowerCase()] = m[2].trim(); });
        i = j + 1;
      }
    }
    const bloecke = [];
    let puffer = [];
    const leeren = () => {
      while (puffer.length && !puffer[0].trim()) puffer.shift();
      while (puffer.length && !puffer[puffer.length - 1].trim()) puffer.pop();
      if (puffer.length) bloecke.push(Object.assign(leer('info'), {text: puffer.join('\n')}));
      puffer = [];
    };
    for (; i < z.length; i++) {
      const l = z[i];
      let m;
      if (/^\s*(```|~~~)/.test(l)) {                       // Codeblock bleibt im Text
        puffer.push(l);
        while (++i < z.length) { puffer.push(z[i]); if (/^\s*(```|~~~)/.test(z[i])) break; }
      } else if ((m = /^(#{1,3})\s+(.*?)\s*(?:\{([^{}]*)\})?\s*$/.exec(l))) {
        leeren();
        bloecke.push(Object.assign(leer(['titel', 'kap', 'h3'][m[1].length - 1]), {titel: m[2], attr: attrLesen(m[3])}));
      } else if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(l)) {
        leeren();
        bloecke.push(leer('seite'));
      } else if ((m = /^\s{0,3}>\s?\[!([^\]|]+)((?:\|[^\]]*)?)\]\s*(.*)$/.exec(l))) {
        leeren();
        const inhalt = [];
        while (i + 1 < z.length && /^\s{0,3}>/.test(z[i + 1])) inhalt.push(z[++i].replace(/^\s{0,3}> ?/, ''));
        while (inhalt.length && !inhalt[0].trim()) inhalt.shift();
        while (inhalt.length && !inhalt[inhalt.length - 1].trim()) inhalt.pop();
        const typ = ALIAS[norm(m[1])] || 'box';
        bloecke.push({typ, titel: m[3].trim(), text: inhalt.join('\n'), name: m[1].trim(), attr: attrLesen(m[2].slice(1))});
      } else if (HTML_START.test(l) && !(puffer.length && puffer[puffer.length - 1].trim())) {
        leeren();
        const roh = [l];
        while (i + 1 < z.length && z[i + 1].trim()) roh.push(z[++i]);
        bloecke.push(Object.assign(leer('html'), {text: roh.join('\n')}));
      } else puffer.push(l);
    }
    leeren();
    return {meta, bloecke};
  }

  /* ---------- Blöcke → Markdown ---------- */
  function schreiben(doc) {
    const teile = [];
    const m = doc.meta || {};
    const mz = ['fach', 'fuss', 'kopf'].filter(k => m[k]).map(k => k + ': ' + m[k]);
    if (mz.length) teile.push('---\n' + mz.join('\n') + '\n---');
    doc.bloecke.forEach(b => {
      const a = attrText(b.attr);
      if (b.typ === 'seite' && !a) teile.push('---');
      else if (['titel', 'kap', 'h3'].includes(b.typ)) teile.push(MD[b.typ] + ' ' + (b.titel || '').trim() + (a ? ' {' + a + '}' : ''));
      else if (b.typ === 'info' && !a && b.text.trim() && !/^\s*>|^\s*#|^\s{0,3}([-*_])(\s*\1){2,}\s*$/m.test(b.text) && !HTML_START.test(b.text.trim())) teile.push(b.text.trim());
      else if (b.typ === 'html' && !a && HTML_START.test(b.text.trim()) && !/\n\s*\n/.test(b.text.trim())) teile.push(b.text.trim());
      else {
        let name = b.typ === 'box' ? (b.name || 'KASTEN') : MD[b.typ];
        if (b.name && ALIAS[norm(b.name)] === b.typ) name = b.name;   // eigene Schreibweise (Auftrag, NOTE …) behalten
        const kopf = '> [!' + name + (a ? '|' + a : '') + ']' + (b.titel ? ' ' + b.titel.trim() : '');
        const inhalt = (b.text || '').trim();
        teile.push(kopf + (inhalt ? '\n' + inhalt.split('\n').map(x => x ? '> ' + x : '>').join('\n') : ''));
      }
    });
    return teile.join('\n\n') + '\n';
  }

  /* ---------- Markdown-Text → HTML ---------- */
  function luecke(inhalt) {
    const t = inhalt.split('|');
    const w = t.length > 1 ? t.pop().trim() : '';
    const text = t.join('|').trim();
    return `<span class="a${text.length > 28 ? ' lang' : ''}"${w ? ` style="min-width:${esc(w)}"` : ''}>${inline(text, true)}</span>`;
  }

  function inline(s, ohneLuecken) {
    const halt = [];
    const merk = h => '\u0001' + (halt.push(h) - 1) + '\u0002';
    s = s.replace(/`([^`]+)`/g, (x, c) => merk('<code>' + esc(c) + '</code>'));
    if (!ohneLuecken) s = s.replace(/\[\[((?:(?!\]\]).)+)\]\]/g, (x, c) => merk(luecke(c)));
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (x, alt, src) => {
      const t = alt.split('|');
      const w = t.length > 1 ? t.pop().trim() : '';
      return merk(`<img src="${esc(src)}" alt="${esc(t.join('|'))}"${w ? ` style="width:${esc(w)}"` : ''}>`);
    });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (x, t, u) => merk(`<a href="${esc(u)}">`) + t + merk('</a>'));
    s = s.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (x, a, b) => '<b>' + (a || b) + '</b>');
    s = s.replace(/\*([^*\s][^*]*)\*/g, '<i>$1</i>').replace(/(^|[^\w])_([^_\s][^_]*)_(?!\w)/g, '$1<i>$2</i>');
    s = s.replace(/==([^=]+)==/g, '<mark>$1</mark>');
    s = s.replace(/( {2,}|\\)\n/g, '<br>\n');
    return s.replace(/\u0001(\d+)\u0002/g, (x, n) => halt[n]);
  }

  function zellen(l) {
    const out = [];
    let cur = '', tief = 0;
    l = l.trim().replace(/^\|/, '').replace(/\|$/, '');
    for (let k = 0; k < l.length; k++) {
      const c = l[k];
      if (c === '\\' && l[k + 1] === '|') { cur += '|'; k++; continue; }
      if (c === '[' && l[k + 1] === '[') tief++;
      if (c === ']' && l[k + 1] === ']' && tief) tief--;
      if (c === '|' && !tief) { out.push(cur.trim()); cur = ''; } else cur += c;
    }
    out.push(cur.trim());
    return out;
  }

  const LISTE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
  const PLATZ = /^\s*\[\[(linien|karo)\s+(\d+(?:[.,]\d+)?)\]\]\s*$/i;

  function platz(art, n, inhalt) {
    n = parseFloat(String(n).replace(',', '.'));
    if (art.toLowerCase() === 'linien') return `<div class="ab" style="height:${n * 7.5}mm"><div class="at">${inhalt || ''}</div></div>`;
    const W = 180, H = Math.round(n) * 5;
    let d = '';
    for (let y = 0; y <= H; y += 5) d += `M0 ${y}H${W}`;
    for (let x = 0; x <= W; x += 5) d += `M${x} 0V${H}`;
    return `<div class="karo" style="height:${H}mm"><svg class="grid" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:${W}mm;height:${H}mm"><path d="${d}" stroke="#8a8a8a" stroke-width="0.18" fill="none"/></svg><div class="at">${inhalt || ''}</div></div>`;
  }

  function block(md) {
    const z = String(md || '').replace(/\r\n?/g, '\n').split('\n');
    const teil = z.findIndex(l => l.trim() === '|||');
    if (teil >= 0) return `<div class="zwei"><div>${block(z.slice(0, teil).join('\n'))}</div><div>${block(z.slice(teil + 1).join('\n'))}</div></div>`;
    let out = '', i = 0;
    while (i < z.length) {
      const l = z[i];
      let m;
      if (!l.trim()) { i++; continue; }
      if ((m = /^\s*(```|~~~)/.exec(l))) {
        const code = [];
        while (++i < z.length && !/^\s*(```|~~~)/.test(z[i])) code.push(z[i]);
        i++;
        out += `<pre class="code">${esc(code.join('\n'))}</pre>`;
      } else if ((m = PLATZ.exec(l))) {
        out += platz(m[1], m[2]); i++;
      } else if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) {
        out += m[1].length <= 3 ? `<h3 class="h3">${inline(m[2])}</h3>` : `<h4>${inline(m[2])}</h4>`; i++;
      } else if (/^\s*\|/.test(l) && i + 1 < z.length && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(z[i + 1])) {
        const kopf = zellen(l);
        i += 2;
        let rows = '';
        while (i < z.length && /^\s*\|/.test(z[i])) rows += '<tr>' + zellen(z[i++]).map(c => `<td>${inline(c)}</td>`).join('') + '</tr>';
        const th = kopf.some(Boolean) ? '<tr>' + kopf.map(c => `<th>${inline(c)}</th>`).join('') + '</tr>' : '';
        out += `<table class="t">${th}${rows}</table>`;
      } else if (LISTE.test(l)) {
        const zeilen = [];
        while (i < z.length && (LISTE.test(z[i]) || /^\s+\S/.test(z[i]) || (!z[i].trim() && i + 1 < z.length && (LISTE.test(z[i + 1]) || /^\s+\S/.test(z[i + 1]))))) zeilen.push(z[i++]);
        out += liste(zeilen);
      } else if (/^\s*>/.test(l)) {
        const q = [];
        while (i < z.length && /^\s*>/.test(z[i])) q.push(z[i++].replace(/^\s*> ?/, ''));
        out += `<blockquote>${block(q.join('\n'))}</blockquote>`;
      } else if (HTML_START.test(l.trim())) {
        const roh = [];
        while (i < z.length && z[i].trim()) roh.push(z[i++]);
        out += roh.join('\n');
      } else {
        const p = [];
        while (i < z.length && z[i].trim() && !LISTE.test(z[i]) && !/^(#{1,6})\s|^\s*(```|~~~|>)/.test(z[i]) && !PLATZ.test(z[i]) &&
          !(/^\s*\|/.test(z[i]) && p.length === 0)) p.push(z[i++]);
        if (!p.length) { out += inline(z[i++]); continue; }
        const t = p.join('\n');
        const bild = /^\s*!\[[^\]]*\]\([^)]+\)\s*$/.test(t);
        out += bild ? `<div class="fig">${inline(t.trim())}</div>` : `<p>${inline(t)}</p>`;
      }
    }
    return out;
  }

  function liste(zeilen) {
    const ein = zeilen.filter(l => LISTE.test(l)).map(l => LISTE.exec(l)[1].length);
    const basis = Math.min(...ein);
    const items = [];
    let geordnet = false;
    zeilen.forEach(l => {
      const m = LISTE.exec(l);
      if (m && m[1].length === basis) {
        geordnet = geordnet || /\d/.test(m[2]);
        items.push([m[3]]);
      } else if (items.length) items[items.length - 1].push(l.replace(new RegExp('^\\s{0,' + (basis + 4) + '}'), ''));
    });
    const tag = geordnet ? 'ol' : 'ul';
    return `<${tag}>` + items.map(it => `<li>${ohneP(block(it.join('\n')))}</li>`).join('') + `</${tag}>`;
  }

  const ohneP = h => { const m = /^<p>([\s\S]*?)<\/p>([\s\S]*)$/.exec(h); return m && !/<p>/.test(m[1]) ? m[1] + m[2] : h; };

  /* ---------- Aufgaben ---------- */
  function aufgaben(b, ctx, nrPrefix) {
    const z = b.text.split('\n');
    const vor = [], items = [];
    let cur = null;
    z.forEach(l => {
      const m = /^(\d+)[.)]\s+(.*)$/.exec(l);
      if (m) items.push(cur = [m[2]]);
      else if (cur) cur.push(l.replace(/^( {1,4}|\t)/, ''));
      else vor.push(l);
    });
    let out = '';
    if (vor.join('').trim()) out += `<div class="avor" data-b="${ctx.i}">${block(vor.join('\n'))}</div>`;
    items.forEach((it, k) => {
      const nr = (nrPrefix ? nrPrefix + '.' : '') + (k + 1);
      let li = it.findIndex(l => /^\s*L(ö|oe)sung\s*:/i.test(l));
      const auf = li >= 0 ? it.slice(0, li) : it.slice();
      const lsg = li >= 0 ? [it[li].replace(/^\s*L(ö|oe)sung\s*:\s*/i, '')].concat(it.slice(li + 1)).join('\n').trim() : '';
      let raum = null;
      for (let j = auf.length - 1; j >= 0; j--) {
        const m = PLATZ.exec(auf[j]) || /\[\[(linien|karo)\s+(\d+(?:[.,]\d+)?)\]\]/i.exec(auf[j]);
        if (m) { raum = m; auf[j] = auf[j].replace(m[0].trim(), ''); break; }
      }
      const lsgHtml = lsg && ctx.modus !== 's' ? ohneP(block(lsg)) : '';
      let extra = '';
      if (raum) extra = platz(raum[1], raum[2], lsgHtml);
      else if (lsgHtml) extra = `<div class="lt"><div class="at">${lsgHtml}</div></div>`;
      out += `<div class="task" data-b="${ctx.i}"><b class="tn">${nr}</b> ${ohneP(block(auf.join('\n')))}${extra}</div>`;
    });
    return out;
  }

  /* ---------- Blöcke → HTML ---------- */
  const LEGENDE = `<div class="legende">
<div><span class="mini mi">INFO</span> Lies den Text genau und markiere Fachbegriffe.</div>
<div><span class="mini ma">ALLTAG</span> Vergleich mit dem echten Leben – hilft beim Verstehen.</div>
<div><span class="mini mu">ÜBERBLICK</span> Ergänze die Lücken. Das ist dein Merkkasten zum Lernen.</div>
<div><span class="mini mk">✎ AUFGABEN</span> Bearbeite sie selbstständig auf deinem Blockblatt.</div>
<div><span class="mini mc">✔ L1</span> Hole dir das Lösungsblatt, vergleiche und korrigiere.</div></div>`;
  const HINWEIS = '✎ Bearbeite alle Aufgaben auf einem <b>eigenen Blockblatt</b> (Aufgabennummer davor schreiben). <b>Ausnahme:</b> Lücken, Tabellen und Kästchen, die auf dem Blatt vorgegeben sind, füllst du direkt hier aus.';

  function rendern(doc, modus) {
    const ctx = {modus, kap: 0, lsg: {}, kapTitel: {}};
    const kaps = [];
    let k = 0;
    doc.bloecke.forEach(b => { if (b.typ === 'kap') kaps.push([++k, b.titel]); });
    const titel = (doc.bloecke.find(b => b.typ === 'titel') || {}).titel || '';
    const teile = doc.bloecke.map((b, i) => {
      ctx.i = i;
      const a = b.attr || {};
      const inhalt = h => a.spalten && b.typ !== 'info' ? `<div class="cols">${h}</div>` : h;
      const nr = a.nr || ctx.kap || 1;
      const kl = base => [base, a.spalten && b.typ === 'info' && 'cols', a.zusammen && 'keep', a.seite && 'pb', a.klasse].filter(Boolean).join(' ');
      const st = a.stil ? ` style="${esc(a.stil)}"` : '';
      const box = (base, h) => `<div class="${kl(base)}" data-b="${i}"${st}>${h}</div>`;
      let h;
      switch (b.typ) {
        case 'titel':
          h = box('blattkopf', ((doc.meta || {}).kopf || '').toLowerCase() === 'nein' ? '' :
            '<div class="kopf"><span>Name: ______________________________</span><span>Klasse: ______</span><span>Datum: ______________</span></div>') +
            `<div class="titel" data-b="${i}"><div>${doc.meta && doc.meta.fach ? `<div class="tsub">${inline(doc.meta.fach)}</div>` : ''}<h1>${inline(b.titel || '')}</h1></div></div>`;
          if (h.startsWith('<div class="blattkopf" data-b="' + i + '"></div>')) h = h.replace(/^<div class="blattkopf"[^>]*><\/div>/, '');
          break;
        case 'kap':
          ctx.kap++;
          ctx.kapTitel[ctx.kap] = b.titel;
          h = `<h2 class="${kl('kap')}" data-b="${i}"${st}><span class="kn">${ctx.kap}</span>${inline(b.titel || '')}</h2>`;
          break;
        case 'h3': h = `<h3 class="${kl('h3')}" data-b="${i}"${st}>${inline(b.titel || '')}</h3>`; break;
        case 'info': h = box('info', block(b.text)); break;
        case 'auftrag': h = box('szenario', `<div class="szt">${inline(b.titel || 'Dein Auftrag')}</div>${inhalt(block(b.text))}`); break;
        case 'alltag': case 'beispiel': case 'box': {
          const label = b.typ === 'alltag' ? 'AUS DEM ALLTAG' : b.typ === 'beispiel' ? 'BEISPIEL' : esc((b.name || 'Kasten').toUpperCase());
          h = box('alltag', `<div class="allt">${label}${b.titel ? ' · ' + inline(b.titel) : ''}</div>${inhalt(block(b.text))}`);
          break;
        }
        case 'ueberblick':
          h = box('ueb', `<div class="uebt">ÜBERBLICK${b.titel ? ' · ' + inline(b.titel) : ''} <span>– ergänze die Lücken</span></div>${inhalt(block(b.text))}`);
          (ctx.lsg[nr] = ctx.lsg[nr] || []).push(h);
          break;
        case 'aufgaben':
          h = box('aufgaben', `<div class="ak" data-b="${i}">✎ ${b.titel ? inline(b.titel) : 'Aufgaben'}</div>` + inhalt(aufgaben(b, ctx, a.nr || (ctx.kap && kaps.length > 1 ? ctx.kap : ''))));
          (ctx.lsg[nr] = ctx.lsg[nr] || []).push(h);
          break;
        case 'material': h = box('mat', `<div class="matt">Material${b.titel ? ': ' + inline(b.titel) : ''}</div>${inhalt(block(b.text))}`); break;
        case 'formel': h = `<div class="${kl('formelz')}" data-b="${i}"${st}><div class="formel">${ohneP(block(b.text))}</div></div>`; break;
        case 'hinweis': h = box('block', b.text.trim() ? ohneP(block(b.text)) : HINWEIS); break;
        case 'check':
          h = box('check', `<span class="cl">✔ L${esc(nr)}</span> Vergleiche jetzt deine Lösungen mit dem <b>Lösungsblatt L${esc(nr)}</b>. Korrigiere mit einer anderen Farbe. ${ohneP(block(b.text))}`);
          break;
        case 'plan':
          h = box('planz', '<table class="plan"><tr><th>Nr.</th><th>Thema</th><th>Seite</th><th>Lösungsblatt</th><th>erledigt</th></tr>' +
            kaps.map(([n, t]) => `<tr><td>${n}</td><td>${inline(t || '')}</td><td>?</td><td>L${n}</td><td class="cb">☐</td></tr>`).join('') + '</table>');
          break;
        case 'legende': h = box('legendez', LEGENDE); break;
        case 'html': h = box('roh', b.text); break;
        case 'seite': h = `<div class="pb umbruch" data-b="${i}"></div>`; break;
        default: h = '';
      }
      return h;
    });
    return {html: teile.join('\n'), lsg: ctx.lsg, kapTitel: ctx.kapTitel, titel};
  }

  /* ---------- läuft im Blatt: Tabellenzeilen mit Schreiblinien + Seitenumbruch (aus paginate.py) ---------- */
  function umbrechen(fuss) {
    const mm = 3.7795;
    document.querySelectorAll('tr').forEach(tr => {
      const tds = [...tr.children].filter(td => td.tagName === 'TD');
      if (!tr.querySelector('.a.lang') && !tds.some(td => td.querySelectorAll('.a').length >= 2)) return;
      tds.forEach(td => { if (!td.querySelector('.a')) return; const d = document.createElement('div'); d.className = 'zl'; while (td.firstChild) d.appendChild(td.firstChild); td.appendChild(d); });
    });
    const body = document.body, pages = [], zuGross = [];
    let pc = null;
    const neu = (sec) => {
      const p = document.createElement('div');
      p.className = 'page ' + (sec.dataset.klasse || '');
      if (sec.dataset.nr) p.insertAdjacentHTML('beforeend', '<div class="lnr">' + sec.dataset.nr + '</div>');
      pc = document.createElement('div'); pc.className = 'pc'; p.appendChild(pc);
      if (sec.dataset.kopf) pc.insertAdjacentHTML('beforeend', sec.dataset.kopf);
      body.appendChild(p); pages.push(p);
      return pc;
    };
    const over = () => pc.scrollHeight > pc.clientHeight + 1;
    const kopfteil = c => c.classList.contains('lkopf') || c.classList.contains('lhinw');
    const leerSeite = () => [...pc.children].every(kopfteil);
    const nurKopf = () => [...pc.children].slice(0, -1).every(kopfteil);   // der zuletzt angehängte Block ist allein auf der Seite
    [...document.querySelectorAll('#quelle > section')].forEach(sec => {
      const blocks = [];
      [...sec.children].forEach(c => {
        if (c.classList.contains('aufgaben') && !c.classList.contains('keep') && !c.getAttribute('style')) [...c.children].forEach(x => blocks.push(x));
        else blocks.push(c);
      });
      sec.remove();
      neu(sec);
      // Zeilenhöhe der Schreiblinien in Tabellen erst messen, wenn der Block auf einer Seite steht
      for (let k = 0; k < blocks.length; k++) {
        const b = blocks[k];
        if (b.classList.contains('pb') && !leerSeite()) neu(sec);
        pc.appendChild(b);
        b.querySelectorAll('tr').forEach(tr => {
          const z = [...tr.querySelectorAll('.zl')]; if (!z.length) return;
          let h = Math.max(...z.map(e => e.getBoundingClientRect().height)); h = Math.ceil(h / (6 * mm) - 0.05) * 6 * mm;
          z.forEach(e => e.style.minHeight = h + 'px');
        });
        if ((b.classList.contains('kap') || b.classList.contains('ak') || b.classList.contains('h3')) && k + 1 < blocks.length) {
          const nx = blocks[k + 1]; pc.appendChild(nx);
          const bad = over(); nx.remove();
          if (bad && !nurKopf()) { b.remove(); neu(sec); pc.appendChild(b); }
          continue;
        }
        if (!over()) continue;
        if (b.classList.contains('info') && !b.classList.contains('keep') && b.children.length > 1) {
          const rest = b.cloneNode(false);
          while (over() && b.children.length > 0) rest.insertBefore(b.lastElementChild, rest.firstChild);
          if (b.children.length === 0) b.remove();
          neu(sec); pc.appendChild(rest);
          if (over()) zuGross.push(+rest.dataset.b);
          continue;
        }
        if (!nurKopf()) { b.remove(); neu(sec); pc.appendChild(b); }
        if (over()) zuGross.push(+b.dataset.b);
      }
    });
    const n = pages.length;
    if (fuss !== null) pages.forEach((p, i) => { const f = document.createElement('div'); f.className = 'foot'; f.innerHTML = '<span></span><span>Seite ' + (i + 1) + ' von ' + n + '</span>'; f.firstChild.textContent = fuss; p.appendChild(f); });
    const seite = {};
    pages.forEach((p, i) => p.querySelectorAll('.kap .kn').forEach(e => { if (!seite[e.textContent.trim()]) seite[e.textContent.trim()] = i + 1; }));
    document.querySelectorAll('.plan tr').forEach(tr => { const td = tr.children; if (td.length > 3 && seite[td[0].textContent.trim()]) td[2].textContent = seite[td[0].textContent.trim()]; });
    return {seiten: n, zuGross: [...new Set(zuGross)].filter(x => x === x)};
  }

  function vorschau() {
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-b]');
      e.preventDefault();
      if (el) parent.postMessage({blatt: 'wahl', i: +el.dataset.b}, '*');
    });
    window.addEventListener('message', e => {
      const d = e.data || {};
      if (d.blatt !== 'zeige') return;
      document.querySelectorAll('.gewaehlt').forEach(x => x.classList.remove('gewaehlt'));
      const els = [...document.querySelectorAll('[data-b="' + d.i + '"]')];
      els.forEach(x => x.classList.add('gewaehlt'));
      if (els[0] && d.scroll) els[0].scrollIntoView({block: 'nearest', behavior: 'smooth'});
    });
  }

  function seite(doc, modus, o) {
    o = o || {};
    const r = rendern(doc, modus === 'lb' ? 'l' : modus);
    const fuss = (doc.meta && doc.meta.fuss) || r.titel || '';
    let quelle;
    if (modus === 'lb') {
      const nrn = Object.keys(r.lsg).sort((a, b) => a - b);
      quelle = nrn.map(n => {
        const kopf = `<div class="lkopf">Lösungsblatt ${esc(n)} · ${inline(r.kapTitel[n] || r.titel || '')}</div><div class="lhinw">Nicht hineinschreiben – bitte zurücklegen!</div>`;
        return `<section data-klasse="lsheet" data-nr="L${esc(n)}" data-kopf="${esc(kopf)}">${r.lsg[n].join('\n')}</section>`;
      }).join('') || '<section><p class="leerhinweis">Keine Überblicke oder Aufgaben – hier gibt es nichts für ein Lösungsblatt.</p></section>';
    } else quelle = `<section>${r.html}</section>`;
    const titel = (r.titel || 'Arbeitsblatt').replace(/<[^>]*>/g, '') + (modus === 'l' ? ' – Lehrkraft' : modus === 'lb' ? ' – Lösungsblätter' : '');
    const skript = `(${umbrechen})(${JSON.stringify(modus === 'lb' ? null : fuss)})`;
    const melden = o.vorschau ? `parent.postMessage(Object.assign({blatt:'fertig'},r),'*');(${vorschau})();` : '';
    const zoom = o.zoom && o.zoom !== 1 ? `@media screen{body{zoom:${o.zoom}}}` : '';
    return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titel)}</title>` +
      `<style>${CSS}${o.vorschau ? VORSCHAU_CSS : ''}${zoom}</style></head><body class="${modus === 's' ? 's' : 'l'}"><div id="quelle">${quelle}</div>` +
      `<script>window.addEventListener('load',function(){var r=${skript};${melden}});<\/script></body></html>`;
  }

  /* Layout aus dem Skill „selbstlernheft-html“ (assets/style.css + paginate.py), dazu Ergänzungen fürs Arbeitsblatt */
  const CSS = `@page{size:A4;margin:0}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#888;font-family:Arial,Helvetica,"Liberation Sans",sans-serif;font-size:10.5pt;line-height:1.38;color:#000}
.page{width:210mm;height:297mm;padding:11mm 14mm 15mm;background:#fff;margin:8mm auto;position:relative;overflow:hidden;break-after:page;page-break-after:always}
@media print{body{background:#fff}.page{margin:0}}
.foot{position:absolute;left:14mm;right:14mm;bottom:7mm;border-top:.6pt solid #000;padding-top:1mm;font-size:8pt;display:flex;justify-content:space-between}
p{margin:0 0 2mm}ul{margin:0 0 2mm;padding-left:5mm}li{margin-bottom:.6mm}
small{font-size:8.5pt}
.klein{font-size:9pt}
/* Kopf und Titel */
.kopf{display:flex;justify-content:space-between;background:#e6e6e6;padding:2mm 3mm;font-size:9.5pt;margin-bottom:5mm}
.titel{display:flex;justify-content:space-between;align-items:center;border-bottom:3pt solid #000;padding-bottom:2mm;margin-bottom:4mm}
.titel h1{font-size:25pt;margin:0;letter-spacing:-.3pt}.tsub{font-size:10pt;text-transform:uppercase;letter-spacing:1pt}
.h3{font-size:12pt;margin:4mm 0 1.5mm;border-bottom:1pt solid #000}
.szenario{border:2pt solid #000;border-radius:3mm;padding:3mm 4mm 1mm;position:relative;margin:2mm 0 2mm;background:repeating-linear-gradient(135deg,#fff 0 6px,#f3f3f3 6px 7px)}
.szt{position:absolute;top:-3.2mm;left:4mm;background:#000;color:#fff;font-weight:bold;font-size:9pt;padding:.3mm 2.5mm;border-radius:1mm}
table{border-collapse:collapse}
.steck{width:100%}.steck td{border:.6pt solid #000;padding:1.2mm 2mm}.steck td:first-child{width:45mm;font-weight:bold;background:#eee}
.plan{width:100%;font-size:10pt}.plan th,.plan td{border:.6pt solid #000;padding:1mm 2mm}.plan th{background:#000;color:#fff}.plan td:nth-child(1),.plan td:nth-child(3),.plan td:nth-child(4),.plan td:nth-child(5){text-align:center;width:16mm}.cb{font-size:13pt}
.legende div{margin:1.3mm 0}.mini{display:inline-block;width:30mm;font-size:8pt;font-weight:bold;text-align:center;padding:.5mm 0;margin-right:3mm}
.mi{border-left:3pt solid #000}.ma{background:#e6e6e6;border-left:3pt solid #000}.mu{border:1.5pt solid #000;border-radius:2mm}.mk{border-bottom:1.5pt solid #000}.mc{border:1.5pt dashed #000}
/* Kapitel */
.kap{font-size:17pt;margin:0 0 3mm;display:flex;align-items:center;gap:3mm;border-bottom:2.5pt solid #000;padding-bottom:1.5mm}
.kn{display:inline-flex;align-items:center;justify-content:center;width:10mm;height:10mm;border-radius:50%;background:#000;color:#fff;font-size:15pt}
.info{border-left:2.5pt solid #000;padding-left:3mm;margin:0 0 2.5mm}
.alltag{background:#ececec;border-radius:2mm;padding:2mm 3mm 0.5mm;margin:0 0 3mm;border-left:5pt solid #000}
.allt{font-size:8.5pt;font-weight:bold;letter-spacing:.5pt;margin-bottom:1mm}
.fig{margin:1mm auto 3mm;text-align:center}.fig80{width:82%}
.formel{border:1.5pt solid #000;display:inline-block;padding:2mm 5mm;margin:1mm 0 2mm;font-weight:bold;font-size:11.5pt}
.frac{display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;margin:0 1mm}.frac span:first-child{border-bottom:1pt solid #000;padding:0 1mm}
.autos{display:flex;gap:6mm;margin-bottom:3mm}.auto{flex:1;border:1pt solid #000;border-radius:2mm;padding:2mm 3mm}.auto p{font-size:10pt;margin:1mm 0 0}
.balken{display:flex;justify-content:center;gap:15mm}.balken div{width:58mm}
.drei{display:flex;gap:4mm;margin-bottom:3mm}.drei div{flex:1}
/* Überblick */
.ueb{border:2pt solid #000;border-radius:3mm;padding:4.5mm 4mm 1.5mm;margin:4mm 0 4mm;position:relative}
.uebt{position:absolute;top:-3mm;left:4mm;background:#fff;padding:0 2mm;font-weight:bold;font-size:10pt}.uebt span{font-weight:normal;font-style:italic;font-size:9pt}
.ueb p{margin:0 0 2.6mm;line-height:1.9}
/* Material */
.mat{border:1pt solid #000;padding:2mm 3mm;margin-bottom:3mm;background:#fafafa}.matt{font-weight:bold;font-size:10pt;margin-bottom:1.5mm}
.bil{width:100%;font-size:9pt}.bil th,.bil td{border:.5pt solid #777;padding:.5mm 1.5mm}.bil th{background:#ddd}.bil td:nth-child(2),.bil td:nth-child(4){text-align:right;width:24mm}
.sum td{font-weight:bold;border-top:1.5pt solid #000}
.t{width:100%;margin:1mm 0 1mm}.t th,.t td{border:.6pt solid #000;padding:1mm 2mm;vertical-align:top}.t th{background:#e2e2e2;text-align:left}
.ut td{padding:2mm;line-height:1.9}.ut3 td{font-size:9.5pt;height:9mm}.ut3 td:first-child{width:20mm}
.vn td{font-size:9.3pt}
.schema{width:110mm}.schema td:nth-child(2),.schema td:nth-child(3){text-align:right}
.rech{width:120mm}.rech td:nth-child(2){text-align:right}
.plaene{display:flex;flex-direction:column;gap:1.5mm}.pl{font-size:8.8pt;margin:0}.pl td,.pl th{padding:.3mm 1.5mm}.pl td:not(:first-child){text-align:right}.pl th{text-align:center}
.opt td{font-size:9.5pt}
/* Aufgaben */
.ak{font-weight:bold;font-size:12pt;border-bottom:1.5pt solid #000;margin:2mm 0 2mm;padding-bottom:.5mm}
.task{margin-bottom:3mm;break-inside:avoid}.tn{display:inline-block;min-width:8mm}
.check{border:1.6pt dashed #000;border-radius:2mm;padding:2mm 3mm;margin-top:3mm;font-size:10pt}
.cl{display:inline-block;background:#000;color:#fff;font-weight:bold;padding:.3mm 2mm;margin-right:2mm;border-radius:1mm}
.notiz{margin-top:4mm}
.mail{border:1.5pt solid #000;border-radius:2mm;padding:2mm 3mm;margin-top:2mm}.mailk{font-size:9.5pt;border-bottom:1pt solid #000;padding-bottom:1mm;margin-bottom:1mm}
.ende{text-align:center;font-weight:bold;font-size:13pt;margin-top:6mm}
/* Baum */
.baum{text-align:center}.bw{border:1.5pt solid #000;padding:1.5mm;font-weight:bold;margin:0 auto 2mm;background:#fff}.bw0{width:70mm;background:#000;color:#fff}
.br2{display:grid;grid-template-columns:2fr 1fr;gap:4mm}.br3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4mm;margin-bottom:1.5mm}
.bb{border:1pt solid #000;padding:2mm;font-size:9.5pt;line-height:1.9}.bb small{display:block;font-style:italic;line-height:1.3;margin:.5mm 0 1mm}
/* Antworten */
.a{display:inline-block;min-width:12mm;color:#1565c0;font-family:"Courier New",Consolas,monospace;font-weight:bold;font-size:9.6pt;line-height:1.35;border-bottom:.8pt solid #000;padding:0 1mm}
.ab{position:relative;margin-top:1mm;background:repeating-linear-gradient(to bottom,transparent 0,transparent calc(7.5mm - .7pt),#888 calc(7.5mm - .7pt),#888 7.5mm);line-height:7.5mm;overflow:hidden}
.karo{margin-top:1mm;background-color:#fff;background-image:linear-gradient(#bbb .5pt,transparent .5pt),linear-gradient(90deg,#bbb .5pt,transparent .5pt);background-size:5mm 5mm;line-height:5mm;padding-left:1mm;overflow:hidden}
.at{color:#1565c0;font-family:"Courier New",Consolas,monospace;font-weight:bold;font-size:9.6pt}
.s .a,.s .at{color:transparent}
.s .a{min-width:14mm}
/* Lösungsblätter */
.lsheet{padding-top:14mm}
.lnr{position:absolute;top:7mm;right:12mm;font-size:30pt;font-weight:bold;border:3pt solid #000;padding:0 3mm;border-radius:2mm}
.lkopf{font-size:15pt;font-weight:bold;border-bottom:2.5pt solid #000;margin-bottom:1mm;padding-right:30mm}
.lhinw{font-size:9pt;font-style:italic;margin-bottom:4mm}
.lsheet .ab,.lsheet .karo{height:auto!important;background:none;line-height:1.45;padding:0;margin:0}
.lsheet .task{margin-bottom:3mm}
.lsheet .ueb p{line-height:1.6}
.titel h1{font-size:22pt}.kopf{margin-bottom:3mm}.legende div{margin:.6mm 0;font-size:9.5pt}.steck td{padding:.8mm 2mm}.plan td{padding:.6mm 2mm}
.auto svg{max-height:28mm}.balken div{width:44mm}
.lsheet{font-size:9.8pt}.lsheet .t td,.lsheet .t th{padding:.6mm 1.5mm}.lsheet .ueb p{margin-bottom:1.6mm}.lsheet .bb{line-height:1.5}
.bil td{padding:.2mm 1.5mm;line-height:1.25}
.pl{font-size:8.3pt}.pl td,.pl th{padding:0 1.5mm;line-height:1.3}.plan1 b{font-size:9.5pt}.plaene{gap:.5mm}
.info{font-size:9.6pt;line-height:1.35}
.cols{column-count:2;column-gap:6mm;column-rule:.5pt solid #bbb}.cols p,.cols li{break-inside:avoid}
.alltag{font-size:9.6pt}
.matrix{width:100%;border-collapse:collapse;margin:1mm 0 2mm}.matrix th,.matrix td{border:1.2pt solid #000;padding:2mm;vertical-align:top;line-height:1.7;text-align:left}
.matrix tr:first-child th{background:#e6e6e6;width:42%}.matrix tr:first-child th:first-child{width:16%;background:#fff;border-top-color:#fff;border-left-color:#fff}
.matrix th small,.matrix td small{display:block;font-weight:normal;font-style:italic;font-size:8.5pt;line-height:1.3}.matrix tr th:first-child{background:#e6e6e6}
.matrix td.grau{background:repeating-linear-gradient(135deg,#fff 0 5px,#ddd 5px 6px);text-align:center;vertical-align:middle}
.vnt{margin:2mm 0 1mm}
.block{border:2pt solid #000;padding:2mm 3mm;margin-bottom:2mm;font-size:10pt;background:#f0f0f0}
.lt{margin:.5mm 0 1mm;line-height:1.4}
.s .lt{display:none}
.karo{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 50 50'%3E%3Cpath d='M0 0.5H50M0.5 0V50' stroke='%23999' stroke-width='1' fill='none'/%3E%3C/svg%3E");background-size:5mm 5mm;background-position:0 0;border-right:.6pt solid #999;border-bottom:.6pt solid #999}
.task{margin-bottom:2.2mm}
.karo{background:none!important;position:relative;border:none}.karo .grid{position:absolute;left:0;top:0}.karo .at{position:relative}
.zwei{display:grid;grid-template-columns:1fr 1fr;gap:6mm}.zwei>div+div{border-left:.5pt solid #bbb;padding-left:6mm}
td .a,th .a{border-bottom:none!important;min-width:0!important;padding:0}
.t td:has(.a){height:7mm}
.zl{min-height:12mm;line-height:6mm;font-size:9pt;background:repeating-linear-gradient(to bottom,transparent 0,transparent calc(6mm - .6pt),#999 calc(6mm - .6pt),#999 6mm)}.zl .a{line-height:6mm;font-size:9pt}
.ut3 td{height:auto}
.zl small{display:block!important;line-height:6mm!important;margin:0!important;font-size:8.5pt}
.lsheet .grid{display:none}
.fig:not(.fig80)>svg:not(.leg){width:84%!important}.fig80>svg{width:92%}.pc{height:calc(297mm - 26mm);overflow:hidden}.lsheet .pc{height:calc(297mm - 29mm)}
.pc>.kap:not(:first-child){margin-top:5mm}.pc>.ak:first-child{margin-top:0}
#quelle{width:182mm;margin:0 auto}
.fig img{max-width:100%}img{max-width:100%}
.titel h1{font-size:22pt}.blattkopf .kopf{margin-bottom:3mm}
.ak{break-after:avoid}h4{font-size:10.5pt;margin:2mm 0 1mm}
.ueb .zwei p,.ueb .cols p{line-height:1.9}
.formelz{margin:0 0 2mm}.formel p{margin:0}
.code,code{font-family:"Courier New",Consolas,monospace;font-size:9pt}.code{border:.6pt solid #000;background:#f4f4f4;padding:1.5mm 2mm;white-space:pre-wrap;margin:0 0 2mm}
blockquote{margin:0 0 2mm;padding-left:3mm;border-left:1pt solid #888;font-style:italic}
mark{background:#ddd;color:inherit}
.planz,.legendez,.roh{margin-bottom:3mm}
.task .ab,.task .karo{margin-bottom:1mm}
.alltag>.cols,.szenario>.cols,.mat>.cols{margin-bottom:1.5mm}
.leerhinweis{font-style:italic}
.umbruch{height:0}
`;
  const VORSCHAU_CSS = '@media screen{[data-b]{cursor:pointer}[data-b]:hover{outline:1px dashed #5e81ac;outline-offset:1mm}.gewaehlt{outline:2px solid #c05a1c!important;outline-offset:1mm}.umbruch.gewaehlt{outline-width:4px}}';

  window.Arbeitsblatt = {lesen, schreiben, seite, TYPEN, leer, MIT_TITEL, MIT_NR, OHNE_INHALT, attrText, hatAttr, inline};
})();
