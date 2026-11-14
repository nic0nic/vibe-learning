/* Menüleiste der Übungsplattform
 *
 * Baut oben auf jeder Seite die Leiste: vorne das Fach-Menü (IT, BWR › Jahrgangsstufe 9 …),
 * dahinter die Bereiche des gewählten Fachs aus katalog.js.
 * Fährt man mit der Maus über einen Bereich (am Handy: antippen), klappen
 * dessen Übungen auf. Außerdem füllt das Skript die Startseite bzw. Fachseite (#pf-start),
 * die Auswahl der Jahrgangsstufe (#pf-fach) und die Übersichtsseite eines Bereichs (#pf-bereich).
 * Das zuletzt gewählte Fach merkt sich der Browser (localStorage pf-fach) für die Startseite.
 *
 * Fehlt katalog.js oder nav.js, läuft das Tool trotzdem – nur ohne Menüleiste.
 * Tools mit gruppe (katalog.js) stehen im Menü in einem Untermenü (klappt beim Darüberfahren auf)
 * und auf der Bereichsseite unter einer Zwischenüberschrift.
 * Tools mit bedingt: true (katalog.js) sind zunächst ausgeblendet; sync.js blendet sie ein,
 * wenn der Server sie für den angemeldeten Schüler freigibt (Klasse pf-sichtbar).
 * In Einzeldateien (werkzeuge/einzeldateien.py, window.PF_EINZELDATEI) zeigt die
 * Leiste nur Name und Hell/Dunkel-Knopf, weil es keine anderen Seiten gibt.
 * Rechts in der Leiste sitzt auf jeder Seite ein Vollbild-Knopf (auch in Einzeldateien und ByCS-Paketen).
 * Läuft die Seite in einem iframe ohne allowfullscreen (z. B. Moodle-Player), wird das iframe-Element
 * im übergeordneten Fenster bildschirmfüllend, solange es denselben Ursprung hat. Geht beides nicht
 * (z. B. iPhone), fehlt der Knopf. Browser beenden Vollbild bei jedem Seitenwechsel (dauerhaft: F11).
 * Läuft die Seite in einem iframe gleichen Ursprungs (ByCS/Moodle-Player), gibt es daneben „Großansicht“:
 * Das oberste erreichbare iframe-Element wird per CSS über das ganze Fenster gelegt. Geht auch dort, wo
 * Vollbild nicht klappt (iPad, Apps); bleibt für die Sitzung eingeschaltet (sessionStorage pf-gross), Esc beendet.
 * Design (lib/designs.js): Haben Angemeldete im Konto-Menü (sync.js) ein anderes Design gewählt (localStorage pf-design),
 * lädt nav.js designs.js nach und schaltet es ein – außer die Seite bringt selbst ein Design mit (html[data-design]).
 * Experimentell: handgebaute Seiten (Excel, SQL …) sehen dann nur teilweise anders aus.
 * Unten auf jeder Seite (außer Einzeldateien) stehen Links zu Impressum und Datenschutz (pb_public/impressum.html, datenschutz.html).
 */
