/* vorlage-szenario.js – Szenario (verzweigter Lern-Chat) im Baukasten visuell bauen: Bausteine und Pfeile
 *
 * Öffnet wie der Kontenplan ein Fenster über dem Baukasten: Knopf mit data-szenario-bau im Formular des Lern-Chats
 * (vorlage-typen.js). Links Bausteine (anklicken oder auf einen Kasten bzw. Anschluss ziehen), in der Mitte die
 * Nachrichten als Kästen mit Pfeilen (Anschluss ● ziehen = Pfeil zu einem anderen Kasten), rechts die Eigenschaften
 * des markierten Kastens. Die Anordnung entsteht von selbst und wird nicht gespeichert.
 * Einbinden nach vorlage-typen.js; nutzt Baukasten.aufgabe() / aendere(). Aussehen: .sz-… in uebung-erstellen.html.
 *
 * Gespeichert wird das gewohnte Format des Typs chat (lib/aufgaben.js): Die Kästen werden so gereiht, dass möglichst
 * viele Pfeile „nächste Nachricht“ bedeuten; die übrigen werden zu "weiter": "<id>" (ids m1, m2 … entstehen von selbst),
 * ein Anschluss ohne Pfeil zu "ende": true. Knöpfe ohne „ok“ und ohne eigenen Pfeil bekommen "entscheidung": true.
 *
 * Modell im Fenster: G = {start, nodes: [{k, m (Nachricht als Objekt ohne weiter/ende), out (Ziel-k oder null = Ende),
 *   aout: [je Antwort Ziel-k, null = Ende, undefined = wie der Kasten]}]}
 *   Szenario.lesen(aufgabe) → G, Szenario.schreiben(G) → nachrichten   (auch für Tests)
 */
