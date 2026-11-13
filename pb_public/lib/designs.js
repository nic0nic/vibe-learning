/* designs.js – andere Optik für Übungen (v. a. für heruntergeladene Übungen aus „Übung erstellen“)
 *
 * Ein Design = CSS (nur unter html[data-design="<id>"] gültig, überschreibt die Farbvariablen --bg, --panel, --text …),
 * optional eine Flammen-Vorlage (HTML, {n} = Stufe; lib/aufgaben.js nutzt sie über window.PF_FLAMME) und
 * modus 'dunkel' | 'hell' (fest – dann kein Hell/Dunkel-Knopf) oder frei (weglassen).
 * Genutzt von lib/seite.js (Aufgaben-JSON mit "design": "<id>" → CSS eingebettet), dem Editor (Auswahl neben „Vorschau“)
 * und nav.js/sync.js (Einstellung für Angemeldete, localStorage pf-design: lädt diese Datei nach, experimentell –
 * handgebaute Seiten wie Excel/SQL haben eigenes CSS und sehen dann nur teilweise anders aus).
 * Im Browser: window.Designs, in Node/Hook: require(…/lib/designs.js).
 *
 * API
 *   Designs.liste()          → [{id, name, beschreibung, modus}]
 *   Designs.hole(id)         → Design oder null ('standard' = kein Design)
 *   Designs.kopf(id)         → HTML für <head>: <style> + <script> (data-design, Flamme, feste Hell/Dunkel-Wahl)
 *   Designs.anwenden(id)     → im laufenden Dokument einschalten (für die Einstellung)
 * Neues Design: unten in D eintragen; CSS immer mit S (= Selektor des Designs) beginnen lassen.
 */
