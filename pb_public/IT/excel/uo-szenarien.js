/* uo-szenarien.js – Sachaufgaben für WENN mit UND/ODER (Achterbahn, Mofa, Versand …) und buildTask
 * Genutzt von und-oder.html (Übungen, Endlos). Laden nach wennbau.js.
 *
 * API
 *   SCEN                       {id: {name, pick(r) → Parameter, build(p) → {comb, conds, labels, resLabel, then, else, text, resD}}}
 *   buildTask(id, fixed, seed) → Aufgabe für wennbau.js (Zellen, Beispielwerte, Testfälle, Ablenker, sol = Musterlösung);
 *                                id aus SCEN oder LSCEN der Seite; T.CD = Bedingungen einzeln {cell, op, b, L(wert) → Literal, type, …}
 */
const HOW = 'Verwende dazu eine WENN-Funktion zusammen mit UND bzw. ODER.';
const outs = (a, b) => `Ausgegeben werden soll ${C(a)} bzw. ${C(b)}.`;

/* ---- Grundmengen ---- */
const RIDES = [{n:'Feuerwirbel', h:1.1, a:6}, {n:'Blitzschlange', h:1.2, a:8}, {n:'Schwarzer Falke', h:1.3, a:10}, {n:'Donnerkeil', h:1.4, a:10}];
const TARIFE = [{lo:6, hi:14, n:'Kindertarif'}, {lo:12, hi:17, n:'Jugendtarif'}, {lo:14, hi:17, n:'Jugendtarif'}, {lo:18, hi:25, n:'Studententarif'}];
const KLIMA = [{lo:19, hi:22}, {lo:20, hi:23}, {lo:18, hi:21}];

/* ---- Szenarien ----
   build(p) liefert: comb, conds[{c (Zellindex), op, b, type, dp, lo, hi, values}], labels, resLabel, then, else, text(cells, out), resD */
