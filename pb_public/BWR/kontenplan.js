/* kontenplan.js – Kontenplan (nach dem IKR) für bayerische Realschulen, LehrplanPLUS (ISB, Stand 2022)
 *
 * Abgetippt aus Kontenplan_LehrplanPLUS.pdf; Aufbau wie im Original: vier Spalten, darin Blöcke.
 *   KONTENPLAN.spalten = [[block, …], …]   block = {kopf:'Aktive Bestandskonten'} (grau hinterlegt)
 *                                                | {klasse:'Kontenklasse 0 Sachanlagen'}
 *                                                | {gruppe:'05 Grundstücke und Bauten', konten:[[nr, kürzel, name, klr], …]}
 *       klr = true: Konto geht in die Kosten- und Leistungsrechnung ein (im Original mit *)
 *   KONTENPLAN.konten  = flache Liste {nr, kz, name, klr} in der Reihenfolge des Plans
 *   KONTENPLAN.finde('2800 BK' | 'BK' | '2800') → Konto oder null
 *   KONTENPLAN.text(konto, jgst7) → '2800 BK' bzw. in Jgst. 7 'BK'
 * Genutzt vom Editor („Übung erstellen“, Buchungssatz: Konten auswählen). Eine lesbare Fassung für Chats steht
 * als kontenplan.md im Austausch-Ordner (erzeugt aus dieser Datei: werkzeuge/kontenplan-md.js).
 */
