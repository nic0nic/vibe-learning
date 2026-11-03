/// <reference path="../pb_data/types.d.ts" />
// Schnittstellen der Übungsplattform (vibe learning).
//
// Anmeldung (ein Feld für alles):
//   POST /api/trainer/login            {kennung, passwort?}
//        Code                       -> {rolle:"schueler", cred, anzeige, klasse}
//        Benutzername/E-Mail allein -> {passwort:true}  (Passwort im zweiten Schritt)
//        mit Passwort               -> Schüler {rolle, cred, …} | Lehrkraft/Admin {rolle, token, name}
//
// Schüler (Kopfzeile "X-Trainer-Code: <Code oder Konto-Token>"):
//   GET  /api/trainer/state?seite=wenn                           -> {daten, stand}
//   POST /api/trainer/state            {seite, daten, stand}     -> {stand}  (409, wenn der Server neuer ist)
//   POST /api/trainer/events           {events:[…]}              -> {gespeichert}
//
// Lehrkraft (Kopfzeile "X-Lehrer-Token") und Admin (PocketBase-Superuser, "Authorization"):
//   GET    /api/trainer/uebersicht                               -> {admin, name, klassen, lehrer}
//   POST   /api/trainer/klassen        {name, lehrer?}           -> Klasse anlegen
//   PATCH  /api/trainer/klassen/{id}   {lehrer}                  -> Klasse einer Lehrkraft geben (nur Admin)
//   DELETE /api/trainer/klassen/{id}                             -> Klasse samt Schülern löschen
//   GET    /api/trainer/schueler?klasse=<id>                     -> Schüler einer Klasse
//   POST   /api/trainer/codes          {klasse, anzahl}          -> neue Codes
//   POST   /api/trainer/konten         {klasse, konten:[{name, pass}]} -> neue Konten
//   POST   /api/trainer/schueler/{id}/passwort {passwort?}       -> neues Passwort
//   PATCH  /api/trainer/schueler/{id}  {gesperrt?, klasse?}        -> sperren/entsperren, in eine andere eigene Klasse verschieben
//   DELETE /api/trainer/schueler/{id}
//   GET    /api/trainer/report?klasse=<id>&von=&bis=             -> Fortschritt + Ereignisse
// Nur Admin:
//   GET    /api/trainer/lehrer   POST /api/trainer/lehrer {benutzername, anzeigename, passwort?}
//   PATCH  /api/trainer/lehrer/{id} {anzeigename?, passwort?}   DELETE /api/trainer/lehrer/{id}

routerAdd("POST", "/api/trainer/login", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const body = e.requestInfo().body || {};
  const kennung = u.text(body.kennung, 120).trim();
  const pw = u.text(body.passwort, 200);
  if (!kennung) return e.json(400, { message: "Bitte gib deinen Code oder Benutzernamen ein." });

  if (!pw) {
    const s = u.findSchueler(kennung);
    if (s && s.getString("code")) return e.json(200, { rolle: "schueler", cred: s.getString("code"), anzeige: s.getString("code"), klasse: s.getString("klasse") });
  }

  const name = u.normName(kennung);
  let rolle = "", rec = null;
  if (name.includes("@")) {
    try { rec = $app.findAuthRecordByEmail("_superusers", name); rolle = "admin"; } catch (err) {}
  } else if (name) {
    try { rec = $app.findFirstRecordByData("schueler", "benutzername", name); rolle = "schueler"; } catch (err) {}
    if (!rec) { try { rec = $app.findFirstRecordByData("lehrer", "benutzername", name); rolle = "lehrer"; } catch (err) {} }
  }
  if (!rec || (rolle === "schueler" && rec.getBool("gesperrt"))) {
    return e.json(401, { message: "Diesen Code oder Benutzernamen gibt es nicht. Prüfe die Schreibweise oder frage deine Lehrkraft." });
  }
  if (!pw) return e.json(200, { passwort: true });
  if (!rec.validatePassword(pw)) return e.json(401, { message: "Das Passwort stimmt nicht." });

  if (rolle === "schueler") {
    return e.json(200, { rolle: "schueler", cred: u.token("S", rec), anzeige: rec.getString("benutzername"), klasse: rec.getString("klasse") });
  }
  if (rolle === "lehrer") {
    return e.json(200, { rolle: "lehrer", token: u.token("L", rec), name: rec.getString("anzeigename") || rec.getString("benutzername") });
  }
  return e.json(200, { rolle: "admin", token: rec.newAuthToken(), name: rec.getString("email") });
});

