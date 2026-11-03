/// <reference path="../pb_data/types.d.ts" />
// Schnittstellen für den Tipptrainer pockettype (pb_public/tippen/).
// Anmeldung wie bei den anderen Übungen: Kopfzeile "X-Trainer-Code: <Code oder Konto-Token>".
//
//   GET  /api/trainer/tippen                         -> {ergebnisse:[daten…], meta, stand}
//   POST /api/trainer/tippen/ergebnisse {ergebnisse:[daten…]}  -> {gespeichert}
//        neue Ergebnisse; schon vorhandene (gleiche _id) werden übersprungen
//   POST /api/trainer/tippen/meta       {meta, stand}         -> {stand}
//        409 mit {meta, stand}, wenn der Server einen neueren Stand hat
//
// Lehrkraft (Kopfzeile "X-Lehrer-Token") und Admin ("Authorization"):
//   GET  /api/trainer/tippen/report?klasse=<id>&von=&bis=      -> {ergebnisse:[{schueler, zeitpunkt, …}]}
//        Werte ohne das vollständige Ergebnis, von/bis als ISO-Datum
//
// Ergebnisse löscht nur die Lehrkraft (mit dem Schüler oder der Klasse).

routerAdd("GET", "/api/trainer/tippen", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const s = u.schuelerAusAnfrage(e);
  if (!s) return e.json(401, { message: "Nicht angemeldet." });
  const ergebnisse = $app
    .findRecordsByFilter("tipp_ergebnisse", "schueler = {:s}", "zeitpunkt", 20000, 0, { s: s.id })
    .map((r) => r.get("daten"));
  let meta = null, stand = 0;
  try {
    const r = $app.findFirstRecordByFilter("tipp_stand", "schueler = {:s}", { s: s.id });
    meta = r.get("meta");
    stand = r.getFloat("stand");
  } catch (err) {}
  return e.json(200, { ergebnisse, meta, stand });
});

routerAdd("POST", "/api/trainer/tippen/ergebnisse", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const s = u.schuelerAusAnfrage(e);
  if (!s) return e.json(401, { message: "Nicht angemeldet." });
  const body = e.requestInfo().body || {};
  const liste = Array.isArray(body.ergebnisse) ? body.ergebnisse.slice(0, 100) : [];
  const zahl = (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0));
  let n = 0;
  $app.runInTransaction((txApp) => {
    const col = txApp.findCollectionByNameOrId("tipp_ergebnisse");
    for (const d of liste) {
      if (!d || typeof d !== "object" || Array.isArray(d)) continue;
      const id = u.text(d._id, 40);
      if (!/^[A-Za-z0-9_-]{6,40}$/.test(id)) continue;
      if (JSON.stringify(d).length > 50000) continue;
      try {
        txApp.findFirstRecordByFilter("tipp_ergebnisse", "schueler = {:s} && lokal_id = {:i}", { s: s.id, i: id });
        continue; // schon gespeichert
      } catch (err) {}
      const r = new Record(col);
      r.set("schueler", s.id);
      r.set("lokal_id", id);
      r.set("zeitpunkt", zahl(d.timestamp, 0, 1e14));
      r.set("modus", u.text(d.mode, 10));
      r.set("modus2", u.text(d.mode2, 20));
      r.set("sprache", u.text(d.language, 40));
      r.set("wpm", zahl(d.wpm, 0, 1000));
      r.set("roh", zahl(d.rawWpm, 0, 1000));
      r.set("genauigkeit", zahl(d.acc, 0, 100));
      r.set("gleichmaessigkeit", zahl(d.consistency, 0, 100));
      r.set("anschlaege", zahl(d.anschlaege, 0, 1e6));
      r.set("dauer", zahl(d.testDuration, 0, 1e5));
      r.set("satzzeichen", !!d.punctuation);
      r.set("zahlen", !!d.numbers);
      r.set("bestwert", !!d.isPb);
      r.set("daten", d);
      txApp.save(r);
      n++;
    }
  });
  return e.json(200, { gespeichert: n });
});

routerAdd("POST", "/api/trainer/tippen/meta", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const s = u.schuelerAusAnfrage(e);
  if (!s) return e.json(401, { message: "Nicht angemeldet." });
  const body = e.requestInfo().body || {};
  const meta = body.meta;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return e.json(400, { message: "Ungültige Daten." });
  if (JSON.stringify(meta).length > 15000) return e.json(400, { message: "Zu viele Daten." });
  const stand = Number(body.stand) || 0;
  let r;
  try {
    r = $app.findFirstRecordByFilter("tipp_stand", "schueler = {:s}", { s: s.id });
    if (r.getFloat("stand") > stand) return e.json(409, { message: "Auf dem Server liegt ein neuerer Stand.", meta: r.get("meta"), stand: r.getFloat("stand") });
  } catch (err) {
    r = new Record($app.findCollectionByNameOrId("tipp_stand"));
    r.set("schueler", s.id);
  }
  r.set("meta", meta);
  r.set("stand", stand);
  $app.save(r);
  return e.json(200, { stand });
});

routerAdd("GET", "/api/trainer/tippen/report", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const a = u.lehrkraft(e);
  if (!a) return e.json(401, { message: "Bitte anmelden." });
  const q = e.request.url.query();
  const k = u.eigeneKlasse(a, q.get("klasse"));
  if (!k) return e.json(404, { message: "Klasse nicht gefunden." });
  let filter = "schueler.klasse_ref = {:k}";
  const params = { k: k.id };
  const von = Date.parse(q.get("von")), bis = Date.parse(q.get("bis"));
  if (!isNaN(von)) { filter += " && zeitpunkt >= {:von}"; params.von = von; }
  if (!isNaN(bis)) { filter += " && zeitpunkt <= {:bis}"; params.bis = bis; }
  const felder = ["zeitpunkt", "modus", "modus2", "sprache", "wpm", "roh", "genauigkeit", "gleichmaessigkeit", "anschlaege", "dauer"];
  const ergebnisse = $app.findRecordsByFilter("tipp_ergebnisse", filter, "zeitpunkt", 20000, 0, params).map((r) => {
    const z = { schueler: r.getString("schueler"), satzzeichen: r.getBool("satzzeichen"), zahlen: r.getBool("zahlen"), bestwert: r.getBool("bestwert") };
    for (const f of felder) z[f] = r.get(f);
    return z;
  });
  return e.json(200, { ergebnisse });
});
