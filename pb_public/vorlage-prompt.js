/* vorlage-prompt.js – Prompt-Generator im Baukasten: Thema und Aufbau wählen, Prompt für Claude kopieren
 *
 * Öffnet wie der Kontenplan und „Szenario bauen“ ein Fenster über dem Baukasten (Knopf mit data-prompt-bau neben der
 * Umschaltung Editor/JSON in uebung-erstellen.html). Links die Bausteine (Schritt mit Erklärung, Training, Aufgabentypen
 * aus Baukasten.TYPEN; anklicken = in den offenen Schritt, ziehen = auf einen Reiter, den offenen Schritt oder ＋), in der
 * Mitte oben die Schritte als Reiter wie im Editor und darunter der offene Schritt, rechts Thema, Ergebnis-Weg und der fertige Prompt. Der Prompt verweist auf den Skill
 * vibe-learning-seite-erstellen (github.com/nic0nic/vibe-learning-skills); die Antwort (JSON-Block) fügt man in der
 * Ansicht „JSON“ ein. „Gerüst in den Editor“ legt die Struktur stattdessen direkt als Übung mit leeren Aufgaben
 * (Typ.neu()) an und ersetzt dabei den Entwurf; laden muss die Seite setzen: Baukasten.prompt.laden = d => … (wie „Neu“).
 * Stand im Browser: localStorage vorlage-prompt = {bereich, thema, klasse, hinweise, weg, schritte:[{titel, erklaerung,
 *   training: null | {antwort, zeit, endlos}, typen:[typ, …]}]}.
 * Einbinden nach vorlage-typen.js (und vorlage-typen-beta.js); braucht katalog.js. Fenster-Layout: .pg-… in uebung-erstellen.html.
 */
