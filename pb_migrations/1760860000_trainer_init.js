/// <reference path="../pb_data/types.d.ts" />
// Legt die Datenbank-Tabellen für vibe learning an.
// Alle Tabellen sind nur für Superuser direkt zugänglich – Schüler greifen
// ausschließlich über die Schnittstellen in pb_hooks/trainer.pb.js darauf zu.
migrate((app) => {
  const schueler = new Collection({
    type: "base",
    name: "schueler",
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: "code",     type: "text", required: true, max: 40 },
      { name: "klasse",   type: "text", required: true, max: 40 },
      { name: "gesperrt", type: "bool" },
      { name: "created",  type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated",  type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_schueler_code ON schueler (code)",
      "CREATE INDEX idx_schueler_klasse ON schueler (klasse)",
    ],
  });
  app.save(schueler);

  const fortschritt = new Collection({
    type: "base",
    name: "fortschritt",
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: "schueler", type: "relation", required: true, collectionId: schueler.id, cascadeDelete: true, maxSelect: 1 },
      { name: "seite",    type: "text", required: true, max: 20 },
      { name: "daten",    type: "json", maxSize: 200000 },
      { name: "stand",    type: "number" },
      { name: "created",  type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated",  type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_fortschritt_schueler_seite ON fortschritt (schueler, seite)"],
  });
  app.save(fortschritt);

  const ereignisse = new Collection({
    type: "base",
    name: "ereignisse",
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: "schueler", type: "relation", required: true, collectionId: schueler.id, cascadeDelete: true, maxSelect: 1 },
      { name: "seite",    type: "text", max: 20 },
      { name: "modus",    type: "text", max: 20 },
      { name: "stufe",    type: "number" },
      { name: "aufgabe",  type: "text", max: 60 },
      { name: "titel",    type: "text", max: 200 },
      { name: "gesamt",   type: "number" },
      { name: "erstmals", type: "bool" },
      { name: "created",  type: "autodate", onCreate: true, onUpdate: false },
    ],
    indexes: ["CREATE INDEX idx_ereignisse_schueler_created ON ereignisse (schueler, created)"],
  });
  app.save(ereignisse);

  // Schutz gegen zu viele Anfragen. Ganze Klassen sitzen oft hinter EINER
  // Schul-IP-Adresse – die Grenzen sind deshalb großzügig.
  const settings = app.settings();
  settings.rateLimits.enabled = true;
  settings.rateLimits.rules = [
    { label: "POST /api/trainer/login", maxRequests: 60,  duration: 60 },
    { label: "*:auth",                  maxRequests: 5,   duration: 10 },
    { label: "/api/",                   maxRequests: 600, duration: 10 },
  ];
  // Datensparsam: Server-Protokolle nur 7 Tage aufheben, keine IP-Adressen speichern
  settings.logs.maxDays = 7;
  settings.logs.logIP = false;
  app.save(settings);
}, (app) => {
  for (const name of ["ereignisse", "fortschritt", "schueler"]) {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (e) {}
  }
});
