/// <reference path="../pb_data/types.d.ts" />
// Version 3: Tipptrainer pockettype (eigenes Repo, gebaut nach pb_public/tippen/).
//
// - tipp_ergebnisse: ein Eintrag pro Test. Die wichtigsten Werte als eigene Felder
//                    für die Auswertung, das vollständige Ergebnis in `daten`.
// - tipp_stand:      pro Schüler Erfahrungspunkte, Serie und Tippzeit (meta).
// Beide hängen am Schüler und werden mit ihm gelöscht (auch beim Löschen der Klasse).
migrate((app) => {
  const schueler = app.findCollectionByNameOrId("schueler");

  const ergebnisse = new Collection({
    type: "base",
    name: "tipp_ergebnisse",
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: "schueler",          type: "relation", required: true, collectionId: schueler.id, cascadeDelete: true, maxSelect: 1 },
      { name: "lokal_id",          type: "text", required: true, max: 40 },
      { name: "zeitpunkt",         type: "number" },   // Ende des Tests, ms seit 1970 (aus dem Browser)
      { name: "modus",             type: "text", max: 10 },
      { name: "modus2",            type: "text", max: 20 },
      { name: "sprache",           type: "text", max: 40 },
      { name: "wpm",               type: "number" },
      { name: "roh",               type: "number" },
      { name: "genauigkeit",       type: "number" },
      { name: "gleichmaessigkeit", type: "number" },
      { name: "anschlaege",        type: "number" },
      { name: "dauer",             type: "number" },   // Sekunden
      { name: "satzzeichen",       type: "bool" },
      { name: "zahlen",            type: "bool" },
      { name: "bestwert",          type: "bool" },
      { name: "daten",             type: "json", maxSize: 60000 },
      { name: "created",           type: "autodate", onCreate: true, onUpdate: false },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_tipp_ergebnisse_lokal ON tipp_ergebnisse (schueler, lokal_id)",
      "CREATE INDEX idx_tipp_ergebnisse_zeit ON tipp_ergebnisse (schueler, zeitpunkt)",
    ],
  });
  app.save(ergebnisse);

  const stand = new Collection({
    type: "base",
    name: "tipp_stand",
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: "schueler", type: "relation", required: true, collectionId: schueler.id, cascadeDelete: true, maxSelect: 1 },
      { name: "meta",     type: "json", maxSize: 20000 },
      { name: "stand",    type: "number" },
      { name: "updated",  type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_tipp_stand_schueler ON tipp_stand (schueler)"],
  });
  app.save(stand);
}, (app) => {
  for (const name of ["tipp_stand", "tipp_ergebnisse"]) {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (e) {}
  }
});
