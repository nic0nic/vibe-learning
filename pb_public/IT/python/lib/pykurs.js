/* vibe learning – geführte Python-Übungen mit automatischer Prüfung
 *
 * Eine Übungsseite (z. B. bedingungen.html) legt window.PYKURS an und bindet danach
 * codemirror.min.js, skulpt.min.js, skulpt-stdlib.js und diese Datei ein.
 *
 * PYKURS = {
 *   id:     'pyif',                  Tool-id aus katalog.js (Speicherstand, Auswertung)
 *   titel:  'Bedingte Anweisung',
 *   logo:   'if',                    kurzer Text im Logo
 *   aufgaben: [{
 *     titel, stufe (1 einfach, 2 mittel, 3 schwer),
 *     wissen:   HTML mit Erklärung; <pre class="py">…</pre> wird farbig dargestellt
 *               und bekommt einen Knopf „Beispiel ausprobieren“
 *     auftrag:  HTML mit der Aufgabe (genaue Ausgabetexte nennen!)
 *     start:    Startcode im Editor
 *     tipps:    ['…', '…']           werden nacheinander aufgedeckt
 *     tests:    [{ein: ['5'], aus: ['positiv']}]
 *               ein = Eingaben für input() der Reihe nach
 *               aus = erwartete letzte Ausgabezeilen; davor darf noch etwas stehen
 *               zahl: true → es reicht, wenn die Zahl aus aus[0] in der letzten Zeile steht
 *     muss:     [{re: /…/m, text: 'Meldung, wenn das Muster fehlt'}]   geprüft im Code ohne Kommentare/Texte
 *     nicht:    [{re: /…/,  text: 'Meldung, wenn das Muster vorkommt'}]
 *   }]
 * }
 *
 * Verglichen wird ohne Groß-/Kleinschreibung, Satzzeichen und doppelte Leerzeichen,
 * ä/ö/ü/ß zählen wie ae/oe/ue/ss. Texte in input("…") gehören nicht zur Ausgabe.
 */
