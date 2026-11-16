/* szenario.js – Szenario (verzweigter Lern-Chat, Typ chat in lib/aufgaben.js) als Bild: Kästen und Pfeile
 *
 * Genutzt vom Baukasten (vorlage-szenario.js: Szenario visuell bauen) und von Seiten, die ein Szenario zeigen
 * (IT/tools/demo-aufgabentypen.html). Dazu lib/szenario.css.
 *   <link rel="stylesheet" href="…/lib/szenario.css">  <script src="…/lib/szenario.js"></script>
 *
 * API
 *   Szenario.zeige(el, aufgabe)     Bild einer chat-Aufgabe in el (nur ansehen); el muss sichtbar sein (Höhen werden gemessen).
 *                                   Nach einer Änderung von Schrift oder Design einfach noch einmal aufrufen.
 *   Szenario.lesen(aufgabe) → G     Modell: {start, zaehler, nodes: [{k, m (Nachricht als Objekt ohne weiter/ende),
 *                                   out (Ziel-k oder null = Ende), aout: [je Antwort Ziel-k, null = Ende, undefined = wie der Kasten]}]}
 *   Szenario.schreiben(G) → nachrichten   zurück ins Format von chat: Reihenfolge so, dass möglichst viele Pfeile „nächste
 *                                   Nachricht“ bedeuten, sonst "weiter": "<id>" (ids m1, m2 … entstehen von selbst), "ende", "entscheidung"
 *   Szenario.zeichne(innen, G, {sel}) → {Kasten-k: Nummer}   Kästen (.sz-n, data-n) mit Anschlüssen (.sz-port, data-port="k:"
 *                                   bzw. "k:<Antwort>") in Ebenen ab Start setzen, Pfeile als SVG; sel = markierter Kasten
 *   Szenario.art(n) → 'text' | 'knoepfe' | 'zahl' | 'freitext', Szenario.alleEigen(n), Szenario.kurz(html, n), Szenario.SYMBOL
 * Bild lesen: ● Anschluss, ■ Ende, gestrichelter Pfeil = Sprung zurück oder quer, gestrichelter Kasten = wird nie erreicht.
 */
(function () {
  'use strict';
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
  const SYMBOL = {text: '💬', knoepfe: '🔘', zahl: '🔢', freitext: '✎'};

  /* ---------- Bild: Kästen in Ebenen (Breitensuche ab Start), Pfeile als SVG darüber ---------- */
  const W = 230, LUECKE = 34, ZEILE = 58;
  function zeichne(innen, G, opt) {
    const sel = opt && opt.sel, by = k => G.nodes.find(n => n.k === k) || null;
    const kinder = {}, tiefe = {}, wurzeln = [], lose = new Set();
    const ziele = n => { const l = []; n.aout.forEach(t => { if (t && by(t)) l.push(t); }); if (!alleEigen(n) && n.out && by(n.out)) l.push(n.out); return [...new Set(l)]; };
    const suche = r => { wurzeln.push(r); tiefe[r] = 0; kinder[r] = []; const q = [r]; while (q.length) { const k = q.shift(); ziele(by(k)).forEach(c => { if (tiefe[c] == null) { tiefe[c] = tiefe[k] + 1; kinder[k].push(c); kinder[c] = []; q.push(c); } }); } };
    if (G.start && by(G.start)) suche(G.start);
    G.nodes.forEach(n => { if (tiefe[n.k] == null) { lose.add(n.k); suche(n.k); } });
    const nummer = {}; let z = 0;
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
    const oben = [], unten = zeilenH.reduce((s, v, i) => { oben[i] = s; return s + v + ZEILE; }, 14);
    let blatt = 0;
    const setze = k => { if (!kinder[k].length) x[k] = 30 + blatt++ * (W + LUECKE); else { kinder[k].forEach(setze); x[k] = (x[kinder[k][0]] + x[kinder[k][kinder[k].length - 1]]) / 2; } y[k] = oben[tiefe[k]]; };
    wurzeln.forEach(setze);
    G.nodes.forEach(n => { el[n.k].style.left = x[n.k] + 'px'; el[n.k].style.top = y[n.k] + 'px'; });
    const breit = 44 + Math.max(1, blatt) * (W + LUECKE), hoch = Math.max(60, unten - ZEILE + 24);
    innen.style.width = breit + 'px'; innen.style.height = hoch + 'px';
    // Pfeile
    const R = innen.getBoundingClientRect(), mitte = p => { const r = p.getBoundingClientRect(); return [r.left + r.width / 2 - R.left, r.top + r.height / 2 - R.top]; };
    let pfade = '';
    // Pfeil nach unten: Bogen. Pfeil zurück (Ziel nicht tiefer): außen am Kasten vorbei durch die Lücke zwischen den Spalten
    // nach oben und von der Seite auf das Ziel. Das SVG liegt hinter den Kästen, Linien verschwinden also hinter ihnen.
    const pfeil = (port, nach, seite, klasse, von) => {
      const [x1, y1] = mitte(port), x2 = x[nach] + W / 2, y2 = y[nach] - 3;
      let weg;
      if (y2 > y1 + 14) { const c1 = seite ? [x1 + 46, y1] : [x1, y1 + 34]; weg = `M${x1} ${y1} C${c1[0]} ${c1[1]}, ${x2} ${y2 - 40}, ${x2} ${y2}`; }
      else {
        const rechts = seite || x1 >= x2, xs = rechts ? x[von] + W + LUECKE / 2 : x[von] - LUECKE / 2, xe = x2 + (xs >= x2 ? 26 : -26);
        weg = `M${x1} ${y1} ${seite ? '' : `V${y1 + 20} `}H${xs} V${y2 - 22} H${xe} V${y2}`;
      }
      pfade += `<path class="${klasse}" d="${weg}" marker-end="url(#sz-spitze${klasse.includes('ant') ? '-a' : ''})"/>`;
    };
    G.nodes.forEach(n => {
      if (!alleEigen(n) && n.out && by(n.out)) pfeil(el[n.k].querySelector('.sz-port.unten'), n.out, false, 'sz-pf' + (kinder[n.k].includes(n.out) ? '' : ' quer'), n.k);
      n.aout.forEach((t, j) => { if (t && by(t)) pfeil(el[n.k].querySelector(`[data-port="${n.k}:${j}"]`), t, true, 'sz-pf ant' + (kinder[n.k].includes(t) ? '' : ' quer'), n.k); });
    });
    innen.insertAdjacentHTML('beforeend', `<svg class="sz-svg" width="${breit}" height="${hoch}" aria-hidden="true"><defs>
      <marker id="sz-spitze" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="sz-sp" d="M0 0L10 5L0 10z"/></marker>
      <marker id="sz-spitze-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="sz-sp a" d="M0 0L10 5L0 10z"/></marker></defs>${pfade}<path class="sz-zug" d=""/></svg>`);
    return nummer;
  }
  function zeige(el, aufgabe) {
    el = typeof el === 'string' ? document.querySelector(el) : el;
    el.classList.add('sz-flaeche', 'sz-fest');
    el.innerHTML = '<div class="sz-innen"></div>';
    zeichne(el.firstChild, lesen(aufgabe), {});
    el.setAttribute('role', 'img'); el.setAttribute('aria-label', 'Aufbau des Szenarios als Kästen mit Pfeilen');
  }
  const Szenario = {zeige, zeichne, lesen, schreiben, art, alleEigen, kurz, SYMBOL, BREITE: W};
  if (typeof window !== 'undefined') window.Szenario = Szenario;
  if (typeof module !== 'undefined' && module.exports) module.exports = Szenario;
})();
