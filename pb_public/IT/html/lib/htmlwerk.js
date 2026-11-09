/* vibe learning – HTML und CSS im Browser: Editor mit Vorschau, Regelprüfung und Bildern
 *
 * Grundlage für editor.html (freier Editor) und htmlkurs.js (geführte Übungen).
 * Vorher einbinden: ../python/lib/codemirror.css, ../python/lib/codemirror.min.js,
 * lib/codemirror-html.js, lib/mediathek.js (window.HTML_BILDER), dann diese Datei.
 *
 * const w = HtmlWerk.arbeitsplatz(host, {
 *   anordnung: 'unten' | 'neben',      Vorschau unter oder neben dem Editor
 *   onChange(html, css) {}             nach jeder Eingabe (zum Speichern)
 * });
 * w.lade({html, css, mitCss, bilder})  neuen Inhalt zeigen; mitCss: Schalter HTML/CSS sichtbar,
 *                                      bilder: Knopf „Bilder“ sichtbar
 * w.html(), w.css()                    aktueller Inhalt
 * w.links, w.rechts                    Plätze in der Leiste für eigene Knöpfe
 * w.pruefe(tests)                      → Promise {ok, regeln: [{datei, zeile, text}], tests: [{ok, text}]}
 * w.download('seite.html')             eine Datei, CSS und Bilder eingebettet
 * Unten rechts im Editor öffnet ein Zahnrad die Optionen (OPTIONEN weiter unten: Tags automatisch
 * schließen, Zeilen umbrechen, große Schrift). Sie gelten für alle HTML-Seiten und stehen im Browser
 * unter dem Schlüssel hw-optionen. Neue Option: Eintrag in OPTIONEN ergänzen.
 * „Vorschau ausblenden“ (z. B. für den Beamer) gilt nur bis zum Neuladen der Seite.
 * Die Grenze zwischen Editor und Vorschau lässt sich mit der Maus ziehen (Doppelklick: wieder halb und halb);
 * das Verhältnis steht im Browser unter hw-teiler, getrennt für „neben“ und „unten“.
 * HtmlWerk.themaKnopf(button)          Hell/Dunkel-Knopf
 * HtmlWerk.dokument(html, css)         fertige Seite als Text (für Vorschau und Download)
 * HtmlWerk.pruefeHtml(html), HtmlWerk.pruefeCss(css, doc)   Regelprüfung → [{zeile, text, art}]
 *
 * Die CSS-Datei heißt immer style.css. Die Zeile <link rel="stylesheet" href="style.css">
 * im HTML ist gesperrt und lässt sich nicht ändern oder löschen.
 * Bilder: src="bilder/<name>" mit einem Namen aus mediathek.js.
 * Die Vorschau führt kein JavaScript aus; Links öffnen sich dort nicht.
 *
 * Tests (Daten, jeweils mit text = Anzeige in der Rückmeldung):
 *   {sel: 'ul li', min: 3}                 Elemente zum Selektor; min (Standard 1), anzahl (genau) oder keine: true
 *   {sel: 'h1', enthaelt: 'Mouse Rat'}     … deren Text das enthält (Groß-/Kleinschreibung egal)
 *   {stil: 'h1', attribut: 'color', wert: 'red'}    berechneter Stil aller Treffer; statt wert auch
 *                                          ungleich: 'black', minPx: 18, maxPx: 40
 *   {regel: '.mitglied', attribut: 'border'}        CSS-Regel mit diesem Selektor (auch /RegExp/), attribut optional
 *   {quelle: /…/}, {quelleNicht: /…/}      Muster im HTML-Text
 *   {css: /…/}, {cssNicht: /…/}            Muster im CSS-Text (ohne Kommentare)
 *   {kontrast: 'p', min: 4.5}              Kontrast Schrift zu Hintergrund
 *   {passt: 375}                           kein Querrollen bei dieser Breite in px
 *   {test: (doc, html, css) => true}       Sonderfall als Funktion
 */