routerAdd("GET", "/api/trainer/state", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const s = u.schuelerAusAnfrage(e);
  if (!s) return e.json(401, { message: "Nicht angemeldet." });
  const seite = e.request.url.query().get("seite");
  if (!u.istSeite(seite)) return e.json(400, { message: "Unbekannte Seite." });
  try {
    const r = $app.findFirstRecordByFilter("fortschritt", "schueler = {:s} && seite = {:p}", { s: s.id, p: seite });
    return e.json(200, { daten: r.get("daten"), stand: r.getFloat("stand") });
  } catch (err) {
    return e.json(200, { daten: null, stand: 0 });
  }
});

routerAdd("POST", "/api/trainer/state", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const s = u.schuelerAusAnfrage(e);
  if (!s) return e.json(401, { message: "Nicht angemeldet." });
  const body = e.requestInfo().body || {};
  const seite = String(body.seite || "");
  if (!u.istSeite(seite)) return e.json(400, { message: "Unbekannte Seite." });
  const daten = body.daten;
  if (!daten || typeof daten !== "object" || Array.isArray(daten)) return e.json(400, { message: "Ungültige Daten." });
  if (JSON.stringify(daten).length > 100000) return e.json(400, { message: "Zu viele Daten." });
  const stand = Number(body.stand) || 0;

  let r;
  try {
    r = $app.findFirstRecordByFilter("fortschritt", "schueler = {:s} && seite = {:p}", { s: s.id, p: seite });
    // Ein anderes Gerät hat zwischenzeitlich einen neueren Stand gespeichert
    if (r.getFloat("stand") > stand) return e.json(409, { message: "Auf dem Server liegt ein neuerer Stand.", daten: r.get("daten"), stand: r.getFloat("stand") });
  } catch (err) {
    r = new Record($app.findCollectionByNameOrId("fortschritt"));
    r.set("schueler", s.id);
    r.set("seite", seite);
  }
  r.set("daten", daten);
  r.set("stand", stand);
  $app.save(r);
  return e.json(200, { stand: stand });
});

routerAdd("POST", "/api/trainer/events", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const s = u.schuelerAusAnfrage(e);
  if (!s) return e.json(401, { message: "Nicht angemeldet." });
  const body = e.requestInfo().body || {};
  const events = Array.isArray(body.events) ? body.events.slice(0, 200) : [];
  let n = 0;
  $app.runInTransaction((txApp) => {
    const col = txApp.findCollectionByNameOrId("ereignisse");
    for (const ev of events) {
      if (!ev || !u.istSeite(ev.seite) || !u.MODI.includes(ev.modus)) continue;
      const r = new Record(col);
      r.set("schueler", s.id);
      r.set("seite", ev.seite);
      r.set("modus", ev.modus);
      r.set("stufe", Number(ev.stufe) || 0);
      r.set("aufgabe", u.text(ev.aufgabe, 60));
      r.set("titel", u.text(ev.titel, 200));
      r.set("gesamt", Number(ev.gesamt) || 0);
      r.set("erstmals", !!ev.erstmals);
      txApp.save(r);
      n++;
    }
  });
  return e.json(200, { gespeichert: n });
});

// ---------------- Lehrkraft und Admin ----------------

routerAdd("GET", "/api/trainer/uebersicht", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const a = u.lehrkraft(e);
  if (!a) return e.json(401, { message: "Bitte anmelden." });
  const filter = a.admin ? "id != ''" : "lehrer = {:l}";
  const klassen = $app.findRecordsByFilter("klassen", filter, "name", 0, 0, { l: a.admin ? "" : a.lehrer.id }).map((k) => {
    const n = $app.countRecords("schueler", $dbx.hashExp({ klasse_ref: k.id }));
    return { id: k.id, name: k.getString("name"), lehrer: k.getString("lehrer"), anzahl: n };
  });
  const lehrer = a.admin
    ? $app.findRecordsByFilter("lehrer", "id != ''", "anzeigename,benutzername", 0, 0).map((l) => ({ id: l.id, benutzername: l.getString("benutzername"), anzeigename: l.getString("anzeigename") }))
    : [];
  return e.json(200, { admin: a.admin, name: a.admin ? "Admin" : (a.lehrer.getString("anzeigename") || a.lehrer.getString("benutzername")), klassen, lehrer });
});