(function () {
  'use strict';
  const K = window.KATALOG;
  if (!K) return;

  // Wurzel der Plattform = Ordner, in dem nav.js liegt (funktioniert auch per Doppelklick)
  const me = document.currentScript && document.currentScript.src;
  const BASE = me ? me.replace(/[^/]*$/, '') : '';
  const root = document.documentElement;
  const TOOL = root.dataset.trainer || '';
  // Aktueller Bereich: über das Tool oder <html data-bereich="IT/excel">.
  // Aktuelle Gruppe (Fach bzw. Fach + Jahrgangsstufe): über den Bereich, <html data-gruppe="BWR/9II">
  // oder <html data-fach="BWR">, sonst die zuletzt gewählte (localStorage pf-fach), sonst die erste.
  const BER = K.bereiche.find(b => b.tools.some(t => t.id === TOOL)) || K.bereiche.find(b => b.pfad === root.dataset.bereich) || null;
  const BEREICH = BER ? BER.id : '';
  // gewähltes Design (Einstellung im Konto-Menü) nachladen; Seiten mit eigenem Design behalten es
  let wunsch = null; try { wunsch = localStorage.getItem('pf-design'); } catch (e) {}
  if (wunsch && wunsch !== 'standard' && !root.dataset.design){
    root.dataset.design = wunsch;
    const s = document.createElement('script'); s.src = BASE + 'lib/designs.js';
    s.onload = () => { if (window.Designs) Designs.anwenden(wunsch); };
    document.head.appendChild(s);
  }
  const FACHSEITE = K.faecher.find(f => f.id === root.dataset.fach) || null;
  let GRUPPE = BER ? BER.gruppe : K.gruppen.find(g => g.pfad === root.dataset.gruppe) || (FACHSEITE && K.gruppen.find(g => g.fach === FACHSEITE));
  if (GRUPPE){ try { localStorage.setItem('pf-fach', GRUPPE.pfad); } catch (e) {} }
  else {
    let zuletzt = null;
    try { zuletzt = localStorage.getItem('pf-fach'); } catch (e) {}
    GRUPPE = K.gruppen.find(g => g.pfad === zuletzt) || K.gruppen[0];
  }

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const bereichUrl = b => BASE + b.pfad + '/index.html';
  const toolUrl = (b, t) => BASE + b.pfad + '/' + t.datei;
  const gruppeUrl = g => BASE + g.pfad + '/index.html';
  const fachUrl = f => BASE + f.id + '/index.html';

  const CSS = `
.pf-fuss{max-width:1400px;margin:28px auto 0;padding:14px 16px 22px;text-align:center;font:13px system-ui,sans-serif;color:var(--muted,#5b6578)}
.pf-fuss a{color:inherit}
.pf-nav{background:var(--panel,#f6f8fb);color:var(--text,#2e3440);border-bottom:1px solid var(--border,#cdd3de);position:relative;z-index:60;font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.pf-in{max-width:1400px;margin:0 auto;display:flex;align-items:center;gap:6px;padding:0 16px;min-height:50px}
.pf-brand{font:800 18px ui-monospace,Consolas,"Liberation Mono",monospace;color:inherit;text-decoration:none;margin-right:14px;white-space:nowrap}
.pf-brand span{color:var(--accent-text,var(--accent,#5e81ac))}
.pf-menu{display:flex;gap:2px;list-style:none;margin:0;padding:0}
.pf-item{position:relative;--bc:#5e81ac}
html[data-theme=dark] .pf-item{--bc:#88c0d0}
.pf-item>a{display:flex;align-items:center;gap:5px;padding:14px 11px;color:inherit;text-decoration:none;font-weight:600;border-bottom:3px solid transparent;white-space:nowrap}
.pf-item>a::after{content:"";width:6px;height:6px;border:solid currentColor;border-width:0 2px 2px 0;transform:rotate(45deg) translateY(-2px);opacity:.5}
.pf-item:hover>a,.pf-item.open>a{color:var(--bc)}
.pf-item>a[aria-current]{border-bottom-color:var(--bc)}
.pf-drop{display:none;position:absolute;top:100%;left:0;min-width:280px;background:var(--panel,#f6f8fb);border:1px solid var(--border,#cdd3de);border-radius:0 0 12px 12px;box-shadow:0 14px 30px rgba(0,0,0,.18);padding:6px;list-style:none;margin:0}
.pf-item:hover .pf-drop,.pf-item:focus-within .pf-drop,.pf-item.open .pf-drop{display:block}
.pf-drop a{display:block;padding:8px 10px;border-radius:8px;color:inherit;text-decoration:none}
.pf-drop a:hover,.pf-drop a:focus{background:var(--panel2,#eceff4);outline:none}
.pf-drop a[aria-current]{color:var(--bc);font-weight:600}
.pf-drop small{display:block;color:var(--muted,#5b6578);font-size:13px}
.pf-drop .pf-all{font-size:13px;color:var(--muted,#5b6578);border-top:1px solid var(--border,#cdd3de);border-radius:0 0 8px 8px;margin-top:4px}
.pf-fach{margin-right:8px}
.pf-fach>a{border:1px solid var(--border,#cdd3de);border-radius:10px;background:var(--panel2,#eceff4);padding:6px 10px!important;margin:6px 0}
.pf-fach>a small{font-weight:500;color:var(--muted,#5b6578);margin-right:2px}
.pf-sub{position:relative}
.pf-sub>a{display:flex!important;align-items:center;justify-content:space-between;gap:12px}
.pf-sub>a::after{content:"";width:6px;height:6px;border:solid currentColor;border-width:0 2px 2px 0;transform:rotate(-45deg);opacity:.5;flex:none}
.pf-drop2{display:none;position:absolute;left:100%;top:-7px;min-width:250px;background:var(--panel,#f6f8fb);border:1px solid var(--border,#cdd3de);border-radius:12px;box-shadow:0 14px 30px rgba(0,0,0,.18);padding:6px;list-style:none;margin:0}
.pf-sub.links>.pf-drop2{left:auto;right:100%}
.pf-drop2 li:not(.pf-fachtool)+.pf-fachtool{border-top:1px solid var(--border,#cdd3de);margin-top:4px;padding-top:4px}
.pf-sub:hover>.pf-drop2,.pf-sub:focus-within>.pf-drop2,.pf-sub.open>.pf-drop2{display:block}
.pf-drop .pf-leer{padding:8px 10px;color:var(--muted,#5b6578);font-style:italic}
.pf-right{margin-left:auto;display:flex;align-items:center;gap:10px}
.pf-btn{background:var(--panel2,#eceff4);border:1px solid var(--border,#cdd3de);color:inherit;border-radius:10px;width:38px;height:38px;display:grid;place-items:center;cursor:pointer;font-size:17px;padding:0}
.pf-burger{display:none}
.pf-einzeln .pf-menu{display:none!important}
.pf-bedingt:not(.pf-sichtbar){display:none!important}
@media (max-width:760px){
  .pf-burger{display:grid}
  .pf-menu{display:none;position:absolute;top:100%;left:0;right:0;flex-direction:column;background:var(--panel,#f6f8fb);border-bottom:1px solid var(--border,#cdd3de);box-shadow:0 14px 30px rgba(0,0,0,.18);padding:6px 16px 12px;max-height:80vh;overflow:auto}
  .pf-nav.open .pf-menu{display:flex}
  .pf-item>a{padding:10px 0 4px;border:0}
  .pf-item>a::after{display:none}
  .pf-drop{display:block;position:static;min-width:0;border:0;box-shadow:none;padding:0 0 4px 10px}
  .pf-drop2{display:block;position:static;min-width:0;border:0;box-shadow:none;padding:0 0 0 12px}
  .pf-sub>a::after{display:none}
}
.pf-knapp .ts-badge.gast .ts-lang{display:none}
/* dasselbe, wenn die Leiste zu voll ist (nav.js setzt pf-eng) */
.pf-eng .pf-burger{display:grid}
.pf-eng .pf-menu{display:none;position:absolute;top:100%;left:0;right:0;flex-direction:column;background:var(--panel,#f6f8fb);border-bottom:1px solid var(--border,#cdd3de);box-shadow:0 14px 30px rgba(0,0,0,.18);padding:6px 16px 12px;max-height:80vh;overflow:auto}
.pf-eng.open .pf-menu{display:flex}
.pf-eng .pf-item>a{padding:10px 0 4px;border:0}
.pf-eng .pf-item>a::after{display:none}
.pf-eng .pf-drop{display:block;position:static;min-width:0;border:0;box-shadow:none;padding:0 0 4px 10px}
.pf-eng .pf-drop2{display:block;position:static;min-width:0;border:0;box-shadow:none;padding:0 0 0 12px}
.pf-eng .pf-sub>a::after{display:none}
.pf-fade,.pf-fade *{transition:background-color .35s,color .35s,border-color .35s,fill .35s!important}
.pf-gesperrt{opacity:.5;cursor:default!important}
@media print{.pf-nav{display:none}}`;

  // Farben der Bereiche (katalog.js: farbe = dunkles Design, farbeHell = helles Design,
  // farbeSchrift = optional hellerer Ton für Schrift im dunklen Design).
  // --accent gilt für die ganze Seite des aktuellen Bereichs, --bc nur für den eigenen Menüpunkt.
  function akzentCss(){
    let css = '';
    K.bereiche.forEach(b => {
      if (!b.farbe) return;
      const dunkel = b.farbeSchrift || b.farbe;
      css += `\n.pf-item[data-b="${b.id}"]{--bc:${b.farbeHell || b.farbe}}\nhtml[data-theme=dark] .pf-item[data-b="${b.id}"]{--bc:${dunkel}}`;
      if (b.id === BEREICH) css += `\nhtml[data-theme]{--accent:${b.farbeHell || b.farbe};--accent-text:${b.farbeHell || b.farbe}}\nhtml[data-theme=dark]{--accent:${b.farbe};--accent-text:${dunkel}}`;
    });
    return css;
  }

  const SONNE = '☀', MOND = '☾';

  /* ---------- Vollbild ---------- */
  const VOLL_AN = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>';
  const VOLL_AUS = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/></svg>';
  const darfVoll = d => { try { return !!(d.fullscreenEnabled || d.webkitFullscreenEnabled); } catch (e) { return false; } };
  const vollElement = d => { try { return d.fullscreenElement || d.webkitFullscreenElement || null; } catch (e) { return null; } };
  // Element, das in Vollbild geht: die Seite selbst oder, im iframe ohne Erlaubnis, das iframe-Element
  // im nächsthöheren Fenster gleichen Ursprungs, das Vollbild erlaubt
  function vollZiel(){
    if (darfVoll(document)) return document.documentElement;
    let w = window;
    try {
      while (w.frameElement){
        const el = w.frameElement, d = el.ownerDocument;
        if (darfVoll(d)) return el;
        w = d.defaultView;
      }
    } catch (e) {}                                   // fremder Ursprung
    return null;
  }
  const VOLL = vollZiel();
  const imVoll = () => !!VOLL && vollElement(VOLL.ownerDocument) === VOLL;
  function vollUmschalten(){
    const d = VOLL.ownerDocument;
    try {
      if (imVoll()) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      else { const r = (VOLL.requestFullscreen || VOLL.webkitRequestFullscreen).call(VOLL); if (r && r.catch) r.catch(() => {}); }
    } catch (e) {}
  }
  function vollKnopf(btn){
    const an = imVoll();
    btn.innerHTML = an ? VOLL_AUS : VOLL_AN;
    btn.setAttribute('aria-label', an ? 'Vollbild beenden' : 'Vollbild');
    btn.title = an ? 'Vollbild beenden (Esc)' : 'Vollbild – gilt für diese Seite, für alle Seiten F11';
    btn.setAttribute('aria-pressed', an);
  }

  /* ---------- Großansicht (nur im iframe): iframe-Element im obersten erreichbaren Fenster über alles legen ---------- */
  const GROSS_AN = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7"/></svg>';
  const GROSS_AUS = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10h-6V4M14 10l7-7M4 14h6v6M10 14l-7 7"/></svg>';
  const GROSS = (() => {
    let el = null, w = window;
    try { while (w.frameElement){ el = w.frameElement; w = el.ownerDocument.defaultView; } } catch (e) {}   // fremder Ursprung: bis hierher
    return el;
  })();
  const GROSS_CSS = {position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', 'max-width': 'none', 'max-height': 'none',
    margin: '0', border: '0', 'z-index': '2147483000', background: '#fff'};
  const ss = {
    get(k){ try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v){ try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} }
  };
  const imGross = () => { try { return !!GROSS && GROSS.dataset.pfGross === '1'; } catch (e) { return false; } };
  function gross(an){
    if (!GROSS) return;
    try {
      const body = GROSS.ownerDocument.body;
      if (an && !imGross()){
        GROSS.dataset.pfGrossStil = GROSS.getAttribute('style') || '';
        GROSS.dataset.pfGrossBody = body.style.overflow || '';
        Object.keys(GROSS_CSS).forEach(k => GROSS.style.setProperty(k, GROSS_CSS[k], 'important'));
        body.style.overflow = 'hidden';
        GROSS.dataset.pfGross = '1';
      } else if (!an && imGross()){
        GROSS.setAttribute('style', GROSS.dataset.pfGrossStil);
        body.style.overflow = GROSS.dataset.pfGrossBody;
        ['pfGross', 'pfGrossStil', 'pfGrossBody'].forEach(k => delete GROSS.dataset[k]);
      }
    } catch (e) {}
    ss.set('pf-gross', an ? '1' : null);
    const b = document.getElementById('pfGross'); if (b) grossKnopf(b);
  }
  function grossKnopf(btn){
    const an = imGross();
    btn.innerHTML = an ? GROSS_AUS : GROSS_AN;
    btn.setAttribute('aria-label', an ? 'Großansicht beenden' : 'Großansicht');
    btn.title = an ? 'Großansicht beenden (Esc)' : 'Großansicht – Übung füllt das ganze Fenster (gut auf dem iPad)';
    btn.setAttribute('aria-pressed', an);
  }
  if (GROSS && ss.get('pf-gross') === '1') gross(true);   // in dieser Sitzung schon eingeschaltet
  if (GROSS) document.addEventListener('keydown', e => { if (e.key === 'Escape' && imGross() && !vollElement(document)) gross(false); });

  function theme(){ return root.dataset.theme === 'dark' ? 'dark' : 'light'; }

  // Tools derselben gruppe (katalog.js) hintereinander → [{name, tools}], ohne gruppe: name ''
  function gruppen(b){
    const out = [];
    b.tools.forEach(t => {
      const g = out[out.length - 1];
      if (g && g.name === (t.gruppe || '')) g.tools.push(t); else out.push({name: t.gruppe || '', tools: [t]});
    });
    return out;
  }
  // Tools eines Fachs für alle Jahrgangsstufen (katalog.js Fach.tools) → [[Bereich, Tool]]
  const fachTools = f => K.bereiche.filter(b => b.fachweit && b.gruppe.fach === f).flatMap(b => b.tools.map(t => [b, t]));
  const toolLi = (b, t, extra) => `<li${t.bedingt ? ` class="pf-bedingt" data-tool="${esc(t.id)}"` : extra || ''}><a href="${toolUrl(b, t)}"${t.id === TOOL ? ' aria-current="page"' : ''}>${esc(t.titel)}</a></li>`;

  // Fach-Menü: Fächer ohne Stufen direkt, Fächer mit Jahrgangsstufen als Untermenü (wie gruppe bei Tools)
  function fachMenue(){
    const eintrag = (g, text) => `<li><a href="${gruppeUrl(g)}"${g === GRUPPE ? ' aria-current="page"' : ''}>${esc(text)}</a></li>`;
    return `<li class="pf-item pf-fach"><a href="${gruppeUrl(GRUPPE)}" aria-haspopup="true" title="Fach wechseln"><small>Fach</small> ${esc(GRUPPE.titel)}</a>
      <ul class="pf-drop">${K.faecher.map(f => f.stufen
        ? `<li class="pf-sub"><a href="${fachUrl(f)}"${GRUPPE.fach === f ? ' aria-current="true"' : ''} aria-haspopup="true">${esc(f.titel)}</a><ul class="pf-drop2">${f.stufen.map(st => eintrag(K.gruppen.find(g => g.stufe === st), st.titel)).join('')}${fachTools(f).map(([b, t]) => toolLi(b, t, ' class="pf-fachtool"')).join('')}</ul></li>`
        : eintrag(K.gruppen.find(g => g.fach === f), f.titel)).join('')}</ul></li>`;
  }

  function buildNav(){
    const s = document.createElement('style'); s.textContent = CSS + akzentCss(); document.head.appendChild(s);
    const nav = document.createElement('nav');
    nav.className = 'pf-nav' + (window.PF_EINZELDATEI ? ' pf-einzeln' : '');
    nav.setAttribute('aria-label', 'Bereiche');
    const name = esc(K.name).replace(/^(\S+)/, '<span>$1</span>');
    const EINZELN = !!window.PF_EINZELDATEI;
    nav.innerHTML = `<div class="pf-in">
      ${EINZELN ? `<span class="pf-brand">${name}</span>` : `<a class="pf-brand" href="${BASE}index.html">${name}</a>`}
      <ul class="pf-menu">${fachMenue()}${GRUPPE.bereiche.map(b => `
        <li class="pf-item" data-b="${esc(b.id)}">
          <a href="${bereichUrl(b)}"${b.id === BEREICH ? ' aria-current="true"' : ''}>${esc(b.titel)}</a>
          <ul class="pf-drop">${b.tools.length
            ? gruppen(b).map(g => g.name
              ? `<li class="pf-sub"><a href="${bereichUrl(b)}"${g.tools.some(t => t.id === TOOL) ? ' aria-current="true"' : ''} aria-haspopup="true">${esc(g.name)}</a><ul class="pf-drop2">${g.tools.map(t => toolLi(b, t)).join('')}</ul></li>`
              : g.tools.map(t => toolLi(b, t)).join('')).join('')
              + `<li><a class="pf-all" href="${bereichUrl(b)}">Alle Übungen zu ${esc(b.titel)}</a></li>`
            : '<li class="pf-leer">Hier entstehen bald Übungen.</li>'}
          </ul>
        </li>`).join('')}
      </ul>
      <div class="pf-right">
        ${GROSS ? '<button class="pf-btn" id="pfGross" type="button"></button>' : ''}
        ${VOLL ? '<button class="pf-btn" id="pfVoll" type="button"></button>' : ''}
        ${document.getElementById('themeBtn') ? '' : `<button class="pf-btn" id="pfTheme" type="button" aria-label="Hell/Dunkel umschalten">${theme() === 'dark' ? SONNE : MOND}</button>`}
        ${EINZELN ? '' : '<button class="pf-btn pf-burger" type="button" aria-label="Menü">☰</button>'}
      </div>
    </div>`;
    document.body.insertBefore(nav, document.body.firstChild);
    if (!EINZELN){
      const fuss = document.createElement('footer');
      fuss.className = 'pf-fuss';
      fuss.innerHTML = `<a href="${BASE}impressum.html">Impressum</a> · <a href="${BASE}datenschutz.html">Datenschutz</a>`;
      document.body.appendChild(fuss);
    }

    // Passt die Leiste nicht in die Breite (Fach-Menü, lange Bereichsnamen, Anmeldung), kommt das Menü hinter ☰
    const innen = nav.querySelector('.pf-in');
    // Erst den Zusatz „– Fortschritt wird nicht gespeichert“ weglassen (pf-knapp), erst dann ☰ (pf-eng)
    const voll = () => innen.scrollWidth > innen.clientWidth + 1;
    const platz = () => {
      nav.classList.remove('pf-eng', 'pf-knapp');
      if (EINZELN || !voll()) return;
      nav.classList.add('pf-knapp');
      if (voll()) nav.classList.add('pf-eng');
    };
    platz();
    addEventListener('resize', platz);
    new MutationObserver(platz).observe(nav.querySelector('.pf-right'), {childList: true, subtree: true, characterData: true});
    if (document.fonts) document.fonts.ready.then(platz);
    const schmal = () => matchMedia('(max-width:760px)').matches || nav.classList.contains('pf-eng');

    const burger = nav.querySelector('.pf-burger');
    if (burger) burger.addEventListener('click', () => nav.classList.toggle('open'));
    const gb = nav.querySelector('#pfGross');
    if (gb){ grossKnopf(gb); gb.addEventListener('click', () => gross(!imGross())); }
    const vb = nav.querySelector('#pfVoll');
    if (vb){
      vollKnopf(vb);
      vb.addEventListener('click', vollUmschalten);
      new Set([document, VOLL.ownerDocument]).forEach(d => ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => d.addEventListener(ev, () => vollKnopf(vb))));
    }
    const tb = nav.querySelector('#pfTheme');
    if (tb) tb.addEventListener('click', () => {
      const t = theme() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = t; tb.textContent = t === 'dark' ? SONNE : MOND;
      try { localStorage.setItem('wenn-theme', t); } catch (e) {}
    });

    // Geräte ohne Maus: erstes Antippen klappt auf, zweites öffnet die Bereichsseite
    const items = [...nav.querySelectorAll('.pf-item')];
    if (matchMedia('(hover: none)').matches) items.forEach(li => li.firstElementChild.addEventListener('click', e => {
      if (schmal() || li.classList.contains('open')) return;
      e.preventDefault();
      items.forEach(x => x.classList.toggle('open', x === li));
    }));
    // Untermenüs (gruppe): nach links aufklappen, wenn rechts kein Platz ist; ohne Maus erst antippen
    nav.querySelectorAll('.pf-sub').forEach(sub => {
      sub.addEventListener('mouseenter', () => {
        const r = sub.getBoundingClientRect();
        sub.classList.toggle('links', r.right + 260 > innerWidth);
      });
      if (matchMedia('(hover: none)').matches) sub.firstElementChild.addEventListener('click', e => {
        if (schmal() || sub.classList.contains('open')) return;
        e.preventDefault();
        const r = sub.getBoundingClientRect();
        sub.classList.toggle('links', r.right + 260 > innerWidth);
        sub.classList.add('open');
      });
    });
    document.addEventListener('click', e => { if (!nav.contains(e.target)){ nav.querySelectorAll('.pf-sub.open').forEach(x => x.classList.remove('open')); items.forEach(x => x.classList.remove('open')); nav.classList.remove('open'); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape'){ items.forEach(x => x.classList.remove('open')); nav.classList.remove('open'); } });
  }

  /* ---------- Übersichtsseiten ---------- */
  // Tools mit gruppe (katalog.js) stehen unter einer gemeinsamen Zwischenüberschrift
  function kacheln(b){
    if (!b.tools.length) return '<p class="pf-hinweis">Hier entstehen bald Übungen.</p>';
    const kachel = t => `<a class="pf-tile${t.bedingt ? ' pf-bedingt' : ''}"${t.bedingt ? ` data-tool="${esc(t.id)}"` : ''} href="${toolUrl(b, t)}"><b>${esc(t.titel)}</b><span>${esc(t.text)}</span></a>`;
    return gruppen(b).map(g => (g.name ? `<h3 class="pf-gruppe">${esc(g.name)}</h3>` : '') + `<div class="pf-grid">${g.tools.map(kachel).join('')}</div>`).join('');
  }
  function buildPages(){
    const start = document.getElementById('pf-start');
    if (start){
      const gruppenseite = !!root.dataset.gruppe;
      if (gruppenseite) document.title = GRUPPE.titel + ' – ' + K.name;
      start.innerHTML = `<h1>${esc(gruppenseite ? GRUPPE.titel : K.name)}</h1><p class="pf-lead">${esc(GRUPPE.text)}${gruppenseite ? '' : ' ' + esc(K.untertitel)}</p>`
        + GRUPPE.bereiche.map(b => `<section class="pf-sec"><h2><a href="${bereichUrl(b)}">${esc(b.titel)}</a></h2><p class="pf-text">${esc(b.text)}</p>${kacheln(b)}</section>`).join('');
    }
    // Fach mit Jahrgangsstufen: Auswahl der Stufe
    const fach = document.getElementById('pf-fach');
    if (fach && FACHSEITE){
      document.title = FACHSEITE.titel + ' – ' + K.name;
      fach.innerHTML = `<h1>${esc(FACHSEITE.titel)}</h1><p class="pf-lead">${esc(FACHSEITE.text)} Wähle die Jahrgangsstufe.</p><div class="pf-grid">`
        + K.gruppen.filter(g => g.fach === FACHSEITE).map(g => `<a class="pf-tile" href="${gruppeUrl(g)}"><b>${esc(g.stufe.titel)}</b><span>${esc(g.text)}</span></a>`).join('') + '</div>'
        + (fachTools(FACHSEITE).length ? `<section class="pf-sec pf-fachtools"><h2>Für alle Jahrgangsstufen</h2><div class="pf-grid">${fachTools(FACHSEITE).map(([b, t]) => `<a class="pf-tile" href="${toolUrl(b, t)}"><b>${esc(t.titel)}</b><span>${esc(t.text)}</span></a>`).join('')}</div></section>` : '');
    }
    const be = document.getElementById('pf-bereich');
    const b = BER;
    if (be && b){
      document.title = b.titel + ' – ' + K.name;
      be.innerHTML = `<h1>${esc(b.titel)}</h1><p class="pf-lead">${esc(b.text)}</p>${kacheln(b)}`;
    }
  }

  // Hell/Dunkel höchstens einmal pro Sekunde umschalten und weich überblenden – kein Flackern beim schnellen Klicken
  let themeSperre = 0;
  document.addEventListener('click', e => {
    const btn = e.target.closest('#themeBtn,#pfTheme');
    if (!btn) return;
    if (Date.now() < themeSperre){ e.stopImmediatePropagation(); e.preventDefault(); return; }
    themeSperre = Date.now() + 1000;
    root.classList.add('pf-fade'); btn.classList.add('pf-gesperrt');
    setTimeout(() => root.classList.remove('pf-fade'), 400);
    setTimeout(() => btn.classList.remove('pf-gesperrt'), 1000);
  }, true);

  function init(){ buildNav(); buildPages(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