(function () {
  'use strict';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const BILDER = window.HTML_BILDER || {};
  const LINK = '<link rel="stylesheet" href="style.css">';
  const LINK_RE = /<link\b[^>]*href\s*=\s*["']style\.css["'][^>]*>/i;

  /* ---------- Aussehen ---------- */
  const CSS_TEXT = `
:root{--bg:#e5e9f0;--panel:#f6f8fb;--panel2:#eceff4;--text:#2e3440;--muted:#5b6578;--border:#cdd3de;
  --accent:#ad4c7a;--accent-bg:#f2bcd2;--err:#a8434d;--ok:#5e8a45;--ok-bg:#dfe9d6;--err-bg:#f1d9db;
  --ed-bg:#f6f8fb;--gutter:#e5e9f0;--gutter-text:#7b88a1;--active:#e9ecf2;--sel:#d8dee9;
  --tag:#4f73a3;--attr:#8a5f84;--str:#5e8a45;--num:#b0631f;--com:#7b88a1;--prop:#3b7f8c;
  --mono:ui-monospace,"Cascadia Mono","SF Mono",Consolas,"Liberation Mono",monospace}
[data-theme=dark]{--bg:#2e3440;--panel:#3b4252;--panel2:#434c5e;--text:#eceff4;--muted:#a9b3c4;--border:#4c566a;
  --accent:#e8a5c0;--accent-bg:#e8a5c0;--err:#d4848b;--ok:#a3be8c;--ok-bg:#3e4a45;--err-bg:#4a3c45;
  --ed-bg:#2e3440;--gutter:#2a2f3a;--gutter-text:#616e88;--active:#353b49;--sel:#434c5e;
  --tag:#81a1c1;--attr:#b48ead;--str:#a3be8c;--num:#d08770;--com:#7b88a1;--prop:#88c0d0}
*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{background:var(--bg);color:var(--text);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;display:flex;flex-direction:column}
code{font-family:var(--mono);background:var(--panel2);padding:1px 5px;border-radius:5px;font-size:.92em}
.btn{font:600 15px system-ui,sans-serif;background:var(--panel2);color:var(--text);border:1px solid var(--border);border-radius:10px;padding:7px 14px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.btn:hover{border-color:var(--accent)}
.btn:disabled{opacity:.45;cursor:default;border-color:var(--border)}
.btn.prim{background:var(--accent-bg);border-color:var(--accent);color:#2e3440}
.btn svg{width:16px;height:16px}
.iconbtn{background:var(--panel2);border:1px solid var(--border);color:var(--text);border-radius:10px;width:38px;height:38px;display:grid;place-items:center;cursor:pointer}
.iconbtn svg{width:20px;height:20px}
.hw{flex:1;display:flex;flex-direction:column;min-height:0;min-width:0}
.hw-leiste{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;align-items:center;position:relative}
.hw-leiste .sp{flex:1}
.hw-links,.hw-rechts{display:contents}
.hw-schalter{display:inline-flex;border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--panel2)}
.hw-schalter button{font:600 15px system-ui,sans-serif;border:0;background:transparent;color:var(--text);padding:7px 16px;cursor:pointer}
.hw-schalter button+button{border-left:1px solid var(--border)}
.hw-schalter button.an{background:var(--accent-bg);color:#2e3440}
.hw-schalter.klein button{font-size:12px;padding:2px 10px;text-transform:none;letter-spacing:0}
.hw-flaeche{flex:1;display:flex;flex-direction:column;min-height:0}
.hw-teiler{flex:none;height:12px;cursor:row-resize;display:grid;place-items:center;touch-action:none}
.hw-teiler::after{content:"";width:48px;height:4px;border-radius:2px;background:var(--border)}
.hw-teiler:hover::after,.hw-teiler:focus-visible::after,.hw-zieht .hw-teiler::after{background:var(--accent)}
.hw-teiler:focus-visible{outline:none}
.hw-neben .hw-teiler{height:auto;width:12px;cursor:col-resize}
.hw-neben .hw-teiler::after{width:4px;height:48px}
.hw-zieht iframe{pointer-events:none}
.hw-zieht{user-select:none}
.hw-ohne-vorschau .hw-vor,.hw-ohne-vorschau .hw-teiler{display:none}
.hw-neben .hw-flaeche{flex-direction:row}
.pane{background:var(--panel);border:1px solid var(--border);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;min-height:0;min-width:0;flex:1 1 0}
.pane-head{display:flex;align-items:center;gap:10px;padding:4px 12px;min-height:30px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;border-bottom:1px solid var(--border);background:var(--panel2)}
.pane-head .status{margin-left:auto;text-transform:none;letter-spacing:0;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hw-datei{font-family:var(--mono);text-transform:none;letter-spacing:0}
.CodeMirror{flex:1;height:auto;min-height:0;font:15px/1.5 var(--mono);background:var(--ed-bg);color:var(--text)}
.CodeMirror-gutters{background:var(--gutter);border-right:1px solid var(--border)}
.CodeMirror-linenumber{color:var(--gutter-text)}
.CodeMirror-cursor{border-left:2px solid var(--text)}
.CodeMirror-activeline-background{background:var(--active)}
.CodeMirror-selected,.CodeMirror-focused .CodeMirror-selected{background:var(--sel)}
.CodeMirror-matchingtag{background:var(--sel);outline:1px solid var(--muted)}
.cm-s-default .cm-tag{color:var(--tag);font-weight:600} .cm-s-default .cm-attribute{color:var(--attr)} .cm-s-default .cm-string{color:var(--str)}
.cm-s-default .cm-comment{color:var(--com);font-style:italic} .cm-s-default .cm-meta{color:var(--com)} .cm-s-default .cm-bracket{color:var(--tag)}
.cm-s-default .cm-property{color:var(--prop)} .cm-s-default .cm-number,.cm-s-default .cm-atom{color:var(--num)} .cm-s-default .cm-keyword{color:var(--num)}
.cm-s-default .cm-qualifier,.cm-s-default .cm-builtin{color:var(--attr);font-weight:600} .cm-s-default .cm-variable,.cm-s-default .cm-variable-2,.cm-s-default .cm-variable-3{color:var(--text)}
.cm-s-default .cm-error{color:var(--err)}
.err-line{background:color-mix(in srgb,var(--err) 20%,transparent)!important}
.hw-fest{background:var(--sel);border-radius:3px;cursor:not-allowed}
.hw-hinweise{border-top:1px solid var(--border);max-height:104px;overflow:auto;font-size:14px;line-height:1.4}
.hw-hinweise:empty{display:none}
.hw-hinweise button{display:block;width:100%;text-align:left;font:inherit;color:var(--text);background:transparent;border:0;border-bottom:1px solid var(--border);padding:4px 12px;cursor:pointer}
.hw-hinweise button:last-child{border-bottom:0}
.hw-hinweise button:hover{background:var(--panel2)}
.hw-hinweise .z{font-family:var(--mono);font-weight:700;color:var(--err);margin-right:6px}
.hw-hinweise .hinweis .z{color:var(--muted)}
.hw-buehne{flex:1;min-height:0;background:var(--border);display:flex;justify-content:center;overflow:auto}
.hw-buehne iframe{border:0;background:#fff;width:100%;height:100%;flex:none}
.hw-buehne.handy{padding:10px 0}
.hw-buehne.handy iframe{width:375px;border-radius:14px;box-shadow:0 0 0 6px var(--panel2),0 0 0 7px var(--muted)}
.hw-rad{position:absolute;right:14px;bottom:10px;z-index:8;width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:var(--panel2);color:var(--muted);display:grid;place-items:center;cursor:pointer;opacity:.75;padding:0}
.hw-rad:hover,.hw-rad[aria-expanded=true]{opacity:1;color:var(--text);border-color:var(--accent)}
.hw-rad svg{width:18px;height:18px}
.hw-opt{position:absolute;right:14px;bottom:48px;z-index:9;background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:10px 14px;box-shadow:0 8px 24px rgba(0,0,0,.25);font:15px/1.4 system-ui,sans-serif;color:var(--text);display:grid;gap:6px;white-space:nowrap}
.hw-opt b{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.hw-opt label{display:flex;align-items:center;gap:8px;cursor:pointer}
.hw-opt input{width:17px;height:17px;accent-color:var(--accent)}
.hw-gross .CodeMirror{font-size:19px}
.hw-bilder{position:absolute;z-index:20;top:100%;left:0;margin-top:4px;background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:10px;box-shadow:0 8px 24px rgba(0,0,0,.25);display:grid;grid-template-columns:repeat(2,1fr);gap:8px;width:min(380px,92vw)}
.hw-bilder p{grid-column:1/-1;margin:0;font-size:14px;color:var(--muted)}
.hw-bilder button{font:600 13px var(--mono);color:var(--text);background:var(--panel2);border:1px solid var(--border);border-radius:9px;padding:6px;cursor:pointer;display:flex;flex-direction:column;gap:4px;align-items:center}
.hw-bilder button:hover{border-color:var(--accent)}
.hw-bilder img{width:100%;height:80px;object-fit:contain;background:#fff;border-radius:6px}
[hidden]{display:none!important}
@media (max-width:900px){.hw-neben .hw-flaeche{flex-direction:column}
  .hw-neben .hw-teiler{width:auto;height:12px;cursor:row-resize} .hw-neben .hw-teiler::after{width:48px;height:4px}}`;
  document.head.appendChild(Object.assign(document.createElement('style'), {textContent: CSS_TEXT}));

  /* ---------- Seite zusammenbauen ---------- */
  const urls = {};
  function bildUrl(name){
    return urls[name] || (urls[name] = 'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(BILDER[name].svg).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16)));
  }
  function dokument(html, css){
    return String(html)
      .replace(LINK_RE, () => '<style>\n' + (css || '') + '\n</style>')
      .replace(/(\b(?:src|href)\s*=\s*)(["'])bilder\/([^"']+)\2/gi, (m, a, q, n) => BILDER[n] ? a + q + bildUrl(n) + q : m)
      .replace(/url\(\s*(["']?)bilder\/([^"')]+)\1\s*\)/gi, (m, q, n) => BILDER[n] ? 'url("' + bildUrl(n) + '")' : m);
  }
  // Rahmen ohne JavaScript; Klicks auf Links fängt die Seite ab
  function rahmen(iframe, notiz){
    iframe.setAttribute('sandbox', 'allow-same-origin');
    let y = 0;
    iframe.addEventListener('load', () => {
      const d = iframe.contentDocument;
      if (!d) return;
      try { iframe.contentWindow.scrollTo(0, y); } catch (e) {}
      d.addEventListener('click', e => {
        const a = e.target.closest && e.target.closest('a[href]');
        if (!a) return;
        e.preventDefault();
        const h = a.getAttribute('href');
        if (h.charAt(0) === '#'){
          const z = h.length > 1 && d.getElementById(h.slice(1));
          if (z) z.scrollIntoView({behavior: 'smooth'});
          if (notiz) notiz(z ? '' : h === '#' ? 'Link ohne Ziel (#)' : `Kein Element mit id="${h.slice(1)}" gefunden`);
        } else if (notiz) notiz('Link führt zu: ' + h);
      });
    });
    return dok => { try { y = iframe.contentWindow.scrollY || 0; } catch (e) {} iframe.srcdoc = dok || ' '; };
  }

  /* ---------- Regelprüfung HTML ---------- */
  const LEER = new Set('br img hr meta link input source area base col embed track wbr'.split(' '));
  const BEKANNT = new Set(('html head title meta link style script body h1 h2 h3 h4 h5 h6 p br hr a img ul ol li table thead tbody tfoot tr td th caption ' +
    'div span header nav main section article aside footer figure figcaption b strong i em u mark small sub sup blockquote q cite code pre audio video source ' +
    'form label input button select option textarea fieldset legend iframe address abbr del ins s dl dt dd details summary picture time').split(' '));
  const KOPF = new Set(['title', 'meta', 'link']);
  const BLOCK = new Set('p h1 h2 h3 h4 h5 h6 ul ol div table header nav main section article aside footer figure blockquote form'.split(' '));

  function pruefeHtml(src){
    src = String(src);
    const m = [];
    const zeile = pos => src.slice(0, pos).split('\n').length;
    const add = (pos, text, art) => m.push({zeile: zeile(pos), text, art: art || 'fehler'});
    const stack = [], gesehen = {}, verwaist = {};
    const offen = n => stack.some(s => s.name === n);
    let i = 0, ausserhalb = false;
    const erstes = src.search(/\S/);
    while (i < src.length){
      const lt = src.indexOf('<', i);
      if (lt < 0) break;
      if (src.startsWith('<!--', lt)){
        const e = src.indexOf('-->', lt + 4);
        if (e < 0){ add(lt, 'Der Kommentar wird nicht mit --> beendet.'); break; }
        i = e + 3; continue;
      }
      if (src.charAt(lt + 1) === '!'){
        const e = src.indexOf('>', lt);
        if (/^<!doctype\s+html\s*>/i.test(src.slice(lt, lt + 40))){
          gesehen.doctype = true;
          if (lt !== erstes) add(lt, '<!DOCTYPE html> steht ganz am Anfang der Datei.');
        } else add(lt, 'Die erste Zeile lautet genau: <!DOCTYPE html>');
        i = e < 0 ? lt + 2 : e + 1; continue;
      }
      const tm = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)/.exec(src.slice(lt, lt + 40));
      if (!tm){ i = lt + 1; continue; }
      const zu = !!tm[1], name = tm[2].toLowerCase();
      // Ende des Tags suchen, Anführungszeichen beachten
      let ende = -1, q = null, kaputt = false;
      for (let j = lt + tm[0].length; j < src.length; j++){
        const c = src[j];
        if (q){ if (c === q) q = null; else if (c === '<' || c === '\n'){ kaputt = true; break; } }
        else if (c === '"' || c === "'") q = c;
        else if (c === '>'){ ende = j; break; }
        else if (c === '<') break;
      }
      if (q && !kaputt) kaputt = true;
      if (kaputt){
        add(lt, `In <${name} …> fehlt ein Anführungszeichen.`);
        const roh = src.indexOf('>', lt), naechstes = src.indexOf('<', lt + 1);
        ende = roh >= 0 && (naechstes < 0 || roh < naechstes) ? roh : -1;
      }
      if (ende < 0 && !kaputt) add(lt, `Bei <${zu ? '/' : ''}${name} fehlt die schließende spitze Klammer >.`);
      const attrText = ende < 0 ? '' : src.slice(lt + tm[0].length, ende);
      i = ende < 0 ? lt + tm[0].length : ende + 1;

      if (!BEKANNT.has(name)){ add(lt, `<${zu ? '/' : ''}${name}> ist kein HTML-Element. Tippfehler?`); continue; }
      if (zu){
        if (LEER.has(name)){ add(lt, `<${name}> hat kein schließendes Tag.`); continue; }
        let k = stack.length - 1;
        while (k >= 0 && stack[k].name !== name) k--;
        if (k < 0){
          const oben = stack[stack.length - 1];
          if (verwaist[name]) verwaist[name]--;
          else if (oben && ((/^h[1-6]$/.test(name) && /^h[1-6]$/.test(oben.name)) || zeile(oben.pos) === zeile(lt))){
            add(lt, `</${name}> passt nicht zum offenen <${oben.name}>. Das schließende Tag heißt </${oben.name}>.`);
            stack.pop();
          }
          else add(lt, `</${name}> schließt nichts: Es gibt kein offenes <${name}>.`);
          continue;
        }
        stack.splice(k + 1).forEach(s => {
          add(s.pos, `<${s.name}> muss vor </${name}> (Zeile ${zeile(lt)}) geschlossen werden.`);
          verwaist[s.name] = (verwaist[s.name] || 0) + 1;
        });
        stack.pop();
        continue;
      }
      // öffnendes Tag
      const attrs = {};
      if (!kaputt){
        if (/=\s*[„“”‚‘’]/.test(attrText)) add(lt, `In <${name} …> stehen schräge Anführungszeichen. Verwende gerade: "`);
        attrText.replace(/([^\s"'=<>\/]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g, (x, a, w) => {
          a = a.toLowerCase();
          if (w === undefined) attrs[a] = '';
          else if (/^["']/.test(w)) attrs[a] = w.slice(1, -1);
          else { attrs[a] = w; if (!/^[„“”‚‘’]/.test(w)) add(lt, `Der Wert von ${a} steht in Anführungszeichen: ${a}="${w}"`); }
          return x;
        });
      }
      if (['html', 'head', 'body', 'title'].includes(name)){
        if (gesehen[name]) add(lt, `<${name}> gibt es auf jeder Seite nur einmal.`);
        gesehen[name] = true;
        if (name !== 'html' && name !== 'title' && gesehen.html && !offen('html')) add(lt, `<${name}> steht innerhalb von <html> … </html>.`);
        if (name === 'body' && offen('head')){
          const k = stack.findIndex(s => s.name === 'head');
          add(stack[k].pos, '<head> muss mit </head> geschlossen werden, bevor <body> beginnt.');
          stack.splice(k).forEach(s => { verwaist[s.name] = (verwaist[s.name] || 0) + 1; });
        }
      }
      if (KOPF.has(name)){
        if (!offen('head')) add(lt, `<${name}> gehört in den Kopf der Seite (<head>).`);
      } else if (!['html', 'head', 'body', 'style', 'script'].includes(name)){
        if (offen('head')) add(lt, `<${name}> gehört nicht in den <head>, sondern in den <body>.`);
        else if (!offen('body') && !ausserhalb){ ausserhalb = true; add(lt, `<${name}> steht außerhalb von <body> … </body>. Alles Sichtbare gehört in den body.`); }
      }
      const oben = stack.length ? stack[stack.length - 1] : null;
      if (name === 'li' && !(oben && (oben.name === 'ul' || oben.name === 'ol'))) add(lt, '<li> steht direkt in einer Liste: <ul> oder <ol>.');
      if (oben && (oben.name === 'ul' || oben.name === 'ol') && name !== 'li') add(lt, `Direkt in <${oben.name}> stehen nur Listenpunkte <li>.`);
      if (BLOCK.has(name)){
        const k = stack.findIndex(s => s.name === 'p');
        if (k >= 0){
          add(stack[k].pos, `Der Absatz <p> wird nicht mit </p> geschlossen, bevor <${name}> (Zeile ${zeile(lt)}) beginnt.`);
          stack.splice(k);
        }
      }
      if (name === 'img'){
        if (!('src' in attrs)) add(lt, 'Dem Bild fehlt die Quelle: src="…"');
        else if (/^bilder\//.test(attrs.src) && !BILDER[attrs.src.slice(7)]) add(lt, `Das Bild ${attrs.src} gibt es nicht. Schau unter „Bilder“ nach dem genauen Namen.`);
        if (!('alt' in attrs)) add(lt, 'Dem Bild fehlt der Alternativtext: alt="…" beschreibt das Bild für alle, die es nicht sehen.');
      }
      if (name === 'a' && !('href' in attrs) && !kaputt) add(lt, 'Dem Link fehlt das Ziel: href="…"');
      if (name === 'style' || name === 'script'){
        const e = src.toLowerCase().indexOf('</' + name, i);
        if (e < 0){ add(lt, `<${name}> wird nie geschlossen.`); break; }
        i = src.indexOf('>', e) + 1 || src.length;
        continue;
      }
      if (!LEER.has(name)) stack.push({name, pos: lt});
    }
    stack.forEach(s => add(s.pos, `<${s.name}> wird nie geschlossen: Es fehlt </${s.name}>.`));
    if (!gesehen.doctype) m.push({zeile: 1, text: 'Die Seite beginnt mit <!DOCTYPE html>.', art: 'fehler'});
    [['html', 'Es fehlt das Wurzelelement <html> … </html>.'], ['head', 'Es fehlt der Kopf der Seite: <head> … </head>.'],
     ['title', 'Im <head> fehlt der Titel der Seite: <title> … </title>.'], ['body', 'Es fehlt der Körper der Seite: <body> … </body>.']]
      .forEach(([n, t]) => { if (!gesehen[n]) m.push({zeile: 1, text: t, art: 'fehler'}); });
    return m.sort((a, b) => a.zeile - b.zeile);
  }

  /* ---------- Regelprüfung CSS ---------- */
  const FARBEN_DE = /^(rot|blau|gruen|grün|gelb|schwarz|weiss|weiß|grau|rosa|lila|braun|hellblau|dunkelblau)$/i;
  function ohneKommentare(css){ return String(css).replace(/\/\*[\s\S]*?(\*\/|$)/g, k => k.replace(/[^\n]/g, ' ')); }
  function pruefeCss(roh, doc){
    roh = String(roh);
    const m = [];
    const css = ohneKommentare(roh);
    const zeile = pos => css.slice(0, pos).split('\n').length;
    const add = (pos, text, art) => m.push({zeile: zeile(pos), text, art: art || 'fehler'});
    if (/\/\*(?![\s\S]*?\*\/)/.test(roh.slice(roh.lastIndexOf('/*') < 0 ? roh.length : roh.lastIndexOf('/*')))) add(roh.lastIndexOf('/*'), 'Der Kommentar wird nicht mit */ beendet.');
    const kennt = p => { try { return CSS.supports(p, 'inherit'); } catch (e) { return true; } };
    const passt = (p, w) => { try { return CSS.supports(p, w); } catch (e) { return true; } };
    let i = 0;
    while (i < css.length){
      const auf = css.indexOf('{', i), zu = css.indexOf('}', i);
      if (auf < 0){
        if (zu >= 0){ add(zu, 'Diese } schließt nichts: Es fehlt die öffnende {.'); i = zu + 1; continue; }
        const rest = css.slice(i);
        if (rest.trim()) add(i + rest.search(/\S/), 'Nach dem Selektor folgen die Angaben in geschweiften Klammern: { … }');
        break;
      }
      if (zu >= 0 && zu < auf){ add(zu, 'Diese } schließt nichts: Es fehlt die öffnende {.'); i = zu + 1; continue; }
      const selRoh = css.slice(i, auf), sel = selRoh.trim().replace(/\s+/g, ' ');
      const selPos = i + Math.max(0, selRoh.search(/\S/));
      // Ende des Blocks: nächste }, außer vorher beginnt schon die nächste Regel
      const naechsteAuf = css.indexOf('{', auf + 1);
      let ende = css.indexOf('}', auf + 1), geschlossen = true;
      if (sel.charAt(0) === '@'){                       // @media usw.: nur Klammern zählen
        let tiefe = 1, j = auf + 1;
        for (; j < css.length && tiefe; j++){ if (css[j] === '{') tiefe++; else if (css[j] === '}') tiefe--; }
        if (tiefe) add(selPos, 'Die Regel wird nicht mit } geschlossen.');
        i = j; continue;
      }
      if (ende < 0 || (naechsteAuf >= 0 && naechsteAuf < ende)){
        geschlossen = false;
        add(selPos, 'Die Regel wird nicht mit } geschlossen.');
        if (naechsteAuf < 0) ende = css.length;
        else {
          const bis = css.slice(auf + 1, naechsteAuf);
          const cut = Math.max(bis.lastIndexOf(';'), bis.lastIndexOf('\n'));
          ende = auf + 1 + (cut < 0 ? 0 : cut + 1);
        }
      }
      // Selektor
      if (!sel) add(auf, 'Vor { fehlt der Selektor: Für welche Elemente gilt die Regel?');
      else {
        let gueltig = true;
        try { document.createDocumentFragment().querySelector(sel); } catch (e) { gueltig = false; }
        const wort = /^[a-zäöüß][\w-äöüß]*$/i.test(sel) && !BEKANNT.has(sel.toLowerCase());
        if (!gueltig) add(selPos, `Den Selektor „${sel}“ versteht der Browser nicht.`);
        else if (wort) add(selPos, `„${sel}“ ist kein HTML-Element. Der Selektor für eine Klasse beginnt mit einem Punkt: .${sel}`);
        else if (doc){
          let n = 1;
          try { n = doc.querySelectorAll(sel.replace(/::?(hover|focus|active|visited|link|before|after|first-letter|first-line)\b/g, '')).length; } catch (e) {}
          if (!n) add(selPos, `Der Selektor „${sel}“ passt auf kein Element in der HTML-Datei.`, 'hinweis');
        }
      }
      // Angaben
      let p = auf + 1;
      css.slice(auf + 1, ende).split(';').forEach(teil => {
        const start = p + Math.max(0, teil.search(/\S/));
        p += teil.length + 1;
        const t = teil.trim();
        if (!t) return;
        const d = t.indexOf(':');
        if (d < 0){ add(start, `Zwischen Attribut und Wert steht ein Doppelpunkt, z. B. color: red;`); return; }
        const attribut = t.slice(0, d).trim().toLowerCase();
        let wert = t.slice(d + 1).trim();
        if (/\n\s*[a-z-]+\s*:/i.test(wert)){
          add(start, 'Am Ende der Angabe fehlt der Strichpunkt ;');
          wert = wert.split('\n')[0].trim();
        }
        if (!/^-{0,2}[a-z][a-z0-9-]*$/.test(attribut)){ add(start, `„${attribut}“ ist kein gültiges Attribut.`); return; }
        if (attribut.startsWith('--')) return;
        if (!kennt(attribut)){ add(start, `Das Attribut „${attribut}“ gibt es in CSS nicht. Tippfehler?`); return; }
        if (!wert){ add(start, `Bei ${attribut} fehlt der Wert.`); return; }
        if (!passt(attribut, wert.replace(/\s*!important$/i, ''))){
          let tipp = '';
          if (FARBEN_DE.test(wert)) tipp = ' Farbnamen sind englisch, z. B. red, blue, green.';
          else if (/^-?\d+(\.\d+)?$/.test(wert) && wert !== '0') tipp = ` Fehlt die Einheit? Zum Beispiel ${wert}px.`;
          else if (/^\d+(,\d+)/.test(wert)) tipp = ' Kommazahlen schreibt man mit Punkt.';
          else if (/^\d+\s+(px|em|%)/.test(wert)) tipp = ' Zwischen Zahl und Einheit steht kein Leerzeichen.';
          add(start, `Der Wert „${wert}“ passt nicht zum Attribut ${attribut}.${tipp}`);
        }
      });
      i = geschlossen ? ende + 1 : ende;
    }
    return m.sort((a, b) => a.zeile - b.zeile);
  }

  /* ---------- Tests ---------- */
  const klar = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
  function rgb(s){
    const z = String(s).match(/-?[\d.]+/g);
    return z && z.length >= 3 ? {r: +z[0], g: +z[1], b: +z[2], a: z.length > 3 ? +z[3] : 1} : null;
  }
  function hell(c){
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function kontrast(el, win){
    const vorn = rgb(win.getComputedStyle(el).color);
    let hinten = {r: 255, g: 255, b: 255, a: 1};
    for (let e = el; e && e.nodeType === 1; e = e.parentNode){
      const c = rgb(win.getComputedStyle(e).backgroundColor);
      if (c && c.a > 0.5){ hinten = c; break; }
    }
    if (!vorn) return 21;
    const a = hell(vorn), b = hell(hinten);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }
  // berechneter Stil von el gleich dem, was „attribut: wert“ an derselben Stelle ergäbe?
  function stilGleich(el, win, attribut, wert){
    const probe = el.ownerDocument.createElement(el.tagName);
    probe.style.setProperty(attribut, wert);
    if (!probe.style.length) return false;
    el.parentNode.appendChild(probe);
    const a = win.getComputedStyle(el), b = win.getComputedStyle(probe);
    let gleich = true;
    for (let i = 0; i < probe.style.length; i++){
      const n = probe.style[i];
      if (a.getPropertyValue(n) !== b.getPropertyValue(n)) gleich = false;
    }
    probe.remove();
    return gleich;
  }
  function regeln(doc){
    const liste = [];
    const sammle = rs => { for (const r of rs){ if (r.selectorText) liste.push(r); else if (r.cssRules) sammle(r.cssRules); } };
    for (const s of doc.styleSheets){ try { sammle(s.cssRules); } catch (e) {} }
    return liste;
  }
  function teste(t, doc, win, html, css, iframe){
    if (t.test) return !!t.test(doc, html, css);
    if (t.quelle) return t.quelle.test(html);
    if (t.quelleNicht) return !t.quelleNicht.test(html);
    if (t.css) return t.css.test(ohneKommentare(css));
    if (t.cssNicht) return !t.cssNicht.test(ohneKommentare(css));
    if (t.sel){
      let els = [...doc.querySelectorAll(t.sel)];
      if (t.enthaelt != null) els = els.filter(e => klar(e.textContent).includes(klar(t.enthaelt)));
      if (t.keine) return els.length === 0;
      return t.anzahl != null ? els.length === t.anzahl : els.length >= (t.min || 1);
    }
    if (t.stil){
      const els = [...doc.querySelectorAll(t.stil)];
      if (!els.length) return false;
      return els.every(el => {
        if (t.wert != null) return [].concat(t.wert).some(w => stilGleich(el, win, t.attribut, w));
        if (t.ungleich != null) return ![].concat(t.ungleich).some(w => stilGleich(el, win, t.attribut, w));
        const px = parseFloat(win.getComputedStyle(el).getPropertyValue(t.attribut));
        return !(t.minPx != null && !(px >= t.minPx)) && !(t.maxPx != null && !(px <= t.maxPx));
      });
    }
    if (t.regel){
      return regeln(doc).some(r => r.selectorText.split(',').some(s => {
        s = s.trim().replace(/\s+/g, ' ');
        if (!(t.regel instanceof RegExp ? t.regel.test(s) : klar(s) === klar(t.regel))) return false;
        if (!t.attribut) return r.style.length > 0;
        if (r.style.getPropertyValue(t.attribut)) return true;
        for (let i = 0; i < r.style.length; i++) if (r.style[i].startsWith(t.attribut + '-')) return true;
        return false;
      }));
    }
    if (t.kontrast){
      const els = [...doc.querySelectorAll(t.kontrast)];
      return els.length > 0 && els.every(el => kontrast(el, win) >= (t.min || 4.5));
    }
    if (t.passt){
      const alt = iframe.style.width;
      iframe.style.width = t.passt + 'px';
      const ok = doc.documentElement.scrollWidth <= t.passt + 1;
      iframe.style.width = alt;
      return ok;
    }
    return false;
  }
  function pruefe(html, css, tests){
    return new Promise(resolve => {
      const f = document.createElement('iframe');
      f.setAttribute('sandbox', 'allow-same-origin');
      f.setAttribute('aria-hidden', 'true');
      f.style.cssText = 'position:fixed;left:-9999px;top:0;width:1000px;height:700px;visibility:hidden;border:0';
      f.addEventListener('load', () => {
        const doc = f.contentDocument, win = f.contentWindow;
        const erg = (tests || []).map(t => {
          let ok = false;
          try { ok = teste(t, doc, win, html, css, f); } catch (e) {}
          return {ok, text: t.text || ''};
        });
        f.remove();
        resolve(erg);
      });
      f.srcdoc = dokument(html, css) || ' ';
      document.body.appendChild(f);
    });
  }

  /* ---------- Hell/Dunkel ---------- */
  function themaKnopf(btn){
    const zeichne = () => {
      btn.innerHTML = document.documentElement.dataset.theme === 'dark'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
    };
    btn.setAttribute('aria-label', 'Hell/Dunkel umschalten');
    btn.addEventListener('click', () => {
      const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = t;
      try { localStorage.setItem('wenn-theme', t); } catch (e) {}
      zeichne();
    });
    zeichne();
  }

  /* ---------- Optionen des Editors (Zahnrad) ---------- */
  const OPTIONEN = [
    {id: 'tags', text: 'Tags automatisch schließen', an: false, setze: (cm, el, v) => cm.setOption('autoCloseTags', v ? {whenOpening: true, whenClosing: true, indentTags: []} : false)},
    {id: 'umbruch', text: 'Lange Zeilen umbrechen', an: true, setze: (cm, el, v) => cm.setOption('lineWrapping', v)},
    {id: 'gross', text: 'Große Schrift', an: false, setze: (cm, el, v) => { el.classList.toggle('hw-gross', v); cm.refresh(); }},
    {id: 'ohneVorschau', text: 'Vorschau ausblenden', an: false, fluechtig: true, setze: (cm, el, v) => { el.classList.toggle('hw-ohne-vorschau', v); cm.refresh(); }}
  ];
  function optionen(){
    let o = {};
    try { o = JSON.parse(localStorage.getItem('hw-optionen') || '{}') || {}; } catch (e) {}
    const erg = {};
    OPTIONEN.forEach(x => { erg[x.id] = typeof o[x.id] === 'boolean' && !x.fluechtig ? o[x.id] : x.an; });
    return erg;
  }

  /* ---------- Arbeitsplatz: Editor, Hinweise, Vorschau ---------- */
  function arbeitsplatz(host, opt){
    opt = opt || {};
    const el = document.createElement('div');
    el.className = 'hw hw-' + (opt.anordnung === 'neben' ? 'neben' : 'unten');
    el.innerHTML = `
      <div class="hw-leiste">
        <span class="hw-links"></span>
        <div class="hw-schalter hw-datei-wahl" role="group" aria-label="Datei wählen"><button type="button" data-f="html" class="an">HTML</button><button type="button" data-f="css">CSS</button></div>
        <button type="button" class="btn hw-bilder-knopf" aria-expanded="false">Bilder</button>
        <div class="hw-bilder" hidden></div>
        <span class="sp"></span>
        <span class="hw-rechts"></span>
      </div>
      <div class="hw-flaeche">
        <section class="pane hw-ed"><div class="pane-head"><span class="hw-datei">index.html</span><span class="status hw-stand"></span></div><textarea aria-label="Code"></textarea><div class="hw-hinweise" aria-live="polite"></div></section>
        <div class="hw-teiler" role="separator" tabindex="0" aria-label="Größe von Editor und Vorschau ändern" title="Ziehen, um die Größe zu ändern. Doppelklick: halb und halb."></div>
        <section class="pane hw-vor"><div class="pane-head">Vorschau<span class="status hw-notiz"></span>
          <div class="hw-schalter klein hw-geraet" role="group" aria-label="Breite der Vorschau"><button type="button" data-b="" class="an">Computer</button><button type="button" data-b="handy">Handy</button></div></div>
          <div class="hw-buehne"><iframe title="Vorschau der Webseite"></iframe></div></section>
      </div>`;
    host.appendChild(el);
    const $ = s => el.querySelector(s);

    const cm = CodeMirror.fromTextArea($('textarea'), {
      mode: 'htmlmixed', lineNumbers: true, indentUnit: 2, tabSize: 2, indentWithTabs: false, lineWrapping: true,
      styleActiveLine: true, matchTags: {bothTags: true}, matchBrackets: true,
      extraKeys: {
        'Tab': c => c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection('  ', 'end'),
        'Shift-Tab': c => c.indentSelection('subtract')
      }
    });
    // Zahnrad unten rechts im Editor
    const werte = optionen(), huelle = cm.getWrapperElement();
    const rad = Object.assign(document.createElement('button'), {type: 'button', className: 'hw-rad', title: 'Optionen des Editors',
      innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'});
    rad.setAttribute('aria-label', 'Optionen des Editors'); rad.setAttribute('aria-expanded', 'false');
    const optFeld = Object.assign(document.createElement('div'), {className: 'hw-opt', hidden: true,
      innerHTML: '<b>Editor</b>' + OPTIONEN.map(x => `<label><input type="checkbox" data-o="${x.id}"${werte[x.id] ? ' checked' : ''}>${esc(x.text)}</label>`).join('')});
    huelle.appendChild(rad); huelle.appendChild(optFeld);
    OPTIONEN.forEach(x => x.setze(cm, el, werte[x.id]));
    const optZu = () => { optFeld.hidden = true; rad.setAttribute('aria-expanded', 'false'); };
    rad.addEventListener('click', e => { e.stopPropagation(); optFeld.hidden = !optFeld.hidden; rad.setAttribute('aria-expanded', String(!optFeld.hidden)); });
    optFeld.addEventListener('change', e => {
      const x = OPTIONEN.find(y => y.id === e.target.dataset.o);
      if (!x) return;
      werte[x.id] = e.target.checked;
      x.setze(cm, el, werte[x.id]);
      const fest = {};
      OPTIONEN.forEach(y => { if (!y.fluechtig) fest[y.id] = werte[y.id]; });
      try { localStorage.setItem('hw-optionen', JSON.stringify(fest)); } catch (err) {}
    });
    ['mousedown', 'touchstart'].forEach(n => { rad.addEventListener(n, e => e.stopPropagation()); optFeld.addEventListener(n, e => e.stopPropagation()); });
    document.addEventListener('click', e => { if (!optFeld.hidden && !optFeld.contains(e.target)) optZu(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') optZu(); });

    // Grenze zwischen Editor und Vorschau ziehen
    const teiler = $('.hw-teiler'), flaeche = $('.hw-flaeche'), edPane = $('.hw-ed'), vorPane = $('.hw-vor');
    const lage = opt.anordnung === 'neben' ? 'neben' : 'unten';
    let anteile = {};
    try { anteile = JSON.parse(localStorage.getItem('hw-teiler') || '{}') || {}; } catch (e) {}
    function teile(r, merken){
      r = Math.min(0.85, Math.max(0.15, r));
      edPane.style.flex = `${r * 100} 1 0`; vorPane.style.flex = `${(1 - r) * 100} 1 0`;
      teiler.setAttribute('aria-valuenow', Math.round(r * 100));
      cm.refresh();
      if (merken){ anteile[lage] = r; try { localStorage.setItem('hw-teiler', JSON.stringify(anteile)); } catch (e) {} }
    }
    const anteil = () => typeof anteile[lage] === 'number' ? anteile[lage] : 0.5;
    function ausZeiger(e){
      const k = flaeche.getBoundingClientRect(), quer = getComputedStyle(flaeche).flexDirection === 'row';
      return quer ? (e.clientX - k.left) / k.width : (e.clientY - k.top) / k.height;
    }
    teiler.addEventListener('pointerdown', e => {
      e.preventDefault(); teiler.setPointerCapture(e.pointerId); el.classList.add('hw-zieht');
      const zieh = ev => teile(ausZeiger(ev), false);
      const ende = ev => {
        teiler.removeEventListener('pointermove', zieh); teiler.removeEventListener('pointerup', ende); teiler.removeEventListener('pointercancel', ende);
        el.classList.remove('hw-zieht'); teile(ausZeiger(ev), true);
      };
      teiler.addEventListener('pointermove', zieh); teiler.addEventListener('pointerup', ende); teiler.addEventListener('pointercancel', ende);
    });
    teiler.addEventListener('dblclick', () => teile(0.5, true));
    teiler.addEventListener('keydown', e => {
      const d = {ArrowLeft: -0.03, ArrowUp: -0.03, ArrowRight: 0.03, ArrowDown: 0.03}[e.key];
      if (d){ e.preventDefault(); teile(anteil() + d, true); }
    });
    if (typeof anteile[lage] === 'number') teile(anteile[lage], false);

    let docs = {html: cm.getDoc(), css: CodeMirror.Doc('', 'css')};
    let datei = 'html', mitCss = true, laden = false, timer = null, markiert = [], meld = {html: [], css: []};

    const notizEl = $('.hw-notiz');
    let notizTimer = null;
    function notiz(t){ notizEl.textContent = t || ''; clearTimeout(notizTimer); if (t) notizTimer = setTimeout(() => { notizEl.textContent = ''; }, 5000); }
    const zeigeVorschau = rahmen($('iframe'), notiz);

    function sperre(){
      const d = docs.html;
      d.getAllMarks().forEach(mk => mk.clear());
      if (!mitCss) return;
      for (let n = 0; n < d.lineCount(); n++){
        const z = d.getLine(n), t = LINK_RE.exec(z);
        if (t){ d.markText({line: n, ch: t.index}, {line: n, ch: t.index + t[0].length}, {readOnly: true, className: 'hw-fest', atomic: true, attributes: {title: 'Diese Zeile bindet style.css ein und ist fest.'}}); break; }
      }
    }
    function waehle(f){
      datei = f;
      cm.swapDoc(docs[f]);
      el.querySelectorAll('.hw-datei-wahl button').forEach(b => b.classList.toggle('an', b.dataset.f === f));
      $('.hw-datei').textContent = f === 'html' ? 'index.html' : 'style.css';
      $('.hw-bilder-knopf').disabled = f !== 'html';
      zeigeHinweise();
      cm.focus();
    }
    function pruefeRegeln(){
      const html = docs.html.getValue(), css = docs.css.getValue();
      let doc = null;
      try { doc = new DOMParser().parseFromString(html, 'text/html'); } catch (e) {}
      meld = {html: pruefeHtml(html), css: mitCss ? pruefeCss(css, doc) : []};
      return meld;
    }
    function zeigeHinweise(){
      markiert.forEach(h => cm.removeLineClass(h, 'background', 'err-line'));
      markiert = [];
      const liste = meld[datei], andere = datei === 'html' ? 'css' : 'html';
      liste.filter(x => x.art === 'fehler').forEach(x => {
        if (x.zeile <= cm.lineCount()) markiert.push(cm.addLineClass(x.zeile - 1, 'background', 'err-line'));
      });
      const n = meld[andere].filter(x => x.art === 'fehler').length;
      $('.hw-hinweise').innerHTML = liste.map(x => `<button type="button" class="${x.art}" data-z="${x.zeile}"><span class="z">Zeile ${x.zeile}</span>${esc(x.text)}</button>`).join('') +
        (n ? `<button type="button" data-f="${andere}"><span class="z">${andere === 'css' ? 'style.css' : 'index.html'}</span>${n} ${n === 1 ? 'Fehler' : 'Fehler'} in der anderen Datei – hier klicken</button>` : '');
    }
    $('.hw-hinweise').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.f) return waehle(b.dataset.f);
      cm.setCursor({line: +b.dataset.z - 1, ch: 0}); cm.focus();
    });
    function aktualisiere(){
      clearTimeout(timer); timer = null;
      pruefeRegeln(); zeigeHinweise();
      zeigeVorschau(dokument(docs.html.getValue(), docs.css.getValue()));
    }
    cm.on('change', () => {
      if (laden) return;
      clearTimeout(timer); timer = setTimeout(aktualisiere, 350);
      if (opt.onChange) opt.onChange(docs.html.getValue(), docs.css.getValue());
    });
    el.querySelector('.hw-datei-wahl').addEventListener('click', e => { const b = e.target.closest('button'); if (b) waehle(b.dataset.f); });
    el.querySelector('.hw-geraet').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      el.querySelectorAll('.hw-geraet button').forEach(x => x.classList.toggle('an', x === b));
      $('.hw-buehne').classList.toggle('handy', b.dataset.b === 'handy');
    });

    // Bilder
    const menue = $('.hw-bilder'), knopf = $('.hw-bilder-knopf');
    menue.innerHTML = '<p>Klicke ein Bild an, um es an der Schreibmarke einzufügen.</p>' + Object.keys(BILDER).map(n =>
      `<button type="button" data-n="${esc(n)}"><img src="${bildUrl(n)}" alt="${esc(BILDER[n].titel)}">bilder/${esc(n)}</button>`).join('');
    function menueZu(){ menue.hidden = true; knopf.setAttribute('aria-expanded', 'false'); }
    knopf.addEventListener('click', e => { e.stopPropagation(); menue.hidden = !menue.hidden; knopf.setAttribute('aria-expanded', String(!menue.hidden)); menue.style.left = knopf.offsetLeft + 'px'; });
    menue.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      menueZu();
      cm.replaceSelection(`<img src="bilder/${b.dataset.n}" alt="">`, 'end');
      const c = cm.getCursor(); cm.setCursor({line: c.line, ch: c.ch - 2}); cm.focus();
    });
    document.addEventListener('click', e => { if (!menue.hidden && !menue.contains(e.target)) menueZu(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') menueZu(); });

    return {
      el, cm,
      links: $('.hw-links'), rechts: $('.hw-rechts'), stand: $('.hw-stand'),
      html: () => docs.html.getValue(),
      css: () => docs.css.getValue(),
      waehle,
      lade(inhalt){
        laden = true;
        mitCss = inhalt.mitCss !== false;
        docs = {html: CodeMirror.Doc(inhalt.html || '', 'htmlmixed'), css: CodeMirror.Doc(inhalt.css || '', 'css')};
        markiert = [];
        sperre();
        el.querySelector('.hw-datei-wahl').hidden = !mitCss;
        knopf.hidden = !inhalt.bilder;
        menueZu();
        laden = false;
        waehle('html');
        aktualisiere();
      },
      async pruefe(tests){
        if (timer) aktualisiere();
        const html = docs.html.getValue(), css = docs.css.getValue();
        const regelFehler = [].concat(
          meld.html.filter(x => x.art === 'fehler').map(x => Object.assign({datei: 'index.html'}, x)),
          meld.css.filter(x => x.art === 'fehler').map(x => Object.assign({datei: 'style.css'}, x)));
        const erg = await pruefe(html, mitCss ? css : '', tests);
        return {ok: !regelFehler.length && erg.every(x => x.ok), regeln: regelFehler, tests: erg};
      },
      download(name){
        const blob = new Blob([dokument(docs.html.getValue(), docs.css.getValue())], {type: 'text/html;charset=utf-8'});
        const a = Object.assign(document.createElement('a'), {href: URL.createObjectURL(blob), download: name || 'index.html'});
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
    };
  }

  window.HtmlWerk = {arbeitsplatz, dokument, rahmen, pruefeHtml, pruefeCss, pruefe, themaKnopf, esc, LINK, BILDER};
})();
