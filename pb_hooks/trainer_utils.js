// Hilfsfunktionen für trainer.pb.js
// (PocketBase führt jede Route in einer eigenen JS-Umgebung aus –
//  gemeinsame Funktionen müssen deshalb per require() geladen werden.)

// Tool-ids stehen in pb_public/katalog.js; hier wird nur das Format geprüft,
// damit neue Tools ohne Änderung am Server gespeichert werden.
const SEITE_RE = /^[a-z0-9][a-z0-9-]{0,19}$/;
function istSeite(s) {
  return typeof s === "string" && SEITE_RE.test(s);
}
const MODI = ["erarbeitung", "uebungen", "endlos"];
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ohne 0/O, 1/I – leichter abzutippen
const PW_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function normCode(c) {
  return String(c || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40);
}

// Benutzernamen: klein geschrieben, 3–40 Zeichen, keine @ (die sind dem Admin vorbehalten)
// und nicht wie ein Zugangscode aufgebaut, damit das Anmeldefeld eindeutig bleibt.
function normName(n) {
  return String(n || "").trim().toLowerCase();
}
function namePruefen(n) {
  if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(n)) return "3–40 Zeichen, nur Buchstaben a–z, Ziffern, Punkt, Minus und Unterstrich";
  if (/^[a-z0-9]{1,6}-[a-z0-9]{4}-[a-z0-9]{4}$/.test(n)) return "sieht aus wie ein Zugangscode";
  return "";
}
function nameVergeben(n) {
  for (const col of ["schueler", "lehrer"]) {
    try { $app.findFirstRecordByData(col, "benutzername", n); return true; } catch (err) {}
  }
  return false;
}

// Anmeldung per Konto: Token = Präfix.id.Signatur, signiert mit einem Schlüssel pro Konto.
// Neues Passwort -> neuer Schlüssel -> alle alten Anmeldungen ungültig.
function neuerSchluessel(rec) {
  rec.set("tokenKey", $security.randomString(40));
}
function token(prefix, rec) {
  if (!rec.getString("tokenKey")) { neuerSchluessel(rec); $app.save(rec); }
  return prefix + "." + rec.id + "." + $security.hs256(rec.id, rec.getString("tokenKey"));
}
function tokenRecord(t, prefix, col) {
  const p = String(t || "").split(".");
  if (p.length !== 3 || p[0] !== prefix) return null;
  try {
    const r = $app.findRecordById(col, p[1]);
    const key = r.getString("tokenKey");
    if (!key || !$security.equal(p[2], $security.hs256(r.id, key))) return null;
    return r;
  } catch (err) {
    return null;
  }
}

// Schüler anhand des Codes oder Konto-Tokens finden; null, wenn unbekannt oder gesperrt
function findSchueler(cred) {
  let r = null;
  if (String(cred || "").startsWith("S.")) r = tokenRecord(cred, "S", "schueler");
  else {
    const c = normCode(cred);
    if (c.length < 6) return null;
    try { r = $app.findFirstRecordByData("schueler", "code", c); } catch (err) {}
  }
  return r && !r.getBool("gesperrt") ? r : null;
}

function schuelerAusAnfrage(e) {
  return findSchueler(e.request.header.get("X-Trainer-Code"));
}

// Lehrkraft oder Admin der Anfrage: {admin:true} | {admin:false, lehrer:Record} | null
function lehrkraft(e) {
  if (e.hasSuperuserAuth()) return { admin: true, lehrer: null };
  const r = tokenRecord(e.request.header.get("X-Lehrer-Token"), "L", "lehrer");
  return r ? { admin: false, lehrer: r } : null;
}

// Klasse holen, wenn die Lehrkraft sie sehen darf (Admin: alle, Lehrkraft: nur eigene)
function eigeneKlasse(a, id) {
  try {
    const k = $app.findRecordById("klassen", String(id || ""));
    return a.admin || k.getString("lehrer") === a.lehrer.id ? k : null;
  } catch (err) {
    return null;
  }
}

// Schüler holen, wenn er in einer Klasse der Lehrkraft ist
function eigenerSchueler(a, id) {
  try {
    const s = $app.findRecordById("schueler", String(id || ""));
    return eigeneKlasse(a, s.getString("klasse_ref")) ? s : null;
  } catch (err) {
    return null;
  }
}

function text(v, max) {
  return String(v == null ? "" : v).slice(0, max);
}

// "2026-10-19T08:00:00.000Z" -> "2026-10-19 08:00:00.000Z" (Datumsformat von PocketBase)
function pbDatum(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().replace("T", " ");
}

function klassenKuerzel(klasse) {
  return String(klasse || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "K";
}

function neuerCode(klasse) {
  const z = $security.randomStringWithAlphabet(8, ALPHABET);
  return klassenKuerzel(klasse) + "-" + z.slice(0, 4) + "-" + z.slice(4);
}

function neuesPasswort() {
  return $security.randomStringWithAlphabet(8, PW_ALPHABET);
}

module.exports = {
  istSeite, MODI, normCode, normName, namePruefen, nameVergeben, neuerSchluessel, token,
  findSchueler, schuelerAusAnfrage, lehrkraft, eigeneKlasse, eigenerSchueler, text, pbDatum, neuerCode, neuesPasswort,
};
