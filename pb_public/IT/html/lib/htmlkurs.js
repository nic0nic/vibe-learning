/* vibe learning – geführte HTML- und CSS-Übungen mit Vorschau und automatischer Prüfung
 *
 * Eine Übungsseite (z. B. aufbau.html) legt window.HTMLKURS an und bindet danach ein:
 * ../python/lib/codemirror.min.js (+ .css), lib/codemirror-html.js, lib/mediathek.js,
 * lib/htmlwerk.js und diese Datei.
 *
 * HTMLKURS = {
 *   id:     'htmlaufbau',            Tool-id aus katalog.js (Speicherstand, Auswertung)
 *   titel:  'Aufbau einer Webseite',
 *   logo:   'Aufbau',                kurzer Text im Logo
 *   css:    true,                    Schalter HTML/CSS zeigen (Standard: nein, nur HTML)
 *   bilder: true,                    Knopf „Bilder“ zeigen (Standard: nein)
 *   datei:  'css',                   welche Datei beim Öffnen einer Aufgabe zu sehen ist (Standard: 'html');
 *                                    auch je Aufgabe möglich
 *   aufgaben: [{
 *     titel, stufe (1 einfach, 2 mittel, 3 schwer),
 *     wissen:   Erklärung, auftrag: Aufgabe (beide HTML, dazu die Kurzformen unten)
 *     start:    HTML im Editor, startCss: CSS im Editor
 *               Mit css: true steht in start an der Stelle der Einbindung von style.css das Kürzel %CSS%.
 *               (Die Zeile selbst darf nicht in der Seite stehen, sonst stolpert einzeldateien.py.)
 *     tipps:    ['…', '…']           werden nacheinander aufgedeckt
 *     tests:    [{…, text: 'Anzeige'}]   Arten siehe htmlwerk.js; zusätzlich müssen alle Regeln
 *               von HTML und CSS eingehalten sein (Regelprüfung des Editors)
 *     projekt:  true                 freie Abschlussaufgabe: zusätzlich Knopf „Herunterladen“
 *   }]
 * }
 *
 * Kurzformen in wissen und auftrag (Code muss dort nicht mit &lt; geschrieben werden):
 *   {{<h1>}}                         Code im Satz
 *   ~~~html                          Beispiel: Code und darunter das Ergebnis im Browser.
 *   <h1>Hallo</h1>                   Die Zeilen ~~~ stehen allein am Zeilenanfang.
 *   ~~~css                           optional: CSS zum Beispiel
 *   h1 { color: red; }
 *   ~~~
 *   ~~~html nur   bzw.   ~~~css      nur Code zeigen, ohne Ergebnis
 */
