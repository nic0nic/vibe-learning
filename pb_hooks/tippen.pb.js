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
//   GET    /api/trainer/tippen/aufgaben?klasse=<id>             -> {aufgaben:[{id, titel, text, bis, aktiv, created}]}
//   POST   /api/trainer/tippen/aufgaben       {klasse, titel, text, bis?}   -> neue Aufgabe (aktiv)
//   PATCH  /api/trainer/tippen/aufgaben/{id}  {titel?, bis?, aktiv?}        -> der Text bleibt fest
//   DELETE /api/trainer/tippen/aufgaben/{id}
//
// Schüler, Aufgaben:
//   GET  /api/trainer/tippen/aufgaben/meine                     -> {aufgaben:[{id, titel, text, bis}]} (nur aktive)
//   GET  /api/trainer/sichtbar                                  -> {tools:[…]} bedingte Menüpunkte (katalog.js: bedingt)
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
      r.set("lektion", zahl(d.lektion, 0, 99));
      // Aufgabe nur übernehmen, wenn sie zur Klasse des Schülers gehört
      const aufgabe = u.text(d.aufgabe, 20);
      if (aufgabe) {
        try {
          const a = txApp.findRecordById("tipp_aufgaben", aufgabe);
          if (a.getString("klasse") === s.getString("klasse_ref")) r.set("aufgabe", a.id);
        } catch (err) {}
      }
      r.set("vollstaendig", !d.bailedOut);
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
  const felder = ["zeitpunkt", "modus", "modus2", "sprache", "wpm", "roh", "genauigkeit", "gleichmaessigkeit", "anschlaege", "dauer", "lektion"];
  const ergebnisse = $app.findRecordsByFilter("tipp_ergebnisse", filter, "zeitpunkt", 50000, 0, params).map((r) => {
    const z = { schueler: r.getString("schueler"), satzzeichen: r.getBool("satzzeichen"), zahlen: r.getBool("zahlen"), bestwert: r.getBool("bestwert"),
                aufgabe: r.getString("aufgabe"), vollstaendig: r.getBool("vollstaendig") };
    for (const f of felder) z[f] = r.get(f);
    return z;
  });
  return e.json(200, { ergebnisse });
});

// ---------------- Aufgaben ----------------

routerAdd("GET", "/api/trainer/tippen/aufgaben", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const a = u.lehrkraft(e);
  if (!a) return e.json(401, { message: "Bitte anmelden." });
  const k = u.eigeneKlasse(a, e.request.url.query().get("klasse"));
  if (!k) return e.json(404, { message: "Klasse nicht gefunden." });
  const list = $app.findRecordsByFilter("tipp_aufgaben", "klasse = {:k}", "-created", 0, 0, { k: k.id }).map((r) => ({
    id: r.id, titel: r.getString("titel"), text: r.getString("text"), bis: r.getString("bis"), aktiv: r.getBool("aktiv"), created: r.getString("created"),
  }));
  return e.json(200, { aufgaben: list });
});

routerAdd("POST", "/api/trainer/tippen/aufgaben", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const a = u.lehrkraft(e);
  if (!a) return e.json(401, { message: "Bitte anmelden." });
  const body = e.requestInfo().body || {};
  const k = u.eigeneKlasse(a, body.klasse);
  if (!k) return e.json(404, { message: "Klasse nicht gefunden." });
  const titel = u.text(body.titel, 120).trim();
  const text = String(body.text == null ? "" : body.text).replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{2,}/g, "\n").trim();
  if (!titel) return e.json(400, { message: "Bitte einen Titel angeben." });
  if (!text) return e.json(400, { message: "Bitte einen Text angeben." });
  if (text.length > 20000) return e.json(400, { message: "Der Text ist zu lang (höchstens 20 000 Zeichen)." });
  const r = new Record($app.findCollectionByNameOrId("tipp_aufgaben"));
  r.set("klasse", k.id);
  r.set("titel", titel);
  r.set("text", text);
  r.set("bis", u.text(body.bis, 30));
  r.set("aktiv", true);
  $app.save(r);
  return e.json(200, { id: r.id, titel, text, bis: r.getString("bis"), aktiv: true, created: r.getString("created") });
});

routerAdd("PATCH", "/api/trainer/tippen/aufgaben/{id}", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const a = u.lehrkraft(e);
  if (!a) return e.json(401, { message: "Bitte anmelden." });
  let r;
  try { r = $app.findRecordById("tipp_aufgaben", e.request.pathValue("id")); } catch (err) { return e.json(404, { message: "Aufgabe nicht gefunden." }); }
  if (!u.eigeneKlasse(a, r.getString("klasse"))) return e.json(404, { message: "Aufgabe nicht gefunden." });
  const body = e.requestInfo().body || {};
  if ("titel" in body) { const t = u.text(body.titel, 120).trim(); if (!t) return e.json(400, { message: "Bitte einen Titel angeben." }); r.set("titel", t); }
  if ("bis" in body) r.set("bis", u.text(body.bis, 30));
  if ("aktiv" in body) r.set("aktiv", !!body.aktiv);
  $app.save(r);
  return e.json(200, { ok: true });
});

routerAdd("DELETE", "/api/trainer/tippen/aufgaben/{id}", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const a = u.lehrkraft(e);
  if (!a) return e.json(401, { message: "Bitte anmelden." });
  let r;
  try { r = $app.findRecordById("tipp_aufgaben", e.request.pathValue("id")); } catch (err) { return e.json(404, { message: "Aufgabe nicht gefunden." }); }
  if (!u.eigeneKlasse(a, r.getString("klasse"))) return e.json(404, { message: "Aufgabe nicht gefunden." });
  $app.delete(r);   // Ergebnisse bleiben, verlieren aber die Zuordnung in der Auswertung
  return e.json(200, { ok: true });
});

routerAdd("GET", "/api/trainer/tippen/aufgaben/meine", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const s = u.schuelerAusAnfrage(e);
  if (!s) return e.json(401, { message: "Nicht angemeldet." });
  const list = $app.findRecordsByFilter("tipp_aufgaben", "klasse = {:k} && aktiv = true", "-created", 0, 0, { k: s.getString("klasse_ref") })
    .map((r) => ({ id: r.id, titel: r.getString("titel"), text: r.getString("text"), bis: r.getString("bis") }));
  return e.json(200, { aufgaben: list });
});

// Bedingte Menüpunkte (katalog.js: bedingt: true), die dieser Schüler sehen soll
routerAdd("GET", "/api/trainer/sichtbar", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const s = u.schuelerAusAnfrage(e);
  if (!s) return e.json(401, { message: "Nicht angemeldet." });
  const tools = [];
  const n = $app.countRecords("tipp_aufgaben", $dbx.hashExp({ klasse: s.getString("klasse_ref"), aktiv: true }));
  if (n > 0) tools.push("tippaufgabe");
  return e.json(200, { tools });
});
