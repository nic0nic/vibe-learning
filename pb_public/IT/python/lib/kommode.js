/*
  kommode.js – Variablenmodell „Kommode“ für Python (Skulpt), Bereich IT/python

  Bild: Jede Variable ist eine Schublade. Der Name steht auf einem Post-it auf der Schublade,
  der Wert auf einer kleinen Schiefertafel darin (Datentyp klein in der Ecke, Text in "…").
    Variable anlegen    → Post-it auf eine leere Schublade, Tafel hineinlegen und beschreiben
    neuer Wert          → Tafel putzen und neu beschreiben
    Variable verwenden  → Schublade auf, auf die Tafel schauen (Auge)

  Einbinden (nach skulpt.min.js):
    <link rel="stylesheet" href="lib/kommode.css">
    <script src="lib/kommode.js"></script>

  Ansicht:
    const k = Kommode.erzeugen(eltern)     Kommode zeichnen, k.el ist das Wurzelelement (darf umgehängt werden)
    k.groesse('mini' | 'gross')            Darstellung (klein in der Ecke / Vollbild)
    k.leeren()                             alle Schubladen leer
    k.zustand(map)                         ohne Animation setzen, map: Map name → {text, typ}
    await k.lesen(['x', 'y'])              auf die Tafeln schauen
    await k.schreiben('x', {text, typ})    anlegen bzw. putzen und neu beschreiben
    await k.entfernen('x')                 Post-it ab, Schublade leer (del x)
    k.info(text)                           Satz unter der Kommode („Was passiert gerade?“)
    k.tempo = 1                            0.5 … 4, größer = schneller

  Programm laufen lassen:
    const lauf = Kommode.lauf({code, kommode, konfig, schritte, auto, zeile, abbruch})
      konfig    Optionen für Sk.configure (output, inputfun, read …), debugging setzt lauf selbst
      schritte  true: vor jeder Zeile anhalten und Teilschritte zeigen (lesen → putzen/schreiben)
                false: normal laufen, am Ende (auch nach Fehler) den Endzustand zeigen
      auto      true: Schritte selbst abspielen (Pause je nach k.tempo)
      zeile(nr, art)  Zeile markieren, art 'naechste' | 'aktiv'; nr null = Markierung weg
      abbruch() wird bei jedem Halt aufgerufen und darf werfen, um das Programm abzubrechen
    lauf.promise              wie Sk.misceval.asyncToPromise
    lauf.schritt()            nächster Schritt
    lauf.abspielen(an)        automatisch weiter (an = true) oder anhalten; lauf.auto gibt den Stand
    lauf.beenden(grund)       wartenden Schritt mit grund abbrechen
    lauf.bereit               true, solange auf den nächsten Schritt gewartet wird
    lauf.onwarten = fn        wird aufgerufen, wenn sich lauf.bereit ändert

  Hilfen:
    Kommode.analyse(text)     → {lesen: [...], ziele: [...], fuer: [...]} welche Namen eine Zeile liest/setzt
    Kommode.variablen(gbl)    → Map name → {text, typ} aus einem Skulpt-Namensraum (ohne Funktionen, Module)

  Grenzen: Lokale Variablen in Funktionen zeigt die Kommode nicht (nur globale).
*/
(function () {
  'use strict';

  /* ---------- Zeile untersuchen: welche Namen werden gelesen, welche gesetzt? ---------- */
  const KW = new Set(('False None True and as assert async await break class continue def del elif else ' +
    'except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield').split(' '));
  const OPS = ['**=', '//=', '>>=', '<<=', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '->', ':=', '**', '//'];
  const AUG = new Set(['**=', '//=', '>>=', '<<=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=']);
  const NAME = /^[A-Za-z_\u00C0-\uFFFF][\w\u00C0-\uFFFF]*/;

  function tokens(src, fNamen) {
    const t = [];
    let i = 0;
    while (i < src.length) {
      const c = src[i], rest = src.slice(i);
      if (c === '#') { const n = src.indexOf('\n', i); i = n < 0 ? src.length : n; continue; }
      if (/\s/.test(c)) { i++; continue; }
      const s = /^([rRbBuUfF]{0,2})("""|'''|"|')/.exec(rest);
      if (s) {
        const q = s[2], f = /f/i.test(s[1]);
        let j = i + s[0].length, inhalt = '';
        while (j < src.length && src.substr(j, q.length) !== q) {
          if (src[j] === '\\') { inhalt += src[j]; j++; }
          inhalt += src[j]; j++;
        }
        i = j + q.length;
        if (f) fAusdruecke(inhalt).forEach(a => tokens(a).forEach(x => { if (x.t === 'name') fNamen.push(x); }));
        t.push({t: 'str'});
        continue;
      }
      const m = NAME.exec(rest);
      if (m) { t.push({t: 'name', v: m[0]}); i += m[0].length; continue; }
      const z = /^\.?\d[\w.]*/.exec(rest);
      if (z) { t.push({t: 'zahl'}); i += z[0].length; continue; }
      const op = OPS.find(o => rest.startsWith(o)) || c;
      t.push({t: 'op', v: op}); i += op.length;
    }
    return t;
  }
  // Ausdrücke in {…} eines f-Strings
  function fAusdruecke(s) {
    const a = [];
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '{') {
        if (s[i + 1] === '{') { i++; continue; }
        let tiefe = 1, j = i + 1;
        while (j < s.length && tiefe) { if (s[j] === '{') tiefe++; else if (s[j] === '}') tiefe--; j++; }
        a.push(s.slice(i + 1, j - 1).replace(/![rsa]$/, ''));
        i = j - 1;
      }
    }
    return a;
  }
  function klammerTiefe(text) {
    let d = 0;
    tokens(text, []).forEach(x => { if (x.t === 'op') { if ('([{'.includes(x.v)) d++; else if (')]}'.includes(x.v)) d--; } });
    return d;
  }

  function analyse(text) {
    const fNamen = [];
    const tk = tokens(text, fNamen);
    const lesen = new Set(), ziele = new Set(), fuer = new Set();
    const erstes = tk[0] && tk[0].t === 'name' ? tk[0].v : '';
    if (['def', 'class', 'import', 'from', 'global', 'nonlocal', 'del'].includes(erstes)) return {lesen: [], ziele: [], fuer: []};

    // Tiefe je Token, Stellen von = und +=, … auf oberster Ebene
    let d = 0;
    const tiefe = tk.map(x => {
      if (x.t === 'op' && '([{'.includes(x.v)) return d++;
      if (x.t === 'op' && ')]}'.includes(x.v)) return --d;
      return d;
    });
    const gleich = [], aug = [];
    tk.forEach((x, i) => {
      if (x.t !== 'op' || tiefe[i] !== 0) return;
      if (x.v === '=') gleich.push(i);
      else if (AUG.has(x.v)) aug.push(i);
    });
    const einfacheNamen = (von, bis) => {   // a  oder  a, b  oder  (a, b) → Namen, sonst null
      const n = [];
      for (let i = von; i < bis; i++) {
        const x = tk[i];
        if (x.t === 'name' && !KW.has(x.v)) n.push(x.v);
        else if (!(x.t === 'op' && ',()'.includes(x.v))) return null;
      }
      return n;
    };
    let lesenAb = 0;
    if (erstes === 'for') {
      const inI = tk.findIndex((x, i) => i > 0 && x.t === 'name' && x.v === 'in');
      (einfacheNamen(1, inI < 0 ? tk.length : inI) || []).forEach(n => { fuer.add(n); ziele.add(n); });
      lesenAb = inI < 0 ? tk.length : inI + 1;
    } else if (aug.length) {
      const n = einfacheNamen(0, aug[0]);
      if (n) { n.forEach(v => { ziele.add(v); lesen.add(v); }); lesenAb = aug[0] + 1; }
    } else if (gleich.length) {
      let von = 0, alleEinfach = true;
      gleich.forEach(g => { const n = einfacheNamen(von, g); if (n) n.forEach(v => ziele.add(v)); else alleEinfach = false; von = g + 1; });
      lesenAb = alleEinfach ? gleich[gleich.length - 1] + 1 : 0;
    }
    for (let i = lesenAb; i < tk.length; i++) {
      const x = tk[i];
      if (x.t !== 'name' || KW.has(x.v)) continue;
      const vor = tk[i - 1], nach = tk[i + 1];
      if (vor && vor.t === 'op' && vor.v === '.') continue;                        // Methode/Attribut
      if (nach && nach.t === 'op' && nach.v === '=' && tiefe[i] > 0) continue;     // Schlüsselwort-Argument end=""
      lesen.add(x.v);
    }
    fNamen.forEach(x => { if (!KW.has(x.v)) lesen.add(x.v); });
    return {lesen: [...lesen], ziele: [...ziele], fuer: [...fuer]};
  }

  /* ---------- Werte aus Skulpt ---------- */
  const OHNE = new Set(['function', 'module', 'type', 'builtin_function_or_method', 'method', 'generator', 'NotImplementedType']);
  function wertText(v) {
    let s;
    if (v instanceof Sk.builtin.str) s = '"' + v.v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"') + '"';
    else { try { s = v.$r().v; } catch (e) { s = '?'; } }
    return s.length > 80 ? s.slice(0, 79) + '…' : s;
  }
  function variablen(gbl) {
    const m = new Map();
    if (!gbl) return m;
    Object.keys(gbl).forEach(k => {
      if (k.startsWith('__')) return;
      const v = gbl[k];
      if (!v || typeof v !== 'object' || !v.tp$name || OHNE.has(v.tp$name)) return;
      m.set(k.replace(/_\$rw\$$/, ''), {text: wertText(v), typ: v.tp$name});
    });
    return m;
  }

  /* ---------- Ansicht ---------- */
  const AUGE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12z" fill="#fff" stroke="#2e3440" stroke-width="1.6"/><circle cx="12" cy="12" r="4.2" fill="#4f73a3"/><circle cx="12" cy="12" r="2" fill="#1d232c"/><circle cx="13.3" cy="10.7" r=".9" fill="#fff"/></svg>';
  const MIN_LADEN = 4;
  const ruhe = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pause = ms => new Promise(r => setTimeout(r, ms));
  function h(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }

  function erzeugen(eltern) {
    const el = h('div', 'kommode');
    el.innerHTML = '<div class="km-platte"></div><div class="km-korpus"><div class="km-laden"></div></div>' +
      '<div class="km-fuesse"><span></span><span></span></div><div class="km-info" aria-live="polite"></div>';
    const ladenEl = el.querySelector('.km-laden'), infoEl = el.querySelector('.km-info');
    const belegt = new Map();          // name → Schublade
    const k = {el, tempo: 1};
    const dauer = ms => Math.round(ms / Math.max(.25, k.tempo) * (ruhe ? .3 : 1));
    const anim = (e, frames, ms, opt) => e.animate(frames, Object.assign({duration: dauer(ms), easing: 'ease-in-out'}, opt)).finished.catch(() => {});

    function neueLade() {
      const l = h('div', 'km-lade leer',
        '<div class="km-innen"><div class="km-tafel"><span class="km-wert"></span><span class="km-typ"></span></div></div>' +
        '<div class="km-front"><span class="km-postit"></span><span class="km-knauf"></span></div>' +
        '<span class="km-auge">' + AUGE + '</span>');
      ladenEl.appendChild(l);
      return l;
    }
    function teile(l) { return {tafel: l.querySelector('.km-tafel'), wert: l.querySelector('.km-wert'), typ: l.querySelector('.km-typ'), postit: l.querySelector('.km-postit')}; }
    function beschrifte(l, name, w) {
      const t = teile(l);
      if (name != null) { t.postit.textContent = name; t.postit.title = 'Variable ' + name; }
      t.wert.textContent = w.text; t.wert.title = w.text;
      t.typ.textContent = w.typ;
    }
    function freieLade() {
      let l = ladenEl.querySelector('.km-lade.leer');
      if (!l) l = neueLade();
      return l;
    }
    function auffuellen(sanft) {
      const n = ladenEl.children.length, frei = ladenEl.querySelectorAll('.km-lade.leer').length;
      for (let i = n; i < MIN_LADEN; i++) neueLade();
      if (n >= MIN_LADEN && !frei) { const l = neueLade(); if (sanft) anim(l, [{opacity: 0, transform: 'translateY(.6em)'}, {opacity: 1, transform: 'none'}], 400); }
    }

    k.groesse = g => { el.classList.toggle('mini', g === 'mini'); el.classList.toggle('gross', g === 'gross'); };
    k.info = text => { infoEl.textContent = text || ''; };
    k.leeren = () => { ladenEl.textContent = ''; belegt.clear(); auffuellen(); k.info(''); };
    k.zustand = map => {
      k.leeren();
      map.forEach((w, name) => { const l = freieLade(); l.classList.remove('leer'); beschrifte(l, name, w); belegt.set(name, l); });
      auffuellen();
    };
    k.lesen = async names => {
      const laden = names.map(n => belegt.get(n)).filter(Boolean);
      if (!laden.length) return;
      laden.forEach(l => l.classList.add('schaut'));
      laden[0].scrollIntoView({block: 'nearest', behavior: 'smooth'});
      await pause(dauer(1100));
      laden.forEach(l => l.classList.remove('schaut'));
      await pause(dauer(250));
    };
    k.schreiben = async (name, w) => {
      let l = belegt.get(name);
      if (!l) {
        // anlegen: Post-it aufkleben, Schublade auf, Tafel hineinlegen, beschreiben
        l = freieLade();
        belegt.set(name, l);
        const t = teile(l);
        t.postit.textContent = name; t.wert.textContent = ''; t.typ.textContent = '';
        l.scrollIntoView({block: 'nearest', behavior: 'smooth'});
        l.classList.add('klebt');
        await anim(t.postit, [
          {opacity: 0, transform: 'translate(1.5em,-2.5em) rotate(-18deg) scale(1.7)'},
          {opacity: 1, transform: 'translate(0,0) rotate(-2.5deg) scale(1.08)', offset: .8},
          {opacity: 1, transform: 'rotate(-2.5deg) scale(1)'}], 650, {easing: 'ease-out'});
        l.classList.remove('klebt');
        l.classList.remove('leer');
        await pause(dauer(380));
        await anim(t.tafel, [{opacity: 0, transform: 'translateY(-1.2em) scale(1.1)'}, {opacity: 1, transform: 'none'}], 420, {easing: 'ease-out'});
        auffuellen(true);
        await schreibeKreide(l, name, w);
        return;
      }
      // neuer Wert: putzen, dann neu beschreiben
      l.scrollIntoView({block: 'nearest', behavior: 'smooth'});
      await putzen(l);
      await schreibeKreide(l, name, w);
    };
    async function putzen(l) {
      const t = teile(l);
      l.classList.add('arbeitet');
      const s = h('span', 'km-schwamm');
      t.tafel.appendChild(s);
      const breite = t.tafel.clientWidth - s.offsetWidth;
      await Promise.all([
        anim(s, [
          {transform: 'translate(0,-.3em) rotate(-8deg)', opacity: 0},
          {transform: 'translate(0,-.3em) rotate(-8deg)', opacity: 1, offset: .1},
          {transform: `translate(${breite}px,0) rotate(6deg)`, offset: .4},
          {transform: 'translate(0,.25em) rotate(-6deg)', offset: .7},
          {transform: `translate(${breite}px,0) rotate(4deg)`, opacity: 1, offset: .92},
          {transform: `translate(${breite}px,0) rotate(4deg)`, opacity: 0}], 1100),
        anim(t.wert, [{opacity: 1, filter: 'blur(0)'}, {opacity: .35, filter: 'blur(2px)', offset: .45}, {opacity: 0, filter: 'blur(4px)'}], 1000, {fill: 'forwards'}),
        anim(t.typ, [{opacity: 1}, {opacity: 0}], 700, {fill: 'forwards'})
      ]);
      s.remove();
      t.tafel.classList.add('geputzt');
      t.wert.textContent = ''; t.typ.textContent = '';
      t.wert.getAnimations().forEach(a => a.cancel()); t.typ.getAnimations().forEach(a => a.cancel());
      l.classList.remove('arbeitet');
    }
    async function schreibeKreide(l, name, w) {
      const t = teile(l);
      l.classList.add('arbeitet');
      beschrifte(l, name, w);
      const kreide = h('span', 'km-kreide');
      t.tafel.appendChild(kreide);
      const x0 = t.wert.offsetLeft, x1 = x0 + Math.min(t.wert.offsetWidth, t.tafel.clientWidth), y = t.wert.offsetTop + t.wert.offsetHeight * .55;
      const ms = Math.min(1400, 280 + 90 * w.text.length);
      await Promise.all([
        anim(t.wert, [{clipPath: 'inset(0 100% 0 0)'}, {clipPath: 'inset(0 0 0 0)'}], ms, {easing: 'linear'}),
        anim(kreide, [
          {transform: `translate(${x0}px,${y}px) rotate(-35deg)`, opacity: 1},
          {transform: `translate(${(x0 + x1) / 2}px,${y - 4}px) rotate(-30deg)`, offset: .5},
          {transform: `translate(${x1}px,${y}px) rotate(-35deg)`, opacity: 1}], ms, {easing: 'linear'})
      ]);
      await anim(t.typ, [{opacity: 0}, {opacity: 1}], 300);
      kreide.remove();
      l.classList.remove('arbeitet');
    }
    k.entfernen = async name => {
      const l = belegt.get(name);
      if (!l) return;
      belegt.delete(name);
      await anim(teile(l).postit, [{transform: 'rotate(-2.5deg)', opacity: 1}, {transform: 'translateY(2em) rotate(25deg)', opacity: 0}], 600, {easing: 'ease-in'});
      l.classList.add('leer');
      teile(l).postit.textContent = '';
    };

    k.leeren();
    if (eltern) eltern.appendChild(el);
    return k;
  }

  /* ---------- Programm laufen lassen, auf Wunsch Schritt für Schritt ---------- */
  function lauf(o) {
    const k = o.kommode, zeilen = String(o.code).split('\n');
    const zeile = o.zeile || (() => {});
    const pruefe = () => { if (o.abbruch) o.abbruch(); };
    const cache = {};
    function an(nr) {
      if (cache[nr]) return cache[nr];
      let text = zeilen[nr - 1] || '', j = nr;
      while (klammerTiefe(text) > 0 && j < zeilen.length && j < nr + 30) text += '\n' + zeilen[j++];
      return (cache[nr] = analyse(text));
    }
    function forZeile(name, bis) {
      let gefunden = 0;
      for (let nr = 1; nr <= zeilen.length; nr++) if (/^\s*for\b/.test(zeilen[nr - 1]) && an(nr).fuer.includes(name) && (!gefunden || nr <= bis)) gefunden = nr;
      return gefunden;
    }
    // while-Schleifen, die Zeile nr umschließen (innerste zuerst)
    const einzug = z => z.match(/^\s*/)[0].length;
    const leer = z => !z.trim() || /^\s*#/.test(z);
    function whileUm(nr) {
      const w = [];
      for (let k = nr - 1; k >= 1; k--) {
        const z = zeilen[k - 1];
        if (leer(z) || !/^\s*while\b/.test(z)) continue;
        let ende = k + 1;
        while (ende <= zeilen.length && (leer(zeilen[ende - 1]) || einzug(zeilen[ende - 1]) > einzug(z))) ende++;
        if (nr < ende) w.push({nr: k, ende});
      }
      return w;
    }
    const pauseMs = () => Math.round(900 / Math.max(.25, k ? k.tempo : 1));
    const liste = names => names.map(n => '„' + n + '“').join(names.length > 2 ? ', ' : ' und ');

    let vorher = new Map(), gbl = null, letzteZeile = 0, zieleOffen = false, letzteModul = 0, warten = null;
    const self = {auto: !!o.auto, bereit: false, onwarten: null};
    function setzeBereit(b) { self.bereit = b; if (self.onwarten) self.onwarten(b); }

    // Änderungen seit dem letzten Halt zeigen (Post-it, putzen, schreiben)
    async function nachher(modulZeile) {
      const neu = variablen(gbl);
      // Ziele der Zeile (auch bei gleichem Wert neu schreiben) nur beim ersten Halt nach dem Schritt
      const ziele = letzteZeile && modulZeile && zieleOffen ? an(letzteZeile).ziele : [];
      zieleOffen = false;
      const geaendert = [];
      neu.forEach((w, n) => { const a = vorher.get(n); if (!a || a.text !== w.text || a.typ !== w.typ || ziele.includes(n)) geaendert.push(n); });
      const weg = [...vorher.keys()].filter(n => !neu.has(n));
      for (const n of geaendert) {
        pruefe();
        let nr = letzteZeile, wie = '';
        if (!ziele.includes(n)) {
          const f = forZeile(n, letzteZeile);
          if (f) { nr = f; wie = 'for'; }
          else if (letzteModul && an(letzteModul).ziele.includes(n)) nr = letzteModul;
        }
        if (nr) zeile(nr, 'aktiv');
        const w = neu.get(n);
        if (!vorher.has(n)) k.info(`Zeile ${nr}: Neue Variable ${liste([n])}. Post-it auf eine leere Schublade, Tafel hinein, ${w.text} anschreiben.`);
        else if (wie === 'for') k.info(`Zeile ${nr}: Die for-Schleife gibt ${liste([n])} den nächsten Wert. Tafel putzen, ${w.text} anschreiben.`);
        else k.info(`Zeile ${nr}: Neuer Wert für ${liste([n])}. Tafel putzen, ${w.text} anschreiben.`);
        await k.schreiben(n, w);
        vorher.set(n, w);
      }
      for (const n of weg) { pruefe(); k.info(`Die Variable ${liste([n])} wird gelöscht.`); await k.entfernen(n); vorher.delete(n); }
      return geaendert.length + weg.length > 0;
    }

    // Schleife verlassen: die letzte Prüfung der Bedingung als eigenen Schritt zeigen
    async function schleifenEnde(nr) {
      if (!letzteModul || /^\s*(break|return)\b/.test(zeilen[letzteModul - 1] || '')) return;
      for (const w of whileUm(letzteModul)) {
        if (nr && (nr === w.nr || (nr > w.nr && nr < w.ende))) break;
        zeile(w.nr, 'naechste');
        k.info(`Als Nächstes: Zeile ${w.nr}. Die Bedingung wird noch einmal geprüft.`);
        await warte();
        pruefe();
        zeile(w.nr, 'aktiv');
        const lies = an(w.nr).lesen.filter(n => vorher.has(n));
        if (lies.length) {
          k.info(lies.length === 1 ? `Zeile ${w.nr}: Python schaut auf die Tafel ${liste(lies)}. Dort steht ${vorher.get(lies[0]).text}.` : `Zeile ${w.nr}: Python schaut auf die Tafeln ${liste(lies)}.`);
          await k.lesen(lies);
          pruefe();
        }
        k.info(`Zeile ${w.nr}: Die Bedingung ist nicht mehr erfüllt, die Schleife endet.`);
        await pause(pauseMs());
        letzteModul = letzteZeile = w.nr;
      }
    }

    function warte() {
      return new Promise((resolve, reject) => {
        warten = {resolve, reject, timer: self.auto ? setTimeout(resolve, pauseMs()) : null};
        setzeBereit(true);
      }).finally(() => { if (warten && warten.timer) clearTimeout(warten.timer); warten = null; setzeBereit(false); });
    }
    self.schritt = () => { if (warten) warten.resolve(); };
    self.abspielen = an => {
      self.auto = !!an;
      if (warten) { clearTimeout(warten.timer); warten.timer = self.auto ? setTimeout(warten.resolve, 150) : null; }
    };
    self.beenden = grund => { if (warten) warten.reject(grund); };

    const handler = {'*': () => { pruefe(); }};
    if (o.schritte) {
      // Sk.debug: vor jeder Anweisung; Sk.delay: Schleifenkopf (while/for) vor jedem weiteren Durchlauf
      handler['Sk.debug'] = handler['Sk.delay'] = s => {
        let d = s;
        while (d.child && d.child.child) d = d.child;
        if (d.$filename !== '<stdin>.py' || !d.$lineno) { pruefe(); return null; }
        const nr = d.$lineno, modul = d.$loc === d.$gbl;
        gbl = d.$gbl;
        return (async () => {
          pruefe();
          const anders = await nachher(modul);
          pruefe();
          // for-Kopf: der nächste Wert ist schon gesetzt (oben als Teilschritt gezeigt), hier nicht anhalten
          if (s.data.type === 'Sk.delay' && /^\s*for\b/.test(zeilen[nr - 1] || '')) return s.resume();
          // while-Kopf: direkt nach dem eigenen Schritt kommt er ein zweites Mal – überspringen
          if (s.data.type === 'Sk.delay' && nr === letzteZeile && !anders) return s.resume();
          if (modul) { await schleifenEnde(nr); pruefe(); }
          zeile(nr, 'naechste');
          k.info(modul ? `Als Nächstes: Zeile ${nr}` : `Als Nächstes: Zeile ${nr} (in einer Funktion – ihre lokalen Variablen zeigt die Kommode nicht)`);
          await warte();
          pruefe();
          zeile(nr, 'aktiv');
          letzteZeile = nr; zieleOffen = true;
          if (modul) {
            letzteModul = nr;
            const lies = an(nr).lesen.filter(n => vorher.has(n));
            if (lies.length) {
              const werte = lies.map(n => vorher.get(n).text);
              k.info(lies.length === 1
                ? `Zeile ${nr}: Python schaut auf die Tafel ${liste(lies)}. Dort steht ${werte[0]}.`
                : `Zeile ${nr}: Python schaut auf die Tafeln ${liste(lies)}.`);
              await k.lesen(lies);
              pruefe();
            }
          }
          const art = (zeilen[nr - 1] || '').trim().split(/[\s(:]/)[0];
          k.info(art === 'def' ? `Zeile ${nr}: Eine Funktion wird festgelegt. Funktionen kommen nicht in die Kommode.`
            : art === 'import' || art === 'from' ? `Zeile ${nr}: Ein Modul wird geladen. Module kommen nicht in die Kommode.`
            : `Zeile ${nr} wird ausgeführt …`);
          return s.resume();
        })();
      };
    }
    const konfig = Object.assign({}, o.konfig, o.schritte ? {debugging: true, breakpoints: f => f === '<stdin>.py'} : {debugging: false});
    Sk.configure(konfig);

    const hauptNamensraum = () => { try { return Sk.sysmodules.mp$subscript(new Sk.builtin.str('__main__')).$d; } catch (e) { return null; } };
    const p = Sk.misceval.asyncToPromise(() => Sk.importMainWithBody('<stdin>', false, o.code, true), handler);
    self.promise = p.then(async r => {
      if (k) {
        if (o.schritte) { gbl = hauptNamensraum() || gbl; await nachher(true); await schleifenEnde(null); zeile(null); k.info('Programm beendet.'); }
        else k.zustand(variablen(hauptNamensraum()));
      }
      return r;
    }, async err => {
      if (k && !(err && err.abbruch)) {
        try {
          if (o.schritte) { gbl = hauptNamensraum() || gbl; zeile(null); k.info('Fehler – siehe Terminal. So sieht die Kommode jetzt aus.'); }
          else k.zustand(variablen(hauptNamensraum()));
        } catch (e) { /* Anzeige ist nicht wichtig */ }
      }
      throw err;
    });
    return self;
  }

  window.Kommode = {erzeugen, lauf, analyse, variablen};
})();