(function () {
  'use strict';
  const K = window.HTMLKURS, A = K.aufgaben, P = K.id + '-', W = window.HtmlWerk, esc = W.esc;
  const STUFE = ['', 'Einfach', 'Mittel', 'Schwer'];
  const $ = s => document.querySelector(s);

  /* ---------- Speichern ---------- */
  const ls = {
    get(k){ try { return localStorage.getItem(P + k); } catch (e) { return null; } },
    set(k, v){ try { localStorage.setItem(P + k, v); } catch (e) {} if (window.TrainerSync) TrainerSync.changed(); }
  };
  let geloest = [];
  try { geloest = JSON.parse(ls.get('geloest') || '[]'); } catch (e) {}
  let akt = Math.min(A.length - 1, Math.max(0, (+ls.get('akt') || 1) - 1));
  const tippsOffen = {};
  let ergebnis = null;

  document.head.appendChild(Object.assign(document.createElement('style'), {textContent: `
.k-wrap{flex:1;display:flex;flex-direction:column;min-height:0;width:min(1600px,100%);margin:0 auto;padding:12px 16px 16px}
.k-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:12px}
.k-brand{font:800 20px var(--mono);letter-spacing:-.5px}
.k-brand span{color:var(--accent)}
.k-pills{display:flex;flex-wrap:wrap;gap:6px;flex:1}
.k-pill{font:700 14px var(--mono);width:34px;height:34px;border-radius:9px;border:1px solid var(--border);background:var(--panel);color:var(--text);cursor:pointer;position:relative}
.k-pill:hover{border-color:var(--accent)}
.k-pill.akt{outline:2px solid var(--accent);outline-offset:1px}
.k-pill.ok{background:var(--ok-bg);border-color:var(--ok);color:var(--ok)}
.k-pill .st{position:absolute;left:50%;bottom:3px;transform:translateX(-50%);display:flex;gap:2px}
.k-pill .st i{width:3px;height:3px;border-radius:50%;background:currentColor;opacity:.55}
.k-count{font-size:14px;color:var(--muted);font-weight:600}
.k-main{flex:1;display:grid;grid-template-columns:minmax(320px,2fr) 3fr;gap:14px;min-height:0}
.k-left{overflow:auto;min-height:0;padding-right:2px}
.k-right{display:flex;flex-direction:column;min-height:0;min-width:0}
.card{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:14px 18px;margin-bottom:12px}
.k-meta{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em}
.k-meta .ok{color:var(--ok)}
.k-left h2{font:800 21px var(--mono);margin:4px 0 0}
.k-sec{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;margin:0 0 6px}
.k-text p{margin:0 0 10px} .k-text>:last-child{margin-bottom:0}
.k-text ul,.k-text ol{margin:0 0 10px;padding-left:22px}
.k-auftrag{border-left:4px solid var(--accent)}
.k-bsp{margin:0 0 10px;border:1px solid var(--border);border-radius:9px;overflow:hidden}
.k-bsp .lab{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;padding:2px 10px;background:var(--panel2);border-bottom:1px solid var(--border)}
.k-bsp .lab:not(:first-child){border-top:1px solid var(--border)}
.k-bsp pre{margin:0;font:14px/1.5 var(--mono);background:var(--ed-bg);padding:8px 10px;overflow:auto;white-space:pre}
.k-bsp iframe{display:block;width:100%;height:60px;border:0;background:#fff}
table.k-tab{border-collapse:collapse;font-size:14px;margin:0 0 10px}
.k-tab td,.k-tab th{border:1px solid var(--border);padding:3px 10px;text-align:left;vertical-align:top}
.k-tab th{background:var(--panel2);color:var(--muted)}
.k-tipp{background:var(--panel2);border-radius:9px;padding:8px 12px;margin-top:8px;font-size:15px}
.k-nav{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.k-erg{border-radius:12px;padding:12px 16px;margin-bottom:12px;border:1px solid var(--border)}
.k-erg.ok{background:var(--ok-bg);border-color:var(--ok)} .k-erg.no{background:var(--err-bg);border-color:var(--err)}
.k-erg ul{list-style:none;margin:8px 0 0;padding:0}
.k-erg li{padding:2px 0 2px 26px;position:relative}
.k-erg li::before{position:absolute;left:2px;font-weight:700}
.k-erg li.ok::before{content:"✓";color:var(--ok)} .k-erg li.no::before{content:"✗";color:var(--err)}
.k-erg .z{font-family:var(--mono);font-size:13px;color:var(--muted)}
.k-erg .btn{margin-top:10px}
@media (max-width:900px){
  body{height:auto} html{height:auto}
  .k-main{display:block}
  .k-right{height:92vh}
}`}));

  /* ---------- Gerüst ---------- */
  const wrap = document.createElement('div');
  wrap.className = 'k-wrap';
  wrap.innerHTML = `
  <div class="k-bar">
    <div class="k-brand"><span>&lt;/&gt;</span> ${esc(K.logo || 'HTML')}</div>
    <div class="k-pills" id="kPills" role="group" aria-label="Aufgabe wählen"></div>
    <span class="k-count" id="kCount"></span>
    <button class="iconbtn" id="themeBtn"></button>
  </div>
  <div class="k-main">
    <div class="k-left" id="kLeft"></div>
    <div class="k-right" id="kRight"></div>
  </div>`;
  document.body.appendChild(wrap);
  W.themaKnopf($('#themeBtn'));

  let saveTimer = null;
  function speichere(){
    clearTimeout(saveTimer); saveTimer = null;
    ls.set('h' + (akt + 1), platz.html());
    if (K.css) ls.set('c' + (akt + 1), platz.css());
    platz.stand.textContent = 'gespeichert';
  }
  const platz = W.arbeitsplatz($('#kRight'), {
    anordnung: 'unten',
    onChange(){ platz.stand.textContent = ''; clearTimeout(saveTimer); saveTimer = setTimeout(speichere, 600); }
  });
  window.addEventListener('beforeunload', () => { if (saveTimer) speichere(); });
  platz.links.innerHTML = '<button class="btn prim" id="checkBtn" title="Prüfen (Strg+Enter)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>Prüfen</button>';
  platz.rechts.innerHTML = '<button class="btn" id="dlBtn" hidden title="Deine Seite als eine HTML-Datei speichern">Herunterladen</button><button class="btn" id="resetBtn" title="Startcode wiederherstellen">Neu anfangen</button>';
  platz.cm.setOption('extraKeys', Object.assign({}, platz.cm.getOption('extraKeys'), {'Ctrl-Enter': () => pruefen(), 'Cmd-Enter': () => pruefen()}));

  /* ---------- Texte mit Beispielen ---------- */
  const mitLink = s => String(s || '').split('%CSS%').join(W.LINK);
  let beispiele = [];
  function text(s){
    return mitLink(s)
      .replace(/^~~~(html|css)( nur)?\n([\s\S]*?)\n(?:~~~css\n([\s\S]*?)\n)?~~~$/gm, (m, art, nur, a, b) => {
        beispiele.push(art === 'css' ? {css: a, nur: true} : {html: a, css: b, nur: !!nur});
        return `<div class="k-bsp" data-b="${beispiele.length - 1}"></div>`;
      })
      .replace(/\{\{([\s\S]*?)\}\}(?!\})/g, (m, c) => `<code>${esc(c)}</code>`);
  }
  function codeBlock(box, titel, code, modus){
    box.appendChild(Object.assign(document.createElement('div'), {className: 'lab', textContent: titel}));
    const pre = document.createElement('pre');
    pre.className = 'cm-s-default';
    CodeMirror.runMode(code, modus, pre);
    box.appendChild(pre);
  }
  function fuelleBeispiele(root){
    root.querySelectorAll('.k-bsp').forEach(box => {
      const b = beispiele[+box.dataset.b];
      if (b.html != null) codeBlock(box, 'HTML', b.html, 'htmlmixed');
      if (b.css != null) codeBlock(box, 'CSS', b.css, 'css');
      if (b.nur) return;
      box.appendChild(Object.assign(document.createElement('div'), {className: 'lab', textContent: 'So zeigt es der Browser'}));
      const f = document.createElement('iframe');
      f.title = 'Ergebnis des Beispiels';
      const zeige = W.rahmen(f);
      f.addEventListener('load', () => { try { f.style.height = Math.min(320, f.contentDocument.documentElement.scrollHeight + 2) + 'px'; } catch (e) {} });
      box.appendChild(f);
      const ganz = /<html[\s>]/i.test(b.html);
      zeige(ganz ? W.dokument(b.html, b.css || '')
        : W.dokument(`<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><style>body{font-family:sans-serif;margin:8px 10px}</style>${W.LINK}</head><body>\n${b.html}\n</body></html>`, b.css || ''));
    });
  }

  /* ---------- Aufgabe anzeigen ---------- */
  function renderPills(){
    $('#kPills').innerHTML = A.map((a, i) =>
      `<button class="k-pill${i === akt ? ' akt' : ''}${geloest.includes(i + 1) ? ' ok' : ''}" data-i="${i}" title="Aufgabe ${i + 1}: ${esc(a.titel)} (${STUFE[a.stufe]})${geloest.includes(i + 1) ? ' – gelöst' : ''}">${i + 1}<span class="st">${'<i></i>'.repeat(a.stufe)}</span></button>`).join('');
    $('#kCount').textContent = `${geloest.length}/${A.length} gelöst`;
  }
  $('#kPills').addEventListener('click', e => { const b = e.target.closest('.k-pill'); if (b) zeige(+b.dataset.i); });

  function ergebnisHtml(){
    if (!ergebnis) return '';
    const r = ergebnis, n = r.tests.filter(t => t.ok).length;
    const kopf = r.ok ? (A[akt].projekt ? '✓ Alle Punkte erfüllt – deine Seite ist fertig!' : '✓ Alles richtig – Aufgabe gelöst!')
      : r.regeln.length && n === r.tests.length ? 'Der Inhalt stimmt, aber die Regeln von HTML und CSS sind noch nicht eingehalten:'
      : `${n} von ${r.tests.length} Punkten erfüllt.`;
    return `<div class="k-erg ${r.ok ? 'ok' : 'no'}" id="kErg"><b>${kopf}</b>
      <ul>${r.regeln.map(x => `<li class="no"><span class="z">${x.datei}, Zeile ${x.zeile}:</span> ${esc(x.text)}</li>`).join('')}
      ${r.tests.map(t => `<li class="${t.ok ? 'ok' : 'no'}">${t.text}</li>`).join('')}</ul>
      ${r.ok && akt < A.length - 1 ? `<button class="btn prim" id="weiterBtn">Weiter zu Aufgabe ${akt + 2} →</button>` : ''}
      ${r.ok && geloest.length === A.length && !A[akt].projekt ? `<p><b>🎉 Du hast alle ${A.length} Aufgaben gelöst!</b></p>` : ''}</div>`;
  }
  function renderLeft(){
    const a = A[akt], ok = geloest.includes(akt + 1), n = tippsOffen[akt] || 0;
    beispiele = [];
    $('#kLeft').innerHTML = `
      <div class="card">
        <div class="k-meta"><span>Aufgabe ${akt + 1} von ${A.length} · ${STUFE[a.stufe]}</span>${ok ? '<span class="ok">✓ gelöst</span>' : ''}</div>
        <h2>${esc(a.titel)}</h2>
      </div>
      ${a.wissen ? `<div class="card k-text"><div class="k-sec">Wissen</div>${text(a.wissen)}</div>` : ''}
      <div class="card k-text k-auftrag"><div class="k-sec">Deine Aufgabe</div>${text(a.auftrag)}
        ${(a.tipps || []).slice(0, n).map((t, i) => `<div class="k-tipp"><b>Tipp ${i + 1}:</b> ${text(t)}</div>`).join('')}
      </div>
      ${ergebnisHtml()}
      <div class="k-nav">
        <button class="btn" id="prevBtn" ${akt === 0 ? 'disabled' : ''}>← Zurück</button>
        ${(a.tipps || []).length > n ? `<button class="btn" id="tippBtn">Tipp anzeigen (${n + 1}/${a.tipps.length})</button>` : ''}
        <button class="btn" id="nextBtn" ${akt === A.length - 1 ? 'disabled' : ''}>Weiter →</button>
      </div>`;
    fuelleBeispiele($('#kLeft'));
    $('#prevBtn').onclick = () => zeige(akt - 1);
    $('#nextBtn').onclick = () => zeige(akt + 1);
    if ($('#tippBtn')) $('#tippBtn').onclick = () => { tippsOffen[akt] = n + 1; renderLeft(); };
    if ($('#weiterBtn')) $('#weiterBtn').onclick = () => zeige(akt + 1);
  }
  function zeige(i){
    if (i < 0 || i >= A.length) return;
    if (saveTimer) speichere();
    akt = i; ls.set('akt', String(i + 1));
    ergebnis = null;
    platz.lade({html: ls.get('h' + (i + 1)) ?? mitLink(A[i].start), css: ls.get('c' + (i + 1)) ?? A[i].startCss ?? '', mitCss: !!K.css, bilder: !!K.bilder});
    if (K.css && (A[i].datei || K.datei) === 'css') platz.waehle('css');
    platz.stand.textContent = '';
    $('#dlBtn').hidden = !A[i].projekt;
    renderPills(); renderLeft();
    $('#kLeft').scrollTop = 0;
  }
  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('Deinen Code für diese Aufgabe löschen und mit dem Startcode neu anfangen?')) return;
    ergebnis = null;
    platz.lade({html: mitLink(A[akt].start), css: A[akt].startCss || '', mitCss: !!K.css, bilder: !!K.bilder});
    speichere(); renderLeft();
  });
  $('#dlBtn').addEventListener('click', () => platz.download('meine-seite.html'));

  /* ---------- Prüfen ---------- */
  let prueft = false;
  async function pruefen(){
    if (prueft) return;
    prueft = true; $('#checkBtn').disabled = true;
    if (saveTimer) speichere();
    const a = A[akt];
    ergebnis = await platz.pruefe(a.tests || []);
    prueft = false; $('#checkBtn').disabled = false;
    if (ergebnis.ok){
      const erstmals = !geloest.includes(akt + 1);
      if (erstmals){ geloest.push(akt + 1); geloest.sort((x, y) => x - y); ls.set('geloest', JSON.stringify(geloest)); }
      if (window.TrainerSync) TrainerSync.event({modus: 'uebungen', stufe: a.stufe, aufgabe: String(akt + 1), titel: a.titel, gesamt: A.filter(x => x.stufe === a.stufe).length, erstmals}); // gesamt = Aufgaben dieser Stufe
    }
    renderPills(); renderLeft();
    const e = $('#kErg');
    if (e) e.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }
  $('#checkBtn').addEventListener('click', pruefen);

  zeige(akt);

  // für Tests von außen
  window.HTMLKURS_API = {zeige, pruefen, platz, ergebnis: () => ergebnis};
})();