const SCEN = {
  achterbahn: { name:'Achterbahn',
    pick: r => ({ride:pick1(r, RIDES).n, v:ri(r, 0, 1)}),
    build: p => { const k = RIDES.find(x => x.n === p.ride), h = fx(k.h, 2);
      const V = pickV([
        {comb:'UND', ops:['>=', '>='], then:'darf mitfahren', else:'darf nicht mitfahren', rule:`Mitfahren darf nur, wer mindestens ${h} m groß und mindestens ${k.a} Jahre alt ist.`},
        {comb:'ODER', ops:['<', '<'], then:'darf nicht mitfahren', else:'darf mitfahren', rule:`Wer kleiner als ${h} m oder jünger als ${k.a} Jahre ist, darf nicht mitfahren.`}], p);
      return {...V, conds:[{c:0, op:V.ops[0], b:k.h, type:'dec', dp:2, lo:0.95, hi:1.95}, {c:1, op:V.ops[1], b:k.a, type:'int', lo:4, hi:16}],
        labels:['Größe (m)', 'Alter'], resLabel:'Achterbahn',
        text:(c, o) => `In Zelle ${B(c[0])} steht die Körpergröße eines Kindes in Metern, in Zelle ${B(c[1])} sein Alter. Für die Achterbahn <i>${k.n}</i> gilt: ${V.rule} Entscheide in Zelle ${B(o)}, ob das Kind mitfahren darf. ${HOW} ${outs('darf mitfahren', 'darf nicht mitfahren')}`,
        resD:['mitfahren', 'nicht mitfahren', 'ja', 'nein', 'zu klein', 'zu jung']}; } },

  mofa: { name:'Mofa',
    pick: r => ({v:ri(r, 0, 1)}),
    build: p => {
      const V = pickV([
        {comb:'UND', c:[['>=', 15], ['=', 'ja']], then:'darf fahren', else:'darf nicht fahren', rule:'Ein Mofa darf fahren, wer mindestens 15 Jahre alt ist und eine Mofa-Prüfbescheinigung besitzt.'},
        {comb:'ODER', c:[['<', 15], ['=', 'nein']], then:'darf nicht fahren', else:'darf fahren', rule:'Wer jünger als 15 Jahre ist oder keine Mofa-Prüfbescheinigung besitzt, darf kein Mofa fahren.'}], p);
      return {...V, conds:[{c:0, op:V.c[0][0], b:V.c[0][1], type:'int', lo:12, hi:40}, {c:1, op:V.c[1][0], b:V.c[1][1], type:'text', values:['ja', 'nein']}],
        labels:['Alter', 'Prüfbescheinigung'], resLabel:'Mofa',
        text:(c, o) => `In Zelle ${B(c[0])} steht das Alter einer Person, in Zelle ${B(c[1])} steht ${C('ja')} oder ${C('nein')} – je nachdem, ob sie eine Mofa-Prüfbescheinigung besitzt. ${V.rule} Entscheide in Zelle ${B(o)}, ob die Person Mofa fahren darf. ${HOW} ${outs('darf fahren', 'darf nicht fahren')}`,
        resD:['fahren', 'nicht fahren', 'ja', 'nein', 'erlaubt', 15]}; } },

  kundenkarte: { name:'Kundenkarte',
    pick: r => ({b:pick1(r, [30, 50, 100]), rate:pick1(r, [5, 10]), v:ri(r, 0, 1)}),
    build: p => {
      const V = pickV([
        {comb:'UND', c:[['=', 'ja'], ['>=', p.b]], then:p.rate, else:0, rule:`${p.rate} % Rabatt gibt es nur mit Kundenkarte und ab einem Einkaufswert von ${p.b} €, sonst 0 %.`},
        {comb:'ODER', c:[['=', 'nein'], ['<', p.b]], then:0, else:p.rate, rule:`Ohne Kundenkarte oder bei einem Einkaufswert unter ${p.b} € gibt es keinen Rabatt, sonst ${p.rate} %.`}], p);
      return {...V, conds:[{c:0, op:V.c[0][0], b:V.c[0][1], type:'text', values:['ja', 'nein']}, {c:1, op:V.c[1][0], b:V.c[1][1], type:'dec', dp:2, lo:5, hi:200}],
        labels:['Kundenkarte', 'Einkauf (€)'], resLabel:'Rabatt (%)',
        text:(c, o) => `In Zelle ${B(c[0])} steht, ob ein Kunde eine Kundenkarte hat (${C('ja')} oder ${C('nein')}), in Zelle ${B(c[1])} sein Einkaufswert in €. ${V.rule} Gib in Zelle ${B(o)} den Rabatt in Prozent als Zahl aus. ${HOW}`,
        resD:[p.rate + ' %', String(p.rate), p.rate / 100, '0', 100, p.b]}; } },

  versand_de: { name:'Versand ins Ausland',
    pick: r => ({b:pick1(r, [29, 39, 50]), fee:pick1(r, [3.95, 4.95, 5.9]), v:ri(r, 0, 1)}),
    build: p => { const ff = fx(p.fee, 2);
      const V = pickV([
        {comb:'UND', c:[['>=', p.b], ['=', 'Deutschland']], then:0, else:p.fee, rule:`Versandkostenfrei sind nur Bestellungen ab ${p.b} €, die nach Deutschland gehen. Alle anderen kosten ${ff} € Versand.`},
        {comb:'ODER', c:[['<', p.b], ['<>', 'Deutschland']], then:p.fee, else:0, rule:`Liegt der Bestellwert unter ${p.b} € oder geht die Lieferung nicht nach Deutschland, kostet der Versand ${ff} €, sonst ist er kostenlos.`}], p);
      return {...V, conds:[{c:0, op:V.c[0][0], b:V.c[0][1], type:'dec', dp:2, lo:5, hi:150}, {c:1, op:V.c[1][0], b:V.c[1][1], type:'text', values:['Deutschland', 'Österreich', 'Schweiz']}],
        labels:['Bestellwert (€)', 'Land'], resLabel:'Versand (€)',
        text:(c, o) => `In Zelle ${B(c[0])} steht der Bestellwert in €, in Zelle ${B(c[1])} das Lieferland (z. B. ${C('Deutschland')} oder ${C('Österreich')}). ${V.rule} Berechne in Zelle ${B(o)} die Versandkosten in € (als Zahl). ${HOW}`,
        resD:['0', ff, 'kostenlos', ff + ' €', p.b, Math.round(p.fee)]}; } },

  tarif: { name:'Eintrittstarif',
    pick: r => ({t:ri(r, 0, TARIFE.length - 1), v:ri(r, 0, 1)}),
    build: p => { const T = TARIFE[p.t];
      const V = pickV([
        {comb:'UND', c:[['>=', T.lo], ['<=', T.hi]], then:T.n, else:'Normaltarif', rule:`Der ${T.n} gilt für alle von ${T.lo} bis einschließlich ${T.hi} Jahren.`},
        {comb:'ODER', c:[['<', T.lo], ['>', T.hi]], then:'Normaltarif', else:T.n, rule:`Wer jünger als ${T.lo} oder älter als ${T.hi} Jahre ist, zahlt den Normaltarif, alle anderen den ${T.n}.`}], p);
      return {...V, conds:[{c:0, op:V.c[0][0], b:V.c[0][1], type:'int', lo:1, hi:80}, {c:0, op:V.c[1][0], b:V.c[1][1], type:'int', lo:1, hi:80}],
        labels:['Alter'], resLabel:'Tarif',
        text:(c, o) => `Im Kletterpark gibt es verschiedene Tarife. In Zelle ${B(c[0])} steht das Alter einer Person. ${V.rule} Gib in Zelle ${B(o)} den passenden Tarif aus. ${HOW} ${outs(T.n, 'Normaltarif')}`,
        resD:['ermäßigt', 'Vollpreis', 'Normalpreis', 'Kinder', 'ja', 'nein']}; } },

  raumklima: { name:'Raumklima',
    pick: r => ({k:ri(r, 0, KLIMA.length - 1), v:ri(r, 0, 1)}),
    build: p => { const K = KLIMA[p.k];
      const V = pickV([
        {comb:'UND', c:[['>=', K.lo], ['<=', K.hi]], then:'angenehm', else:'nicht angenehm', rule:`Angenehm ist eine Temperatur von ${K.lo} °C bis einschließlich ${K.hi} °C.`},
        {comb:'ODER', c:[['<', K.lo], ['>', K.hi]], then:'nicht angenehm', else:'angenehm', rule:`Unter ${K.lo} °C oder über ${K.hi} °C ist es im Klassenzimmer nicht angenehm.`}], p);
      return {...V, conds:[{c:0, op:V.c[0][0], b:V.c[0][1], type:'dec', dp:1, lo:15, hi:28}, {c:0, op:V.c[1][0], b:V.c[1][1], type:'dec', dp:1, lo:15, hi:28}],
        labels:['Temperatur (°C)'], resLabel:'Raumklima',
        text:(c, o) => `Ein Sensor misst die Temperatur im Klassenzimmer. Der Messwert in °C steht in Zelle ${B(c[0])}. ${V.rule} Gib in Zelle ${B(o)} eine Bewertung aus. ${HOW} ${outs('angenehm', 'nicht angenehm')}`,
        resD:['zu warm', 'zu kalt', 'gut', 'schlecht', 'normal', 'unangenehm']}; } },

  sportabzeichen: { name:'Sportabzeichen',
    pick: r => ({s:pick1(r, [8.5, 9, 9.5]), w:pick1(r, [3.2, 3.5, 3.8]), v:ri(r, 0, 1)}),
    build: p => { const ss = fx(p.s, 1), ww = fx(p.w, 2);
      const V = pickV([
        {comb:'UND', c:[['<=', p.s], ['>=', p.w]], then:'geschafft', else:'nicht geschafft', rule:`Geschafft hat es, wer die 50 m in höchstens ${ss} Sekunden läuft und mindestens ${ww} m weit springt.`},
        {comb:'ODER', c:[['>', p.s], ['<', p.w]], then:'nicht geschafft', else:'geschafft', rule:`Wer für 50 m länger als ${ss} Sekunden braucht oder weniger als ${ww} m weit springt, hat es nicht geschafft.`}], p);
      return {...V, conds:[{c:0, op:V.c[0][0], b:V.c[0][1], type:'dec', dp:1, lo:6.5, hi:12}, {c:1, op:V.c[1][0], b:V.c[1][1], type:'dec', dp:2, lo:2, hi:5}],
        labels:['50 m (s)', 'Weitsprung (m)'], resLabel:'Abzeichen',
        text:(c, o) => `Für ein Sportabzeichen zählen zwei Disziplinen. In Zelle ${B(c[0])} steht die Laufzeit über 50 m in Sekunden, in Zelle ${B(c[1])} die Sprungweite in Metern. ${V.rule} Gib das Ergebnis in Zelle ${B(o)} aus. ${HOW} ${outs('geschafft', 'nicht geschafft')}`,
        resD:['bestanden', 'durchgefallen', 'Urkunde', 'ja', 'nein', 'geschafft!']}; } },

  bewerbung: { name:'Bewerbung',
    pick: r => ({b:pick1(r, [2, 3]), v:ri(r, 0, 1)}),
    build: p => {
      const V = pickV([
        {comb:'UND', ops:['<=', '<='], b:p.b, then:'Einladung', else:'Absage', rule:`Eine Einladung zum Vorstellungsgespräch bekommt, wer in Mathematik und in Deutsch jeweils die Note ${p.b} oder besser hat.`},
        {comb:'ODER', ops:['>', '>'], b:p.b, then:'Absage', else:'Einladung', rule:`Wer in Mathematik oder in Deutsch schlechter als ${p.b} ist, bekommt eine Absage.`}], p);
      return {...V, conds:[{c:0, op:V.ops[0], b:p.b, type:'int', lo:1, hi:6}, {c:1, op:V.ops[1], b:p.b, type:'int', lo:1, hi:6}],
        labels:['Mathe', 'Deutsch'], resLabel:'Bewerbung',
        text:(c, o) => `Ein Betrieb sucht Auszubildende. In Zelle ${B(c[0])} steht die Mathematiknote einer Bewerberin, in Zelle ${B(c[1])} ihre Deutschnote. ${V.rule} Gib in Zelle ${B(o)} die Entscheidung aus. ${HOW} ${outs('Einladung', 'Absage')}`,
        resD:['Zusage', 'eingeladen', 'abgelehnt', 'ja', 'nein', 'Termin']}; } },

  ermaessigung: { name:'Museumseintritt',
    pick: r => ({y:pick1(r, [14, 16, 18]), o:pick1(r, [60, 65]), v:ri(r, 0, 1)}),
    build: p => {
      const V = pickV([
        {comb:'ODER', c:[['<', p.y], ['>=', p.o]], then:'ermäßigt', else:'voller Preis', rule:`Ermäßigten Eintritt bekommen alle unter ${p.y} Jahren und alle ab ${p.o} Jahren.`},
        {comb:'UND', c:[['>=', p.y], ['<', p.o]], then:'voller Preis', else:'ermäßigt', rule:`Den vollen Preis zahlen alle ab ${p.y} Jahren, die jünger als ${p.o} sind. Alle anderen zahlen ermäßigt.`}], p);
      return {...V, conds:[{c:0, op:V.c[0][0], b:V.c[0][1], type:'int', lo:3, hi:90}, {c:0, op:V.c[1][0], b:V.c[1][1], type:'int', lo:3, hi:90}],
        labels:['Alter'], resLabel:'Eintritt',
        text:(c, o) => `In Zelle ${B(c[0])} steht das Alter eines Museumsbesuchers. ${V.rule} Gib in Zelle ${B(o)} den Eintrittspreis aus. ${HOW} ${outs('ermäßigt', 'voller Preis')}`,
        resD:['Vollpreis', 'Seniorentarif', 'Kinder', 'frei', 'ja', 'nein']}; } },

  premiumversand: { name:'Premiumversand',
    pick: r => ({b:pick1(r, [25, 39, 50]), fee:pick1(r, [2.99, 3.95, 4.95]), v:ri(r, 0, 1)}),
    build: p => { const ff = fx(p.fee, 2);
      const V = pickV([
        {comb:'ODER', c:[['>=', p.b], ['=', 'Premium']], then:0, else:p.fee, rule:`Der Versand ist kostenlos ab einem Bestellwert von ${p.b} € oder für Premium-Kunden. Sonst kostet er ${ff} €.`},
        {comb:'UND', c:[['<', p.b], ['<>', 'Premium']], then:p.fee, else:0, rule:`Nur wer unter ${p.b} € bestellt und kein Premium-Kunde ist, zahlt ${ff} € Versand. Alle anderen zahlen nichts.`}], p);
      return {...V, conds:[{c:0, op:V.c[0][0], b:V.c[0][1], type:'dec', dp:2, lo:5, hi:120}, {c:1, op:V.c[1][0], b:V.c[1][1], type:'text', values:['Premium', 'Basis', 'Standard']}],
        labels:['Bestellwert (€)', 'Status'], resLabel:'Versand (€)',
        text:(c, o) => `In Zelle ${B(c[0])} steht der Bestellwert in €, in Zelle ${B(c[1])} der Kundenstatus (${C('Premium')}, ${C('Basis')} oder ${C('Standard')}). ${V.rule} Berechne in Zelle ${B(o)} die Versandkosten in € (als Zahl). ${HOW}`,
        resD:['0', ff, 'kostenlos', ff + ' €', p.b, 'Premium']}; } },

  museum: { name:'Öffnungstage',
    pick: r => { const i = ri(r, 0, 5); return {d1:DAYS[i], d2:DAYS[i + 1], v:ri(r, 0, 1)}; },
    build: p => {
      const V = pickV([
        {comb:'ODER', c:[['=', p.d1], ['=', p.d2]], then:'geschlossen', else:'geöffnet', rule:`Das Museum hat am ${p.d1} und am ${p.d2} geschlossen.`},
        {comb:'UND', c:[['<>', p.d1], ['<>', p.d2]], then:'geöffnet', else:'geschlossen', rule:`Das Museum hat an allen Tagen außer ${p.d1} und ${p.d2} geöffnet.`}], p);
      return {...V, conds:[{c:0, op:V.c[0][0], b:V.c[0][1], type:'text', values:DAYS}, {c:0, op:V.c[1][0], b:V.c[1][1], type:'text', values:DAYS}],
        labels:['Wochentag'], resLabel:'Museum',
        text:(c, o) => `In Zelle ${B(c[0])} steht ein Wochentag. ${V.rule} Gib in Zelle ${B(o)} aus, ob das Museum an diesem Tag offen ist. ${HOW} ${outs('geöffnet', 'geschlossen')}`,
        resD:['zu', 'offen', 'Ruhetag', 'frei', 'Wochenende', p.d1]}; } },

  unwetter: { name:'Unwetterwarnung',
    pick: r => ({w:pick1(r, [60, 75, 90]), n:pick1(r, [25, 40, 50]), v:ri(r, 0, 1)}),
    build: p => {
      const V = pickV([
        {comb:'ODER', c:[['>=', p.w], ['>=', p.n]], then:'Warnung', else:'keine Warnung', rule:`Eine Warnung wird ausgegeben, wenn der Wind mindestens ${p.w} km/h erreicht oder mindestens ${p.n} Liter Regen pro m² erwartet werden.`},
        {comb:'UND', c:[['<', p.w], ['<', p.n]], then:'keine Warnung', else:'Warnung', rule:`Keine Warnung gibt es nur, wenn der Wind unter ${p.w} km/h bleibt und weniger als ${p.n} Liter Regen pro m² erwartet werden.`}], p);
      return {...V, conds:[{c:0, op:V.c[0][0], b:V.c[0][1], type:'int', lo:0, hi:130}, {c:1, op:V.c[1][0], b:V.c[1][1], type:'int', lo:0, hi:80}],
        labels:['Wind (km/h)', 'Regen (l/m²)'], resLabel:'Wetterdienst',
        text:(c, o) => `Der Wetterdienst prüft jeden Tag die Vorhersage. In Zelle ${B(c[0])} steht die Windgeschwindigkeit in km/h, in Zelle ${B(c[1])} die Regenmenge in Litern pro m². ${V.rule} ${HOW} Gib in Zelle ${B(o)} ${C('Warnung')} bzw. ${C('keine Warnung')} aus.`,
        resD:['Sturm', 'Alarm', 'Unwetter', 'sicher', 'ok', 'Gefahr']}; } },

  vorruecken: { name:'Vorrücken',
    pick: r => { const a = ri(r, 0, SUBJ.length - 1); return {s1:SUBJ[a], s2:SUBJ[(a + 1) % SUBJ.length], v:ri(r, 0, 2)}; },
    build: p => { const s1 = p.s1 || 'Mathematik', s2 = p.s2 || 'Deutsch';
      const V = pickV([
        {comb:'ODER', ops:['>=', '>='], b:5, then:'gefährdet', else:'in Ordnung', rule:`Hat jemand in ${s1} oder in ${s2} eine 5 oder 6, ist das Vorrücken gefährdet.`},
        {comb:'ODER', ops:['>', '>'], b:4, then:'gefährdet', else:'in Ordnung', rule:`Ist die Note in ${s1} oder in ${s2} schlechter als 4, ist das Vorrücken gefährdet.`},
        {comb:'UND', ops:['<=', '<='], b:4, then:'in Ordnung', else:'gefährdet', rule:`Nur wer in ${s1} und in ${s2} mindestens eine 4 hat, rückt sicher vor. Sonst ist das Vorrücken gefährdet.`}], p);
      return {...V, conds:[{c:0, op:V.ops[0], b:V.b, type:'int', lo:1, hi:6}, {c:1, op:V.ops[1], b:V.b, type:'int', lo:1, hi:6}],
        labels:[s1, s2], resLabel:'Vorrücken',
        text:(c, o) => `In Zelle ${B(c[0])} steht die Zeugnisnote in ${s1}, in Zelle ${B(c[1])} die Note in ${s2}. ${V.rule} Gib in Zelle ${B(o)} ${C('gefährdet')} bzw. ${C('in Ordnung')} aus. ${HOW}`,
        resD:['bestanden', 'durchgefallen', 'gut', 'schlecht', 'Nachprüfung', V.b]}; } },

  verein: { name:'Vereinsbeitrag',
    pick: r => ({red:pick1(r, [3, 5, 6]), full:pick1(r, [10, 12, 15]), v:ri(r, 0, 1)}),
    build: p => {
      const V = pickV([
        {comb:'ODER', c:[['<', 18], ['=', 'ja']], then:p.red, else:p.full, rule:`Wer jünger als 18 ist oder noch zur Schule geht bzw. eine Ausbildung macht, zahlt ${p.red} € im Monat. Alle anderen zahlen ${p.full} €.`},
        {comb:'UND', c:[['>=', 18], ['=', 'nein']], then:p.full, else:p.red, rule:`Den vollen Beitrag von ${p.full} € zahlen nur Mitglieder ab 18 Jahren, die nicht Schüler bzw. Azubi sind. Alle anderen zahlen ${p.red} €.`}], p);
      return {...V, conds:[{c:0, op:V.c[0][0], b:V.c[0][1], type:'int', lo:6, hi:70}, {c:1, op:V.c[1][0], b:V.c[1][1], type:'text', values:['ja', 'nein']}],
        labels:['Alter', 'Schüler/Azubi'], resLabel:'Beitrag (€)',
        text:(c, o) => `Ein Sportverein berechnet den Monatsbeitrag. In Zelle ${B(c[0])} steht das Alter eines Mitglieds, in Zelle ${B(c[1])} ${C('ja')} oder ${C('nein')} – je nachdem, ob es Schüler oder Azubi ist. ${V.rule} Gib in Zelle ${B(o)} den Beitrag in € als Zahl aus. ${HOW}`,
        resD:[p.red + ' €', 'ermäßigt', p.red + p.full, 0, 18, String(p.red)]}; } },

  parkplatz: { name:'Kundenparkplatz',
    pick: r => ({b:pick1(r, [30, 60]), fee:pick1(r, [2, 3, 4.5]), v:ri(r, 0, 1)}),
    build: p => { const ff = fx(p.fee, 2);
      const V = pickV([
        {comb:'ODER', c:[['<=', p.b], ['=', 'ja']], then:0, else:p.fee, rule:`Kostenlos parkt, wer höchstens ${p.b} Minuten bleibt oder im Geschäft eingekauft hat. Alle anderen zahlen ${ff} €.`},
        {comb:'UND', c:[['>', p.b], ['=', 'nein']], then:p.fee, else:0, rule:`Wer länger als ${p.b} Minuten parkt und nicht eingekauft hat, zahlt ${ff} €. Alle anderen parken kostenlos.`}], p);
      return {...V, conds:[{c:0, op:V.c[0][0], b:V.c[0][1], type:'int', lo:5, hi:240}, {c:1, op:V.c[1][0], b:V.c[1][1], type:'text', values:['ja', 'nein']}],
        labels:['Parkdauer (min)', 'Eingekauft'], resLabel:'Gebühr (€)',
        text:(c, o) => `Ein Supermarkt hat einen Kundenparkplatz. In Zelle ${B(c[0])} steht die Parkdauer in Minuten, in Zelle ${B(c[1])} steht ${C('ja')} oder ${C('nein')} – je nachdem, ob eingekauft wurde. ${V.rule} Berechne in Zelle ${B(o)} die Parkgebühr in € (als Zahl). ${HOW}`,
        resD:['0', ff, 'kostenlos', ff + ' €', p.b, p.fee * 2]}; } },

  leihrad: { name:'Leihrad-Check',
    pick: r => ({b:pick1(r, [500, 800, 1000]), v:ri(r, 0, 1)}),
    build: p => {
      const V = pickV([
        {comb:'ODER', c:[['>=', p.b], ['=', 'abgenutzt']], then:'Werkstatt', else:'einsatzbereit', rule:`Ein Rad muss in die Werkstatt, wenn es seit der letzten Wartung mindestens ${p.b} km gefahren ist oder die Bremsen abgenutzt sind.`},
        {comb:'UND', c:[['<', p.b], ['=', 'ok']], then:'einsatzbereit', else:'Werkstatt', rule:`Einsatzbereit ist ein Rad nur, wenn es seit der Wartung weniger als ${p.b} km gefahren ist und die Bremsen ok sind. Sonst muss es in die Werkstatt.`}], p);
      return {...V, conds:[{c:0, op:V.c[0][0], b:V.c[0][1], type:'int', lo:0, hi:2000}, {c:1, op:V.c[1][0], b:V.c[1][1], type:'text', values:['ok', 'abgenutzt']}],
        labels:['km seit Wartung', 'Bremsen'], resLabel:'Status',
        text:(c, o) => `Ein Fahrradverleih prüft seine Räder. In Zelle ${B(c[0])} stehen die Kilometer seit der letzten Wartung, in Zelle ${B(c[1])} der Zustand der Bremsen (${C('ok')} oder ${C('abgenutzt')}). ${V.rule} Gib in Zelle ${B(o)} ${C('Werkstatt')} bzw. ${C('einsatzbereit')} aus. ${HOW}`,
        resD:['reparieren', 'defekt', 'fahrbereit', 'ok', 'Wartung', p.b]}; } }
};

