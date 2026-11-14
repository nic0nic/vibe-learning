/* vibe learning – Anmeldung und Anbindung an PocketBase
 *
 * Läuft die Seite über den PocketBase-Server, erscheint beim ersten Öffnen ein
 * Anmeldefenster: ein Feld für Code oder Benutzername (bei Benutzernamen folgt das
 * Passwort), alternativ „Seite ohne Anmeldung nutzen“. Oben rechts in der Leiste
 * steht danach, wer angemeldet ist; dort meldet man sich auch an und ab.
 *
 * Schüler: Fortschritt wird auf dem Server gespeichert, jede gelöste Aufgabe protokolliert.
 * Lehrkraft/Admin: Anmeldung gilt bis zum Schließen des Browsers, im Menü steht
 * der Link zur Verwaltung (lehrer.html).
 * Wird die HTML-Datei direkt geöffnet (oder läuft kein PocketBase dahinter),
 * passiert nichts davon – die Seite speichert dann wie bisher nur im Browser.
 *
 * Bedingte Menüpunkte (katalog.js: bedingt) blendet das Skript nach der Anmeldung ein,
 * wenn der Server sie für diesen Schüler freigibt (/api/trainer/sichtbar).
 *
 * Die Seite ruft auf:
 *   TrainerSync.changed()      nach jeder Änderung am gespeicherten Stand
 *   TrainerSync.event({...})   wenn eine Aufgabe richtig gelöst wurde
 */
