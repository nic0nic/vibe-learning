/*
  bloecke.js – Programmieren mit Blöcken (Blockly, Darstellung wie Scratch), Bereich IT/python, Jgst. 7

  Blöcke nach Lehrplan IT 1.2: Anweisung, Sequenz, falls (… sonst), wiederhole … mal,
  wiederhole solange (Anfangsbedingung), Variablen (setze, ändere), sage, frage, Operatoren.
  Die Blöcke werden zu Python übersetzt; das läuft wie gewohnt über Skulpt und Kommode.lauf.
  Ausgeführt werden nur Blöcke unter „wenn ▶ angeklickt“ (mehrere Startblöcke: von oben nach unten).

  Einbinden (Blockly liegt in lib/blockly/):
    <script src="lib/blockly/blockly_compressed.js"></script>
    <script src="lib/blockly/de.js"></script>
    <script src="lib/bloecke.js"></script>

  const b = Bloecke.erzeugen(div, {aenderung})   Blockly in div einsetzen; aenderung() nach jeder Änderung
    b.ws                         Blockly-Arbeitsfläche
    b.python()                   → {code, bloecke: {zeile: blockId}, namen: {pythonName: Anzeigename}, start: true/false}
    b.laden(daten) / b.daten()   Arbeitsfläche als JSON (Blockly-Format) laden / holen
    b.markiere(blockId | null)   Block hervorheben (Schritt)
    b.fehler(blockId | null)     Block als fehlerhaft zeigen und hinscrollen (null: Markierung weg)
    b.zoom(faktor)               Größe der Blöcke (Start 0.8)
    b.groesse()                  nach Umhängen/Größenänderung aufrufen
  Bloecke.BEISPIELE              {Name: JSON}, für b.laden
  Zu Kommode.lauf passen: halt: nr => nr in bloecke, namen, bloecke: true.
*/
(function () {
  'use strict';

  const FARBE = {var: '#FF8C1A', ea: '#9966FF', frage: '#5CB1D6', steuer: '#FFAB19', op: '#59C059', start: '#FFBF00'};
  const RUND = 2, ECKIG6 = 1;   // Zelos: Form der Werte-Blöcke (rund) und Bedingungen (sechseckig)

  Blockly.common.defineBlocksWithJsonArray([
    {type: 'vl_start', message0: 'wenn ▶ angeklickt', nextStatement: null, colour: FARBE.start,
      hat: 'cap', tooltip: 'Hier beginnt das Programm.'},
    {type: 'vl_wert', message0: '%1', args0: [{type: 'field_input', name: 'WERT', text: '0'}], output: null, outputShape: RUND, colour: '#ffffff'},
    {type: 'vl_variable', message0: '%1', args0: [{type: 'field_variable', name: 'VAR', variable: null}], output: null, outputShape: RUND,
      colour: FARBE.var, tooltip: 'Schaut auf die Tafel der Variable und liefert ihren Wert.'},
    {type: 'vl_setze', message0: 'setze %1 auf %2', args0: [{type: 'field_variable', name: 'VAR', variable: null}, {type: 'input_value', name: 'WERT'}],
      inputsInline: true, previousStatement: null, nextStatement: null, colour: FARBE.var,
      tooltip: 'Wischt die Tafel der Variable und schreibt den neuen Wert darauf.'},
    {type: 'vl_aendere', message0: 'ändere %1 um %2', args0: [{type: 'field_variable', name: 'VAR', variable: null}, {type: 'input_value', name: 'WERT'}],
      inputsInline: true, previousStatement: null, nextStatement: null, colour: FARBE.var,
      tooltip: 'Zählt den Wert zur Variable dazu (negative Zahl: abziehen).'},
    {type: 'vl_sage', message0: 'sage %1', args0: [{type: 'input_value', name: 'WERT'}],
      inputsInline: true, previousStatement: null, nextStatement: null, colour: FARBE.ea, tooltip: 'Gibt den Wert im Terminal aus.'},
    {type: 'vl_frage', message0: 'frage %1 und speichere die Antwort in %2', args0: [{type: 'input_value', name: 'WERT'}, {type: 'field_variable', name: 'VAR', variable: null}],
      inputsInline: true, previousStatement: null, nextStatement: null, colour: FARBE.frage,
      tooltip: 'Fragt im Terminal nach und schreibt die Antwort auf die Tafel der Variable.'},
    {type: 'vl_wiederhole', message0: 'wiederhole %1 mal', args0: [{type: 'input_value', name: 'ANZAHL'}], message1: '%1', args1: [{type: 'input_statement', name: 'DO'}],
      inputsInline: true, previousStatement: null, nextStatement: null, colour: FARBE.steuer, tooltip: 'Wiederholt die Blöcke darin so oft.'},
    {type: 'vl_solange', message0: 'wiederhole solange %1', args0: [{type: 'input_value', name: 'BED', check: 'Boolean'}], message1: '%1', args1: [{type: 'input_statement', name: 'DO'}],
      inputsInline: true, previousStatement: null, nextStatement: null, colour: FARBE.steuer,
      tooltip: 'Prüft zuerst die Bedingung. Solange sie stimmt, werden die Blöcke darin wiederholt.'},
    {type: 'vl_falls', message0: 'falls %1 dann', args0: [{type: 'input_value', name: 'BED', check: 'Boolean'}], message1: '%1', args1: [{type: 'input_statement', name: 'DO'}],
      inputsInline: true, previousStatement: null, nextStatement: null, colour: FARBE.steuer, tooltip: 'Die Blöcke darin laufen nur, wenn die Bedingung stimmt.'},
    {type: 'vl_fallssonst', message0: 'falls %1 dann', args0: [{type: 'input_value', name: 'BED', check: 'Boolean'}], message1: '%1', args1: [{type: 'input_statement', name: 'DO'}],
      message2: 'sonst', message3: '%1', args3: [{type: 'input_statement', name: 'SONST'}],
      inputsInline: true, previousStatement: null, nextStatement: null, colour: FARBE.steuer, tooltip: 'Stimmt die Bedingung, laufen die oberen Blöcke, sonst die unteren.'},
    {type: 'vl_rechne', message0: '%1 %2 %3', args0: [{type: 'input_value', name: 'A'}, {type: 'field_dropdown', name: 'OP', options: [['+', '+'], ['−', '-'], ['·', '*'], [':', '/']]}, {type: 'input_value', name: 'B'}],
      inputsInline: true, output: null, outputShape: RUND, colour: FARBE.op},
    {type: 'vl_vergleich', message0: '%1 %2 %3', args0: [{type: 'input_value', name: 'A'}, {type: 'field_dropdown', name: 'OP', options: [['<', '<'], ['>', '>'], ['=', '==']]}, {type: 'input_value', name: 'B'}],
      inputsInline: true, output: 'Boolean', outputShape: ECKIG6, colour: FARBE.op},
    {type: 'vl_logik', message0: '%1 %2 %3', args0: [{type: 'input_value', name: 'A', check: 'Boolean'}, {type: 'field_dropdown', name: 'OP', options: [['und', 'and'], ['oder', 'or']]}, {type: 'input_value', name: 'B', check: 'Boolean'}],
      inputsInline: true, output: 'Boolean', outputShape: ECKIG6, colour: FARBE.op},
    {type: 'vl_nicht', message0: 'nicht %1', args0: [{type: 'input_value', name: 'A', check: 'Boolean'}],
      inputsInline: true, output: 'Boolean', outputShape: ECKIG6, colour: FARBE.op},
    {type: 'vl_zufall', message0: 'Zufallszahl von %1 bis %2', args0: [{type: 'input_value', name: 'A'}, {type: 'input_value', name: 'B'}],
      inputsInline: true, output: null, outputShape: RUND, colour: FARBE.op},
    {type: 'vl_verbinde', message0: 'verbinde %1 und %2', args0: [{type: 'input_value', name: 'A'}, {type: 'input_value', name: 'B'}],
      inputsInline: true, output: null, outputShape: RUND, colour: FARBE.op, tooltip: 'Hängt zwei Texte (oder Zahlen) aneinander.'}
  ]);

  /* ---------- Werkzeugkasten ---------- */
  const W = t => ({shadow: {type: 'vl_wert', fields: {WERT: String(t)}}});
  const blk = (type, inputs, fields) => ({kind: 'block', type, inputs, fields});
  const TOOLBOX = {kind: 'categoryToolbox', contents: [
    {kind: 'category', name: 'Variablen', colour: FARBE.var, custom: 'VL_VARIABLEN'},
    {kind: 'category', name: 'Ein- und Ausgabe', colour: FARBE.ea, custom: 'VL_EA'},
    {kind: 'category', name: 'Steuerung', colour: FARBE.steuer, contents: [
      blk('vl_start'),
      blk('vl_wiederhole', {ANZAHL: W(10)}),
      blk('vl_solange'),
      blk('vl_falls'),
      blk('vl_fallssonst')]},
    {kind: 'category', name: 'Operatoren', colour: FARBE.op, contents: [
      blk('vl_rechne', {A: W(''), B: W('')}, {OP: '+'}),
      blk('vl_rechne', {A: W(''), B: W('')}, {OP: '-'}),
      blk('vl_rechne', {A: W(''), B: W('')}, {OP: '*'}),
      blk('vl_rechne', {A: W(''), B: W('')}, {OP: '/'}),
      blk('vl_vergleich', {A: W(''), B: W(50)}, {OP: '<'}),
      blk('vl_vergleich', {A: W(''), B: W(50)}, {OP: '>'}),
      blk('vl_vergleich', {A: W(''), B: W(50)}, {OP: '=='}),
      blk('vl_logik', {}, {OP: 'and'}),
      blk('vl_logik', {}, {OP: 'or'}),
      blk('vl_nicht'),
      blk('vl_zufall', {A: W(1), B: W(10)}),
      blk('vl_verbinde', {A: W('Hallo '), B: W('Welt')})]}
  ]};
  function variablenListe(ws) {
    return ws.getVariableMap().getAllVariables().slice().sort((a, b) => a.getName().localeCompare(b.getName(), 'de'));
  }
  function kategorieVariablen(ws) {
    const v = variablenListe(ws), l = [{kind: 'button', text: 'Neue Variable', callbackkey: 'VL_NEU'}];
    if (!v.length) return l.concat([{kind: 'label', text: 'Lege zuerst eine Variable an.'}]);
    v.forEach(x => l.push(blk('vl_variable', null, {VAR: {id: x.getId()}})));
    const f = {VAR: {id: v[0].getId()}};
    l.push({kind: 'sep', gap: 24}, blk('vl_setze', {WERT: W(0)}, f), blk('vl_aendere', {WERT: W(1)}, f));
    return l;
  }
  function kategorieEA(ws) {
    const v = variablenListe(ws), l = [blk('vl_sage', {WERT: W('Hallo!')})];
    if (v.length) l.push(blk('vl_frage', {WERT: W('Wie heißt du?')}, {VAR: {id: v[0].getId()}}));
    else l.push({kind: 'label', text: 'Für „frage“ zuerst eine Variable anlegen.'});
    return l;
  }

  /* ---------- Übersetzen nach Python ---------- */
  const RESERVIERT = new Set(('False None True and as assert async await break class continue def del elif else except finally for from ' +
    'global if import in is lambda nonlocal not or pass raise return try while with yield print input str int float random range').split(' '));
  function pyName(anzeige, vergeben) {
    let n = anzeige.trim().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss')
      .replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+/, '');
    if (!n) n = 'variable';
    if (/^\d/.test(n)) n = 'v_' + n;
    if (RESERVIERT.has(n)) n += '_';
    let m = n, i = 2;
    while (vergeben.has(m)) m = n + '_' + i++;
    vergeben.add(m);
    return m;
  }
  function literal(t) {
    t = String(t);
    const s = t.trim();
    if (/^-?\d+$/.test(s)) return String(parseInt(s, 10));
    if (/^-?\d*[.,]\d+$/.test(s)) return String(parseFloat(s.replace(',', '.')));
    return '"' + t.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  const ZAHL = ['def _zahl(t):', '    try:', '        return int(t)', '    except ValueError:', '        pass', '    try:',
    '        return float(t.replace(",", "."))', '    except ValueError:', '        return t'];

  function python(ws) {
    const namen = {}, py = {}, vergeben = new Set();
    variablenListe(ws).forEach(v => { const n = pyName(v.getName(), vergeben); py[v.getId()] = n; namen[n] = v.getName(); });
    const zeilen = [], bloecke = {};
    let zufall = false, frage = false, tiefe = 0;
    const varName = b => py[b.getFieldValue('VAR')] || 'variable';
    const zeile = (text, ein, block) => { zeilen.push('    '.repeat(ein) + text); if (block) bloecke[zeilen.length] = block.id; };

    function ex(b, innen) {
      if (!b) return '0';
      const k = (n, i) => ex(b.getInputTargetBlock(n), i);
      const klammer = s => innen ? '(' + s + ')' : s;
      switch (b.type) {
        case 'vl_wert': return literal(b.getFieldValue('WERT'));
        case 'vl_variable': return varName(b);
        case 'vl_rechne': return klammer(`${k('A', true)} ${b.getFieldValue('OP')} ${k('B', true)}`);
        case 'vl_vergleich': return klammer(`${k('A', true)} ${b.getFieldValue('OP')} ${k('B', true)}`);
        case 'vl_logik': return klammer(`${b.getInputTargetBlock('A') ? k('A', true) : 'False'} ${b.getFieldValue('OP')} ${b.getInputTargetBlock('B') ? k('B', true) : 'False'}`);
        case 'vl_nicht': return klammer('not ' + (b.getInputTargetBlock('A') ? k('A', true) : 'False'));
        case 'vl_zufall': zufall = true; return `random.randint(${k('A')}, ${k('B')})`;
        case 'vl_verbinde': {   // Texte direkt, alles andere mit str()
          const t = n => { const s = k(n); return s.startsWith('"') ? s : `str(${s})`; };
          return klammer(`${t('A')} + ${t('B')}`);
        }
        default: return '0';
      }
    }
    const bed = b => b ? ex(b) : 'False';
    function folge(b, ein) {
      const vorher = zeilen.length;
      for (; b; b = b.getNextBlock()) {
        if (!b.isEnabled()) continue;
        anweisung(b, ein);
      }
      if (zeilen.length === vorher) zeile('pass', ein);
    }
    function anweisung(b, ein) {
      const k = n => b.getInputTargetBlock(n);
      switch (b.type) {
        case 'vl_setze': zeile(`${varName(b)} = ${ex(k('WERT'))}`, ein, b); break;
        case 'vl_aendere': zeile(`${varName(b)} = ${varName(b)} + ${ex(k('WERT'), true)}`, ein, b); break;
        case 'vl_sage': zeile(`print(${ex(k('WERT'))})`, ein, b); break;
        case 'vl_frage': {
          frage = true;
          let p = ex(k('WERT'));
          if (/^".*[^ ]"$/.test(p)) p = p.slice(0, -1) + ' "';
          zeile(`${varName(b)} = _zahl(input(${p}))`, ein, b); break;
        }
        case 'vl_wiederhole': tiefe++; zeile(`for _n${tiefe} in range(${ex(k('ANZAHL'))}):`, ein, b); folge(k('DO'), ein + 1); tiefe--; break;
        case 'vl_solange': zeile(`while ${bed(k('BED'))}:`, ein, b); folge(k('DO'), ein + 1); break;
        case 'vl_falls': zeile(`if ${bed(k('BED'))}:`, ein, b); folge(k('DO'), ein + 1); break;
        case 'vl_fallssonst': zeile(`if ${bed(k('BED'))}:`, ein, b); folge(k('DO'), ein + 1); zeile('else:', ein); folge(k('SONST'), ein + 1); break;
        default: break;
      }
    }
    const starts = ws.getTopBlocks(true).filter(b => b.type === 'vl_start' && b.isEnabled());
    starts.forEach(s => { if (s.getNextBlock()) folge(s.getNextBlock(), 0); });
    // Hilfen vorn einfügen, Zeilennummern verschieben
    const kopf = [];
    if (zufall) kopf.push('import random');
    if (frage) kopf.push(...ZAHL);
    if (kopf.length) kopf.push('');
    const verschoben = {};
    Object.keys(bloecke).forEach(nr => { verschoben[+nr + kopf.length] = bloecke[nr]; });
    return {code: kopf.concat(zeilen).join('\n') + '\n', bloecke: verschoben, namen, start: starts.length > 0};
  }

  /* ---------- Beispiele ---------- */
  // kleine Bauhilfe: Kette aus Anweisungen, Werte als Zahl/Text oder Block
  function bauen(vars, ...kette) {
    const ids = {};
    vars.forEach(n => { ids[n] = 'v-' + n; });
    const E = x => (x && typeof x === 'object') ? {block: x, shadow: {type: 'vl_wert', fields: {WERT: ''}}} : {shadow: {type: 'vl_wert', fields: {WERT: String(x)}}};
    const verkette = l => { for (let i = l.length - 2; i >= 0; i--) l[i].next = {block: l[i + 1]}; return l[0]; };
    const V = n => ({VAR: {id: ids[n]}});
    const B = {
      setze: (n, w) => ({type: 'vl_setze', fields: V(n), inputs: {WERT: E(w)}}),
      aendere: (n, w) => ({type: 'vl_aendere', fields: V(n), inputs: {WERT: E(w)}}),
      sage: w => ({type: 'vl_sage', inputs: {WERT: E(w)}}),
      frage: (w, n) => ({type: 'vl_frage', fields: V(n), inputs: {WERT: E(w)}}),
      wiederhole: (z, ...l) => ({type: 'vl_wiederhole', inputs: {ANZAHL: E(z), DO: {block: verkette(l)}}}),
      solange: (b, ...l) => ({type: 'vl_solange', inputs: {BED: {block: b}, DO: {block: verkette(l)}}}),
      falls: (b, dann, sonst) => ({type: 'vl_fallssonst', inputs: {BED: {block: b}, DO: {block: verkette(dann)}, SONST: {block: verkette(sonst)}}}),
      v: n => ({type: 'vl_variable', fields: V(n)}),
      vgl: (a, op, b) => ({type: 'vl_vergleich', fields: {OP: op}, inputs: {A: E(a), B: E(b)}}),
      zufall: (a, b) => ({type: 'vl_zufall', inputs: {A: E(a), B: E(b)}}),
      verbinde: (a, b) => ({type: 'vl_verbinde', inputs: {A: E(a), B: E(b)}})
    };
    const anweisungen = kette.map(f => f(B));
    return {blocks: {languageVersion: 0, blocks: [{type: 'vl_start', x: 30, y: 30, next: anweisungen.length ? {block: verkette(anweisungen)} : undefined}]},
      variables: vars.map(n => ({name: n, id: ids[n]}))};
  }
  const BEISPIELE = {
    'Hallo Welt': bauen([], B => B.sage('Hallo Welt!')),
    'Begrüßung': bauen(['Name', 'Alter'],
      B => B.frage('Wie heißt du?', 'Name'),
      B => B.frage('Wie alt bist du?', 'Alter'),
      B => B.sage(B.verbinde('Hallo ', B.v('Name'))),
      B => B.aendere('Alter', 1),
      B => B.sage(B.verbinde('Nächstes Jahr bist du ', B.v('Alter')))),
    'Zählen (wiederhole … mal)': bauen(['Zahl'],
      B => B.setze('Zahl', 1),
      B => B.wiederhole(5, B.sage(B.v('Zahl')), B.aendere('Zahl', 1))),
    'Sparen (wiederhole solange)': bauen(['Gespart', 'Wochen'],
      B => B.setze('Gespart', 0),
      B => B.setze('Wochen', 0),
      B => B.solange(B.vgl(B.v('Gespart'), '<', 50), B.aendere('Gespart', 7), B.aendere('Wochen', 1)),
      B => B.sage(B.verbinde('Wochen: ', B.v('Wochen')))),
    'Zahlenraten (falls … sonst)': bauen(['Geheim', 'Tipp'],
      B => B.setze('Geheim', B.zufall(1, 10)),
      B => B.frage('Rate meine Zahl von 1 bis 10:', 'Tipp'),
      B => B.falls(B.vgl(B.v('Tipp'), '==', B.v('Geheim')), [B.sage('Richtig!')], [B.sage(B.verbinde('Leider falsch. Es war ', B.v('Geheim')))]))
  };

  /* ---------- Arbeitsfläche ---------- */
  // Farben der Fläche kommen aus dem CSS der Seite (hell/dunkel), daher hier durchsichtig
  const THEMA = Blockly.Theme.defineTheme('vl', {base: Blockly.Themes.Classic, fontStyle: {family: 'system-ui, sans-serif', weight: '600', size: 12},
    componentStyles: {workspaceBackgroundColour: 'transparent', toolboxBackgroundColour: 'transparent', flyoutBackgroundColour: 'rgba(128,128,128,.12)',
      flyoutOpacity: 1, scrollbarColour: '#888', insertionMarkerColour: '#000', insertionMarkerOpacity: .25}});
  function erzeugen(div, opt) {
    opt = opt || {};
    const ws = Blockly.inject(div, {
      toolbox: TOOLBOX, renderer: 'zelos', sounds: false, trashcan: false, media: '',
      zoom: {controls: false, wheel: false, pinch: true, startScale: .8},
      move: {scrollbars: true, drag: true, wheel: true},
      grid: {spacing: 32, length: 2, colour: 'rgba(128,128,128,.25)', snap: false},
      theme: THEMA
    });
    ws.registerToolboxCategoryCallback('VL_VARIABLEN', kategorieVariablen);
    ws.registerToolboxCategoryCallback('VL_EA', kategorieEA);
    ws.registerButtonCallback('VL_NEU', () => Blockly.Variables.createVariableButtonHandler(ws, null, ''));
    ws.addChangeListener(e => { if (!e.isUiEvent && opt.aenderung) opt.aenderung(); });
    let fehlerBlock = null;
    const b = {
      ws,
      python: () => python(ws),
      daten: () => Blockly.serialization.workspaces.save(ws),
      laden: d => { Blockly.Events.disable(); try { ws.clear(); Blockly.serialization.workspaces.load(d, ws); } finally { Blockly.Events.enable(); } if (opt.aenderung) opt.aenderung(); },
      markiere: id => {
        ws.highlightBlock(null);
        if (!id) return;
        ws.highlightBlock(id);
        const bl = ws.getBlockById(id);
        if (bl) ws.scrollBoundsIntoView(bl.getBoundingRectangleWithoutChildren());
      },
      fehler: id => {
        if (fehlerBlock) { const fb = ws.getBlockById(fehlerBlock); if (fb) fb.getSvgRoot().classList.remove('vl-fehler'); fehlerBlock = null; }
        const bl = id && ws.getBlockById(id);
        if (!bl) return;
        bl.getSvgRoot().classList.add('vl-fehler');
        fehlerBlock = id;
        ws.scrollBoundsIntoView(bl.getBoundingRectangleWithoutChildren());
      },
      groesse: () => Blockly.svgResize(ws),
      zoom: f => ws.setScale(f)
    };
    return b;
  }

  window.Bloecke = {erzeugen, BEISPIELE, pyName, literal};
})();