routerAdd("POST", "/api/trainer/klassen", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const a = u.lehrkraft(e);
  if (!a) return e.json(401, { message: "Bitte anmelden." });
  const body = e.requestInfo().body || {};
  const name = u.text(body.name, 40).trim();
  if (!name) return e.json(400, { message: "Bitte einen Klassennamen angeben." });
  let besitzer = a.admin ? u.text(body.lehrer, 20) : a.lehrer.id;
  if (besitzer) { try { $app.findRecordById("lehrer", besitzer); } catch (err) { return e.json(400, { message: "Unbekannte Lehrkraft." }); } }
  try {
    $app.findFirstRecordByFilter("klassen", "name = {:n} && lehrer = {:l}", { n: name, l: besitzer });
    return e.json(400, { message: "Diese Klasse gibt es schon." });
  } catch (err) {}
  const k = new Record($app.findCollectionByNameOrId("klassen"));
  k.set("name", name);
  k.set("lehrer", besitzer);
  $app.save(k);
  return e.json(200, { id: k.id, name: name, lehrer: besitzer });
});

routerAdd("PATCH", "/api/trainer/klassen/{id}", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const a = u.lehrkraft(e);
  if (!a || !a.admin) return e.json(403, { message: "Nur der Admin kann Klassen umverteilen." });
  const k = u.eigeneKlasse(a, e.request.pathValue("id"));
  if (!k) return e.json(404, { message: "Klasse nicht gefunden." });
  const besitzer = u.text((e.requestInfo().body || {}).lehrer, 20);
  if (besitzer) { try { $app.findRecordById("lehrer", besitzer); } catch (err) { return e.json(400, { message: "Unbekannte Lehrkraft." }); } }
  try {
    const d = $app.findFirstRecordByFilter("klassen", "name = {:n} && lehrer = {:l}", { n: k.getString("name"), l: besitzer });
    if (d.id !== k.id) return e.json(400, { message: "Diese Lehrkraft hat schon eine Klasse mit diesem Namen." });
  } catch (err) {}
  k.set("lehrer", besitzer);
  $app.save(k);
  return e.json(200, { ok: true });
});

routerAdd("DELETE", "/api/trainer/klassen/{id}", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const a = u.lehrkraft(e);
  if (!a) return e.json(401, { message: "Bitte anmelden." });
  const k = u.eigeneKlasse(a, e.request.pathValue("id"));
  if (!k) return e.json(404, { message: "Klasse nicht gefunden." });
  $app.delete(k); // Schüler, Fortschritt und Ereignisse werden mitgelöscht
  return e.json(200, { ok: true });
});

routerAdd("GET", "/api/trainer/schueler", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const a = u.lehrkraft(e);
  if (!a) return e.json(401, { message: "Bitte anmelden." });
  const k = u.eigeneKlasse(a, e.request.url.query().get("klasse"));
  if (!k) return e.json(404, { message: "Klasse nicht gefunden." });
  const list = $app.findRecordsByFilter("schueler", "klasse_ref = {:k}", "code,benutzername", 0, 0, { k: k.id }).map((s) => ({
    id: s.id, code: s.getString("code"), benutzername: s.getString("benutzername"), gesperrt: s.getBool("gesperrt"),
  }));
  return e.json(200, { schueler: list });
});

routerAdd("POST", "/api/trainer/codes", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const a = u.lehrkraft(e);
  if (!a) return e.json(401, { message: "Bitte anmelden." });
  const body = e.requestInfo().body || {};
  const k = u.eigeneKlasse(a, body.klasse);
  if (!k) return e.json(404, { message: "Klasse nicht gefunden." });
  const anzahl = Math.min(60, Math.max(1, Number(body.anzahl) || 0));
  const neu = [];
  $app.runInTransaction((txApp) => {
    const col = txApp.findCollectionByNameOrId("schueler");
    for (let i = 0; i < anzahl; i++) {
      let code;
      for (let v = 0; v < 20; v++) {
        code = u.neuerCode(k.getString("name"));
        try { txApp.findFirstRecordByData("schueler", "code", code); code = null; } catch (err) { break; }
      }
      if (!code) throw new BadRequestError("Konnte keinen freien Code erzeugen.");
      const r = new Record(col);
      r.set("code", code);
      r.set("klasse", k.getString("name"));
      r.set("klasse_ref", k.id);
      txApp.save(r);
      neu.push(code);
    }
  });
  return e.json(200, { codes: neu });
});