(function () {
  'use strict';
  const B = window.Baukasten;
  const SKILL = 'https://github.com/nic0nic/vibe-learning-skills';
  const SKILL_ORDNER = SKILL + '/tree/main/vibe-learning-seite-erstellen';
  const EDITOR = 'https://vl.nimals.de/IT/tools/uebung-erstellen.html';
  const KEY = 'vorlage-prompt';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const WEGE = [
    ['editor', 'JSON für den Editor', 'Weg A: genau ein JSON-Block, den ich auf ' + EDITOR + ' in der Ansicht „JSON“ einfüge.'],
    ['html', 'HTML-Datei', 'Weg C: eine fertige HTML-Datei (läuft per Doppelklick), zusätzlich das Aufgaben-JSON als .json-Datei.'],
    ['bycs', 'ByCS-Paket (ZIP)', 'Weg C: ein ByCS-Paket (SCORM-ZIP, Aktivität „Lernpaket“), zusätzlich das Aufgaben-JSON als .json-Datei.']
  ];

  const leer = () => ({bereich: '', thema: '', klasse: '', hinweise: '', weg: 'editor', schritte: []});
  function laden() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    s = Object.assign(leer(), s && typeof s === 'object' ? s : {});
    if (!Array.isArray(s.schritte)) s.schritte = [];
    if (!s.bereich) try { s.bereich = (JSON.parse(localStorage.getItem('vorlage-entwurf') || '{}') || {}).bereich || ''; } catch (e) { /* egal */ }
    if (!s.thema) try { s.thema = (B.daten() || {}).titel || ''; } catch (e) { /* egal */ }
    return s;
  }
  const merken = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* privates Fenster: dann eben nicht */ } };

  function bereiche() {
    const K = window.KATALOG, l = [];
    if (K && K.gruppen) K.gruppen.forEach(g => g.bereiche.forEach(b => l.push({id: b.id, pfad: b.pfad, name: g.titel + ' › ' + b.titel,
      tools: (b.tools || []).map(t => t.titel)})));
    return l;
  }
  const typName = k => (B.TYPEN[k] || {}).name || k;
  const typSym = k => (B.TYPEN[k] || {}).symbol || '•';
  const neuerSchritt = (training) => ({titel: '', erklaerung: !training, training: training ? {antwort: 'eingabe', zeit: true, endlos: true} : null, typen: []});

  /* ---------- Prompt ---------- */
  function prompt(s) {
    const b = bereiche().find(x => x.id === s.bereich), z = [];
    z.push('Erstelle eine Übung für die Lernplattform vibe learning (https://vl.nimals.de).');
    z.push(`Nutze dafür den Skill „vibe-learning-seite-erstellen“ aus ${SKILL} (Ordner: ${SKILL_ORDNER}). `
      + 'Ist der Skill nicht installiert, lies dort SKILL.md und references/typen.md und halte dich genau an das Aufgaben-JSON und die Prüfregeln.');
    z.push('');
    if (b) z.push(`Fach und Bereich: ${b.name} (Ordner ${b.pfad})`);
    if (s.thema.trim()) z.push(`Thema: ${s.thema.trim()}`);
    if (s.klasse.trim()) z.push(`Klasse / Niveau: ${s.klasse.trim()}`);
    if (!b && !s.thema.trim()) z.push('Thema: bitte bei mir nachfragen.');
    z.push('');
    const exp = new Set();
    if (!s.schritte.length) z.push('Aufbau: wähle selbst einen sinnvollen Aufbau (Erklärung, Übungen, evtl. Training).');
    else {
      z.push('Aufbau (Schritte in dieser Reihenfolge; ein Schritt ist ein Knopf oben auf der Seite):');
      s.schritte.forEach((x, i) => {
        const t = x.titel.trim() ? `„${x.titel.trim()}“` : '(Teilthema wählst du passend)';
        if (x.training) {
          const tr = x.training;
          z.push(`${i + 1}. ${t} – Training: Aufgaben nacheinander, Antwort ${tr.antwort === 'mc' ? 'auswählen' : 'eintippen'}, `
            + `${tr.zeit ? 'auf Zeit' : 'ohne Zeit'}, ${tr.endlos ? 'endlos (Serie und Bestleistung)' : 'feste Anzahl (z. B. 20)'}. Aufgaben als Szenarien mit Zufallswerten oder als Wörterbuch.`);
          return;
        }
        const teile = [];
        if (x.erklaerung) teile.push('kurze Erklärung (html)');
        const gruppen = [];   // gleiche Typen hintereinander zusammenfassen: „2× Multiple Choice (mc)“
        x.typen.forEach(k => { const g = gruppen[gruppen.length - 1]; if (g && g.k === k) g.n++; else gruppen.push({k, n: 1}); if ((B.TYPEN[k] || {}).experimentell) exp.add(k); });
        if (gruppen.length) teile.push('Aufgaben: ' + gruppen.map(g => `${g.n > 1 ? g.n + '× ' : ''}${typName(g.k)} (${g.k})`).join(', '));
        else if (!x.erklaerung) teile.push('Aufgaben: passende Typen wählst du');
        z.push(`${i + 1}. ${t} – ${teile.join('; ')}`);
      });
      z.push('Halte dich an diese Typen und Reihenfolge. Wo kein Teilthema steht, wähle es passend zum Thema.');
    }
    if (exp.size) z.push(`Experimentelle Typen (${[...exp].join(', ')}): Format steht am Ende von references/typen.md.`);
    if (s.hinweise.trim()) { z.push(''); z.push('Weitere Wünsche: ' + s.hinweise.trim()); }
    z.push('');
    z.push('Ergebnis: ' + (WEGE.find(w => w[0] === s.weg) || WEGE[0])[2]);
    z.push('Prüfe das JSON vor der Ausgabe und halte den Text knapp.');
    return z.join('\n');
  }

  /* ---------- Gerüst: Struktur als Aufgaben-JSON mit leeren Aufgaben der gewählten Typen ---------- */
  function geruest(s) {
    const schritte = s.schritte.map((x, i) => {
      const titel = x.titel.trim() || (x.training ? 'Training' : 'Schritt ' + (i + 1));
      if (x.training && B.training) {
        const t = B.training.neu(), o = x.training;
        t.antwort = o.antwort === 'mc' ? 'mc' : 'eingabe';
        if (!o.zeit) delete t.zeit;
        if (o.endlos) delete t.anzahl; else t.anzahl = t.anzahl || 20;
        return {kurz: 'Training', titel, html: '<p>Löse so viele Aufgaben wie möglich.</p>', training: t};
      }
      const y = {titel};
      if (x.erklaerung) y.html = '<p>Erklärtext</p>';
      y.aufgaben = x.typen.filter(k => B.TYPEN[k]).map(k => B.TYPEN[k].neu());
      return y;
    });
    return {titel: s.thema.trim(), kurztext: '', schritte};
  }

  /* ---------- Fenster ---------- */
  function oeffnen() {
    const S = laden(), BER = bereiche();
    let sel = S.schritte.length ? 0 : -1, zug = null;
    const d = document.createElement('dialog'); d.className = 'kp-dialog sz-dialog pg-dialog';
    const rang = k => B.TYPEN[k].experimentell ? 2 : k === 'kombi' ? 1 : 0;
    const namen = Object.keys(B.TYPEN).sort((x, y) => rang(x) - rang(y));
    const leiste = '<div class="leiste-trenn">Schritte</div>'
      + '<button type="button" class="teil sz-teil" data-pg-neu="schritt"><span class="sym">📄</span><span>Schritt / Erklärung</span></button>'
      + '<button type="button" class="teil sz-teil" data-pg-neu="training"><span class="sym">⏱</span><span>Training (Zeit / endlos)</span></button>'
      + namen.map((k, i) => (!i || rang(namen[i - 1]) !== rang(k) ? `<div class="leiste-trenn">${['Aufgaben', 'Kombinieren', 'Experimentell (β)'][rang(k)]}</div>` : '')
        + `<button type="button" class="teil sz-teil" data-pg-neu="${esc(k)}"><span class="sym">${typSym(k)}</span><span>${esc(typName(k))}</span></button>`).join('')
      + '<p class="hinweis">Anklicken: kommt in den offenen Schritt. Ziehen: auf einen Reiter oben, in den offenen Schritt oder auf ＋ (neuer Schritt).</p>';
    d.innerHTML = `<div class="kp-oben"><div><b>Prompt erstellen</b> <span class="kp-titel">für Claude mit dem Skill vibe-learning-seite-erstellen</span></div>
        <span class="hinweis sz-hilfe">Thema wählen, Aufbau aus Bausteinen legen, Prompt kopieren und in Claude einfügen. Den JSON-Block aus der Antwort fügst du hier in der Ansicht „JSON“ ein.</span>
        <button type="button" class="btn pg-geruest" title="Die Struktur direkt im Editor anlegen (leere Aufgaben zum selbst Ausfüllen)">Gerüst in den Editor</button><button type="button" class="btn pg-kopieren">Prompt kopieren</button><button type="button" class="btn haupt sz-fertig">Fertig</button></div>
      <div class="sz-arbeit pg-arbeit"><div class="sz-leiste">${leiste}</div>
        <div class="pg-mitte"></div>
        <div class="sz-eig pg-eig">
          <h3>Thema</h3>
          <label class="klein" for="pgBereich">Fach, Jahrgangsstufe und Bereich</label>
          <select class="feld" id="pgBereich" data-pg="bereich"><option value="">– frei –</option>${BER.map(b => `<option value="${esc(b.id)}"${b.id === S.bereich ? ' selected' : ''}>${esc(b.name)}</option>`).join('')}</select>
          <label class="klein" for="pgThema">Thema</label>
          <input class="feld" id="pgThema" data-pg="thema" list="pgThemen" value="${esc(S.thema)}" placeholder="z. B. Zinsrechnung, WENN-Funktion …"><datalist id="pgThemen"></datalist>
          <label class="klein" for="pgKlasse">Klasse / Niveau (optional)</label>
          <input class="feld" id="pgKlasse" data-pg="klasse" value="${esc(S.klasse)}" placeholder="z. B. 9b, Grundlagen, schwächere Klasse">
          <label class="klein" for="pgHinweise">Weitere Wünsche (optional)</label>
          <textarea class="feld" id="pgHinweise" data-pg="hinweise" rows="3" placeholder="z. B. Beispiele aus dem Alltag, Zahlen bis 1000, Vorwissen …">${esc(S.hinweise)}</textarea>
          <label class="klein">Ergebnis</label>
          <div class="pg-wege">${WEGE.map(([k, t]) => `<label><input type="radio" name="pgWeg" value="${k}"${S.weg === k ? ' checked' : ''}> ${t}</label>`).join('')}</div>
          <h3>Prompt</h3>
          <textarea class="feld pg-prompt" readonly rows="12" aria-label="Prompt"></textarea>
          <div class="reihe wrap"><button type="button" class="btn haupt pg-kopieren">Prompt kopieren</button><a class="btn" href="${SKILL_ORDNER}" target="_blank" rel="noopener">Skill auf GitHub</a></div>
          <p class="hinweis pg-meldung"></p>
        </div></div>`;
    document.body.appendChild(d);
    const mitte = d.querySelector('.pg-mitte'), aus = d.querySelector('.pg-prompt'), msg = d.querySelector('.pg-meldung');

    function themen() {
      const b = BER.find(x => x.id === S.bereich);
      d.querySelector('#pgThemen').innerHTML = (b ? b.tools : []).map(t => `<option value="${esc(t)}">`).join('');
    }
    const kurzTitel = t => t.length > 22 ? t.slice(0, 21) + '…' : t;
    const reiterHtml = () => S.schritte.map((x, i) => `<button type="button" class="reiter pg-reiter${i === sel ? ' on' : ''}" data-i="${i}" title="${esc((x.titel || 'Schritt ' + (i + 1)) + (x.typen.length ? ': ' + x.typen.map(typName).join(', ') : ''))}">${x.training ? '⏱ ' : ''}${i + 1}${x.titel.trim() ? ' ' + esc(kurzTitel(x.titel.trim())) : ''}${!x.training && x.typen.length ? ` <span class="pg-anzahl">${x.typen.length}</span>` : ''}</button>`).join('')
        + '<button type="button" class="reiter plus pg-reiter" data-pg-plus title="Neuer Schritt">＋</button>';
    function zeichne() {   // oben die Schritte als Reiter (wie im Editor), darunter der markierte Schritt
      const x = S.schritte[sel], i = sel;
      const inhalt = !x ? '<div class="pg-leer" data-pg-flaeche>Noch kein Aufbau: Dann wählt Claude ihn selbst.<br>Lege links Schritte und Aufgabentypen an (anklicken oder hierher ziehen), wenn du ihn vorgeben willst.</div>'
        : `<div class="pg-schritt${x.training ? ' training' : ''}" data-i="${i}" data-pg-flaeche>
          <div class="pg-skopf"><span class="pg-nr">${i + 1}</span><span class="sym">${x.training ? '⏱' : '📄'}</span>
            <input class="feld" data-pg-titel="${i}" value="${esc(x.titel)}" placeholder="${x.training ? 'Training zu …' : 'Teilthema (leer = Claude wählt)'}" aria-label="Teilthema von Schritt ${i + 1}">
            <button type="button" class="btn klein" data-pg-hoch="${i}" title="Reiter nach links"${i ? '' : ' disabled'}>←</button>
            <button type="button" class="btn klein" data-pg-runter="${i}" title="Reiter nach rechts"${i < S.schritte.length - 1 ? '' : ' disabled'}>→</button>
            <button type="button" class="btn klein x" data-pg-weg="${i}" title="Schritt entfernen">✕</button></div>
          ${x.training ? `<div class="pg-optionen">
              <label><input type="radio" name="pgA${i}" data-pg-tr="${i}" data-k="antwort" value="eingabe"${x.training.antwort !== 'mc' ? ' checked' : ''}> eintippen</label>
              <label><input type="radio" name="pgA${i}" data-pg-tr="${i}" data-k="antwort" value="mc"${x.training.antwort === 'mc' ? ' checked' : ''}> auswählen</label>
              <label><input type="checkbox" data-pg-tr="${i}" data-k="zeit"${x.training.zeit ? ' checked' : ''}> auf Zeit</label>
              <label><input type="checkbox" data-pg-tr="${i}" data-k="endlos"${x.training.endlos ? ' checked' : ''}> endlos</label></div>
            <p class="hinweis">Aufgabentypen, die du hierher legst, kommen in einen neuen Schritt dahinter.</p>`
          : `<div class="pg-optionen"><label><input type="checkbox" data-pg-erkl="${i}"${x.erklaerung ? ' checked' : ''}> mit Erklärung</label></div>
            <div class="pg-chips">${x.typen.map((k, j) => `<span class="pg-chip${(B.TYPEN[k] || {}).experimentell ? ' exp' : ''}"><span class="sym">${typSym(k)}</span>${esc(typName(k))}<button type="button" data-pg-chipweg="${i}:${j}" aria-label="${esc(typName(k))} entfernen">×</button></span>`).join('')}
              <span class="pg-zone">＋ Aufgabentyp links anklicken oder hierher ziehen</span></div>`}
        </div>`;
      mitte.innerHTML = `<div class="reiterleiste pg-reiterleiste">${reiterHtml()}</div><div class="pg-flaeche">${inhalt}</div>`;
      aktualisiere();
    }
    function aktualisiere() { aus.value = prompt(S); merken(S); }
    function dazu(was, i) {   // was = 'schritt' | 'training' | Typ; i = Zielschritt (undefined = markierter, -1 = neuer am Ende)
      if (was === 'schritt' || was === 'training') {
        const pos = i === -1 || sel < 0 ? S.schritte.length : sel + 1;
        S.schritte.splice(pos, 0, neuerSchritt(was === 'training')); sel = pos; return zeichne();
      }
      let z = i === undefined ? sel : i;
      if (z < 0 || z >= S.schritte.length || S.schritte[z].training) {   // kein passender Schritt: neuer ohne Erklärung
        z = z >= 0 && z < S.schritte.length ? z + 1 : S.schritte.length;
        S.schritte.splice(z, 0, Object.assign(neuerSchritt(false), {erklaerung: false}));
      }
      S.schritte[z].typen.push(was); sel = z; zeichne();
    }

    d.addEventListener('click', e => {
      const t = e.target, q = s => t.closest(s);
      if (q('.sz-fertig') || t === d) return d.close();
      if (q('.pg-kopieren')) return kopieren();
      if (q('.pg-geruest')) return uebernehmen();
      if (zug && zug.bewegt) return;
      if (q('[data-pg-plus]')) return dazu('schritt', -1);
      if (q('[data-pg-weg]')) { const i = +q('[data-pg-weg]').dataset.pgWeg; S.schritte.splice(i, 1); sel = Math.min(sel, S.schritte.length - 1); return zeichne(); }
      if (q('[data-pg-hoch]') || q('[data-pg-runter]')) {
        const hoch = !!q('[data-pg-hoch]'), i = +(hoch ? q('[data-pg-hoch]').dataset.pgHoch : q('[data-pg-runter]').dataset.pgRunter), j = hoch ? i - 1 : i + 1;
        if (j < 0 || j >= S.schritte.length) return;
        [S.schritte[i], S.schritte[j]] = [S.schritte[j], S.schritte[i]]; sel = j; return zeichne();
      }
      if (q('[data-pg-chipweg]')) { const [i, j] = q('[data-pg-chipweg]').dataset.pgChipweg.split(':').map(Number); S.schritte[i].typen.splice(j, 1); sel = i; return zeichne(); }
      const k = q('.pg-reiter[data-i]');
      if (k && +k.dataset.i !== sel) { sel = +k.dataset.i; zeichne(); const f = mitte.querySelector('[data-pg-titel]'); if (f && !f.value) f.focus(); }
    });
    d.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.pg) { S[t.dataset.pg] = t.value; if (t.dataset.pg === 'bereich') themen(); return aktualisiere(); }
      if (t.dataset.pgTitel != null) {   // Reiter-Beschriftung mitziehen, ohne das Feld neu zu zeichnen
        S.schritte[+t.dataset.pgTitel].titel = t.value; aktualisiere();
        mitte.querySelector('.pg-reiterleiste').innerHTML = reiterHtml(); return;
      }
    });
    d.addEventListener('change', e => {
      const t = e.target;
      if (t.name === 'pgWeg') { S.weg = t.value; return aktualisiere(); }
      if (t.dataset.pgErkl != null) { S.schritte[+t.dataset.pgErkl].erklaerung = t.checked; return aktualisiere(); }
      if (t.dataset.pgTr != null) { const tr = S.schritte[+t.dataset.pgTr].training; tr[t.dataset.k] = t.type === 'radio' ? t.value : t.checked; return aktualisiere(); }
    });
    // Ziehen: Baustein → Schritt (oder freie Fläche = neuer Schritt am Ende)
    d.addEventListener('pointerdown', e => {
      const teil = e.button > 0 ? null : e.target.closest('[data-pg-neu]');
      if (teil) zug = {was: teil.dataset.pgNeu, el: teil, x: e.clientX, y: e.clientY, bewegt: false};
    });
    const ziel = (x, y) => { const z = document.elementFromPoint(x, y); return z && d.contains(z) ? z : null; };
    d.addEventListener('pointermove', e => {
      if (!zug) return;
      if (!zug.bewegt && Math.hypot(e.clientX - zug.x, e.clientY - zug.y) < 6) return;
      zug.bewegt = true; e.preventDefault();
      mitte.querySelectorAll('.ziel').forEach(k => k.classList.remove('ziel'));
      const z = ziel(e.clientX, e.clientY), k = z && (z.closest('.pg-reiter') || z.closest('.pg-flaeche'));
      if (k) k.classList.add('ziel');
      if (!zug.geist) { zug.geist = zug.el.cloneNode(true); zug.geist.classList.add('sz-geist'); d.appendChild(zug.geist); }
      zug.geist.style.left = (e.clientX + 8) + 'px'; zug.geist.style.top = (e.clientY + 8) + 'px';
    });
    d.addEventListener('pointerup', e => {
      const g = zug; if (!g) return;
      setTimeout(() => { zug = null; }, 0);   // der Klick danach soll nichts auslösen
      if (g.geist) g.geist.remove();
      mitte.querySelectorAll('.ziel').forEach(k => k.classList.remove('ziel'));
      if (!g.bewegt) return dazu(g.was);
      const z = ziel(e.clientX, e.clientY); if (!z) return;
      const plus = z.closest('[data-pg-plus]'), tab = z.closest('.pg-reiter[data-i]');
      if (plus) return dazu(g.was, -1);   // auf ＋: neuer Schritt am Ende
      if (tab) { const i = +tab.dataset.i; if (g.was === 'schritt' || g.was === 'training') { sel = i; return dazu(g.was); } return dazu(g.was, i); }
      if (z.closest('.pg-flaeche')) dazu(g.was);   // auf den offenen Schritt
    });
    d.addEventListener('pointercancel', () => { if (zug && zug.geist) zug.geist.remove(); zug = null; });

    function uebernehmen() {
      if (!S.schritte.length) { msg.textContent = 'Lege zuerst links Schritte und Aufgabentypen an.'; return; }
      const alt = B.daten() || {}, voll = (alt.schritte || []).some(x => x.html || x.training || (x.aufgaben || []).length);
      if (voll && !confirm('Das Gerüst ersetzt die Übung im Editor. Der jetzige Stand geht verloren (vorher „Speichern“). Weiter?')) return;
      if (typeof B.prompt.laden !== 'function') { msg.textContent = 'Übernehmen geht auf dieser Seite nicht.'; return; }
      B.prompt.laden(geruest(S)); d.close();
    }
    async function kopieren() {
      try { await navigator.clipboard.writeText(aus.value); msg.textContent = '✓ Kopiert. In claude.ai (mit dem Skill) einfügen, den JSON-Block aus der Antwort hier unter „JSON“ einfügen.'; }
      catch (e) { aus.focus(); aus.select(); msg.textContent = 'Kopieren hat nicht geklappt – der Prompt ist markiert, kopiere ihn mit Strg+C.'; }
    }

    d.addEventListener('close', () => d.remove());
    themen(); zeichne(); d.showModal();
  }

  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-prompt-bau]')) oeffnen(); });
  B.prompt = {oeffnen, text: prompt, geruest, laden: null};
})();
