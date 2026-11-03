/* Menüleiste der Übungsplattform
 *
 * Baut oben auf jeder Seite die Leiste mit den Bereichen aus katalog.js.
 * Fährt man mit der Maus über einen Bereich (am Handy: antippen), klappen
 * dessen Übungen auf. Außerdem füllt das Skript die Startseite (#pf-start)
 * und die Übersichtsseite eines Bereichs (#pf-bereich).
 *
 * Fehlt katalog.js oder nav.js, läuft das Tool trotzdem – nur ohne Menüleiste.
 * Tools mit bedingt: true (katalog.js) sind zunächst ausgeblendet; sync.js blendet sie ein,
 * wenn der Server sie für den angemeldeten Schüler freigibt (Klasse pf-sichtbar).
 * In Einzeldateien (werkzeuge/einzeldateien.py, window.PF_EINZELDATEI) zeigt die
 * Leiste nur Name und Hell/Dunkel-Knopf, weil es keine anderen Seiten gibt.
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
  let BEREICH = root.dataset.bereich || '';
  K.bereiche.forEach(b => { if (b.tools.some(t => t.id === TOOL)) BEREICH = b.id; });

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const bereichUrl = b => BASE + b.id + '/index.html';
  const toolUrl = (b, t) => BASE + b.id + '/' + t.datei;

  const CSS = `
.pf-nav{background:var(--panel,#f6f8fb);color:var(--text,#2e3440);border-bottom:1px solid var(--border,#cdd3de);position:relative;z-index:60;font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.pf-in{max-width:1100px;margin:0 auto;display:flex;align-items:center;gap:6px;padding:0 16px;min-height:50px}
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
}
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
  function theme(){ return root.dataset.theme === 'dark' ? 'dark' : 'light'; }

  function buildNav(){
    const s = document.createElement('style'); s.textContent = CSS + akzentCss(); document.head.appendChild(s);
    const nav = document.createElement('nav');
    nav.className = 'pf-nav' + (window.PF_EINZELDATEI ? ' pf-einzeln' : '');
    nav.setAttribute('aria-label', 'Bereiche');
    const name = esc(K.name).replace(/^(\S+)/, '<span>$1</span>');
    const EINZELN = !!window.PF_EINZELDATEI;
    nav.innerHTML = `<div class="pf-in">
      ${EINZELN ? `<span class="pf-brand">${name}</span>` : `<a class="pf-brand" href="${BASE}index.html">${name}</a>`}
      <ul class="pf-menu">${K.bereiche.map(b => `
        <li class="pf-item" data-b="${esc(b.id)}">
          <a href="${bereichUrl(b)}"${b.id === BEREICH ? ' aria-current="true"' : ''}>${esc(b.titel)}</a>
          <ul class="pf-drop">${b.tools.length
            ? b.tools.map(t => `<li${t.bedingt ? ` class="pf-bedingt" data-tool="${esc(t.id)}"` : ''}><a href="${toolUrl(b, t)}"${t.id === TOOL ? ' aria-current="page"' : ''}>${esc(t.titel)}</a></li>`).join('')
              + `<li><a class="pf-all" href="${bereichUrl(b)}">Alle Übungen zu ${esc(b.titel)}</a></li>`
            : '<li class="pf-leer">Hier entstehen bald Übungen.</li>'}
          </ul>
        </li>`).join('')}
      </ul>
      <div class="pf-right">
        ${document.getElementById('themeBtn') ? '' : `<button class="pf-btn" id="pfTheme" type="button" aria-label="Hell/Dunkel umschalten">${theme() === 'dark' ? SONNE : MOND}</button>`}
        ${EINZELN ? '' : '<button class="pf-btn pf-burger" type="button" aria-label="Menü">☰</button>'}
      </div>
    </div>`;
    document.body.insertBefore(nav, document.body.firstChild);

    const burger = nav.querySelector('.pf-burger');
    if (burger) burger.addEventListener('click', () => nav.classList.toggle('open'));
    const tb = nav.querySelector('#pfTheme');
    if (tb) tb.addEventListener('click', () => {
      const t = theme() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = t; tb.textContent = t === 'dark' ? SONNE : MOND;
      try { localStorage.setItem('wenn-theme', t); } catch (e) {}
    });

    // Geräte ohne Maus: erstes Antippen klappt auf, zweites öffnet die Bereichsseite
    const items = [...nav.querySelectorAll('.pf-item')];
    if (matchMedia('(hover: none)').matches) items.forEach(li => li.firstElementChild.addEventListener('click', e => {
      if (matchMedia('(max-width:760px)').matches || li.classList.contains('open')) return;
      e.preventDefault();
      items.forEach(x => x.classList.toggle('open', x === li));
    }));
    document.addEventListener('click', e => { if (!nav.contains(e.target)){ items.forEach(x => x.classList.remove('open')); nav.classList.remove('open'); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape'){ items.forEach(x => x.classList.remove('open')); nav.classList.remove('open'); } });
  }

  /* ---------- Übersichtsseiten ---------- */
  function kacheln(b){
    if (!b.tools.length) return '<p class="pf-hinweis">Hier entstehen bald Übungen.</p>';
    return `<div class="pf-grid">${b.tools.map(t => `<a class="pf-tile${t.bedingt ? ' pf-bedingt' : ''}"${t.bedingt ? ` data-tool="${esc(t.id)}"` : ''} href="${toolUrl(b, t)}"><b>${esc(t.titel)}</b><span>${esc(t.text)}</span></a>`).join('')}</div>`;
  }
  function buildPages(){
    const start = document.getElementById('pf-start');
    if (start){
      start.innerHTML = `<h1>${esc(K.name)}</h1><p class="pf-lead">${esc(K.untertitel)}</p>`
        + K.bereiche.map(b => `<section class="pf-sec"><h2><a href="${bereichUrl(b)}">${esc(b.titel)}</a></h2><p class="pf-text">${esc(b.text)}</p>${kacheln(b)}</section>`).join('');
    }
    const be = document.getElementById('pf-bereich');
    const b = K.bereiche.find(x => x.id === BEREICH);
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