(function () {
  'use strict';
  const B = window.Baukasten;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const nurText = h => String(h || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const kurz = (h, n) => { const t = nurText(h).trim(); return t.length > n ? t.slice(0, n - 2).replace(/\s+\S*$/, '') + ' …' : t; };
  const art = n => n.m.zahl ? 'zahl' : n.m.freitext ? 'freitext' : n.m.antworten ? 'knoepfe' : 'text';
  // Knöpfe, bei denen jede Antwort einen eigenen Pfeil hat: der Anschluss „danach“ wird nie benutzt
  const alleEigen = n => art(n) === 'knoepfe' && n.m.antworten.length > 0 && n.m.antworten.every((x, j) => n.aout[j] !== undefined);

  /* ---------- Aufgabe ↔ Modell ---------- */
  function lesen(a) {
    const N = Array.isArray(a.nachrichten) ? a.nachrichten : [];
    const ziel = id => id == null ? -1 : N.findIndex(n => n && typeof n === 'object' && n.id === id);
    const nach = (m, i) => { if (m && typeof m === 'object' && m.ende) return null; const j = m && typeof m === 'object' ? ziel(m.weiter) : -1, t = j >= 0 ? j : i + 1; return t < N.length ? 'n' + t : null; };
    const nodes = N.map((m, i) => {
      const o = typeof m === 'string' ? {bot: m} : JSON.parse(JSON.stringify(m || {bot: ''}));
      const n = {k: 'n' + i, m: o, out: null, aout: []};
      (o.antworten || []).forEach((x, j) => { n.aout[j] = x.ende ? null : ziel(x.weiter) >= 0 ? 'n' + ziel(x.weiter) : undefined; delete x.weiter; delete x.ende; });
      // "ende" an einer Frage gilt nur für Antworten ohne eigenen Pfeil – das ist hier der Anschluss „danach“
      n.out = nach(m, i);
      delete o.weiter; delete o.ende; delete o.entscheidung;
      return n;
    });
    return {start: nodes.length ? 'n0' : null, nodes, zaehler: nodes.length};
  }
  function reihe(G) {   // Reihenfolge der Nachrichten: Ketten entlang „danach“, Abzweigungen dahinter, Unerreichbares am Ende
    const by = {}, ord = [], drin = new Set();
    G.nodes.forEach(n => { by[n.k] = n; });
    const kette = k => {
      const offen = [];
      while (k != null && by[k] && !drin.has(k)) { const n = by[k]; drin.add(k); ord.push(n); n.aout.forEach(t => { if (t) offen.push(t); }); k = alleEigen(n) ? null : n.out; }
      offen.forEach(kette);
    };
    kette(G.start); G.nodes.forEach(n => kette(n.k));
    return ord;
  }
  function schreiben(G) {
    const ord = reihe(G), by = {}, ziele = new Set(), plan = [];
    G.nodes.forEach(n => { by[n.k] = n; });
    ord.forEach((n, p) => {
      const naechste = ord[p + 1] ? ord[p + 1].k : null, e = {weiter: undefined, ende: false, a: []};
      if (!alleEigen(n)) { if (n.out == null || !by[n.out]) e.ende = p < ord.length - 1; else if (n.out !== naechste) { e.weiter = n.out; ziele.add(n.out); } }
      (n.m.antworten || []).forEach((x, j) => {
        const t = n.aout[j];
        if (t === undefined || (!alleEigen(n) && t === n.out && t != null)) e.a[j] = {};
        else if (t == null || !by[t]) e.a[j] = {ende: true};
        else { e.a[j] = {weiter: t}; ziele.add(t); }
      });
      plan.push(e);
    });
    // Marken: eigene Namen bleiben, m1, m2 … entstehen nur für Sprungziele und verschwinden sonst wieder
    const belegt = new Set(G.nodes.map(n => n.m.id).filter(id => id != null && !/^m\d+$/.test(id)));
    let nr = 1;
    G.nodes.forEach(n => {
      if (n.m.id != null && /^m\d+$/.test(n.m.id)) { if (ziele.has(n.k) && !belegt.has(n.m.id)) belegt.add(n.m.id); else delete n.m.id; }
      if (n.m.id === '') delete n.m.id;
    });
    G.nodes.forEach(n => { if (ziele.has(n.k) && n.m.id == null) { while (belegt.has('m' + nr)) nr++; n.m.id = 'm' + nr; belegt.add(n.m.id); } });
    return ord.map((n, p) => {
      const e = plan[p], m = JSON.parse(JSON.stringify(n.m));
      if (e.weiter) m.weiter = by[e.weiter].m.id;
      if (e.ende) m.ende = true;
      (m.antworten || []).forEach((x, j) => { if (e.a[j].ende) x.ende = true; else if (e.a[j].weiter) x.weiter = by[e.a[j].weiter].m.id; });
      if (m.antworten && !m.antworten.some(x => x.ok) && !m.antworten.some(x => x.weiter != null || x.ende)) m.entscheidung = true;
      return Object.keys(m).length === 1 && typeof m.bot === 'string' ? m.bot : m;
    });
  }
  const VORLAGE = {
    text: () => ({bot: 'Neue Nachricht'}),
    knoepfe: () => ({bot: 'Frage?', antworten: [{t: 'Antwort A', ok: true, r: 'Genau!'}, {t: 'Antwort B', r: 'Leider nein.'}]}),
    wahl: () => ({bot: 'Wie entscheidest du dich?', antworten: [{t: 'Weg A'}, {t: 'Weg B'}]}),
    zahl: () => ({bot: 'Wie viel?', zahl: {l: 0}}),
    freitext: () => ({bot: 'Wie heißt …?', freitext: {antworten: [['Begriff']]}})
  };
  const BAUSTEINE = [['text', '💬', 'Nachricht'], ['wahl', '🔀', 'Entscheidung'], ['knoepfe', '🔘', 'Frage mit Knöpfen'], ['zahl', '🔢', 'Frage: Zahl'], ['freitext', '✎', 'Frage: Begriff']];
  const SYMBOL = {text: '💬', knoepfe: '🔘', zahl: '🔢', freitext: '✎'};

  /* ---------- Fenster ---------- */
  function oeffnen() {
    const a0 = B.aufgabe(); if (!a0 || a0.typ !== 'chat') return;
    B.szenarioAn = true;
    const G = lesen(a0), W = 230, LUECKE = 34, ZEILE = 58;
    let sel = G.start, zug = null, nummer = {};
    const by = k => G.nodes.find(n => n.k === k) || null;
    const d = document.createElement('dialog'); d.className = 'kp-dialog sz-dialog';
    d.innerHTML = `<div class="kp-oben"><div><b>Szenario bauen</b> <span class="kp-titel">${esc(a0.name || 'Lern-Chat')}</span></div>
        <span class="hinweis sz-hilfe">Baustein anklicken oder auf einen Kasten ziehen · Anschluss ● auf einen Kasten ziehen = Pfeil · Anschluss ohne Pfeil = Ende</span>
        <button type="button" class="btn haupt sz-fertig">Fertig</button></div>
      <div class="sz-arbeit"><div class="sz-leiste"><div class="leiste-trenn">Bausteine</div>${BAUSTEINE.map(([k, s, t]) => `<button type="button" class="teil sz-teil" data-sz-neu="${k}"><span class="sym">${s}</span><span>${t}</span></button>`).join('')}
          <p class="hinweis">Der neue Kasten kommt hinter den markierten. Ziehst du ihn auf einen Anschluss ●, hängt er genau dort.</p></div>
        <div class="sz-flaeche"><div class="sz-innen"></div></div><div class="sz-eig"></div></div>`;
    document.body.appendChild(d);
    const innen = d.querySelector('.sz-innen'), eig = d.querySelector('.sz-eig'), flaeche = d.querySelector('.sz-flaeche');

    function speichern() { const neu = schreiben(G); B.aendere(a => { if (a.typ === 'chat') a.nachrichten = neu; }); }
    function geaendert(nurFlaeche) { speichern(); zeichne(); if (!nurFlaeche) eigenschaften(); }

    /* ----- Fläche: Kästen in Ebenen (Breitensuche ab Start), Pfeile als SVG darüber ----- */
    function zeichne() {
      const kinder = {}, tiefe = {}, wurzeln = [], lose = new Set();
      const ziele = n => { const l = []; n.aout.forEach(t => { if (t && by(t)) l.push(t); }); if (!alleEigen(n) && n.out && by(n.out)) l.push(n.out); return [...new Set(l)]; };
      const suche = r => { wurzeln.push(r); tiefe[r] = 0; kinder[r] = []; const q = [r]; while (q.length) { const k = q.shift(); ziele(by(k)).forEach(c => { if (tiefe[c] == null) { tiefe[c] = tiefe[k] + 1; kinder[k].push(c); kinder[c] = []; q.push(c); } }); } };
      if (G.start && by(G.start)) suche(G.start);
      G.nodes.forEach(n => { if (tiefe[n.k] == null) { lose.add(n.k); suche(n.k); } });
      nummer = {}; let z = 0;
      const zaehle = k => { nummer[k] = ++z; kinder[k].forEach(zaehle); }; wurzeln.forEach(zaehle);
      const kasten = n => {
        const t = art(n), wahl = t === 'knoepfe' && !n.m.antworten.some(x => x.ok);
        const ant = t === 'knoepfe' ? n.m.antworten.map((x, j) => `<div class="sz-a"><span>${esc(kurz(x.t, 24) || '?')}${wahl ? '' : x.ok ? ' ✓' : ' ✗'}</span><span class="sz-port${n.aout[j] === undefined ? ' erbt' : n.aout[j] == null ? ' stopp' : ''}" data-port="${n.k}:${j}" title="${n.aout[j] === undefined ? 'geht weiter wie der Kasten – ziehen für einen eigenen Pfeil' : 'Pfeil auf einen Kasten ziehen'}"></span></div>`).join('')
          : t === 'zahl' ? `<div class="sz-a sz-ein"><span>Zahl: ${esc(n.m.zahl.l)}${n.m.zahl.e ? ' ' + esc(n.m.zahl.e) : ''}</span></div>` : t === 'freitext' ? `<div class="sz-a sz-ein"><span>Begriff: ${esc(kurz(((n.m.freitext.antworten || [])[0] || [])[0] || '', 18))}</span></div>` : '';
        return `<div class="sz-n${n.k === sel ? ' sel' : ''}${lose.has(n.k) ? ' lose' : ''}${t !== 'text' ? ' frage' : ''}" data-n="${n.k}" tabindex="0">
          <div class="sz-kopf"><span>${wahl ? '🔀' : SYMBOL[t]} ${nummer[n.k]}</span>${n.k === G.start ? '<b>Start</b>' : lose.has(n.k) ? '<b class="warn" title="Kein Pfeil führt hierher">nie erreicht</b>' : ''}${n.m.id && !/^m\d+$/.test(n.m.id) ? `<small>⚑ ${esc(n.m.id)}</small>` : ''}</div>
          <div class="sz-text">${esc(kurz(n.m.bot, 90)) || '<i>ohne Text</i>'}</div>${ant}
          <span class="sz-port unten${alleEigen(n) ? ' aus' : n.out == null || !by(n.out) ? ' stopp' : ''}" data-port="${n.k}:" title="Pfeil auf einen Kasten ziehen"></span></div>`;
      };
      innen.innerHTML = G.nodes.map(kasten).join('') || '<p class="hinweis sz-leer">Noch keine Nachricht. Klicke links einen Baustein an.</p>';
      // Höhen messen, dann setzen
      const el = {}, h = {}, x = {}, y = {}, zeilenH = [];
      innen.querySelectorAll('.sz-n').forEach(e => { el[e.dataset.n] = e; h[e.dataset.n] = e.offsetHeight; });
      G.nodes.forEach(n => { zeilenH[tiefe[n.k]] = Math.max(zeilenH[tiefe[n.k]] || 0, h[n.k]); });
      const oben = []; zeilenH.reduce((s, v, i) => { oben[i] = s; return s + v + ZEILE; }, 14);
      let blatt = 0;
      const setze = k => { if (!kinder[k].length) x[k] = 14 + blatt++ * (W + LUECKE); else { kinder[k].forEach(setze); x[k] = (x[kinder[k][0]] + x[kinder[k][kinder[k].length - 1]]) / 2; } y[k] = oben[tiefe[k]]; };
      wurzeln.forEach(setze);
      G.nodes.forEach(n => { el[n.k].style.left = x[n.k] + 'px'; el[n.k].style.top = y[n.k] + 'px'; });
      const breit = 28 + Math.max(1, blatt) * (W + LUECKE), hoch = (oben[zeilenH.length] || 60) + 30;
      innen.style.width = breit + 'px'; innen.style.height = hoch + 'px';
      // Pfeile
      const R = innen.getBoundingClientRect(), mitte = p => { const r = p.getBoundingClientRect(); return [r.left + r.width / 2 - R.left, r.top + r.height / 2 - R.top]; };
      let pfade = '';
      const pfeil = (port, nach, seite, klasse) => {
        const [x1, y1] = mitte(port), x2 = x[nach] + W / 2, y2 = y[nach] - 3;
        const runter = y2 > y1 + 14, c1 = seite ? [x1 + 46, y1] : [x1, y1 + 34];
        const c2 = runter ? [x2, y2 - 40] : [x2 + (x1 >= x2 ? 150 : -150), y2 - 90];
        pfade += `<path class="${klasse}" d="M${x1} ${y1} C${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${x2} ${y2}" marker-end="url(#sz-spitze${klasse.includes('ant') ? '-a' : ''})"/>`;
      };
      G.nodes.forEach(n => {
        if (!alleEigen(n) && n.out && by(n.out)) pfeil(el[n.k].querySelector('.sz-port.unten'), n.out, false, 'sz-pf' + (kinder[n.k].includes(n.out) ? '' : ' quer'));
        n.aout.forEach((t, j) => { if (t && by(t)) pfeil(el[n.k].querySelector(`[data-port="${n.k}:${j}"]`), t, true, 'sz-pf ant' + (kinder[n.k].includes(t) ? '' : ' quer')); });
      });
      innen.insertAdjacentHTML('beforeend', `<svg class="sz-svg" width="${breit}" height="${hoch}" aria-hidden="true"><defs>
        <marker id="sz-spitze" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="sz-sp" d="M0 0L10 5L0 10z"/></marker>
        <marker id="sz-spitze-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="sz-sp a" d="M0 0L10 5L0 10z"/></marker></defs>${pfade}<path class="sz-zug" d=""/></svg>`);
    }

    /* ----- Eigenschaften des markierten Kastens ----- */
    const zielWahl = (attr, wert, n, erbt) => `<select class="feld" ${attr} aria-label="weiter zu">${erbt ? `<option value="~"${wert === undefined ? ' selected' : ''}>wie der Kasten („danach“)</option>` : ''}<option value=""${wert === null || (wert !== undefined && !by(wert)) ? ' selected' : ''}>■ Ende</option>`
      + G.nodes.filter(z => erbt || z.k !== n.k || art(n) !== 'text').sort((p, q) => nummer[p.k] - nummer[q.k]).map(z => `<option value="${z.k}"${z.k === wert ? ' selected' : ''}>→ ${nummer[z.k]}: ${esc(kurz(z.m.bot, 34))}</option>`).join('') + '</select>';
    function eigenschaften() {
      const n = by(sel);
      if (!n) { eig.innerHTML = '<p class="hinweis">Kasten anklicken, um ihn zu bearbeiten.</p>'; return; }
      const t = art(n), m = n.m, wahl = t === 'knoepfe' && !m.antworten.some(x => x.ok);
      const seg = [['text', 'Text'], ['knoepfe', 'Knöpfe'], ['zahl', 'Zahl'], ['freitext', 'Begriff']].map(([k, s]) => `<button type="button" class="btn klein${k === t ? ' on' : ''}" data-sz-art="${k}">${s}</button>`).join('');
      let h = `<h3>${wahl ? '🔀' : SYMBOL[t]} Kasten ${nummer[n.k]}${n.k === G.start ? ' <small>(Start)</small>' : ''}</h3><div class="seg">${seg}</div>
        <label class="klein">${t === 'text' ? 'Text des Bots' : 'Frage des Bots'}</label><textarea class="feld" rows="3" data-sz="bot">${esc(m.bot || '')}</textarea>`;
      if (t === 'knoepfe') h += '<label class="klein">Antwort-Knöpfe (Häkchen = richtig; ohne Häkchen ist es eine Entscheidung)</label>' + m.antworten.map((x, j) => `<div class="sz-ant">
          <div class="reihe"><label class="hk" title="richtige Antwort"><input type="checkbox" data-sz-ok="${j}"${x.ok ? ' checked' : ''}> ok</label><input class="feld" data-sz="antworten.${j}.t" value="${esc(x.t || '')}" placeholder="Knopf">${m.antworten.length > 1 ? `<button type="button" class="btn klein x" data-sz-aweg="${j}" title="Entfernen">✕</button>` : ''}</div>
          <input class="feld" data-sz="antworten.${j}.r" value="${esc(x.r || '')}" placeholder="Antwort des Bots darauf (optional)">
          <div class="reihe"><span class="hinweis">dann →</span>${zielWahl(`data-sz-ziel="${j}"`, n.aout[j], n, true)}</div></div>`).join('') + '<button type="button" class="btn klein plus" data-sz-aplus>＋ Knopf</button>';
      if (t === 'zahl') h += `<div class="reihe"><input class="feld zahl" data-sz-zahl value="${esc(String(m.zahl.l).replace('.', ','))}" inputmode="decimal" placeholder="Lösung" title="Lösung"><input class="feld" data-sz="zahl.e" value="${esc(m.zahl.e || '')}" placeholder="Einheit"></div>`;
      if (t === 'freitext') h += `<label class="klein">Richtige Begriffe, Schreibweisen mit Komma</label><input class="feld" data-sz-begriff value="${esc((m.freitext.antworten || []).map(g => [].concat(g).join(', ')).join('; '))}" placeholder="Begriff, andere Schreibweise">`;
      if (t === 'zahl' || t === 'freitext') h += `<input class="feld" data-sz="r" value="${esc(m.r || '')}" placeholder="Antwort des Bots bei richtig">`;
      if (t !== 'text' && !wahl) h += `<input class="feld" data-sz="rFalsch" value="${esc(m.rFalsch || '')}" placeholder="Erklärung bei falsch">`;
      h += `<label class="klein">Danach geht es weiter zu …</label>` + (alleEigen(n) ? '<p class="hinweis">Jeder Knopf hat einen eigenen Pfeil.</p>' : zielWahl('data-sz-ziel=""', n.out, n, false))
        + `<label class="klein">Marke (eigener Name im JSON, optional)</label><input class="feld" data-sz="id" value="${esc(m.id && !/^m\d+$/.test(m.id) ? m.id : '')}" placeholder="z. B. kredit">
        <div class="reihe wrap">${n.k !== G.start ? '<button type="button" class="btn klein" data-sz-start>Als Start</button>' : ''}${G.nodes.length > 1 ? '<button type="button" class="btn klein weg" data-sz-weg>Kasten löschen</button>' : ''}</div>`;
      eig.innerHTML = h;
    }

    /* ----- Änderungen am Modell ----- */
    const portVon = s => { const [k, j] = s.split(':'); return {n: by(k), j: j === '' ? null : +j}; };
    function verbinde(port, ziel) {   // ziel: k, null (Ende) oder undefined (Antwort: wie der Kasten)
      const {n, j} = port; if (!n) return;
      if (j == null) { if (ziel === n.k && art(n) === 'text') return; n.out = ziel == null ? null : ziel; } else n.aout[j] = ziel;
    }
    function neu(typ, port) {
      const n = {k: 'n' + (G.zaehler++), m: VORLAGE[typ](), out: null, aout: []};
      G.nodes.push(n);
      if (!G.start || !by(G.start)) G.start = n.k;
      else if (port && port.n) { const alt = port.j == null ? port.n.out : port.n.aout[port.j] === undefined ? port.n.out : port.n.aout[port.j]; n.out = alt == null ? null : alt; verbinde(port, n.k); }
      sel = n.k;
    }
    function loesche(k) {
      const n = by(k); if (!n || G.nodes.length < 2) return;
      const t = n.out && n.out !== k && by(n.out) ? n.out : null;   // Pfeile, die hierher zeigten, gehen zum Nachfolger
      G.nodes = G.nodes.filter(x => x !== n);
      G.nodes.forEach(x => { if (x.out === k) x.out = t === x.k && art(x) === 'text' ? null : t; x.aout = x.aout.map(z => z === k ? t : z); });
      if (G.start === k) G.start = t || G.nodes[0].k;
      sel = t || G.start;
    }
    function setzeArt(n, typ) {
      if (art(n) === typ) return;
      const m = {bot: n.m.bot}; if (n.m.id) m.id = n.m.id;
      if (typ !== 'text') Object.assign(m, VORLAGE[typ](), {bot: n.m.bot});
      n.m = m; n.aout = [];
    }
    function setzePfad(m, pfad, v) {
      const p = pfad.split('.'); let o = m;
      for (let i = 0; i < p.length - 1; i++) o = o[p[i]];
      if (v === '' && !['bot', 't'].includes(p[p.length - 1])) delete o[p[p.length - 1]]; else o[p[p.length - 1]] = v;
    }

    /* ----- Ereignisse ----- */
    d.addEventListener('click', e => {
      const t = e.target;
      if (t.closest('.sz-fertig') || t === d) return d.close();
      if (zug && zug.bewegt) return;
      const n = by(sel), q = s => t.closest(s);
      if (q('[data-sz-art]')) { setzeArt(n, q('[data-sz-art]').dataset.szArt); return geaendert(); }
      if (q('[data-sz-aplus]')) { n.m.antworten.push({t: 'Antwort'}); return geaendert(); }
      if (q('[data-sz-aweg]')) { const j = +q('[data-sz-aweg]').dataset.szAweg; n.m.antworten.splice(j, 1); n.aout.splice(j, 1); return geaendert(); }
      if (q('[data-sz-weg]')) { loesche(sel); return geaendert(); }
      if (q('[data-sz-start]')) { G.start = sel; return geaendert(); }
    });
    eig.addEventListener('input', e => {
      const t = e.target, n = by(sel); if (!n) return;
      if (t.dataset.sz) setzePfad(n.m, t.dataset.sz, t.dataset.sz === 'id' ? t.value.trim() : t.value);
      else if (t.dataset.szZahl != null) { const z = B.zahlLesen(t.value); if (!isNaN(z)) n.m.zahl.l = z; }
      else if (t.dataset.szBegriff != null) n.m.freitext.antworten = t.value.split(';').map(g => g.split(',').map(x => x.trim()).filter(Boolean)).filter(g => g.length);
    });
    eig.addEventListener('change', e => {
      const t = e.target, n = by(sel); if (!n) return;
      if (t.dataset.szOk != null) { const x = n.m.antworten[+t.dataset.szOk]; if (t.checked) x.ok = true; else delete x.ok; return geaendert(); }
      if (t.dataset.szZiel != null) { verbinde({n, j: t.dataset.szZiel === '' ? null : +t.dataset.szZiel}, t.value === '~' ? undefined : t.value === '' ? null : t.value); return geaendert(); }
      geaendert(true);   // Textfeld verlassen: speichern und Fläche neu zeichnen (Fokus im Formular bleibt)
    });
    // Ziehen: Anschluss → Kasten (Pfeil) und Baustein → Kasten/Anschluss (neuer Kasten)
    d.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      const port = e.target.closest('.sz-port:not(.aus)'), teil = e.target.closest('[data-sz-neu]'), kasten = e.target.closest('.sz-n');
      if (port) { zug = {art: 'pfeil', port: port.dataset.port, el: port, x: e.clientX, y: e.clientY, bewegt: false}; e.preventDefault(); }
      else if (teil) zug = {art: 'neu', typ: teil.dataset.szNeu, el: teil, x: e.clientX, y: e.clientY, bewegt: false};
      else if (kasten && sel !== kasten.dataset.n) { sel = kasten.dataset.n; innen.querySelectorAll('.sz-n').forEach(k => k.classList.toggle('sel', k === kasten)); eigenschaften(); }
    });
    const unter = (x, y) => { const z = document.elementFromPoint(x, y); return z && d.contains(z) ? z : null; };
    d.addEventListener('pointermove', e => {
      if (!zug) return;
      if (!zug.bewegt && Math.hypot(e.clientX - zug.x, e.clientY - zug.y) < 6) return;
      zug.bewegt = true; e.preventDefault();
      innen.querySelectorAll('.ziel').forEach(k => k.classList.remove('ziel'));
      const z = unter(e.clientX, e.clientY), k = z && (zug.art === 'neu' && z.closest('.sz-port:not(.aus)') || z.closest('.sz-n'));
      if (k) k.classList.add('ziel');
      if (zug.art === 'pfeil') {
        const R = innen.getBoundingClientRect(), r = zug.el.getBoundingClientRect();
        innen.querySelector('.sz-zug').setAttribute('d', `M${r.left + r.width / 2 - R.left} ${r.top + r.height / 2 - R.top} L${e.clientX - R.left} ${e.clientY - R.top}`);
      } else {
        if (!zug.geist) { zug.geist = zug.el.cloneNode(true); zug.geist.classList.add('sz-geist'); d.appendChild(zug.geist); }
        zug.geist.style.left = (e.clientX + 8) + 'px'; zug.geist.style.top = (e.clientY + 8) + 'px';
      }
    });
    d.addEventListener('pointerup', e => {
      const g = zug; if (!g) return;
      setTimeout(() => { zug = null; }, 0);   // der Klick danach soll nichts auslösen
      if (g.geist) g.geist.remove();
      const z = unter(e.clientX, e.clientY), kasten = z && z.closest('.sz-n'), port = z && z.closest('.sz-port:not(.aus)');
      if (g.art === 'pfeil') {
        if (g.bewegt && kasten) { verbinde(portVon(g.port), kasten.dataset.n); sel = g.port.split(':')[0]; return geaendert(); }
        if (!g.bewegt) { sel = g.port.split(':')[0]; }
        zeichne(); return eigenschaften();
      }
      if (!g.bewegt) { const n = by(sel) || by(G.start); neu(g.typ, n ? {n, j: null} : null); return geaendert(); }
      if (port) neu(g.typ, portVon(port.dataset.port)); else if (kasten) neu(g.typ, {n: by(kasten.dataset.n), j: null}); else return zeichne();
      geaendert();
    });
    d.addEventListener('pointercancel', () => { if (zug && zug.geist) zug.geist.remove(); zug = null; zeichne(); });
    d.addEventListener('keydown', e => {
      const k = e.target.closest && e.target.closest('.sz-n');
      if (k && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); sel = k.dataset.n; zeichne(); eigenschaften(); const f = eig.querySelector('textarea'); if (f) f.focus(); }
      if (k && e.key === 'Delete') { e.preventDefault(); loesche(k.dataset.n); geaendert(); }
    });
    d.addEventListener('close', () => d.remove());
    d.showModal(); zeichne(); eigenschaften();
    const s = innen.querySelector('.sz-n.sel'); if (s) flaeche.scrollLeft = Math.max(0, s.offsetLeft - flaeche.clientWidth / 2 + W / 2);
  }

  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-szenario-bau]')) oeffnen(); });
  window.Szenario = {lesen, schreiben, oeffnen};
})();
