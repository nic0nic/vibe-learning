/* vibe learning – Anbindung an die ByCS-Lernplattform (Moodle) über SCORM 2004 oder SCORM 1.2
 *
 * Nur in den Paketen aus werkzeuge/bycs-pakete.py eingebettet, dort anstelle von sync.js
 * (also vor den Skripten der Seite). Stellt dieselbe Schnittstelle bereit wie sync.js:
 *   TrainerSync.changed()      nach jeder Änderung am gespeicherten Stand
 *   TrainerSync.event({...})   wenn eine Aufgabe richtig gelöst wurde
 *                              {modus: erarbeitung|uebungen|endlos, stufe, aufgabe, titel, gesamt, erstmals}
 *
 * Was in Moodle ankommt (Namen für SCORM 2004, in Klammern 1.2):
 *   suspend_data               Stand der Übung (localStorage-Schlüssel „<data-trainer>-…“) und die Liste
 *                              gelöster Aufgaben. Beim Öffnen ersetzt er den Stand im Browser (geteilte
 *                              Schul-PCs: kein Stand vom vorherigen Schüler). Über der Grenze (2004: 64000,
 *                              1.2: 4096 Zeichen) wird komprimiert, notfalls nur die Liste gespeichert.
 *   score.raw                  gelöste Aufgaben (Erarbeitung + Übungen) in Prozent, gezählt wie in lehrer.html;
 *                              Stufen, in denen noch nichts gelöst wurde, zählen mit der größten bekannten
 *                              Aufgabenzahl je Stufe (window.PF_BYCS.stufen aus katalog.js).
 *                              Reine Endlos-Seiten melden keine Prozentzahl.
 *   completion_status          completed bei 100 %, sonst incomplete (1.2: lesson_status)
 *   interactions.n.*           jede gelöste Aufgabe: id, Zeitpunkt, Ergebnis, Beschreibung, Details
 *
 * Ohne Lernplattform (Datei direkt geöffnet) läuft die Seite wie eine Einzeldatei, nur im Browser.
 */