routerAdd("POST", "/api/trainer/konten", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const a = u.lehrkraft(e);
  if (!a) return e.json(401, { message: "Bitte anmelden." });
  const body = e.requestInfo().body || {};
  const k = u.eigeneKlasse(a, body.klasse);
  if (!k) return e.json(404, { message: "Klasse nicht gefunden." });
  const konten = Array.isArray(body.konten) ? body.konten.slice(0, 200) : [];
  const angelegt = [], fehler = [], schonDa = {};
  const col = $app.findCollectionByNameOrId("schueler");
  konten.forEach((z, i) => {
    const name = u.normName(z && z.name);
    let pass = u.text(z && z.pass, 200).trim();
    const grund = !name ? "kein Benutzername" : u.namePruefen(name) || (schonDa[name] || u.nameVergeben(name) ? "Benutzername ist schon vergeben" : "")
      || (pass && pass.length < 4 ? "Passwort zu kurz (mindestens 4 Zeichen)" : "");
    if (grund) { fehler.push({ zeile: i + 1, name: u.text(z && z.name, 60), grund }); return; }
    const neu = !pass;
    if (neu) pass = u.neuesPasswort();
    const r = new Record(col);
    r.set("benutzername", name);
    r.set("password", pass);
    r.set("klasse", k.getString("name"));
    r.set("klasse_ref", k.id);
    u.neuerSchluessel(r);
    $app.save(r);
    schonDa[name] = true;
    angelegt.push({ id: r.id, benutzername: name, passwort: neu ? pass : "" });
  });
  return e.json(200, { angelegt, fehler });
});

routerAdd("POST", "/api/trainer/schueler/{id}/passwort", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const a = u.lehrkraft(e);
  if (!a) return e.json(401, { message: "Bitte anmelden." });
  const s = u.eigenerSchueler(a, e.request.pathValue("id"));
  if (!s || !s.getString("benutzername")) return e.json(404, { message: "Konto nicht gefunden." });
  let pass = u.text((e.requestInfo().body || {}).passwort, 200).trim();
  if (pass && pass.length < 4) return e.json(400, { message: "Das Passwort braucht mindestens 4 Zeichen." });
  if (!pass) pass = u.neuesPasswort();
  s.set("password", pass);
  u.neuerSchluessel(s); // meldet das Konto auf allen Geräten ab
  $app.save(s);
  return e.json(200, { passwort: pass });
});

routerAdd("PATCH", "/api/trainer/schueler/{id}", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const a = u.lehrkraft(e);
  if (!a) return e.json(401, { message: "Bitte anmelden." });
  const s = u.eigenerSchueler(a, e.request.pathValue("id"));
  if (!s) return e.json(404, { message: "Schüler nicht gefunden." });
  const body = e.requestInfo().body || {};
  if ("gesperrt" in body) s.set("gesperrt", !!body.gesperrt);
  if ("klasse" in body) {
    // Umziehen: Fortschritt und Ergebnisse bleiben am Schüler
    const k = u.eigeneKlasse(a, body.klasse);
    if (!k) return e.json(404, { message: "Zielklasse nicht gefunden." });
    s.set("klasse", k.getString("name"));
    s.set("klasse_ref", k.id);
  }
  $app.save(s);
  return e.json(200, { ok: true });
});

routerAdd("DELETE", "/api/trainer/schueler/{id}", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const a = u.lehrkraft(e);
  if (!a) return e.json(401, { message: "Bitte anmelden." });
  const s = u.eigenerSchueler(a, e.request.pathValue("id"));
  if (!s) return e.json(404, { message: "Schüler nicht gefunden." });
  $app.delete(s);
  return e.json(200, { ok: true });
});

routerAdd("GET", "/api/trainer/report", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const a = u.lehrkraft(e);
  if (!a) return e.json(401, { message: "Bitte anmelden." });
  const q = e.request.url.query();
  const k = u.eigeneKlasse(a, q.get("klasse"));
  if (!k) return e.json(404, { message: "Klasse nicht gefunden." });
  const schueler = $app.findRecordsByFilter("schueler", "klasse_ref = {:k}", "code,benutzername", 0, 0, { k: k.id }).map((s) => ({
    id: s.id, code: s.getString("code"), benutzername: s.getString("benutzername"), gesperrt: s.getBool("gesperrt"),
  }));
  if (!schueler.length) return e.json(200, { schueler: [], fortschritt: [], ereignisse: [] });

  const fortschritt = $app.findRecordsByFilter("fortschritt", "schueler.klasse_ref = {:k}", "", 0, 0, { k: k.id });
  let filter = "schueler.klasse_ref = {:k}";
  const params = { k: k.id };
  const von = u.pbDatum(q.get("von")), bis = u.pbDatum(q.get("bis"));
  if (von) { filter += " && created >= {:von}"; params.von = von; }
  if (bis) { filter += " && created <= {:bis}"; params.bis = bis; }
  const ereignisse = $app.findRecordsByFilter("ereignisse", filter, "created", 20000, 0, params);
  return e.json(200, { schueler: schueler, fortschritt: fortschritt, ereignisse: ereignisse });
});