/* ---- Aufgabe aus Szenario + Parametern bauen ---- */
function buildTask(id, fixed, seedNum){
  const sc = SCEN[id] || (typeof LSCEN !== 'undefined' && LSCEN[id]), r = rng(seedNum);
  const p = {col:pick1(r, ['A', 'B', 'C']), row:ri(r, 2, 25), ...sc.pick(r), ...fixed};
  const s = sc.build(p);
  const nc = Math.max(...s.conds.map(c => c.c)) + 1, cc = p.col.charCodeAt(0);
  const cells = [...Array(nc)].map((_, i) => String.fromCharCode(cc + i) + p.row);
  const out = s.out || String.fromCharCode(cc + nc) + p.row;
  const O = v => typeof v === 'number' ? (Number.isInteger(v) ? String(v) : fx(v, 2)) : '"' + v + '"';
  const CD = s.conds.map(c => {
    const dp = c.dp || 0, step = Math.pow(10, -dp), f = Math.pow(10, dp);
    const rd = x => Math.round(x * f) / f;
    const numLit = v => Number.isInteger(v) ? String(v) : fx(v, dp);
    const L = v => typeof v === 'number' ? numLit(v) : '"' + v + '"';
    return {...c, dp, step, rd, numLit, L, cell:cells[c.c]};
  });
  const conds = CD.map(c => c.cell + c.op + c.L(c.b));
  const T = {scen:sc.name, id, cells, out, labels:s.labels, resLabel:s.resLabel, comb:s.comb,
             conds, condCells:CD.map(c => c.cell), cvals:CD.map(c => c.L(c.b)),
             dps:cells.map((_, i) => (CD.find(c => c.c === i).dp)),
             then:O(s.then), else:O(s.else), text:s.text(cells, out)};
  const mk = cs => T.comb ? `=WENN(${T.comb}(${cs.join(';')});${T.then};${T.else})` : `=WENN(${cs[0]};${T.then};${T.else})`;
  T.noLogic = !T.comb; T.CD = CD;
  T.sol = mk(conds);

  // Testwerte je Zelle, dann alle Kombinationen
  const perCell = cells.map((_, ci) => {
    const cs = CD.filter(c => c.c === ci);
    if (cs[0].type === 'text') return [...new Set(cs.flatMap(c => c.values))].map(v => ({t:'str', v}));
    const vals = new Set();
    cs.forEach(c => [c.b - c.step, c.b, c.b + c.step, c.lo, c.hi].forEach(x => vals.add(c.rd(x))));
    return [...vals].sort((a, b) => a - b).map(v => ({t:'num', v}));
  });
  T.tests = product(perCell).map(vs => Object.fromEntries(vs.map((v, i) => [cells[i], v])));
  T.sample = Object.fromEntries(cells.map((cell, ci) => {
    const c = CD.find(x => x.c === ci);
    if (p.sample && p.sample[ci] !== undefined) return [cell, p.sample[ci]];
    if (c.type === 'text') return [cell, {t:'str', v:pick1(r, c.values)}];
    return [cell, {t:'num', v:c.rd(c.lo + ri(r, 0, Math.round((c.hi - c.lo) / c.step)) * c.step)}];
  }));

  if (s.sheet){ // Lernmodus: echtes Tabellenblatt, erste Datenzeile ist die Formelzeile
    const sh = SHEETS[s.sheet];
    T.sheet = sh; T.rowEnvs = sh.rows.map((_, i) => sheetEnv(sh, i)); T.sample = T.rowEnvs[0];
  }
  // Ablenker: nur, wenn sie an dieser Stelle eingesetzt die Lösung falsch machen
  const failsSub = (i, c) => { const cs = conds.slice(); cs[i] = c; try { return !checkAgainst(mk(cs), T).ok; } catch (e) { return true; } };
  const condD = [], cvalD = [];
  CD.forEach((c, i) => {
    const other = c.cell.replace(/\d+/, '') + (p.row > 2 ? p.row - 1 : p.row + 1);
    let cands, vals;
    if (c.type === 'text'){
      const oth = [...new Set(c.values)].filter(v => v !== c.b);
      cands = [...oth.slice(0, 2).map(v => c.cell + c.op + c.L(v)), c.cell + c.op + c.b, c.cell + (c.op === '=' ? '<>' : '=') + c.L(c.b), other + c.op + c.L(c.b)];
      vals = [c.b, ...oth.map(c.L)];
    } else {
      const flip = {'>=':'>', '>':'>=', '<':'<=', '<=':'<'}[c.op], mir = {'>=':'<=', '>':'<', '<':'>', '<=':'>='}[c.op];
      const bad = {'>=':'=>', '<=':'=<', '>':'=', '<':'='}[c.op];
      cands = [c.cell + flip + c.L(c.b), c.cell + mir + c.L(c.b), c.cell + c.op + c.L(c.rd(c.b + c.step)), c.cell + c.op + c.L(c.rd(c.b - c.step)),
               c.cell + bad + c.L(c.b), c.cell + c.op + '"' + c.numLit(c.b) + '"', other + c.op + c.L(c.b)];
      vals = ['"' + c.numLit(c.b) + '"', ...[1, -1, 2, 10].map(k => c.L(c.rd(c.b + k * c.step)))];
    }
    let n = 0;
    for (const x of shuffle(cands, r)){ if (n < 2 && !conds.includes(x) && !condD.includes(x) && failsSub(i, x)){ condD.push(x); n++; } }
    n = 0;
    for (const v of vals){ if (n < 2 && !T.cvals.includes(v) && !cvalD.includes(v) && failsSub(i, c.cell + c.op + v)){ cvalD.push(v); n++; } }
  });
  T.condD = condD; T.cvalD = cvalD;
  const used = new Set([T.then, T.else]), res = [];
  for (const v of shuffle(s.resD, r)){ const l = O(v); if (!used.has(l)){ used.add(l); res.push(l); } }
  T.resD = res.slice(0, 6);
  return T;
}