(function () {
  'use strict';
  const K = (nr, kz, name, klr) => [nr, kz, name, !!klr];
  const spalten = [
    [
      {kopf: 'Aktive Bestandskonten'},
      {klasse: 'Kontenklasse 0 Sachanlagen'},
      {gruppe: '05 Grundstücke und Bauten', konten: [K('0500', 'GR', 'Grundstücke'), K('0530', 'BVG', 'Betriebs- und Verwaltungsgebäude')]},
      {gruppe: '07 Technische Anlagen und Maschinen', konten: [K('0700', 'MA', 'Maschinen und Anlagen')]},
      {gruppe: '08 Betriebs- und Geschäftsausstattung', konten: [K('0840', 'FP', 'Fuhrpark'), K('0860', 'BM', 'Büromaschinen'), K('0870', 'BGA', 'Büromöbel und Geschäftsausstattung'), K('0890', 'GWG', 'Geringwertige Wirtschaftsgüter')]},
      {klasse: 'Kontenklasse 1 Finanzanlagen'},
      {gruppe: '15 Wertpapiere des Anlagevermögens', konten: [K('1500', 'WP', 'Wertpapiere des Anlagevermögens')]},
      {klasse: 'Kontenklasse 2 Umlaufvermögen und ARA'},
      {gruppe: '20 Roh-, Hilfs-, Betriebsstoffe, Fremdbauteile', konten: [K('2000', 'R', 'Rohstoffe (Fertigungsmaterial)'), K('2010', 'F', 'Fremdbauteile'), K('2020', 'H', 'Hilfsstoffe'), K('2030', 'B', 'Betriebsstoffe')]},
      {gruppe: '24 Forderungen aus Lieferungen und Leistungen', konten: [K('2400', 'FO', 'Forderungen aus Lieferungen und Leistungen'), K('2470', 'ZWFO', 'Zweifelhafte Forderungen')]},
      {gruppe: '26 Sonstige Vermögensgegenstände', konten: [K('2600', 'VORST', 'Vorsteuer')]},
      {gruppe: '28 Flüssige Mittel', konten: [K('2800', 'BK', 'Bank (Kontokorrentkonto)'), K('2880', 'KA', 'Kasse')]},
      {gruppe: '29 Aktive Rechnungsabgrenzung', konten: [K('2900', 'ARA', 'Aktive Rechnungsabgrenzung')]}
    ],
    [
      {kopf: 'Passive Bestandskonten'},
      {klasse: 'Kontenklasse 3 Eigenkapital und Rückstellungen'},
      {gruppe: '30 Eigenkapital', konten: [K('3000', 'EK', 'Eigenkapital'), K('3001', 'P', 'Privatkonto')]},
      {gruppe: '36 Wertberichtigungen', konten: [K('3670', 'EWB', 'Einzelwertberichtigung'), K('3680', 'PWB', 'Pauschalwertberichtigung')]},
      {gruppe: '39 Sonstige Rückstellungen', konten: [K('3900', 'RST', 'Rückstellungen')]},
      {klasse: 'Kontenklasse 4 Verbindlichkeiten und PRA'},
      {gruppe: '42 Verbindlichkeiten bei Kreditinstituten', konten: [K('4200', 'KBKV', 'Kurzfristige Bankverbindlichkeiten (bis zu einem Jahr)'), K('4250', 'LBKV', 'Langfristige Bankverbindlichkeiten')]},
      {gruppe: '44 Verbindlichkeiten aus Lieferungen und Leistungen', konten: [K('4400', 'VE', 'Verbindlichkeiten aus LL')]},
      {gruppe: '48 Sonstige Verbindlichkeiten', konten: [K('4800', 'UST', 'Umsatzsteuer'), K('4830', 'VFA', 'Sonstige Steuerverbindlichkeiten'), K('4840', 'VSV', 'Verbindlichkeiten gegenüber Sozialversicherungsträgern')]},
      {gruppe: '49 Passive Rechnungsabgrenzung', konten: [K('4900', 'PRA', 'Passive Rechnungsabgrenzung')]},
      {kopf: 'Ertragskonten'},
      {klasse: 'Kontenklasse 5 Erträge'},
      {gruppe: '50 Umsatzerlöse für eigene Erzeugnisse', konten: [K('5000', 'UEFE', 'Umsatzerlöse für eigene Erzeugnisse', 1), K('5001', 'EBFE', 'Erlösberichtigungen')]},
      {gruppe: '54 Sonstige betriebliche Erträge', konten: [K('5400', 'EMP', 'Erlöse aus Vermietung und Verpachtung'), K('5430', 'ASBE', 'Andere sonstige betriebliche Erträge', 1), K('5490', 'PFE', 'Periodenfremde Erträge'), K('5495', 'EFO', 'Erträge aus abgeschriebenen Forderungen')]}
    ],
    [
      {gruppe: '56 Erträge aus anderen Wertpapieren', konten: [K('5650', 'EAWP', 'Erträge aus dem Abgang von Wertpapieren des Anlagevermögens')]},
      {gruppe: '57 Zinsen und ähnliche Erträge', konten: [K('5710', 'ZE', 'Zinserträge'), K('5780', 'DDE', 'Dividendenerträge')]},
      {kopf: 'Aufwandskonten'},
      {klasse: 'Kontenklasse 6 Betriebliche Aufwendungen'},
      {gruppe: '60 Aufwendungen für Roh-, Hilfs-, Betriebsstoffe und Fremdbauteile', konten: [
        K('6000', 'AWR', 'Aufwendungen für Rohstoffe', 1), K('6001', 'BZKR', 'Bezugskosten für Rohstoffe'), K('6002', 'NR', 'Nachlässe für Rohstoffe'),
        K('6010', 'AWF', 'Aufwendungen für Fremdbauteile', 1), K('6011', 'BZKF', 'Bezugskosten für Fremdbauteile'), K('6012', 'NF', 'Nachlässe für Fremdbauteile'),
        K('6020', 'AWH', 'Aufwendungen für Hilfsstoffe', 1), K('6021', 'BZKH', 'Bezugskosten für Hilfsstoffe'), K('6022', 'NH', 'Nachlässe für Hilfsstoffe'),
        K('6030', 'AWB', 'Aufwendungen für Betriebsstoffe', 1), K('6031', 'BZKB', 'Bezugskosten für Betriebsstoffe'), K('6032', 'NB', 'Nachlässe für Betriebsstoffe'),
        K('6040', 'AWVM', 'Aufwendungen für Verpackungsmaterial', 1)]},
      {gruppe: '61 Aufwendungen für bezogene Leistungen', konten: [K('6140', 'AFR', 'Ausgangsfrachten', 1), K('6160', 'FRI', 'Fremdinstandhaltung', 1)]},
      {gruppe: '62 Löhne und Gehälter', konten: [K('6200', 'LG', 'Löhne und Gehälter', 1)]},
      {gruppe: '64 Soziale Abgaben', konten: [K('6400', 'AGASV', 'Arbeitgeberanteil zur Sozialversicherung', 1)]}
    ],
    [
      {gruppe: '65 Abschreibungen', konten: [K('6520', 'ABSA', 'Abschreibungen auf Sachanlagen', 1), K('6540', 'ABGWG', 'Abschreibungen auf GWG', 1)]},
      {gruppe: '67 Aufwendungen für die Inanspruchnahme von Rechten und Diensten', konten: [K('6700', 'AWMP', 'Mieten, Pachten', 1), K('6730', 'GEB', 'Gebühren', 1), K('6750', 'KGV', 'Kosten des Geldverkehrs', 1), K('6760', 'PROV', 'Provisionen', 1), K('6770', 'RBK', 'Rechts- und Beratungskosten', 1)]},
      {gruppe: '68 Aufwendungen für Kommunikation', konten: [K('6800', 'BMK', 'Büromaterial und Kleingüter', 1), K('6820', 'KOM', 'Kommunikationsgebühren', 1), K('6850', 'REK', 'Reisekosten', 1), K('6870', 'WER', 'Werbung', 1)]},
      {gruppe: '69 Sonstige Aufwendungen', konten: [K('6900', 'VBEI', 'Versicherungsbeiträge', 1), K('6950', 'ABFO', 'Abschreibungen auf Forderungen'), K('6990', 'PFAW', 'Periodenfremde Aufwendungen')]},
      {klasse: 'Kontenklasse 7 Weitere Aufwendungen'},
      {gruppe: '70 Betriebliche Steuern', konten: [K('7000', 'GWST', 'Gewerbesteuer', 1), K('7020', 'GRST', 'Grundsteuer', 1), K('7030', 'KFZST', 'Kraftfahrzeugsteuer', 1)]},
      {gruppe: '74 Verluste aus Finanzanlagen', konten: [K('7460', 'VAWP', 'Verluste aus dem Abgang von Wertpapieren des Anlagevermögens')]},
      {gruppe: '75 Zinsen', konten: [K('7510', 'ZAW', 'Zinsaufwendungen', 1)]},
      {kopf: 'Konten für die Ergebnisrechnung'},
      {klasse: 'Kontenklasse 8 Ergebnisrechnungen'},
      {gruppe: '', konten: [K('8010', 'SBK', 'Schlussbilanzkonto'), K('8020', 'GUV', 'Gewinn- und Verlustkonto')]},
      {klasse: 'Kontenklasse 9 Kosten- und Leistungsrechnung'}
    ]
  ];
  const konten = [];
  spalten.forEach(sp => sp.forEach(b => (b.konten || []).forEach(([nr, kz, name, klr]) => konten.push({nr, kz, name, klr}))));
  // '2800 BK', 'BK', '2800', 'bk' → Konto
  function finde(s) {
    s = String(s || '').trim(); if (!s) return null;
    const m = s.match(/^(\d{4})(?:\s+(\S+))?$/);
    if (m) return konten.find(k => k.nr === m[1]) || null;
    const u = s.toUpperCase();
    return konten.find(k => k.kz === u) || null;
  }
  const text = (k, jgst7) => jgst7 ? k.kz : k.nr + ' ' + k.kz;
  const KONTENPLAN = {titel: 'Kontenplan (nach dem IKR) und Abkürzungsverzeichnis zur Verwendung an Bayerischen Realschulen – LehrplanPLUS',
    hinweis: '* Kennzeichen für Konten, die in die Kosten- und Leistungsrechnung eingehen.', spalten, konten, finde, text};
  if (typeof module !== 'undefined' && module.exports) module.exports = KONTENPLAN; else window.KONTENPLAN = KONTENPLAN;
})();