// ---------------- Nur Admin: Lehrkräfte ----------------

routerAdd("GET", "/api/trainer/lehrer", (e) => {
  const list = $app.findRecordsByFilter("lehrer", "id != ''", "anzeigename,benutzername", 0, 0).map((l) => ({
    id: l.id, benutzername: l.getString("benutzername"), anzeigename: l.getString("anzeigename"),
    klassen: $app.countRecords("klassen", $dbx.hashExp({ lehrer: l.id })),
  }));
  return e.json(200, { lehrer: list });
}, $apis.requireSuperuserAuth());

routerAdd("POST", "/api/trainer/lehrer", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const body = e.requestInfo().body || {};
  const name = u.normName(body.benutzername);
  const grund = !name ? "Bitte einen Benutzernamen angeben." : u.namePruefen(name) ? "Benutzername: " + u.namePruefen(name) + "." : u.nameVergeben(name) ? "Dieser Benutzername ist schon vergeben." : "";
  if (grund) return e.json(400, { message: grund });
  let pass = u.text(body.passwort, 200).trim();
  if (pass && pass.length < 8) return e.json(400, { message: "Das Passwort einer Lehrkraft braucht mindestens 8 Zeichen." });
  const neu = !pass;
  if (neu) pass = u.neuesPasswort() + u.neuesPasswort().slice(0, 4);
  const r = new Record($app.findCollectionByNameOrId("lehrer"));
  r.set("benutzername", name);
  r.set("anzeigename", u.text(body.anzeigename, 80).trim());
  r.set("password", pass);
  u.neuerSchluessel(r);
  $app.save(r);
  return e.json(200, { id: r.id, benutzername: name, passwort: neu ? pass : "" });
}, $apis.requireSuperuserAuth());

routerAdd("PATCH", "/api/trainer/lehrer/{id}", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  let r;
  try { r = $app.findRecordById("lehrer", e.request.pathValue("id")); } catch (err) { return e.json(404, { message: "Lehrkraft nicht gefunden." }); }
  const body = e.requestInfo().body || {};
  if (body.anzeigename != null) r.set("anzeigename", u.text(body.anzeigename, 80).trim());
  let pass = "";
  if (body.passwort != null) {
    pass = u.text(body.passwort, 200).trim();
    if (pass && pass.length < 8) return e.json(400, { message: "Das Passwort einer Lehrkraft braucht mindestens 8 Zeichen." });
    if (!pass) pass = u.neuesPasswort() + u.neuesPasswort().slice(0, 4);
    r.set("password", pass);
    u.neuerSchluessel(r); // meldet die Lehrkraft auf allen Geräten ab
  }
  $app.save(r);
  return e.json(200, { passwort: pass });
}, $apis.requireSuperuserAuth());

routerAdd("DELETE", "/api/trainer/lehrer/{id}", (e) => {
  let r;
  try { r = $app.findRecordById("lehrer", e.request.pathValue("id")); } catch (err) { return e.json(404, { message: "Lehrkraft nicht gefunden." }); }
  // Klassen bleiben erhalten und gehen an den Admin
  $app.runInTransaction((txApp) => {
    for (const k of txApp.findRecordsByFilter("klassen", "lehrer = {:l}", "", 0, 0, { l: r.id })) {
      let name = k.getString("name");
      for (let n = 2; ; n++) {
        try { txApp.findFirstRecordByFilter("klassen", "name = {:n} && lehrer = ''", { n: name }); name = k.getString("name") + " (" + n + ")"; } catch (err) { break; }
      }
      k.set("name", name);
      k.set("lehrer", "");
      txApp.save(k);
    }
    txApp.delete(r);
  });
  return e.json(200, { ok: true });
}, $apis.requireSuperuserAuth());
