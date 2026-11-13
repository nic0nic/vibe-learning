/* vorlage-typen.js – Formulare der Aufgabentypen für den Baukasten (vorlage-editor.js)
 *
 * Je Typ aus lib/aufgaben.js: name, symbol, neu() (Beispielaufgabe), kurz(a) (Zusammenfassung auf der Karte),
 * form(a, H) (Formular rechts, Helfer H: Kopfkommentar von vorlage-editor.js), tun (Knöpfe), verschiebe (optional).
 * Neuer Aufgabentyp in lib/aufgaben.js → hier ein Formular ergänzen (sonst: nur im JSON-Modus bearbeitbar).
 * varianten: weitere Bausteine desselben Typs in der Leiste (z. B. Buchungssatz mit Beträgen zum Ziehen, Jgst. 7).
 */
(function () {
  'use strict';
  const B = window.Baukasten;
  const weg = (tun, d) => `<button type="button" class="btn klein x" data-tun="${tun}"${Object.entries(d).map(([k, v]) => ` data-${k}="${v}"`).join('')} title="Entfernen">✕</button>`;
  const plus = (tun, text, d) => `<button type="button" class="btn klein plus" data-tun="${tun}"${Object.entries(d || {}).map(([k, v]) => ` data-${k}="${v}"`).join('')}>＋ ${text}</button>`;
  const n = (z, eins, mehr) => `${z} ${z === 1 ? eins : mehr}`;
  // Index-Umrechnung beim Verschieben/Löschen in Listen, auf die andere Felder per Index zeigen
  const verschiebeIndex = (x, von, nach) => x === von ? (nach > von ? nach - 1 : nach) : (x > von && x < nach ? x - 1 : x < von && x >= nach ? x + 1 : x);

  /* ---------- Multiple Choice ---------- */
  B.typ('mc', {
    name: 'Multiple Choice', symbol: '☑',
    neu: () => ({typ: 'mc', frage: 'Frage', options: ['richtige Antwort', 'falsche Antwort'], correct: [0]}),
    kurz: a => `${n(a.options.length, 'Antwort', 'Antworten')}, ${(a.correct || []).length} richtig`,
    form(a, H) {
      const rows = a.options.map((o, i) => {
        const r = (a.correct || []).includes(i);
        // html:true → Antworten mit Formatierung (Bruch …), sonst reiner Text wie bisher
        const feld = a.html ? H.rt(`options.${i}`, '', {klein: true, knoepfe: 'kurz', pflicht: true, ph: 'Antwort'}) : H.feld(`options.${i}`, '', {pflicht: true, ph: 'Antwort'});
        return H.zeile('options', i, `<div class="spalte">
          <div class="reihe"><label class="hk" title="richtige Antwort"><input type="checkbox" data-tun="richtig" data-i="${i}"${r ? ' checked' : ''}> richtig</label>${a.html ? `<div class="spalte">${feld}</div>` : feld}${weg('weg', {i})}</div>
          ${r ? '' : H.feld(`why.${i}`, '', {ph: 'Warum falsch? (Erklärung, optional)'})}</div>`);
      }).join('');
      return `<label class="hk" title="Antworten mit Fett, Kursiv oder Bruch (Formel) gestalten"><input type="checkbox" data-tun="html"${a.html ? ' checked' : ''}> Antworten mit Formatierung (z. B. Brüche)</label>
        <label class="klein">Antworten (Häkchen = richtig, ⠿ ziehen zum Sortieren)</label>${rows}${plus('plus', 'Antwort')}
        ${H.feld('mischen', 'Reihenfolge behalten (nicht mischen)', {art: 'nein'})}
        ${(a.correct || []).length === 1 ? H.feld('sofort', 'Erst mit Knopf „Prüfen“ prüfen', {art: 'nein'}) : ''}
        ${H.feld('after', 'Zusatz nach richtiger Antwort (optional)')}`;
    },
    tun: {
      richtig(a, d) { const i = +d.i; a.correct = a.correct || []; a.correct = a.correct.includes(i) ? a.correct.filter(x => x !== i) : [...a.correct, i].sort((x, y) => x - y); if (a.why) delete a.why[i]; },
      plus(a) { a.options.push(''); },
      html(a, d, H) {   // Haken „Formatierung“: aus → Antworten zu reinem Text (Bruch → Zähler/Nenner)
        if (!a.html) { a.html = true; a.options = a.options.map(o => H.esc(o == null ? '' : o)); return; }   // „A1<5“ bleibt Text
        delete a.html;
        a.options = a.options.map(o => H.text(String(o || '').replace(/<span class="bruch"><span>([\s\S]*?)<\/span><span>([\s\S]*?)<\/span><\/span>/g, '$1/$2')));
      },
      weg(a, d) {
        const i = +d.i; a.options.splice(i, 1);
        a.correct = (a.correct || []).filter(x => x !== i).map(x => x > i ? x - 1 : x);
        if (a.why) { const w = {}; Object.keys(a.why).forEach(k => { if (+k < i) w[k] = a.why[k]; else if (+k > i) w[+k - 1] = a.why[k]; }); a.why = w; }
      }
    },
    verschiebe(a, liste, von, nach) {
      if (liste !== 'options') return false;
      const x = a.options.splice(von, 1)[0]; a.options.splice(nach > von ? nach - 1 : nach, 0, x);
      a.correct = (a.correct || []).map(i => verschiebeIndex(i, von, nach)).sort((p, q) => p - q);
      if (a.why) { const w = {}; Object.keys(a.why).forEach(k => { w[verschiebeIndex(+k, von, nach)] = a.why[k]; }); a.why = w; }
      return true;
    }
  });

  /* ---------- Zahlen ---------- */
  B.typ('zahlen', {
    name: 'Zahlen eingeben', symbol: '🔢',
    neu: () => ({typ: 'zahlen', frage: 'Berechne.', felder: [{t: 'Ergebnis', l: 0, e: '€'}]}),
    kurz: a => a.felder.map(f => `${String(f.t || '').replace(/<[^>]+>/g, '')} = ${f.l}${f.e ? ' ' + f.e : ''}`).join(' · ').slice(0, 140),
    form(a, H) {
      return `<label class="klein">Eingabefelder</label>` + a.felder.map((f, i) => H.zeile('felder', i, `<div class="spalte">
          <div class="reihe">${H.feld(`felder.${i}.t`, '', {pflicht: true, ph: 'Text vor dem Feld'})}${weg('weg', {i})}</div>
          <div class="reihe">${H.feld(`felder.${i}.l`, '', {art: 'zahl', pflicht: true, ph: 'Lösung', titel: 'Lösung'})}${H.feld(`felder.${i}.e`, '', {ph: 'Einheit'})}${H.feld(`felder.${i}.tol`, '', {art: 'zahl', ph: 'Toleranz', titel: 'Toleranz (Standard 0,005)'})}</div>
          ${H.feld(`felder.${i}.h`, '', {ph: 'Hinweis bei falscher Eingabe (optional)'})}</div>`)).join('')
        + plus('plus', 'Feld') + H.feld('knopf', 'Beschriftung des Knopfs', {ph: 'Prüfen'});
    },
    tun: {plus(a) { a.felder.push({t: '', l: 0}); }, weg(a, d) { a.felder.splice(+d.i, 1); }}
  });

  /* ---------- Lückentext ---------- */
  B.typ('luecken', {
    name: 'Lückentext', symbol: '⬚',
    neu: () => ({typ: 'luecken', frage: 'Vervollständige den Text.', text: 'Zinsen und Tilgung zusammen heißen [[Schuldendienst|Disagio|Skonto]].'}),
    kurz: a => `${n((String(a.text).match(/\[\[/g) || []).length, 'Lücke', 'Lücken')}, ${a.ziehen ? 'Wortbank zum Ziehen' : 'Auswahllisten'}`,
    form(a, H) {
      return `<label class="klein">Text mit Lücken</label>${H.lt('text')}
        <label class="klein">Schüler füllen die Lücken mit …</label>
        <div class="seg">${H.knopf('modus', 'Auswahllisten', {m: ''}).replace('btn klein', 'btn klein' + (a.ziehen ? '' : ' on'))}${H.knopf('modus', 'Wortbank (ziehen)', {m: '1'}).replace('btn klein', 'btn klein' + (a.ziehen ? ' on' : ''))}</div>
        ${a.ziehen ? `<p class="hinweis">Die Wortbank enthält die richtigen Wörter und die falschen Antworten aller Lücken.</p>${H.feld('extra', 'Weitere Ablenker für die Wortbank (mit Komma trennen)', {art: 'liste'})}`
          : '<p class="hinweis">Jede Lücke braucht mindestens eine falsche Antwort (Lücke anklicken).</p>'}`;
    },
    tun: {modus(a, d) { if (d.m) a.ziehen = true; else { delete a.ziehen; delete a.extra; } }}
  });

  /* ---------- Zuordnen ---------- */
  B.typ('zuordnen', {
    name: 'Zuordnen', symbol: '🗂',
    neu: () => ({typ: 'zuordnen', frage: 'Ordne zu.', felder: [['a', 'Feld A'], ['b', 'Feld B']], karten: [{t: 'Karte 1', z: 'a'}, {t: 'Karte 2', z: 'b'}]}),
    kurz: a => `${n(a.felder.length, 'Feld', 'Felder')}: ${a.felder.map(f => f[1]).join(', ')} · ${n(a.karten.length, 'Karte', 'Karten')}`.slice(0, 160),
    form(a, H) {
      const ids = a.felder.map(f => f[0]);
      const karte = i => `<div class="zkarte"><span class="griff" data-zieh="karte" data-i="${i}" title="In ein anderes Feld ziehen">⠿</span>${H.feld(`karten.${i}.t`, '', {pflicht: true, ph: 'Text der Karte'})}${weg('kweg', {i})}</div>`;
      const spalte = (f, j) => `<div class="zspalte" data-ziel="zspalte" data-f="${H.esc(f[0])}">
          <div class="reihe zkopf">${H.feld(`felder.${j}.1`, '', {pflicht: true, ph: 'Titel des Feldes'})}${a.felder.length > 2 ? weg('fweg', {j}) : ''}</div>
          ${a.karten.map((k, i) => k.z === f[0] ? karte(i) : '').join('')}${plus('kplus', 'Karte', {f: H.esc(f[0])})}</div>`;
      const ohne = a.karten.map((k, i) => ids.includes(k.z) ? '' : karte(i)).join('');
      return `<label class="klein">Felder mit ihren Karten (⠿ ziehen, um eine Karte einem anderen Feld zuzuordnen)</label>
        <div class="zspalten">${a.felder.map(spalte).join('')}</div>${plus('fplus', 'Feld')}
        ${ohne ? `<div class="zspalte ohne" data-ziel="zspalte" data-f=""><b>Noch keinem Feld zugeordnet</b>${ohne}</div>` : ''}`;
    },
    tun: {
      kplus(a, d) { a.karten.push({t: '', z: d.f}); },
      kweg(a, d) { a.karten.splice(+d.i, 1); },
      fplus(a) { let k = a.felder.length + 1; while (a.felder.some(f => f[0] === 'f' + k)) k++; a.felder.push(['f' + k, 'Feld ' + (a.felder.length + 1)]); },
      fweg(a, d) {
        const f = a.felder[+d.j], anz = a.karten.filter(k => k.z === f[0]).length;
        if (anz && !confirm(`Feld „${f[1]}“ mit ${anz} Karte(n) löschen?`)) return;
        a.felder.splice(+d.j, 1); a.karten = a.karten.filter(k => k.z !== f[0]);
      }
    }
  });

  /* ---------- Freitext ---------- */
  B.typ('freitext', {
    name: 'Begriffe eintippen', symbol: '✎',
    neu: () => ({typ: 'freitext', frage: 'Nenne zwei Beispiele.', felder: ['1. Beispiel', '2. Beispiel'], antworten: [['Begriff A'], ['Begriff B', 'andere Schreibweise']]}),
    kurz: a => `${n(a.felder.length, 'Feld', 'Felder')}, ${n(a.antworten.length, 'mögliche Antwort', 'mögliche Antworten')}`,
    form(a, H) {
      return `<label class="klein">Eingabefelder (Beschriftung)</label>${a.felder.map((f, i) => H.zeile('felder', i, `<div class="reihe">${H.feld(`felder.${i}`, '', {pflicht: true})}${weg('fweg', {i})}</div>`)).join('')}${plus('fplus', 'Feld')}
        <label class="klein">Mögliche Antworten – je Zeile ein Begriff, Schreibweisen mit Komma (jedes Feld braucht einen anderen Begriff)</label>
        ${a.antworten.map((x, i) => H.zeile('antworten', i, `<div class="reihe">${H.feld(`antworten.${i}`, '', {art: 'liste', pflicht: true, ph: 'Begriff, andere Schreibweise'})}${weg('aweg', {i})}</div>`)).join('')}${plus('aplus', 'Antwort')}
        <label class="hk"><input type="checkbox" data-tun="tipp"${a.tippfehler === 'ok' ? ' checked' : ''}> Tippfehler zählen als richtig</label>`;
    },
    tun: {
      fplus(a) { a.felder.push(''); }, fweg(a, d) { a.felder.splice(+d.i, 1); },
      aplus(a) { a.antworten.push([]); }, aweg(a, d) { a.antworten.splice(+d.i, 1); },
      tipp(a) { if (a.tippfehler === 'ok') delete a.tippfehler; else a.tippfehler = 'ok'; }
    }
  });

  /* ---------- Tabelle ---------- */
  const zellArt = c => c && typeof c === 'object' ? 'eingabe' : typeof c === 'number' ? 'zahl' : 'text';
  const ART_ZEICHEN = {text: 'T', zahl: '#', eingabe: '✎'};
  B.typ('tabelle', {
    name: 'Tabelle ausfüllen', symbol: '▦',
    neu: () => ({typ: 'tabelle', frage: 'Fülle die Tabelle aus.', spalten: ['Jahr', 'Betrag'], zeilen: [['1', {l: 100}], ['2', {l: 200}]]}),
    kurz: a => `${a.spalten.length} Spalten × ${n(a.zeilen.length, 'Zeile', 'Zeilen')}, ${a.zeilen.flat().filter(c => c && typeof c === 'object').length} Eingabefelder`,
    form(a, H) {
      const w = `grid-template-columns:repeat(${a.spalten.length},minmax(96px,1fr)) 26px`, leer = '<span class="griff" style="visibility:hidden">⠿</span>';
      const kopf = `<div class="lz">${leer}<div class="tz kopf" style="${w}">${a.spalten.map((s, j) => `<div class="tzelle">${H.feld(`spalten.${j}`, '', {pflicht: true, ph: 'Spalte'})}${a.spalten.length > 1 ? weg('sweg', {j}) : ''}</div>`).join('')}<span></span></div></div>`;
      const zeilen = a.zeilen.map((r, i) => H.zeile('zeilen', i, `<div class="tz" style="${w}">${r.map((c, j) => {
        const art = zellArt(c), p = art === 'eingabe' ? `zeilen.${i}.${j}.l` : `zeilen.${i}.${j}`;
        return `<div class="tzelle ${art}">${H.feld(p, '', {art: art === 'text' ? 'text' : 'zahl', pflicht: true, ph: art === 'eingabe' ? 'Lösung' : ''})}<button type="button" class="btn klein art" data-tun="zelle" data-i="${i}" data-j="${j}" title="Umschalten: Text → Zahl → Eingabefeld">${ART_ZEICHEN[art]}</button></div>`;
      }).join('')}${weg('zweg', {i})}</div>`)).join('');
      const hin = `<div class="lz">${leer}<div class="tz" style="${w}">${a.spalten.map((s, j) => `<div class="tzelle">${H.feld(`hinweise.${j}`, '', {ph: 'Hinweis'})}</div>`).join('')}<span></span></div></div>`;
      return `<label class="klein">Tabelle – je Zelle umschalten: <b>T</b> Text, <b>#</b> vorgegebene Zahl, <b>✎</b> Eingabefeld mit Lösung</label>
        <div class="tabed">${kopf}${zeilen}<label class="klein">Hinweis je Spalte bei falscher Eingabe</label>${hin}</div>
        <div class="reihe">${plus('zplus', 'Zeile')}${plus('splus', 'Spalte')}</div>
        <div class="reihe">${H.feld('einheit', 'Einheit (im Spaltenkopf)', {ph: '€'})}${H.feld('tol', 'Toleranz', {art: 'zahl', ph: '0,005'})}</div>`;
    },
    tun: {
      zelle(a, d) {
        const r = a.zeilen[+d.i], j = +d.j, c = r[j], art = zellArt(c);
        if (art === 'text') { const z = B.zahlLesen(c); r[j] = isNaN(z) ? 0 : z; }
        else if (art === 'zahl') r[j] = {l: c};
        else r[j] = String(c.l).replace('.', ',');
      },
      zplus(a) { const v = a.zeilen[a.zeilen.length - 1] || a.spalten.map(() => ''); a.zeilen.push(v.map(c => zellArt(c) === 'eingabe' ? {l: 0} : zellArt(c) === 'zahl' ? 0 : '')); },
      zweg(a, d) { a.zeilen.splice(+d.i, 1); },
      splus(a) { a.spalten.push('Spalte ' + (a.spalten.length + 1)); a.zeilen.forEach(r => r.push({l: 0})); },
      sweg(a, d) {
        const j = +d.j; a.spalten.splice(j, 1); a.zeilen.forEach(r => r.splice(j, 1));
        if (a.hinweise) { const h = {}; Object.keys(a.hinweise).forEach(k => { if (+k < j) h[k] = a.hinweise[k]; else if (+k > j) h[+k - 1] = a.hinweise[k]; }); a.hinweise = h; }
      }
    }
  });

  /* ---------- Buchungssatz ---------- */
  const r2 = x => Math.round(x * 100) / 100;
  const bsNeu = () => ({typ: 'buchungssatz', frage: 'Bilde den Buchungssatz.', konten: ['0700 MA', '2600 VORST', '2800 BK', '4400 VE'], soll: [['0700 MA', 10000], ['2600 VORST', 1900]], haben: [['4400 VE', 11900]], steuer: ['2600 VORST']});
  // Beträge der Lösung als Vorschlag für die Liste zum Ziehen (Bezeichnung trägt die Lehrkraft ein)
  const ausLoesung = a => [...(a.soll || []), ...(a.haben || [])].map(x => ['', Number(x[1]) || 0]);
  const dazu = (a, l) => { const b = a.betraege || (a.betraege = []); l.forEach(x => { if (!b.some(y => y[1] === x[1])) b.push(x); }); };
  B.typ('buchungssatz', {
    name: 'Buchungssatz', symbol: '⚖',
    neu: bsNeu,
    varianten: [
      {name: 'Buchungssatz: Beträge ziehen', symbol: '⚖', neu: () => Object.assign(bsNeu(), {betraege: [['Nettowert', 10000], ['Vorsteuer', 1900], ['Rechnungsbetrag', 11900], ['Bruttoskonto', 238]]})},
      {name: 'Buchungssatz Jgst. 7', symbol: '⚖', neu: () => ({typ: 'buchungssatz', jgst: 7, frage: 'Bilde den Buchungssatz.', konten: ['AWR', 'BK', 'UEFE', 'UST', 'VE', 'VORST'], soll: [['AWR', 2000], ['VORST', 380]], haben: [['VE', 2380]], steuer: ['VORST']})}
    ],
    titel: a => 'Buchungssatz' + (a.jgst === 7 ? ' Jgst. 7' : '') + (a.betraege ? ' (Beträge ziehen)' : ''),
    kurz: a => (a.soll || []).map(x => x[0]).join(', ') + ' an ' + (a.haben || []).map(x => x[0]).join(', ') + (a.betraege ? ` · ${a.betraege.length} Beträge zum Ziehen` : ''),
    form(a, H) {
      const seite = s => (a[s] || []).map((x, i) => `<div class="reihe">
          <select class="feld" data-k="${s}.${i}.0" data-art="text" data-pflicht="1" aria-label="Konto"><option value="">– Konto –</option>${a.konten.map(k => `<option${k === x[0] ? ' selected' : ''}>${H.esc(k)}</option>`).join('')}${x[0] && !a.konten.includes(x[0]) ? `<option selected>${H.esc(x[0])}</option>` : ''}</select>
          ${H.feld(`${s}.${i}.1`, '', {art: 'zahl', pflicht: true, ph: 'Betrag'})}${weg('bweg', {s, i})}</div>`).join('') + plus('bplus', s === 'soll' ? 'Soll-Konto' : 'Haben-Konto', {s});
      const sum = s => r2((a[s] || []).reduce((t, x) => t + (Number(x[1]) || 0), 0));
      const gleich = sum('soll') === sum('haben');
      const v = H.vorher, rechnung = v && v.typ === 'zahlen' && Array.isArray(v.felder);
      const betraege = !a.betraege ? '' : (a.betraege.map((x, i) => H.zeile('betraege', i, `<div class="reihe">${H.feld(`betraege.${i}.0`, '', {pflicht: true, ph: 'Bezeichnung, z. B. Rechnungsbetrag'})}${H.feld(`betraege.${i}.1`, '', {art: 'zahl', pflicht: true, ph: 'Betrag'})}${weg('betragweg', {i})}</div>`)).join('')
        + `<div class="reihe wrap">${plus('betragplus', 'Betrag')}${H.knopf('betragloesung', 'Beträge der Lösung dazu')}${rechnung ? H.knopf('betragvorher', 'Ergebnisse der Rechnung davor dazu', {}, {titel: 'Felder der Rechenaufgabe davor mit Bezeichnung und Lösung'}) : ''}</div>
        <p class="hinweis">Die Schüler ziehen die Beträge auf die Betragsfelder (oder tippen erst Betrag, dann Feld). Beträge, die nicht gebraucht werden, sind Ablenker${rechnung ? '' : '. In einer kombinierten Aufgabe nach einer Rechenaufgabe (Zahlen) lassen sich deren Ergebnisse übernehmen'}.</p>`);
      return `<label class="hk"><input type="checkbox" data-tun="jgst7"${a.jgst === 7 ? ' checked' : ''}> Jgst. 7: Konten nur mit Kürzel (ohne Nummer)</label>
        ${H.feld('konten', a.jgst === 7 ? 'Konten zur Auswahl (eine Zeile pro Konto, nur Kürzel)' : 'Konten zur Auswahl (eine Zeile pro Konto, Nummer und Kürzel)', {art: 'zeilen', pflicht: true, zeilen: 5, neu: true})}
        <p class="hinweis">Die Schüler suchen das Konto per Nummer oder Kürzel (z. B. „ve“ → ${a.jgst === 7 ? 'VE' : '4400 VE'}). Ablenker einfach mit in die Liste schreiben.</p>
        <label class="klein">Soll</label>${seite('soll')}<label class="klein">an Haben</label>${seite('haben')}
        <p class="hinweis${gleich ? '' : ' warn'}">Summe Soll ${H.zahl(sum('soll'))} · Haben ${H.zahl(sum('haben'))}${gleich ? ' ✓' : ' – nicht gleich!'}</p>
        <label class="klein">Steuerkonten (für den Hinweis „Steuer fehlt“)</label>
        <div class="reihe wrap">${a.konten.map(k => `<label class="hk"><input type="checkbox" data-tun="steuer" data-k2="${H.esc(k)}"${(a.steuer || []).includes(k) ? ' checked' : ''}> ${H.esc(k)}</label>`).join('')}</div>
        ${H.rt('nebenrechnung', 'Nebenrechnung (erscheint nach der Lösung, optional)', {klein: true})}
        <label class="hk"><input type="checkbox" data-tun="bzieh"${a.betraege ? ' checked' : ''}> Beträge zum Ziehen vorgeben (statt eintippen)</label>${betraege}`;
    },
    tun: {
      jgst7(a) { if (a.jgst === 7) delete a.jgst; else a.jgst = 7; },
      bzieh(a, d, H) { if (a.betraege) delete a.betraege; else { a.betraege = []; const v = H.vorher; if (v && v.typ === 'zahlen' && Array.isArray(v.felder)) dazu(a, v.felder.map(f => [H.text(f.t || ''), f.l])); else dazu(a, ausLoesung(a)); } },
      betragplus(a) { (a.betraege = a.betraege || []).push(['', 0]); },
      betragweg(a, d) { a.betraege.splice(+d.i, 1); },
      betragloesung(a) { dazu(a, ausLoesung(a)); },
      betragvorher(a, d, H) { const v = H.vorher; if (v && Array.isArray(v.felder)) dazu(a, v.felder.map(f => [H.text(f.t || ''), f.l])); },
      bplus(a, d) { (a[d.s] = a[d.s] || []).push(['', 0]); },
      bweg(a, d) { a[d.s].splice(+d.i, 1); },
      steuer(a, d) { const k = d.k2, s = a.steuer || []; a.steuer = s.includes(k) ? s.filter(x => x !== k) : [...s, k]; if (!a.steuer.length) delete a.steuer; }
    }
  });

  /* ---------- Kombinierte Aufgabe ---------- */
  B.typ('kombi', {
    name: 'Kombinierte Aufgabe', symbol: '🧩',
    neu: () => ({typ: 'kombi', teile: []}),
    kurz: a => n((a.teile || []).length, 'Teil', 'Teile'),
    frageLabel: 'Einleitung über allen Teilen (optional)', okLabel: 'Text, wenn alle Teile gelöst sind',
    form(a, H) {
      const t = a.teile || [];
      return `<p class="hinweis">Die Teile erscheinen nacheinander: Teil 2 erst, wenn Teil 1 richtig gelöst ist, usw. Weitere Teile: Baustein links in die Zone „＋ Teil …“ ziehen – oder anklicken, solange die kombinierte Aufgabe markiert ist.</p>
        <label class="klein">Teile (anklicken zum Bearbeiten)</label>
        ${t.map((x, k) => `<div class="reihe"><button type="button" class="btn klein" data-tun="k-wahl" data-t="${k + 1}">${k + 1}. ${H.esc(((B.TYPEN[x.typ] || {}).titel ? B.TYPEN[x.typ].titel(x) : (B.TYPEN[x.typ] || {}).name) || x.typ)}</button><span class="hinweis">${H.esc(H.text(x.frage || '').slice(0, 60))}</span></div>`).join('') || '<p class="hinweis warn">Noch keine Teile.</p>'}
        ${t.length ? H.knopf('k-aufloesen', 'Auflösen (Teile werden einzelne Aufgaben)') : ''}`;
    },
    tun: {}
  });

  /* ---------- Lern-Chat ---------- */
  const nArt = m => typeof m === 'string' ? 'text' : m.zahl ? 'zahl' : m.freitext ? 'freitext' : 'knoepfe';
  B.typ('chat', {
    name: 'Lern-Chat', symbol: '💬',
    neu: () => ({typ: 'chat', name: 'Bot', bild: '🤖', nachrichten: ['Hallo! Ich erkläre dir heute …', {bot: 'Was meinst du?', antworten: [{t: 'Antwort A', ok: true, r: 'Genau!'}, {t: 'Antwort B', r: 'Leider nein.'}]}]}),
    kurz: a => `${n(a.nachrichten.length, 'Nachricht', 'Nachrichten')}, ${n(a.nachrichten.filter(m => typeof m !== 'string').length, 'Frage', 'Fragen')}`,
    form(a, H) {
      const msg = (m, i) => {
        const art = nArt(m), p = `nachrichten.${i}`;
        const seg = ['text', 'knoepfe', 'zahl', 'freitext'].map(x => `<button type="button" class="btn klein${x === art ? ' on' : ''}" data-tun="art" data-i="${i}" data-m="${x}">${{text: 'Text', knoepfe: 'Knöpfe', zahl: 'Zahl', freitext: 'Begriff'}[x]}</button>`).join('');
        let innen = '';
        if (art === 'text') innen = H.feld(p, '', {art: 'area', pflicht: true, ph: 'Text des Bots', zeilen: 2});
        else {
          innen = H.feld(`${p}.bot`, '', {art: 'area', pflicht: true, ph: 'Frage des Bots', zeilen: 2});
          if (art === 'knoepfe') innen += (m.antworten || []).map((x, j) => `<div class="reihe"><label class="hk" title="richtige Antwort"><input type="checkbox" data-tun="aok" data-i="${i}" data-j="${j}"${x.ok ? ' checked' : ''}> ok</label>${H.feld(`${p}.antworten.${j}.t`, '', {pflicht: true, ph: 'Knopf'})}${H.feld(`${p}.antworten.${j}.r`, '', {ph: 'Antwort des Bots'})}${weg('aweg', {i, j})}</div>`).join('') + plus('aplus', 'Knopf', {i});
          if (art === 'zahl') innen += `<div class="reihe">${H.feld(`${p}.zahl.l`, '', {art: 'zahl', pflicht: true, ph: 'Lösung'})}${H.feld(`${p}.zahl.e`, '', {ph: 'Einheit'})}${H.feld(`${p}.zahl.tol`, '', {art: 'zahl', ph: 'Toleranz'})}</div>`;
          if (art === 'freitext') innen += H.feld(`${p}.freitext.antworten`, '', {art: 'gruppen', pflicht: true, ph: 'je Zeile ein Begriff, Schreibweisen mit Komma', zeilen: 2});
          if (art !== 'knoepfe') innen += H.feld(`${p}.r`, '', {ph: 'Antwort des Bots bei richtig'});
          innen += H.feld(`${p}.rFalsch`, '', {ph: 'Erklärung bei falsch'});
        }
        return H.zeile('nachrichten', i, `<div class="spalte"><div class="reihe"><div class="seg">${seg}</div>${weg('mweg', {i})}</div>${innen}</div>`);
      };
      return `<div class="reihe">${H.feld('name', 'Name des Bots', {pflicht: true})}${H.feld('bild', 'Bild (Emoji)')}</div>
        <label class="klein">Nachrichten (⠿ ziehen zum Sortieren)</label>${a.nachrichten.map(msg).join('')}${plus('mplus', 'Nachricht')}`;
    },
    tun: {
      art(a, d) {
        const i = +d.i, m = a.nachrichten[i], text = typeof m === 'string' ? m : m.bot;
        if (d.m === 'text') a.nachrichten[i] = text;
        else if (d.m === 'knoepfe') a.nachrichten[i] = {bot: text, antworten: [{t: 'Ja', ok: true}, {t: 'Nein'}]};
        else if (d.m === 'zahl') a.nachrichten[i] = {bot: text, zahl: {l: 0}};
        else a.nachrichten[i] = {bot: text, freitext: {antworten: [['Begriff']]}};
      },
      aok(a, d) { const x = a.nachrichten[+d.i].antworten[+d.j]; if (x.ok) delete x.ok; else x.ok = true; },
      aplus(a, d) { a.nachrichten[+d.i].antworten.push({t: ''}); },
      aweg(a, d) { a.nachrichten[+d.i].antworten.splice(+d.j, 1); },
      mplus(a) { a.nachrichten.push(''); },
      mweg(a, d) { a.nachrichten.splice(+d.i, 1); }
    }
  });
})();