(function () {
  'use strict';

  const CFG = window.PF_BYCS || {};
  const PAGE = document.documentElement.dataset.trainer || '';
  const OWN = PAGE + '-';
  const SKIP = ['wenn-theme'];
  const MAX_INTERAKTIONEN = 1000;

  /* ---------- SCORM-API suchen (Standardverfahren: übergeordnete Fenster, dann opener) ---------- */
  function suche(name){
    const hoch = w => {
      for (let i = 0; w && i < 10; i++){
        try { if (w[name]) return w[name]; } catch (e) { return null; }   // fremder Ursprung
        if (w.parent === w) break;
        w = w.parent;
      }
      return null;
    };
    let a = hoch(window);
    if (!a){ try { if (window.opener) a = hoch(window.opener); } catch (e) {} }
    return a;
  }
  const API04 = suche('API_1484_11'), API12 = API04 ? null : suche('API');
  const V = API04 ? 2004 : API12 ? 12 : 0;
  const L = V === 2004
    ? {api: API04, init: 'Initialize', get: 'GetValue', set: 'SetValue', commit: 'Commit', fin: 'Terminate', err: 'GetLastError', errS: 'GetErrorString',
       status: 'cmi.completion_status', score: 'cmi.score.', exit: 'cmi.exit', zeit: 'cmi.session_time', max: 64000}
    : {api: API12, init: 'LMSInitialize', get: 'LMSGetValue', set: 'LMSSetValue', commit: 'LMSCommit', fin: 'LMSFinish', err: 'LMSGetLastError', errS: 'LMSGetErrorString',
       status: 'cmi.core.lesson_status', score: 'cmi.core.score.', exit: 'cmi.core.exit', zeit: 'cmi.core.session_time', max: 4096};
  const ruf = (f, ...a) => { try { return String(L.api[f](...a)); } catch (e) { return ''; } };
  const get = k => ruf(L.get, k);
  const set = (k, v) => ruf(L.set, k, String(v)) === 'true';
  const fehler = () => { const c = ruf(L.err); return c + ' ' + ruf(L.errS, c); };

  const ls = {
    get(k){ try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v){ try { localStorage.setItem(k, v); } catch (e) {} },
    del(k){ try { localStorage.removeItem(k); } catch (e) {} },
    keys(){ try { return Object.keys(localStorage); } catch (e) { return []; } }
  };
  const eigene = () => ls.keys().filter(k => k.startsWith(OWN) && !SKIP.includes(k)).sort();
  function snapshot(){ const d = {}; eigene().forEach(k => { d[k] = ls.get(k); }); return d; }

  /* ---------- Komprimieren (LZW, synchron, Ausgabe in 64 URL-sicheren Zeichen) ----------
   * Format: z<Länge Alphabet>:<Zahl der Codes>:<Alphabet><Bits>. Code Nr. k (ab 1) hat
   * bitlen(Alphabetgröße + k − 1) Bits, so kennen Packen und Entpacken die Breite ohne Absprache.
   * Synchron, weil der Stand beim Öffnen vor den Skripten der Seite zurückgeschrieben werden muss. */
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const bits = n => n.toString(2).length;
  function packen(s){
    const alpha = [...new Set(s.split(''))], dict = new Map(alpha.map((c, i) => [c, i]));
    let size = alpha.length, out = '', acc = 0, nb = 0, n = 0, w = '';
    const put = code => {
      n++;
      for (let b = bits(size) - 1; b >= 0; b--){ acc = acc << 1 | (code >> b & 1); if (++nb === 6){ out += B64[acc]; acc = 0; nb = 0; } }
    };
    for (const c of s.split('')){
      const wc = w + c;
      if (dict.has(wc)) w = wc; else { put(dict.get(w)); dict.set(wc, size++); w = c; }
    }
    if (w) put(dict.get(w));
    if (nb) out += B64[acc << (6 - nb)];
    return `z${alpha.length}:${n}:${alpha.join('')}${out}`;
  }
  function entpacken(z){
    const m = /^z(\d+):(\d+):/.exec(z); if (!m) return null;
    const A = +m[1], n = +m[2], rest = z.slice(m[0].length), dict = rest.slice(0, A).split(''), daten = rest.slice(A);
    let pos = 0;
    const lies = w => { let v = 0; for (let i = 0; i < w; i++, pos++){ v = v * 2 + (B64.indexOf(daten[pos / 6 | 0]) >> (5 - pos % 6) & 1); } return v; };
    let prev = dict[lies(bits(A))]; const teile = [prev];
    for (let k = 2; k <= n; k++){
      const c = lies(bits(A + k - 1)), e = c < dict.length ? dict[c] : prev + prev[0];
      teile.push(e); dict.push(prev + e[0]); prev = e;
    }
    return teile.join('');
  }

  // gelöste Aufgaben: e = [ids] Erarbeitung, eg = gesamt; u = {stufe: [ids]}, ug = {stufe: gesamt}; r = {stufe: Anzahl} Endlos
  let A = {e: [], eg: 0, u: {}, ug: {}, r: {}};
  let aktiv = false, fertig = false, timer = null, lastSuspend = '';
  const start = Date.now();

  /* ---------- Start: Stand aus Moodle übernehmen (synchron, vor den Skripten der Seite) ---------- */
  if (V && PAGE){
    aktiv = ruf(L.init, '') === 'true';
    if (!aktiv && get(L.status)) aktiv = true;                         // schon initialisiert
  }
  if (aktiv){
    let d = null;
    try { const roh = get('cmi.suspend_data'); d = JSON.parse((roh[0] === 'z' ? entpacken(roh) : roh) || 'null'); } catch (e) { d = null; }
    // Stand eines anderen Schülers auf diesem PC verwerfen; außer der Stand war zu groß für Moodle (s: null),
    // dann bleibt er nur im Browser und wird hier nicht gelöscht
    if (!d || d.s) eigene().forEach(k => ls.del(k));
    if (d && d.s) Object.keys(d.s).forEach(k => { if (k.startsWith(OWN) && typeof d.s[k] === 'string') ls.set(k, d.s[k]); });
    if (d && d.a) A = Object.assign(A, d.a);
    lastSuspend = get('cmi.suspend_data');
    const st = get(L.status);
    if (!st || st === 'not attempted' || st === 'unknown') set(L.status, 'incomplete');
    set(L.score + 'min', 0); set(L.score + 'max', 100);
    set(L.exit, 'suspend');
    ruf(L.commit, '');
  }

  /* ---------- Speichern ---------- */
  function speichern(){
    clearTimeout(timer); timer = null;
    if (!aktiv || fertig) return;
    const passend = obj => {
      let t = JSON.stringify(obj);
      if (t.length > L.max){ const z = packen(t); if (z.length < t.length) t = z; }
      return t;
    };
    let txt = passend({s: snapshot(), a: A});
    if (txt.length > L.max){
      // Zu groß: nur die Liste gelöster Aufgaben speichern, der Stand der Seite bleibt dann nur im Browser
      console.warn(`vibe learning/ByCS: Speicherstand ${txt.length} Zeichen, erlaubt sind ${L.max}. Gespeichert wird nur, was gelöst ist.`);
      txt = passend({s: null, a: A});
    }
    if (txt !== lastSuspend){
      if (set('cmi.suspend_data', txt)) lastSuspend = txt;
      else console.warn('vibe learning/ByCS: suspend_data nicht gespeichert:', fehler());
    }
    ruf(L.commit, '');
  }
  function changed(){
    if (!aktiv) return;
    clearTimeout(timer);
    timer = setTimeout(speichern, 700);
  }

  /* ---------- Bewertung ---------- */
  function prozent(){
    const stufen = Object.keys(A.ug);
    let geloest = A.e.length, gesamt = A.eg;
    if (stufen.length){
      const n = Math.max(+CFG.stufen || 0, ...stufen.map(Number));    // Stufen laut katalog.js
      const groesste = Math.max(...stufen.map(s => A.ug[s]));
      for (let s = 1; s <= n; s++) gesamt += A.ug[s] || groesste;
      stufen.forEach(s => { geloest += (A.u[s] || []).length; });
    }
    return gesamt ? Math.min(100, Math.round(geloest / gesamt * 100)) : null;
  }

  /* ---------- gelöste Aufgabe ---------- */
  const z2 = n => String(n).padStart(2, '0');
  function zeitpunkt(){
    const d = new Date();
    return V === 2004
      ? `${d.getFullYear()}-${z2(d.getMonth() + 1)}-${z2(d.getDate())}T${z2(d.getHours())}:${z2(d.getMinutes())}:${z2(d.getSeconds())}`
      : `${z2(d.getHours())}:${z2(d.getMinutes())}:${z2(d.getSeconds())}`;
  }
  const ident = s => String(s).normalize('NFKD').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 200) || 'x';
  const dazu = (liste, id) => { if (!liste.includes(id)) liste.push(id); };
  const MODUS = {erarbeitung: 'Erarbeitung', uebungen: 'Übungen', endlos: 'Endlos'};

  function event(ev){
    if (!aktiv || fertig || !ev) return;
    const modus = ev.modus || 'erarbeitung', stufe = +ev.stufe || 0, auf = String(ev.aufgabe == null ? '' : ev.aufgabe);
    if (modus === 'erarbeitung'){ dazu(A.e, auf); A.eg = Math.max(A.eg, +ev.gesamt || 0); }
    else if (modus === 'uebungen'){ dazu(A.u[stufe] = A.u[stufe] || [], auf); A.ug[stufe] = Math.max(A.ug[stufe] || 0, +ev.gesamt || 0); }
    else A.r[stufe] = (A.r[stufe] || 0) + 1;

    const n = +get('cmi.interactions._count') || 0;
    if (n < MAX_INTERAKTIONEN){
      const p = `cmi.interactions.${n}.`;
      const text = `${MODUS[modus] || modus} | Stufe ${stufe} | Aufgabe ${auf}${ev.gesamt ? '/' + ev.gesamt : ''} | ${ev.titel || ''}${ev.erstmals === false ? ' | wiederholt' : ''}`;
      set(p + 'id', ident(`${modus}-s${stufe}-${auf}`));
      if (V === 2004){
        set(p + 'type', 'other');
        set(p + 'timestamp', zeitpunkt());
        set(p + 'description', text.slice(0, 250));
        set(p + 'learner_response', text.slice(0, 4000));
      } else {
        set(p + 'type', 'performance');
        set(p + 'time', zeitpunkt());
        set(p + 'student_response', `${new Date().toLocaleDateString('de-DE')} | ${text}`.slice(0, 255));
      }
      set(p + 'result', 'correct');
      set(p + 'weighting', 1);
    }
    const p = prozent();
    if (p != null){
      set(L.score + 'raw', p);
      if (V === 2004){ set('cmi.score.scaled', (p / 100).toFixed(2)); set('cmi.success_status', p >= 100 ? 'passed' : 'unknown'); }
      set(L.status, p >= 100 ? 'completed' : 'incomplete');
    }
    speichern();
  }

  /* ---------- Ende ---------- */
  function sitzung(){
    const s = Math.round((Date.now() - start) / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
    return V === 2004 ? `PT${h}H${m}M${s % 60}S` : `${z2(h)}:${z2(m)}:${z2(s % 60)}`;
  }
  function beenden(){
    if (!aktiv || fertig) return;
    speichern();
    set(L.zeit, sitzung());
    fertig = true;
    ruf(L.fin, '');
  }
  if (aktiv){
    window.addEventListener('pagehide', beenden);
    window.addEventListener('beforeunload', beenden);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') speichern(); });
  }

  window.TrainerSync = {changed, event, bycs: true, get aktiv(){ return aktiv; }, get lehrer(){ return null; },
    anmelden(){}, abmelden(){}, _stand: () => ({version: V, A, prozent: prozent()}), _lzw: {packen, entpacken}};
})();