(function () {
  'use strict';
  const K = window.PYKURS;
  const A = K.aufgaben;
  const P = K.id + '-';
  const STUFE = ['', 'Einfach', 'Mittel', 'Schwer'];
  const ZEITLIMIT = 3000;          // ms pro Testlauf
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

  /* ---------- Speichern ---------- */
  const ls = {
    get(k){ try { return localStorage.getItem(P + k); } catch (e) { return null; } },
    set(k, v){ try { localStorage.setItem(P + k, v); } catch (e) {} if (window.TrainerSync) TrainerSync.changed(); }
  };
  let geloest = [];
  try { geloest = JSON.parse(ls.get('geloest') || '[]'); } catch (e) {}
  let akt = Math.min(A.length - 1, Math.max(0, (+ls.get('akt') || 1) - 1));
  const tippsOffen = {};

  /* ---------- Aussehen ---------- */
  const CSS = `
:root{--bg:#e5e9f0;--panel:#f6f8fb;--panel2:#eceff4;--text:#2e3440;--muted:#5b6578;--border:#cdd3de;
  --accent:#8a5f84;--err:#a8434d;--ok:#5e8a45;--ok-bg:#dfe9d6;--err-bg:#f1d9db;
  --term-bg:#eceff4;--term-text:#2e3440;--term-in:#5e81ac;
  --ed-bg:#f6f8fb;--gutter:#e5e9f0;--gutter-text:#7b88a1;--active:#e9ecf2;--sel:#d8dee9;
  --kw:#8a5f84;--str:#5e8a45;--num:#b0631f;--com:#7b88a1;--def:#4f73a3;--builtin:#3b7f8c;--op:#4c566a;
  --mono:ui-monospace,"Cascadia Mono","SF Mono",Consolas,"Liberation Mono",monospace}
[data-theme=dark]{--bg:#2e3440;--panel:#3b4252;--panel2:#434c5e;--text:#eceff4;--muted:#a9b3c4;--border:#4c566a;
  --accent:#b48ead;--err:#d4848b;--ok:#a3be8c;--ok-bg:#3e4a45;--err-bg:#4a3c45;
  --term-bg:#242933;--term-text:#e5e9f0;--term-in:#88c0d0;
  --ed-bg:#2e3440;--gutter:#2a2f3a;--gutter-text:#616e88;--active:#353b49;--sel:#434c5e;
  --kw:#b48ead;--str:#a3be8c;--num:#d08770;--com:#7b88a1;--def:#88c0d0;--builtin:#8fbcbb;--op:#81a1c1}
*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{background:var(--bg);color:var(--text);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;display:flex;flex-direction:column}
.k-wrap{flex:1;display:flex;flex-direction:column;min-height:0;width:min(1500px,100%);margin:0 auto;padding:12px 16px 16px}
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
.iconbtn{background:var(--panel2);border:1px solid var(--border);color:var(--text);border-radius:10px;width:38px;height:38px;display:grid;place-items:center;cursor:pointer}
.iconbtn svg{width:20px;height:20px}
.k-main{flex:1;display:grid;grid-template-columns:minmax(320px,2fr) 3fr;gap:14px;min-height:0}
.k-left{overflow:auto;min-height:0;padding-right:2px}
.k-right{display:flex;flex-direction:column;min-height:0}
.card{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:14px 18px;margin-bottom:12px}
.k-meta{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em}
.k-meta .ok{color:var(--ok)}
.k-left h2{font:800 21px var(--mono);margin:4px 0 0}
.k-sec{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;margin:0 0 6px}
.k-wissen p,.k-auftrag p{margin:0 0 10px} .k-wissen p:last-child,.k-auftrag p:last-child{margin-bottom:0}
.k-wissen ul,.k-auftrag ul{margin:0 0 10px;padding-left:22px}
.k-auftrag{border-left:4px solid var(--accent)}
code{font-family:var(--mono);background:var(--panel2);padding:1px 5px;border-radius:5px;font-size:.92em}
.k-ex{position:relative;margin:0 0 10px}
pre.py{margin:0;font:14px/1.5 var(--mono);background:var(--ed-bg);border:1px solid var(--border);border-radius:9px;padding:10px 12px;overflow:auto;white-space:pre}
.k-try{position:absolute;right:6px;top:6px;font:600 12px system-ui,sans-serif;padding:3px 9px;border-radius:7px;border:1px solid var(--border);background:var(--panel2);color:var(--text);cursor:pointer;opacity:.85}
.k-try:hover{opacity:1;border-color:var(--accent)}
table.k-tab{border-collapse:collapse;font-size:14px;margin:0 0 10px}
.k-tab td,.k-tab th{border:1px solid var(--border);padding:3px 10px;text-align:left}
.k-tab th{background:var(--panel2);color:var(--muted)}
.k-tipp{background:var(--panel2);border-radius:9px;padding:8px 12px;margin-top:8px;font-size:15px}
.k-nav{display:flex;gap:8px;flex-wrap:wrap}
.btn{font:600 15px system-ui,sans-serif;background:var(--panel2);color:var(--text);border:1px solid var(--border);border-radius:10px;padding:7px 14px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.btn:hover{border-color:var(--accent)}
.btn:disabled{opacity:.45;cursor:default;border-color:var(--border)}
.btn.prim{background:var(--accent);border-color:var(--accent);color:#fff}
[data-theme=dark] .btn.prim{color:#2e3440}
.btn svg{width:16px;height:16px}
.k-tools{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;align-items:center}
.k-tools .sp{flex:1}
.pane{background:var(--panel);border:1px solid var(--border);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;min-height:0}
.pane-head{display:flex;align-items:center;gap:10px;padding:4px 12px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;border-bottom:1px solid var(--border);background:var(--panel2)}
.pane-head .status{margin-left:auto;text-transform:none;letter-spacing:0;font-weight:600}
.status.laeuft{color:var(--accent)} .status.fehler{color:var(--err)} .status.ok{color:var(--ok)}
#kEd{flex:3 1 0} #kTerm{flex:2 1 0;margin-top:12px}
.CodeMirror{flex:1;height:auto;min-height:0;font:15px/1.5 var(--mono);background:var(--ed-bg);color:var(--text)}
.CodeMirror-gutters{background:var(--gutter);border-right:1px solid var(--border)}
.CodeMirror-linenumber{color:var(--gutter-text)}
.CodeMirror-cursor{border-left:2px solid var(--text)}
.CodeMirror-activeline-background{background:var(--active)}
.CodeMirror-selected,.CodeMirror-focused .CodeMirror-selected{background:var(--sel)}
.CodeMirror-matchingbracket{color:inherit!important;background:var(--sel);outline:1px solid var(--muted)}
.cm-s-default .cm-keyword{color:var(--kw);font-weight:600} .cm-s-default .cm-string{color:var(--str)} .cm-s-default .cm-number{color:var(--num)}
.cm-s-default .cm-comment{color:var(--com);font-style:italic} .cm-s-default .cm-def{color:var(--def);font-weight:600}
.cm-s-default .cm-builtin{color:var(--builtin)} .cm-s-default .cm-operator{color:var(--op)} .cm-s-default .cm-variable-2{color:var(--def)}
.cm-s-default .cm-meta,.cm-s-default .cm-atom{color:var(--num)} .cm-s-default .cm-property,.cm-s-default .cm-variable{color:var(--text)}
.cm-s-default .cm-error{color:var(--err)}
.err-line{background:color-mix(in srgb,var(--err) 22%,transparent)!important}
#term{flex:1;margin:0;padding:10px 14px;overflow:auto;background:var(--term-bg);color:var(--term-text);font:15px/1.45 var(--mono);white-space:pre-wrap;word-break:break-word;cursor:text}
#term .sys{color:var(--muted);font-style:italic}
#term .err{color:var(--err)} #term .tip{color:var(--muted)} #term .inp{color:var(--term-in)}
#term .okl{color:var(--ok);font-weight:700}
#term .res{display:block;white-space:normal;font-family:system-ui,sans-serif;font-size:15px;border-radius:9px;padding:8px 12px;margin:6px 0}
#term .res.ok{background:var(--ok-bg)} #term .res.no{background:var(--err-bg)}
#term .res b{font-weight:700}
#term .res table{border-collapse:collapse;margin-top:6px;font-size:14px}
#term .res td{padding:2px 10px 2px 0;vertical-align:top}
#term .res td.m{font-family:var(--mono);white-space:pre-wrap}
#term input{font:inherit;color:var(--term-in);background:transparent;border:0;outline:0;padding:0;margin:0;min-width:2ch;width:60%;caret-color:var(--term-in)}
.k-done{background:var(--ok-bg);border-color:var(--ok)}
@media (max-width:900px){
  body{height:auto} html{height:auto}
  .k-main{display:block}
  .k-right{height:85vh}
}`;
  document.head.appendChild(Object.assign(document.createElement('style'), {textContent: CSS}));

  /* ---------- Gerüst ---------- */
  const wrap = document.createElement('div');
  wrap.className = 'k-wrap';
  wrap.innerHTML = `
  <div class="k-bar">
    <div class="k-brand"><span>&gt;&gt;&gt;</span> ${esc(K.logo || 'Python')}</div>
    <div class="k-pills" id="kPills" role="group" aria-label="Aufgabe wählen"></div>
    <span class="k-count" id="kCount"></span>
    <button class="iconbtn" id="themeBtn" aria-label="Hell/Dunkel umschalten"></button>
  </div>
  <div class="k-main">
    <div class="k-left" id="kLeft"></div>
    <div class="k-right">
      <div class="k-tools">
        <button class="btn" id="runBtn" title="Ausführen (Strg+Enter)"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>Ausführen</button>
        <button class="btn prim" id="checkBtn" title="Prüfen (Strg+Shift+Enter)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>Prüfen</button>
        <button class="btn" id="stopBtn" disabled title="Abbrechen (Esc)"><svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg>Stopp</button>
        <span class="sp"></span>
        <button class="btn" id="resetBtn" title="Startcode wiederherstellen">Neu anfangen</button>
      </div>
      <section class="pane" id="kEd"><div class="pane-head"><span id="kFile">aufgabe.py</span><span class="status" id="saveState"></span></div><textarea id="code"></textarea></section>
      <section class="pane" id="kTerm"><div class="pane-head">Terminal<span class="status" id="status">bereit</span></div><pre id="term" tabindex="0" aria-live="polite"></pre></section>
    </div>
  </div>`;
  document.body.appendChild(wrap);

  /* ---------- Editor ---------- */
  const ed = CodeMirror.fromTextArea($('#code'), {
    mode: {name: 'python', version: 3}, lineNumbers: true, indentUnit: 4, tabSize: 4, indentWithTabs: false,
    matchBrackets: true, autoCloseBrackets: true, styleActiveLine: true,
    extraKeys: {
      'Tab': cm => cm.somethingSelected() ? cm.indentSelection('add') : cm.replaceSelection('    ', 'end'),
      'Shift-Tab': cm => cm.indentSelection('subtract'),
      'Ctrl-Enter': () => run(), 'Cmd-Enter': () => run(),
      'Shift-Ctrl-Enter': () => pruefen(), 'Shift-Cmd-Enter': () => pruefen(),
      'Ctrl-/': 'toggleComment', 'Cmd-/': 'toggleComment'
    }
  });
  ed.on('keydown', (cm, e) => { if ((e.ctrlKey || e.metaKey) && (e.key === '#' || e.code === 'Backslash')){ e.preventDefault(); cm.toggleComment(); } });
  let saveTimer = null, laden = false;
  function speichereCode(){
    clearTimeout(saveTimer); saveTimer = null;
    ls.set('c' + (akt + 1), ed.getValue());
    $('#saveState').textContent = 'gespeichert';
  }
  ed.on('change', () => {
    if (laden) return;
    clearErrLine(); $('#saveState').textContent = '';
    clearTimeout(saveTimer); saveTimer = setTimeout(speichereCode, 600);
  });
  window.addEventListener('beforeunload', () => { if (saveTimer) speichereCode(); });

  /* ---------- Aufgabe anzeigen ---------- */
  function highlight(root){
    root.querySelectorAll('pre.py').forEach(pre => {
      const src = pre.textContent.replace(/^\n/, '').replace(/\s+$/, '');
      pre.textContent = '';
      pre.classList.add('cm-s-default');
      CodeMirror.runMode(src, {name: 'python', version: 3}, pre);
      const box = document.createElement('div'); box.className = 'k-ex';
      pre.replaceWith(box); box.appendChild(pre);
      const b = document.createElement('button'); b.className = 'k-try'; b.type = 'button'; b.textContent = 'Beispiel ausprobieren';
      b.addEventListener('click', () => run(src, 'Beispiel'));
      box.appendChild(b);
    });
  }
  function renderPills(){
    $('#kPills').innerHTML = A.map((a, i) =>
      `<button class="k-pill${i === akt ? ' akt' : ''}${geloest.includes(i + 1) ? ' ok' : ''}" data-i="${i}" title="Aufgabe ${i + 1}: ${esc(a.titel)} (${STUFE[a.stufe]})${geloest.includes(i + 1) ? ' – gelöst' : ''}">${i + 1}<span class="st">${'<i></i>'.repeat(a.stufe)}</span></button>`).join('');
    $('#kCount').textContent = `${geloest.length}/${A.length} gelöst`;
  }
  $('#kPills').addEventListener('click', e => { const b = e.target.closest('.k-pill'); if (b) zeige(+b.dataset.i); });

  function renderLeft(){
    const a = A[akt], ok = geloest.includes(akt + 1), n = tippsOffen[akt] || 0;
    $('#kLeft').innerHTML = `
      <div class="card">
        <div class="k-meta"><span>Aufgabe ${akt + 1} von ${A.length} · ${STUFE[a.stufe]}</span>${ok ? '<span class="ok">✓ gelöst</span>' : ''}</div>
        <h2>${esc(a.titel)}</h2>
      </div>
      ${a.wissen ? `<div class="card k-wissen"><div class="k-sec">Wissen</div>${a.wissen}</div>` : ''}
      <div class="card k-auftrag"><div class="k-sec">Deine Aufgabe</div>${a.auftrag}
        ${(a.tipps || []).slice(0, n).map((t, i) => `<div class="k-tipp"><b>Tipp ${i + 1}:</b> ${t}</div>`).join('')}
      </div>
      <div class="k-nav">
        <button class="btn" id="prevBtn" ${akt === 0 ? 'disabled' : ''}>← Zurück</button>
        ${(a.tipps || []).length > n ? `<button class="btn" id="tippBtn">Tipp anzeigen (${n + 1}/${a.tipps.length})</button>` : ''}
        <button class="btn" id="nextBtn" ${akt === A.length - 1 ? 'disabled' : ''}>Weiter →</button>
      </div>`;
    highlight($('#kLeft'));
    $('#prevBtn').onclick = () => zeige(akt - 1);
    $('#nextBtn').onclick = () => zeige(akt + 1);
    if ($('#tippBtn')) $('#tippBtn').onclick = () => { tippsOffen[akt] = n + 1; renderLeft(); };
  }
  function zeige(i){
    if (i < 0 || i >= A.length) return;
    if (running) stop();
    if (saveTimer) speichereCode();
    akt = i; ls.set('akt', String(i + 1));
    laden = true;
    ed.setValue(ls.get('c' + (i + 1)) ?? A[i].start ?? '');
    ed.clearHistory(); laden = false;
    clearErrLine();
    $('#kFile').textContent = `aufgabe${i + 1}.py`;
    $('#saveState').textContent = '';
    termLeeren(); setStatus('bereit');
    out('Schreibe dein Programm. „Ausführen“ startet es zum Ausprobieren, „Prüfen“ testet es automatisch.\n', 'sys');
    renderPills(); renderLeft();
    $('#kLeft').scrollTop = 0;
  }
  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('Deinen Code für diese Aufgabe löschen und mit dem Startcode neu anfangen?')) return;
    ed.setValue(A[akt].start || ''); speichereCode(); ed.focus();
  });

  /* ---------- Terminal ---------- */
  const term = $('#term');
  function out(text, cls){
    if (!text) return;
    const pend = term.querySelector('input');
    const node = cls ? Object.assign(document.createElement('span'), {className: cls, textContent: text}) : document.createTextNode(text);
    term.insertBefore(node, pend || null);
    if (term.textContent.length > 100000) while (term.firstChild && term.textContent.length > 80000 && term.firstChild !== pend) term.removeChild(term.firstChild);
    term.scrollTop = term.scrollHeight;
  }
  function outHtml(html){ const d = document.createElement('span'); d.innerHTML = html; term.appendChild(d.firstElementChild || d); term.scrollTop = term.scrollHeight; }
  function nl(){ const t = term.textContent; if (t && !t.endsWith('\n')) out('\n'); }
  function termLeeren(){ term.textContent = ''; }
  function setStatus(text, cls){ const s = $('#status'); s.textContent = text; s.className = 'status ' + (cls || ''); }
  term.addEventListener('click', () => { const i = term.querySelector('input'); if (i && !getSelection().toString()) i.focus(); });

  let pendingInput = null;
  function askInput(prompt){
    return new Promise((resolve, reject) => {
      if (prompt) out(String(prompt));
      const el = document.createElement('input');
      el.setAttribute('aria-label', 'Eingabe'); el.autocomplete = 'off'; el.spellcheck = false;
      term.appendChild(el); el.focus(); term.scrollTop = term.scrollHeight;
      pendingInput = {reject, el};
      setStatus('wartet auf Eingabe …', 'laeuft');
      el.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        const v = el.value; el.remove(); pendingInput = null;
        out(v, 'inp'); out('\n'); setStatus('läuft …', 'laeuft');
        resolve(v);
      });
    });
  }

  /* ---------- Fehlermeldungen ---------- */
  const TIPPS = {
    SyntaxError: 'Die Schreibweise stimmt nicht. Prüfe Klammern, Anführungszeichen und den Doppelpunkt nach if/elif/else.',
    IndentationError: 'Die Einrückung passt nicht. Alles, was zu einem if gehört, muss gleich weit (4 Leerzeichen) eingerückt sein.',
    TabError: 'Tabs und Leerzeichen sind gemischt. Rücke nur mit Leerzeichen ein.',
    NameError: 'Dieser Name ist unbekannt. Tippfehler? Groß-/Kleinschreibung? Texte brauchen Anführungszeichen.',
    TypeError: 'Die Datentypen passen nicht zusammen, z. B. Text mit Zahl vergleichen. input() liefert Text – mit int() umwandeln.',
    ValueError: 'Der Wert lässt sich nicht umwandeln, z. B. int("abc").',
    ZeroDivisionError: 'Durch 0 kann man nicht teilen.'
  };
  let errMark = null;
  function clearErrLine(){ if (errMark != null){ ed.removeLineClass(errMark, 'background', 'err-line'); errMark = null; } }
  function fehlerInfo(err){
    if (err instanceof Sk.builtin.BaseException){
      return {text: err.toString(), name: err.tp$name, line: err.traceback && err.traceback.length ? err.traceback[0].lineno : 0};
    }
    return {text: String(err), name: '', line: 0};
  }
  function markLine(line){
    if (line > 0 && line <= ed.lineCount()){
      errMark = ed.getLineHandle(line - 1);
      ed.addLineClass(errMark, 'background', 'err-line');
      ed.scrollIntoView({line: line - 1, ch: 0}, 60);
    }
  }
  function showError(err){
    const f = fehlerInfo(err);
    nl(); out(f.text + '\n', 'err');
    if (TIPPS[f.name]) out('Tipp: ' + TIPPS[f.name] + '\n', 'tip');
    markLine(f.line);
  }

  /* ---------- Python ausführen ---------- */
  const ABBRUCH = {abbruch: true}, ZEIT = {zeit: true}, ZUVIEL = {zuviel: true};
  let running = false, stopRequested = false, runId = 0, abortRun = null;
  function builtinRead(f){
    if (Sk.builtinFiles === undefined || Sk.builtinFiles.files[f] === undefined) throw "File not found: '" + f + "'";
    return Sk.builtinFiles.files[f];
  }
  // führt code aus; output(text), input(prompt) → Promise; limit = ms oder 0
  function python(code, output, input, limit){
    const id = ++runId, t0 = performance.now();
    stopRequested = false;
    Sk.configure({
      __future__: Sk.python3, read: builtinRead,
      output: s => { if (id === runId && !stopRequested) output(s); },
      inputfun: input, inputfunTakesPrompt: true,
      yieldLimit: 100, killableWhile: true, killableFor: true, execLimit: null
    });
    const abgebrochen = new Promise((_, reject) => { abortRun = () => reject(ABBRUCH); });
    return Promise.race([abgebrochen, Sk.misceval.asyncToPromise(
      () => Sk.importMainWithBody('<stdin>', false, code, true),
      {'*': () => {
        if (id !== runId || stopRequested) throw ABBRUCH;
        if (limit && performance.now() - t0 > limit) throw ZEIT;
      }}
    )]).finally(() => { abortRun = null; });
  }
  function setButtons(){ $('#runBtn').disabled = $('#checkBtn').disabled = running; $('#stopBtn').disabled = !running; }
  function stop(){
    if (!running) return;
    stopRequested = true;
    if (pendingInput){ const p = pendingInput; p.el.remove(); pendingInput = null; p.reject(ABBRUCH); }
    if (abortRun) abortRun();
  }
  $('#stopBtn').addEventListener('click', stop);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && running) stop(); });

  function run(code, name){
    if (running) return;
    const beispiel = typeof code === 'string';
    if (!beispiel){ code = ed.getValue(); clearErrLine(); }
    nl(); out(`>>> ${beispiel ? name : 'dein Programm'} wird ausgeführt\n`, 'sys');
    running = true; setButtons(); setStatus('läuft …', 'laeuft');
    python(code, s => out(s), askInput, 0).then(() => {
      nl(); out('>>> fertig\n', 'sys'); setStatus('fertig', 'ok');
    }, err => {
      if (err === ABBRUCH || stopRequested){ nl(); out('>>> Programm abgebrochen\n', 'sys'); setStatus('abgebrochen'); }
      else { if (beispiel){ nl(); out(fehlerInfo(err).text + '\n', 'err'); } else showError(err); setStatus('Fehler', 'fehler'); }
    }).finally(() => {
      if (pendingInput){ pendingInput.el.remove(); pendingInput = null; }
      running = false; setButtons();
    });
  }
  $('#runBtn').addEventListener('click', () => run());

  /* ---------- Prüfen ---------- */
  function norm(s){
    return String(s).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[,!?:;"'„“”‚‘’»«()–]/g, ' ').replace(/(^|\D)\.|\.(?!\d)/g, '$1 ').replace(/-(?!\d)/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  function zeilen(s){ return String(s).split('\n').map(norm).filter(Boolean); }
  // Code ohne Kommentare und ohne Inhalt von Texten, damit Muster nicht in "…" oder # … gefunden werden
  function codeKern(code){
    return code.replace(/("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|#[^\n]*/g, (m, str) => str ? '""' : '');
  }
  function bestanden(t, ausgabe){
    const ist = zeilen(ausgabe), soll = t.aus.map(norm).filter(Boolean);
    if (t.zahl){
      const letzte = ist[ist.length - 1] || '';
      const zahlen = letzte.match(/-?\d+(?:\.\d+)?/g) || [];
      return zahlen.length === 1 && Number(zahlen[0]) === Number(t.aus[0]);
    }
    if (ist.length < soll.length) return false;
    return soll.every((z, i) => ist[ist.length - soll.length + i] === z);
  }
  function testlauf(code, t){
    let ausgabe = '', n = 0;
    const input = () => {
      if (n >= t.ein.length) return Promise.reject(ZUVIEL);
      return Promise.resolve(String(t.ein[n++]));
    };
    return python(code, s => { ausgabe += s; }, input, ZEITLIMIT)
      .then(() => ({ok: bestanden(t, ausgabe), ausgabe, frageZuWenig: n < t.ein.length}),
            err => ({ok: false, ausgabe, err: err instanceof Sk.builtin.ExternalError && err.nativeError && typeof err.nativeError === 'object' ? err.nativeError : err}));
  }
  const zeig = s => esc(s === '' ? '(nichts)' : s);
  async function pruefen(){
    if (running) return;
    const a = A[akt], code = ed.getValue();
    if (saveTimer) speichereCode();
    clearErrLine(); termLeeren();
    // Aufbau prüfen
    const kern = codeKern(code);
    const fehlt = (a.muss || []).filter(m => !m.re.test(kern)).map(m => m.text)
      .concat((a.nicht || []).filter(m => m.re.test(kern)).map(m => m.text));
    running = true; setButtons(); setStatus('prüft …', 'laeuft');
    const zeilenHtml = [];
    let alleOk = true, abbruch = false;
    for (let i = 0; i < a.tests.length; i++){
      const t = a.tests[i];
      const r = await testlauf(code, t);
      if (r.err === ABBRUCH || stopRequested){ abbruch = true; break; }
      if (r.err && r.err !== ZEIT && r.err !== ZUVIEL){
        // echter Python-Fehler: wie beim Ausführen anzeigen und aufhören
        alleOk = false;
        out(`Test ${i + 1} mit Eingabe ${t.ein.map(x => '„' + x + '“').join(', ') || '(keine)'}:\n`, 'sys');
        if (r.ausgabe) out(r.ausgabe);
        showError(r.err);
        zeilenHtml.length = 0; break;
      }
      const ein = t.ein.length ? t.ein.map(esc).join(', ') : '–';
      if (r.ok){ zeilenHtml.push(`<tr><td>✓</td><td>Eingabe ${ein}</td><td class="m">${esc(t.aus.join('\n'))}</td></tr>`); continue; }
      alleOk = false;
      let warum;
      if (r.err === ZEIT) warum = 'Das Programm wurde nicht fertig (Endlosschleife?).';
      else if (r.err === ZUVIEL) warum = `Dein Programm fragt öfter nach einer Eingabe als nötig (erwartet: ${t.ein.length}).`;
      else {
        const letzte = String(r.ausgabe).split('\n').filter(z => z.trim()).slice(-Math.max(1, t.aus.length)).join('\n');
        warum = `erwartet <b class="m">${esc(t.aus.join(' / '))}</b>${t.zahl ? ' (als einzige Zahl in der letzten Zeile)' : ''}, deine Ausgabe: <b>${zeig(letzte)}</b>`;
        if (r.frageZuWenig) warum += ` – dein Programm hat nur einen Teil der ${t.ein.length} Eingaben abgefragt.`;
      }
      zeilenHtml.push(`<tr><td>✗</td><td>Eingabe ${ein}</td><td>${warum}</td></tr>`);
    }
    running = false; setButtons();
    if (abbruch){ out('>>> Prüfung abgebrochen\n', 'sys'); setStatus('abgebrochen'); return; }
    if (!zeilenHtml.length){ setStatus('Fehler', 'fehler'); return; }
    const testsOk = alleOk;
    alleOk = alleOk && !fehlt.length;
    const anz = zeilenHtml.filter(z => z.startsWith('<tr><td>✓')).length;
    outHtml(`<div class="res ${alleOk ? 'ok' : 'no'}">${alleOk
      ? `<b>✓ Alle ${a.tests.length} Tests bestanden – Aufgabe gelöst!</b>`
      : `<b>${testsOk ? 'Die Tests laufen, aber:' : `${anz} von ${a.tests.length} Tests bestanden.`}</b>`}
      ${fehlt.map(f => `<div>✗ ${f}</div>`).join('')}
      <table>${zeilenHtml.join('')}</table></div>`);
    if (alleOk){
      setStatus('gelöst', 'ok');
      const erstmals = !geloest.includes(akt + 1);
      if (erstmals){ geloest.push(akt + 1); geloest.sort((x, y) => x - y); ls.set('geloest', JSON.stringify(geloest)); }
      if (window.TrainerSync) TrainerSync.event({modus: 'uebungen', stufe: a.stufe, aufgabe: String(akt + 1), titel: a.titel, gesamt: A.filter(x => x.stufe === a.stufe).length, erstmals}); // gesamt = Aufgaben dieser Stufe
      renderPills(); renderLeft();
      if (geloest.length === A.length && erstmals) outHtml(`<div class="res ok"><b>🎉 Du hast alle ${A.length} Aufgaben gelöst!</b></div>`);
      else if (akt < A.length - 1) outHtml(`<div class="res ok"><button class="btn prim" id="weiterBtn">Weiter zu Aufgabe ${akt + 2} →</button></div>`);
      const w = $('#weiterBtn'); if (w) w.onclick = () => zeige(akt + 1);
    } else setStatus(testsOk ? 'fast' : 'noch nicht', 'fehler');
  }
  $('#checkBtn').addEventListener('click', pruefen);

  /* ---------- Hell/Dunkel ---------- */
  function renderTheme(){
    const dark = document.documentElement.dataset.theme === 'dark';
    $('#themeBtn').innerHTML = dark
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  }
  $('#themeBtn').addEventListener('click', () => {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('wenn-theme', t); } catch (e) {}
    renderTheme();
  });
  renderTheme();

  zeige(akt);
  setButtons();

  // für Tests von außen
  window.PYKURS_API = {zeige, pruefen, run, editor: ed};
})();
