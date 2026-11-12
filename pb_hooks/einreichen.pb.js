/// <reference path="../pb_data/types.d.ts" />
// Einreichen von Übungen aus IT/tools/uebung-erstellen.html (früher vorlage.html): Lehrkraft schickt Aufgaben-JSON + Bereich, der Server baut die Seite
// (pb_public/lib/seite.js), trägt sie in katalog.js (Abschnitt EINREICHUNGEN) ein und stellt über die GitHub-API
// einen Pull Request gegen main. Lehrkräfte brauchen kein GitHub-Konto.
//
// Umgebung (systemd: EnvironmentFile=/etc/vibe-learning.env, siehe ANLEITUNG.md):
//   VIBE_GITHUB_TOKEN   fine-grained Token, nur für das Repo, Rechte: Contents + Pull requests (Lesen und Schreiben)
//   VIBE_GITHUB_REPO    Standard nic0nic/vibe-learning
//   VIBE_GITHUB_DRYRUN  1 = nichts an GitHub schicken, nur die erzeugten Dateien zurückgeben (zum Testen)
// Höchstens 10 Einreichungen pro Lehrkraft und Tag (Zähler im Speicher, zurückgesetzt beim Neustart).

routerAdd("POST", "/api/trainer/einreichen", (e) => {
  const u = require(`${__hooks}/trainer_utils.js`);
  const Seite = require(`${__hooks}/../pb_public/lib/seite.js`);
  const a = u.lehrkraft(e);
  if (!a) return e.json(401, { message: "Nur für angemeldete Lehrkräfte." });

  const body = e.requestInfo().body || {};
  const roh = String(body.json || "");
  if (roh.length > Seite.MAX) return e.json(400, { message: "Die Aufgaben sind zu umfangreich." });
  let daten;
  try { daten = JSON.parse(roh); } catch (err) { return e.json(400, { message: "Das JSON ist nicht gültig: " + String(err).slice(0, 160) }); }
  if (body.titel) daten.titel = u.text(body.titel, 120).trim();
  if (body.kurztext != null) daten.kurztext = u.text(body.kurztext, 300).trim();
  const fehler = Seite.pruefe(daten);
  if (fehler.length) return e.json(400, { message: "Bitte zuerst korrigieren.", fehler: fehler.slice(0, 20) });

  const tag = new Date().toISOString().slice(0, 10), wer = a.admin ? "admin" : a.lehrer.id, zKey = `einreichen:${wer}:${tag}`;
  const anzahl = Number($app.store().get(zKey) || 0);
  if (anzahl >= 10) return e.json(429, { message: "Heute wurden schon 10 Übungen eingereicht. Bitte morgen weiter." });

  const repo = $os.getenv("VIBE_GITHUB_REPO") || "nic0nic/vibe-learning";
  const token = $os.getenv("VIBE_GITHUB_TOKEN");
  const trocken = $os.getenv("VIBE_GITHUB_DRYRUN") === "1";
  if (!token && !trocken) return e.json(503, { message: "Einreichen ist auf diesem Server noch nicht eingerichtet (GitHub-Zugang fehlt)." });

  const gh = (method, pfad, daten, roh) => {
    const res = $http.send({
      url: `https://api.github.com/repos/${repo}${pfad}`, method, timeout: 30,
      body: daten ? JSON.stringify(daten) : "",
      headers: { "Authorization": "Bearer " + token, "Accept": roh ? "application/vnd.github.raw+json" : "application/vnd.github+json",
                 "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json", "User-Agent": "vibe-learning" }
    });
    if (res.statusCode >= 300) throw new Error(`GitHub ${method} ${pfad}: ${res.statusCode} ${toString(res.body).slice(0, 200)}`);
    return roh ? toString(res.body) : res.json;
  };

  try {
    // Katalog lesen (GitHub main bzw. beim Testen die Datei auf dem Server) und Bereich prüfen
    const katalogText = trocken ? toString($os.readFile(`${__hooks}/../pb_public/katalog.js`)) : gh("GET", "/contents/pb_public/katalog.js?ref=main", null, true);
    const m = katalogText.match(/\/\* EINREICHUNGEN-ANFANG \*\/([\s\S]*?)\/\* EINREICHUNGEN-ENDE \*\//);
    if (!m) throw new Error("katalog.js: Markierungen EINREICHUNGEN-ANFANG/-ENDE fehlen");
    const liste = JSON.parse(m[1]);
    // Bereich prüfen, ohne Code auszuführen: Ordner im erlaubten Format, letzte Stelle = Bereich-id, und auf diesem
    // Server gibt es dort eine Bereichsseite (index.html mit data-bereich="<pfad>")
    const pfad = String(body.pfad || "");
    if (!/^[A-Za-z0-9]+(\/[A-Za-z0-9]+)?\/[a-z0-9-]+$/.test(pfad) || pfad.split("/").pop() !== body.bereich)
      return e.json(400, { message: "Unbekannter Bereich. Bitte einen Bereich aus der Liste wählen." });
    let seiteBereich = "";
    try { seiteBereich = toString($os.readFile(`${__hooks}/../pb_public/${pfad}/index.html`)); } catch (err) {}
    if (seiteBereich.indexOf(`data-bereich="${pfad}"`) < 0) return e.json(400, { message: "Unbekannter Bereich. Bitte einen Bereich aus der Liste wählen." });
    const bereich = { id: body.bereich };

    const id = Seite.toolId(daten.titel, $security.randomStringWithAlphabet(4, "abcdefghijklmnopqrstuvwxyz0123456789"));
    const datei = id + ".html";
    const seitePfad = `pb_public/${pfad}/${datei}`;
    const html = Seite.seiteHTML(daten, { pfad, toolId: id });
    liste.push({ bereich: bereich.id, tool: { id, datei, titel: daten.titel, text: daten.kurztext || "" } });
    const neuerKatalog = katalogText.replace(m[0], "/* EINREICHUNGEN-ANFANG */ " + JSON.stringify(liste, null, 2) + " /* EINREICHUNGEN-ENDE */");

    $app.store().set(zKey, anzahl + 1);
    if (trocken) return e.json(200, { dryrun: true, pfad: seitePfad, html, katalog: neuerKatalog });

    // Git-Daten-API: Blobs → Baum → Commit → Zweig → Pull Request
    const basis = gh("GET", "/git/ref/heads/main").object.sha;
    const baum = gh("GET", `/git/commits/${basis}`).tree.sha;
    const blob = text => gh("POST", "/git/blobs", { content: text, encoding: "utf-8" }).sha;
    const neuerBaum = gh("POST", "/git/trees", { base_tree: baum, tree: [
      { path: seitePfad, mode: "100644", type: "blob", sha: blob(html) },
      { path: "pb_public/katalog.js", mode: "100644", type: "blob", sha: blob(neuerKatalog) } ] }).sha;
    const commit = gh("POST", "/git/commits", { message: `Einreichung: ${daten.titel} (${pfad})`, tree: neuerBaum, parents: [basis] }).sha;
    const zweig = "einreichung/" + id;
    gh("POST", "/git/refs", { ref: "refs/heads/" + zweig, sha: commit });
    const typen = {};
    Seite.normalisiere(daten).schritte.forEach(s => (s.aufgaben || []).forEach(x => { typen[x.typ] = (typen[x.typ] || 0) + 1; }));
    const pr = gh("POST", "/pulls", { title: `Neue Übung: ${daten.titel}`, head: zweig, base: "main",
      body: `Eingereicht über vl.nimals.de/IT/tools/uebung-erstellen.html.\n\n- **Bereich:** ${pfad}\n- **Datei:** \`${seitePfad}\`\n- **Kurztext:** ${daten.kurztext || "–"}\n`
        + `- **Schritte:** ${Seite.normalisiere(daten).schritte.length}, Aufgaben: ${Object.keys(typen).map(k => k + " " + typen[k]).join(", ") || "keine"}\n\n`
        + `Nach dem Mergen: \`python3 werkzeuge/einzeldateien.py\` und \`python3 werkzeuge/bycs-pakete.py\` laufen lassen und mit \`git push origin main:live\` freigeben.` });
    return e.json(200, { url: pr.html_url, pfad: seitePfad });
  } catch (err) {
    console.log("einreichen:", String(err));
    return e.json(502, { message: "Einreichen hat nicht geklappt. Bitte später noch einmal versuchen.", detail: String(err).slice(0, 300) });
  }
});