(function () {
  'use strict';

  const CONFIG = {
    api: '/api/trainer',
    verwaltung: 'lehrer.html'   // relativ zum Ordner von sync.js
  };

  const me = document.currentScript && document.currentScript.src;
  const BASE = me ? me.replace(/[^/]*$/, '') : '';
  const PAGE = document.documentElement.dataset.trainer || '';          // Tool-id aus katalog.js, leer auf Übersichtsseiten
  const TOOL_IDS = window.KATALOG ? [].concat(...window.KATALOG.bereiche.map(b => b.tools.map(t => t.id))) : [];
  const ALL_PREFIXES = [...new Set(['wenn', 'uo', 'fn', PAGE].concat(TOOL_IDS))].filter(Boolean).map(id => id + '-');
  const OWN = PAGE + '-';
  const SKIP = ['wenn-theme'];                                             // Hell/Dunkel bleibt pro Gerät
  const K = {code: 'ts-code', anzeige: 'ts-anzeige', klasse: 'ts-klasse', queue: 'ts-queue', stand: 'ts-stand-' + PAGE};
  const SS = {gast: 'ts-gast', lehrer: 'ts-lehrer'};                      // gilt nur bis zum Schließen des Browsers

  const ls = {
    get(k){ try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v){ try { localStorage.setItem(k, v); } catch (e) {} },
    del(k){ try { localStorage.removeItem(k); } catch (e) {} },
    keys(){ try { return Object.keys(localStorage); } catch (e) { return []; } }
  };
  const ss = {
    get(k){ try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v){ try { sessionStorage.setItem(k, v); } catch (e) {} },
    del(k){ try { sessionStorage.removeItem(k); } catch (e) {} }
  };
  function lehrerSitzung(){ try { return JSON.parse(ss.get(SS.lehrer) || 'null'); } catch (e) { return null; } }

  const hosted = /^https?:$/.test(location.protocol);
  let aktiv = false, pushTimer = null, pushPending = false, menuEl = null, lastSnap = '';

  /* ---------- Hilfen ---------- */
  function api(path, opt){
    opt = opt || {};
    return fetch(CONFIG.api + path, {
      method: opt.method || 'GET',
      keepalive: !!opt.keepalive,
      headers: {'Content-Type': 'application/json', 'X-Trainer-Code': ls.get(K.code) || ''},
      body: opt.body ? JSON.stringify(opt.body) : undefined
    }).then(async r => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok){ const err = new Error(j.message || ('HTTP ' + r.status)); err.status = r.status; err.data = j; throw err; }
      return j;
    });
  }
  const trainerKeys = prefix => ls.keys().filter(k => k.startsWith(prefix) && !SKIP.includes(k));
  function snapshot(prefix){ prefix = prefix || OWN; const d = {}; trainerKeys(prefix).sort().forEach(k => { d[k] = ls.get(k); }); return d; }
  function applySnapshot(d, prefix){
    prefix = prefix || OWN;
    trainerKeys(prefix).forEach(k => ls.del(k));
    Object.keys(d || {}).forEach(k => { if (k.startsWith(prefix) && !SKIP.includes(k) && typeof d[k] === 'string') ls.set(k, d[k]); });
  }
  function wipeLocal(){
    ALL_PREFIXES.forEach(p => trainerKeys(p).forEach(k => ls.del(k)));
    ls.keys().filter(k => k.startsWith('ts-stand-')).forEach(k => ls.del(k));
    [K.queue, K.code, K.klasse, K.anzeige].forEach(k => ls.del(k));
  }
  function reloadOnce(){
    let last = 0; try { last = +sessionStorage.getItem('ts-reload') || 0; } catch (e) {}
    if (Date.now() - last < 8000) return;
    try { sessionStorage.setItem('ts-reload', Date.now()); } catch (e) {}
    location.reload();
  }

  /* ---------- Fortschritt abgleichen ---------- */
  async function pull(){
    if (!PAGE){ setStatus('ok'); return; }
    const r = await api('/state?seite=' + PAGE);
    const local = +ls.get(K.stand) || 0, server = +r.stand || 0;
    if (r.daten && server > local){
      const before = JSON.stringify(snapshot());
      applySnapshot(r.daten);
      ls.set(K.stand, server);
      lastSnap = JSON.stringify(snapshot());
      if (lastSnap !== before) reloadOnce();
    } else if (local > server) await push();
    setStatus('ok');
  }

  async function push(keepalive){
    clearTimeout(pushTimer); pushPending = false;
    if (!aktiv || !PAGE) return;
    const stand = +ls.get(K.stand) || Date.now();
    setStatus('saving');
    try {
      await api('/state', {method: 'POST', body: {seite: PAGE, daten: snapshot(), stand}, keepalive});
      setStatus('ok');
    } catch (err){
      if (err.status === 409){ await pull().catch(() => setStatus('offline')); }
      else if (err.status === 401) abgelaufen();
      else { pushPending = true; setStatus('offline'); }
    }
  }

  function changed(){
    if (!PAGE) return;
    // Seiten schreiben ihren Stand auch beim Öffnen neu – nur echte Änderungen zählen,
    // sonst würde ein frisch geöffnetes Gerät einen neueren Stand vom Server überschreiben.
    const snap = JSON.stringify(snapshot());
    if (snap === lastSnap) return;
    lastSnap = snap;
    ls.set(K.stand, Date.now());
    if (!aktiv) return;
    pushPending = true;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, 700);
  }

  /* ---------- Protokoll gelöster Aufgaben ---------- */
  function queue(){ try { return JSON.parse(ls.get(K.queue) || '[]'); } catch (e) { return []; } }
  function event(ev){
    if (!aktiv || !PAGE) return;
    const q = queue(); q.push(Object.assign({seite: PAGE}, ev)); ls.set(K.queue, JSON.stringify(q.slice(-500)));
    flush();
  }
  let flushing = false;
  async function flush(keepalive){
    if (!aktiv || flushing) return;
    const q = queue(); if (!q.length) return;
    flushing = true;
    try {
      await api('/events', {method: 'POST', body: {events: q.slice(0, 200)}, keepalive});
      ls.set(K.queue, JSON.stringify(queue().slice(Math.min(q.length, 200))));
    } catch (err){
      if (err.status === 401) abgelaufen(); else setStatus('offline');
    } finally { flushing = false; }
    if (queue().length && !keepalive) setTimeout(flush, 2000);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && aktiv){ if (pushPending) push(true); flush(true); }
  });
  window.addEventListener('online', () => { if (aktiv){ flush(); if (pushPending) push(); else pull().catch(() => {}); } });


  /* ---------- Gast-Fortschritt beim Anmelden übernehmen ---------- */
  // Für jede Übung: Ist das Konto dort noch leer, wird der Stand dieses Geräts hochgeladen,
  // sonst gilt der Stand vom Server.
  async function uebernehmen(){
    for (const p of ALL_PREFIXES){
      const id = p.slice(0, -1), lokal = snapshot(p);
      const st = await api('/state?seite=' + id);
      const leer = !st.daten || !Object.keys(st.daten).length;
      if (leer){
        if (!Object.keys(lokal).length) continue;
        const stand = Date.now();
        await api('/state', {method: 'POST', body: {seite: id, daten: lokal, stand}});
        ls.set('ts-stand-' + id, stand);
      } else {
        applySnapshot(st.daten, p);
        ls.set('ts-stand-' + id, +st.stand || 0);
      }
    }
  }

  /* ---------- Oberfläche: Anmeldefenster + Menü oben rechts ---------- */
  const CSS = `
.ts-ov{position:fixed;inset:0;z-index:2000;background:rgba(20,24,32,.6);backdrop-filter:blur(3px);display:grid;place-items:center;padding:16px}
.ts-box{position:relative;background:var(--panel,#f6f8fb);color:var(--text,#2e3440);border:1px solid var(--border,#cdd3de);border-radius:16px;padding:24px;width:min(420px,100%);box-shadow:0 20px 50px rgba(0,0,0,.3);font:16px/1.5 system-ui,sans-serif}
.ts-box h2{margin:0 0 6px;font-size:21px}
.ts-box p{margin:0 0 14px;color:var(--muted,#5b6578)}
.ts-x{position:absolute;top:10px;right:10px;width:34px;height:34px;border-radius:9px;border:0;background:none;color:var(--muted,#5b6578);font-size:22px;line-height:1;cursor:pointer}
.ts-x:hover{background:var(--panel2,#eceff4);color:var(--text,#2e3440)}
.ts-in{width:100%;box-sizing:border-box;font:700 20px ui-monospace,Consolas,monospace;letter-spacing:.03em;padding:12px 14px;border-radius:10px;border:2px solid var(--slot-border,var(--border,#a7b1c2));background:var(--slot,var(--panel2,#eceff4));color:var(--text,#2e3440);outline:none}
.ts-in:focus{border-color:var(--accent,#5e81ac)}
.ts-btn{margin-top:12px;width:100%;font:600 17px system-ui,sans-serif;padding:12px;border-radius:10px;border:1px solid color-mix(in srgb,var(--accent,#5e81ac) 50%,var(--panel,#f6f8fb));background:color-mix(in srgb,var(--accent,#5e81ac) 22%,var(--panel,#f6f8fb));color:color-mix(in srgb,var(--accent,#5e81ac) 60%,var(--text,#2e3440));cursor:pointer}
.ts-btn:disabled{opacity:.6;cursor:wait}
.ts-err{color:var(--err,#a8434d);min-height:1.4em;margin-top:8px;font-size:14px}
.ts-zurueck{background:none;border:0;padding:0;margin-top:10px;color:var(--muted,#5b6578);text-decoration:underline;cursor:pointer;font-size:14px}
.ts-gast{display:block;width:100%;margin-top:18px;padding:12px;border-radius:10px;border:1px solid var(--border,#cdd3de);background:var(--panel2,#eceff4);color:var(--text,#2e3440);font:600 16px system-ui,sans-serif;cursor:pointer}
.ts-gast small{display:block;font-weight:400;font-size:13px;color:var(--muted,#5b6578)}
.ts-wrap{position:relative}
.ts-badge{display:inline-flex;align-items:center;gap:6px;font:600 13px system-ui,sans-serif;padding:7px 11px;border-radius:999px;border:1px solid var(--border,#cdd3de);background:var(--panel2,#eceff4);color:var(--text,#2e3440);cursor:pointer;white-space:nowrap}
.ts-badge .ts-dot{width:8px;height:8px;border-radius:50%;background:#8a95ab}
.ts-badge.ok .ts-dot{background:var(--then,#a3be8c)}
.ts-badge.saving .ts-dot{background:#ebcb8b}
.ts-badge.offline .ts-dot{background:var(--else,#bf616a)}
.ts-badge.gast{border-color:color-mix(in srgb,#d08770 60%,var(--border,#cdd3de));background:color-mix(in srgb,#d08770 16%,var(--panel,#f6f8fb))}
.ts-badge.gast .ts-dot{background:#d08770}
.ts-dd{display:none;position:absolute;right:0;top:calc(100% + 6px);min-width:240px;z-index:70;background:var(--panel,#f6f8fb);color:var(--text,#2e3440);border:1px solid var(--border,#cdd3de);border-radius:12px;box-shadow:0 14px 30px rgba(0,0,0,.18);padding:6px;font:14px/1.4 system-ui,sans-serif}
.ts-wrap.open .ts-dd{display:block}
.ts-einst{padding:8px 10px;border-bottom:1px solid var(--border,#cdd3de);margin-bottom:4px}
.ts-dd .ts-dw{display:flex;align-items:center;gap:8px;font-weight:600;padding:6px 8px;margin:-6px -8px 0;width:calc(100% + 16px)}
.ts-dw .ts-akt{margin-left:auto;font-weight:400;color:var(--muted,#5b6578);display:flex;align-items:center;gap:6px}
.ts-pfeil{color:var(--muted,#5b6578)}
.ts-dwm{display:none;position:absolute;right:calc(100% + 4px);top:0;min-width:200px;margin:0;padding:6px;list-style:none;background:var(--panel,#f6f8fb);border:1px solid var(--border,#cdd3de);border-radius:12px;box-shadow:0 14px 30px rgba(0,0,0,.18)}
.ts-dwm.auf{display:block}
.ts-dwm li{position:relative}
.ts-dwm .ts-dwm{top:-7px}
.ts-dd .ts-dwm button{display:flex;align-items:center;gap:8px;white-space:nowrap;padding:7px 10px}
.ts-dwm button[aria-checked=true]{font-weight:700}
.ts-dwm button[aria-checked=true]::before{content:"✓";width:12px;color:var(--accent,#5e81ac)}
.ts-dwm button[aria-checked=false]::before{content:"";width:12px}
.ts-dwm .ts-pfeil{margin-left:auto;padding-left:14px}
.ts-dd .ts-dwm button.offen{background:var(--panel2,#eceff4)}
.ts-farbe{width:14px;height:14px;border-radius:4px;border:1px solid rgba(0,0,0,.25);flex:none}
.ts-einst{position:relative}
@media (max-width:760px){.ts-dwm{position:static;box-shadow:none;border:0;border-left:2px solid var(--border,#cdd3de);border-radius:0;margin:4px 0 0 8px;padding:2px 0 2px 6px;min-width:0}.ts-dwm .ts-dwm{margin-left:12px}}
.ts-einst small{display:block;margin-top:4px;color:var(--muted,#5b6578);font-size:12px;line-height:1.35}
.ts-dd .ts-info{padding:8px 10px;color:var(--muted,#5b6578);border-bottom:1px solid var(--border,#cdd3de);margin-bottom:4px}
.ts-dd .ts-info b{color:var(--text,#2e3440)}
.ts-dd a,.ts-dd button{display:block;width:100%;text-align:left;padding:8px 10px;border-radius:8px;border:0;background:none;color:inherit;font:inherit;text-decoration:none;cursor:pointer}
.ts-dd a:hover,.ts-dd button:hover{background:var(--panel2,#eceff4)}
@media (max-width:640px){.ts-badge .ts-lang{display:none}}`;

  function injectCss(){ const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }
  const escH = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

  function setStatus(st){
    const b = menuEl && menuEl.querySelector('.ts-badge');
    if (!b || !aktiv) return;
    b.className = 'ts-badge ' + st;
    const t = {ok: 'Fortschritt gespeichert', saving: 'Wird gespeichert …', offline: 'Keine Verbindung – wird später gespeichert'}[st] || '';
    b.title = t;
    const i = menuEl.querySelector('.ts-status'); if (i) i.textContent = t;
  }

  // Einstellung „Design“ (lib/designs.js, nur für Angemeldete, gilt auf diesem Gerät; nav.js schaltet es ein)
  // Untermenü mit allen Designs; Varianten mit gruppe (z. B. Titelkarte) als weiteres Untermenü mit Farbfeldern
  const DESIGN_HTML = `<div class="ts-einst"><button class="ts-dw" type="button" aria-haspopup="menu" aria-expanded="false">Design <span class="ts-akt">Standard</span><span class="ts-pfeil">›</span></button>
    <ul class="ts-dwm" role="menu" aria-label="Design"></ul>
    <small>Experimentell – nicht alle Übungen sind dafür gebaut. Gilt auf diesem Gerät.</small></div>`;
  const designZu = () => { if (!menuEl) return; menuEl.querySelectorAll('.ts-dwm.auf').forEach(u => u.classList.remove('auf'));
    menuEl.querySelectorAll('.ts-dw,.ts-gruppe').forEach(b => { b.setAttribute('aria-expanded', 'false'); b.classList.remove('offen'); }); };
  function designWahl(){
    const knopf = menuEl && menuEl.querySelector('.ts-dw'); if (!knopf) return;
    const menue = menuEl.querySelector('.ts-einst > .ts-dwm');
    const farbe = d => d.farbe ? `<span class="ts-farbe" style="background:${escH(d.farbe)}"></span>` : '';
    let akt = 'standard'; try { akt = localStorage.getItem('pf-design') || 'standard'; } catch (e) {}
    const fuellen = () => {
      if (!window.Designs) return;
      const L = Designs.liste(), d = L.find(x => x.id === akt) || L[0];
      knopf.querySelector('.ts-akt').innerHTML = farbe(d) + escH(d.name);
      const punkt = (x, text) => `<li role="none"><button type="button" role="menuitemradio" aria-checked="${x.id === akt}" data-design="${escH(x.id)}" title="${escH(x.beschreibung)}">${farbe(x)}${escH(text)}</button></li>`;
      const gesehen = new Set();
      menue.innerHTML = L.map(x => {
        if (!x.gruppe) return punkt(x, x.name);
        if (gesehen.has(x.gruppe)) return ''; gesehen.add(x.gruppe);
        const teile = L.filter(y => y.gruppe === x.gruppe);
        return `<li role="none"><button type="button" class="ts-gruppe" role="menuitem" aria-haspopup="menu" aria-expanded="false" aria-checked="${teile.some(y => y.id === akt)}">${escH(x.gruppe)}<span class="ts-pfeil">›</span></button>`
          + `<ul class="ts-dwm" role="menu" aria-label="${escH(x.gruppe)}">${teile.map(y => punkt(y, y.kurz)).join('')}</ul></li>`;
      }).join('');
    };
    if (window.Designs) fuellen();
    else { const s = document.createElement('script'); s.src = BASE + 'lib/designs.js'; s.onload = fuellen; document.head.appendChild(s); }
    const schmal = () => matchMedia('(max-width:760px)').matches, hover = () => matchMedia('(hover: hover)').matches && !schmal();
    const gruppe = (g, auf) => {
      menue.querySelectorAll('.ts-gruppe').forEach(x => { const an = x === g && auf; x.classList.toggle('offen', an); x.setAttribute('aria-expanded', String(an)); x.nextElementSibling.classList.toggle('auf', an); });
    };
    const oeffne = auf => { menue.classList.toggle('auf', auf); knopf.setAttribute('aria-expanded', String(auf)); if (!auf) gruppe(null, false); };
    knopf.addEventListener('click', e => { e.stopPropagation(); oeffne(!menue.classList.contains('auf')); });
    knopf.addEventListener('mouseenter', () => { if (hover()) oeffne(true); });
    menuEl.querySelector('.ts-einst').addEventListener('mouseleave', () => { if (hover()) oeffne(false); });
    menue.addEventListener('mouseover', e => {
      if (!hover()) return;
      const b = e.target.closest('button'); if (!b) return;
      if (b.classList.contains('ts-gruppe')) gruppe(b, true);
      else if (b.closest('.ts-dwm') === menue) gruppe(null, false);
    });
    menue.addEventListener('click', e => {
      e.stopPropagation();
      const b = e.target.closest('button'); if (!b) return;
      if (b.classList.contains('ts-gruppe')) { gruppe(b, schmal() ? !b.classList.contains('offen') : true); return; }
      const id = b.dataset.design;
      try { if (id === 'standard') localStorage.removeItem('pf-design'); else localStorage.setItem('pf-design', id); } catch (e) {}
      location.reload();
    });
    menuEl.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || !menue.classList.contains('auf')) return;
      e.stopPropagation(); oeffne(false); knopf.focus();
    });
  }
  // Menü oben rechts: angemeldet (Dropdown mit Abmelden) oder Gast (Klick öffnet die Anmeldung)
  function showMenu(){
    if (menuEl) menuEl.remove();
    const host = document.querySelector('.pf-right') || document.querySelector('.hdr-right') || document.querySelector('header') || document.body;
    const L = lehrerSitzung();
    menuEl = document.createElement('div');
    menuEl.className = 'ts-wrap';
    if (aktiv){
      const klasse = ls.get(K.klasse);
      menuEl.innerHTML = `<button class="ts-badge saving" type="button"><span class="ts-dot"></span>👤 <span class="ts-lang">${escH(ls.get(K.anzeige) || ls.get(K.code))}</span></button>
        <div class="ts-dd"><div class="ts-info">Angemeldet als <b>${escH(ls.get(K.anzeige) || ls.get(K.code))}</b>${klasse ? ' (Klasse ' + escH(klasse) + ')' : ''}<br><span class="ts-status"></span></div>
        ${DESIGN_HTML}<button type="button" data-a="ab">Abmelden</button></div>`;
    } else if (L){
      menuEl.innerHTML = `<button class="ts-badge" type="button">👤 <span class="ts-lang">${escH(L.name)}</span></button>
        <div class="ts-dd"><div class="ts-info">Angemeldet als <b>${escH(L.name)}</b> (${L.rolle === 'admin' ? 'Admin' : 'Lehrkraft'})</div>
        <a href="${BASE + CONFIG.verwaltung}">Verwaltung: Klassen und Auswertung</a>
        ${DESIGN_HTML}<button type="button" data-a="ab">Abmelden</button></div>`;
    } else {
      menuEl.innerHTML = `<button class="ts-badge gast" type="button" title="Fortschritt wird nicht gespeichert. Klicken zum Anmelden."><span class="ts-dot"></span>Nicht angemeldet<span class="ts-lang">&nbsp;– Fortschritt wird nicht gespeichert</span></button>`;
    }
    host.insertBefore(menuEl, host.firstChild);
    menuEl.querySelector('.ts-badge').addEventListener('click', () => {
      if (!aktiv && !L){ showLogin(); return; }
      menuEl.classList.toggle('open');
      if (!menuEl.classList.contains('open')) designZu();
    });
    const ab = menuEl.querySelector('[data-a="ab"]');
    if (ab) ab.addEventListener('click', abmelden);
    designWahl();
    document.addEventListener('click', e => { if (menuEl && !menuEl.contains(e.target)) { menuEl.classList.remove('open'); designZu(); } });
  }

  function showLogin(msg){
    if (document.querySelector('.ts-ov')) return;
    const ov = document.createElement('div');
    ov.className = 'ts-ov';
    ov.innerHTML = `<div class="ts-box" role="dialog" aria-modal="true" aria-label="Anmelden">
      <button class="ts-x" type="button" aria-label="Schließen und ohne Anmeldung nutzen" title="Ohne Anmeldung nutzen">×</button>
      <form class="ts-f1" autocomplete="off">
        <h2>Anmelden</h2>
        <p>Gib deinen Zugangscode oder deinen Benutzernamen ein.</p>
        <input class="ts-in" name="kennung" placeholder="Code oder Benutzername" autocapitalize="none" spellcheck="false" aria-label="Code oder Benutzername">
        <button class="ts-btn" type="submit">Weiter</button>
      </form>
      <form class="ts-f2" hidden>
        <h2>Passwort</h2>
        <p>für <b class="ts-wer"></b></p>
        <input class="ts-in" name="passwort" type="password" autocomplete="current-password" aria-label="Passwort">
        <button class="ts-btn" type="submit">Anmelden</button>
        <button class="ts-zurueck" type="button">Anderen Namen eingeben</button>
      </form>
      <div class="ts-err">${msg || ''}</div>
      <button class="ts-gast" type="button">Seite ohne Anmeldung nutzen<small>Dein Fortschritt wird dann nur in diesem Browser gespeichert.</small></button>
    </div>`;
    document.body.appendChild(ov);
    const f1 = ov.querySelector('.ts-f1'), f2 = ov.querySelector('.ts-f2'), err = ov.querySelector('.ts-err');
    const k = f1.kennung, pw = f2.passwort;
    setTimeout(() => k.focus(), 50);

    const gast = () => { ss.set(SS.gast, '1'); ov.remove(); document.removeEventListener('keydown', esc); };
    const esc = e => { if (e.key === 'Escape') gast(); };
    document.addEventListener('keydown', esc);
    ov.querySelector('.ts-x').addEventListener('click', gast);
    ov.querySelector('.ts-gast').addEventListener('click', gast);
    ov.querySelector('.ts-zurueck').addEventListener('click', () => { f2.hidden = true; f1.hidden = false; err.textContent = ''; k.select(); });

    async function senden(btn, body){
      btn.disabled = true; err.textContent = '';
      try {
        const r = await fetch(CONFIG.api + '/login', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)})
          .then(async x => { const j = await x.json().catch(() => ({})); if (!x.ok) throw new Error(x.status === 429 ? 'Zu viele Versuche – bitte kurz warten.' : (j.message || 'Anmeldung fehlgeschlagen.')); return j; });
        if (r.passwort){ f1.hidden = true; f2.hidden = false; ov.querySelector('.ts-wer').textContent = body.kennung; pw.value = ''; pw.focus(); return; }
        if (r.rolle === 'schueler'){
          ls.set(K.code, r.cred); ls.set(K.anzeige, r.anzeige); ls.set(K.klasse, r.klasse || '');
          ss.del(SS.lehrer); ss.del('ts-reload');
          aktiv = true;
          await uebernehmen().catch(() => {});
        } else {
          ss.set(SS.lehrer, JSON.stringify({rolle: r.rolle, token: r.token, name: r.name}));
        }
        location.reload();
      } catch (x){
        err.textContent = x.message || 'Anmeldung fehlgeschlagen.';
        (f2.hidden ? k : pw).select();
      } finally { btn.disabled = false; }
    }
    f1.addEventListener('submit', e => {
      e.preventDefault();
      const v = k.value.trim();
      if (!v){ err.textContent = 'Bitte gib deinen Code oder Benutzernamen ein.'; return; }
      senden(f1.querySelector('.ts-btn'), {kennung: v});
    });
    f2.addEventListener('submit', e => {
      e.preventDefault();
      if (!pw.value){ err.textContent = 'Bitte gib dein Passwort ein.'; return; }
      senden(f2.querySelector('.ts-btn'), {kennung: k.value.trim(), passwort: pw.value});
    });
  }

  async function abmelden(){
    const ohneDesign = () => { try { localStorage.removeItem('pf-design'); } catch (e) {} };   // Design gilt nur für Angemeldete
    if (lehrerSitzung()){ ohneDesign(); ss.del(SS.lehrer); ss.del(SS.gast); location.reload(); return; }
    if (!confirm(`Abmelden?\n\nAngemeldet als ${ls.get(K.anzeige) || ls.get(K.code)}. Dein Fortschritt bleibt auf dem Server gespeichert.`)) return;
    if (pushPending) await push();
    await flush();
    if (queue().length && !confirm('Einige gelöste Aufgaben konnten noch nicht übertragen werden (keine Verbindung). Trotzdem abmelden?')) return;
    ohneDesign(); wipeLocal(); ss.del(SS.gast); ss.del('ts-sichtbar');
    location.reload();
  }
  function abgelaufen(){
    aktiv = false;
    wipeLocal(); ss.del('ts-sichtbar');
    showMenu();
    showLogin('Deine Anmeldung ist nicht mehr gültig. Bitte melde dich neu an.');
  }

  /* ---------- Bedingte Menüpunkte (z. B. Tipp-Aufgabe nur mit aufgegebener Aufgabe) ---------- */
  function zeigeTools(ids){
    // Tool-ids bestehen nur aus a–z, 0–9 und - (katalog.js); andere werden ignoriert
    ids.filter(id => /^[a-z0-9-]+$/.test(id)).forEach(id => document.querySelectorAll(`[data-tool="${id}"]`).forEach(el => el.classList.add('pf-sichtbar')));
  }
  async function sichtbar(){
    try { zeigeTools(JSON.parse(ss.get('ts-sichtbar') || '[]')); } catch (e) {}   // Stand der letzten Seite, ohne Flackern
    try { const r = await api('/sichtbar'); ss.set('ts-sichtbar', JSON.stringify(r.tools || [])); zeigeTools(r.tools || []); } catch (e) {}
  }

  /* ---------- Start ---------- */
  async function start(){
    if (!hosted || window.PF_EINZELDATEI) return;          // Einzeldatei: immer ohne Anmeldung, Fortschritt nur im Browser
    try {
      const h = await fetch('/api/health', {cache: 'no-store'});
      if (!h.ok) return;                                    // kein PocketBase: Seite läuft nur lokal
    } catch (e){ return; }
    injectCss();
    aktiv = !!ls.get(K.code);
    showMenu();
    if (!aktiv){
      if (!lehrerSitzung() && !ss.get(SS.gast)) showLogin();
      return;
    }
    sichtbar();
    try { await pull(); flush(); }
    catch (err){ if (err.status === 401) abgelaufen(); else setStatus('offline'); }
  }

  lastSnap = JSON.stringify(snapshot());   // Stand beim Laden der Seite (vor deren Initialisierung)
  window.TrainerSync = {changed, event, anmelden: () => showLogin(), get aktiv(){ return aktiv; }, get lehrer(){ return lehrerSitzung(); }, abmelden};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