(function () {
  'use strict';
  const sel = id => `html[data-design="${id}"][data-design]`;   // doppelt: schlägt :root, [data-theme] und html[data-theme]

  /* ---------- Kommandozeile ---------- */
  const KZ = (S => `
${S}{--bg:#090d09;--panel:#0c120c;--panel2:#101a10;--text:#b4f5b4;--muted:#6db078;--border:#1f4f28;--accent:#3cff6e;--accent-text:#3cff6e;
  --on-color:#090d09;--err:#ff6b5e;--ok:#3cff6e;--plus:#3cff6e;--minus:#ff6b5e;--plus-bg:rgba(60,255,110,.10);--minus-bg:rgba(255,107,94,.13);
  --ok-bg:rgba(60,255,110,.10);--err-bg:rgba(255,107,94,.13);--slot:#101a10;--slot-border:#2c6b37;--marke:#3cff6e;
  --mono:"Cascadia Mono","DejaVu Sans Mono","Liberation Mono",Consolas,ui-monospace,monospace;color-scheme:dark}
${S} body{background:var(--bg) repeating-linear-gradient(0deg,rgba(0,0,0,.28) 0 1px,transparent 1px 3px)!important;color:var(--text);text-shadow:0 0 3px rgba(60,255,110,.28)}
${S} body,${S} body *{font-family:var(--mono)!important}
${S} *,${S} *::before,${S} *::after{border-radius:0!important}
${S} ::selection{background:var(--accent);color:var(--bg);text-shadow:none}
${S} #pfTheme,${S} #themeBtn{display:none!important}
${S} .brand::before{content:"~/ ";color:var(--muted)}
${S} .brand::after,${S} .tr-frage::after{content:"█";margin-left:4px;color:var(--accent);animation:pf-kz-cursor 1.05s steps(1) infinite}
@keyframes pf-kz-cursor{50%{opacity:0}}
${S} .karte,${S} .tr-karte,${S} .pf-nav,${S} .af-chat,${S} .material,${S} .info{background:var(--panel)!important;border:1px solid var(--border)!important;box-shadow:none!important}
${S} .karte h2::before,${S} .karte h3::before{content:"## ";color:var(--muted)}
${S} .af-frage::before{content:"> ";color:var(--accent)}
${S} .tr-frage::before{content:"$ ";color:var(--muted)}
${S} .btn{background:transparent!important;border:1px solid var(--border)!important;color:var(--text)!important;box-shadow:none!important}
${S} .btn::before{content:"[ "}${S} .btn::after{content:" ]"}
${S} .btn.haupt,${S} .btn.on,${S} .af-schritte .btn.on{border-color:var(--accent)!important;color:var(--accent)!important}
${S} .af-schritte .btn.erl::after{content:" ✓ ]";color:var(--accent)}
${S} .btn:hover:not(:disabled){background:var(--accent)!important;color:var(--bg)!important;text-shadow:none}
${S} .feld,${S} .af-luecken select,${S} .tr-ein{background:transparent!important;color:var(--text)!important;border:0!important;border-bottom:1px dashed var(--slot-border)!important;caret-color:var(--accent)}
${S} .feld:focus,${S} .tr-ein:focus{outline:none!important;border-bottom:1px solid var(--accent)!important;background:rgba(60,255,110,.05)!important}
${S} .af .opt,${S} .tr-opt,${S} .af-karte,${S} .af-betrag,${S} .af-zone,${S} .af-wb{background:var(--panel2)!important;border:1px solid var(--border)!important;color:var(--text)!important}
${S} .af .opt:hover,${S} .tr-opt:hover:not(:disabled){border-color:var(--accent)!important}
${S} .af .opt.good,${S} .tr-opt.richtig{border-color:var(--ok)!important;background:var(--plus-bg)!important}
${S} .af .opt.bad,${S} .tr-opt.falsch{border-color:var(--err)!important;background:var(--minus-bg)!important}
${S} .af-karte{border-left:3px solid var(--accent)!important}
${S} .af-fb.ok{background:var(--plus-bg)!important;color:var(--ok)!important;border-left:3px solid var(--ok)}
${S} .af-fb.falsch{background:var(--minus-bg)!important;color:var(--err)!important;border-left:3px solid var(--err)}
${S} table,${S} td,${S} th{border-color:var(--border)!important}
${S} .af-tabelle th,${S} .tr-fehler th{background:var(--panel2)!important;color:var(--muted)}
${S} .af-flamme,${S} .flame{filter:none!important;animation:none!important;transform:none!important;line-height:1.2!important}
${S} .pf-kz-stufe{font:700 15px var(--mono);color:var(--muted);padding:0 2px}
${S} .af-flamme:hover .pf-kz-stufe{color:var(--text)}
${S} .af-flamme.on .pf-kz-stufe,${S} .flame.on .pf-kz-stufe{color:var(--accent);text-shadow:0 0 6px var(--accent)}
${S} .flame:hover .pf-kz-stufe{color:var(--text)}
${S} .tr-zeit{height:12px;background:transparent!important;border:1px solid var(--border)}
${S} .tr-balken{background:repeating-linear-gradient(90deg,var(--accent) 0 8px,transparent 8px 10px)!important}
${S} .tr-balken.knapp{background:repeating-linear-gradient(90deg,var(--err) 0 8px,transparent 8px 10px)!important}
${S} .tr-taste{border-color:var(--border)!important;color:var(--accent)!important}
${S} .tr-karte.tr-gut{box-shadow:0 0 0 1px var(--ok),0 0 18px rgba(60,255,110,.25)!important}
${S} .af-blase,${S} .af-msg.ich .af-blase{background:var(--panel2)!important;border:1px solid var(--border)!important;color:var(--text)!important}
${S} .af-msg.ich .af-blase{border-color:var(--accent)!important}
${S} .muted,${S} .af-zaehler,${S} .hinweis{color:var(--muted)!important}
${S} a{color:var(--accent)}
@media (prefers-reduced-motion:reduce){${S} .brand::after,${S} .tr-frage::after{animation:none}}
`)(sel('kommandozeile'));

  const D = {
    standard: {name: 'Standard', beschreibung: 'Wie bisher – hell oder dunkel nach Einstellung des Geräts.'},
    kommandozeile: {name: 'Kommandozeile', beschreibung: 'Schwarzer Bildschirm, grüne Monospace-Schrift, Prompt und blinkender Cursor. Immer dunkel.',
      modus: 'dunkel', flamme: '<span class="pf-kz-stufe">[{n}]</span>', css: KZ}
  };

  const hole = id => id && id !== 'standard' && D[id] ? D[id] : null;
  const liste = () => Object.keys(D).map(id => ({id, name: D[id].name, beschreibung: D[id].beschreibung, modus: D[id].modus || null}));
  function kopf(id) {
    const d = hole(id); if (!d) return '';
    const js = `document.documentElement.dataset.design=${JSON.stringify(id)};` + (d.flamme ? `window.PF_FLAMME=${JSON.stringify(d.flamme)};` : '')
      + (d.modus ? `document.documentElement.dataset.theme=${JSON.stringify(d.modus === 'dunkel' ? 'dark' : 'light')};` : '');
    return `<style id="pf-design">${d.css.replace(/<\/style/gi, '<\\/style')}</style>\n<script>${js}</script>`;
  }
  function anwenden(id) {
    const d = hole(id), root = document.documentElement;
    const alt = document.getElementById('pf-design'); if (alt) alt.remove();
    if (!d) { delete root.dataset.design; delete window.PF_FLAMME; return; }
    const st = document.createElement('style'); st.id = 'pf-design'; st.textContent = d.css; document.head.appendChild(st);
    root.dataset.design = id;
    if (d.flamme) {
      window.PF_FLAMME = d.flamme;
      // schon gezeichnete Flammen (Seite war schneller als das Nachladen) austauschen; die Stufe steht im <text> der SVG-Flamme
      document.querySelectorAll('.flame, .af-flamme').forEach(b => { const t = b.querySelector('svg text'); if (t) b.innerHTML = d.flamme.replace(/\{n\}/g, t.textContent.trim()); });
    }
    if (d.modus) root.dataset.theme = d.modus === 'dunkel' ? 'dark' : 'light';
  }
  const Designs = {liste, hole, kopf, anwenden};
  if (typeof module !== 'undefined' && module.exports) module.exports = Designs; else window.Designs = Designs;
})();
