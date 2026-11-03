/// <reference path="../pb_data/types.d.ts" />
// Version 5: Tipp-Aufgaben. Die Lehrkraft gibt einer Klasse einen Text zum Abschreiben auf
// (pb_public/tippen/aufgabe.html). Ergebnisse merken die Aufgabe und ob der Text vollständig war.
migrate((app) => {
  const klassen = app.findCollectionByNameOrId("klassen");
  const aufgaben = new Collection({
    type: "base",
    name: "tipp_aufgaben",
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: "klasse",  type: "relation", required: true, collectionId: klassen.id, cascadeDelete: true, maxSelect: 1 },
      { name: "titel",   type: "text", required: true, max: 120 },
      { name: "text",    type: "text", required: true, max: 20000 },
      { name: "bis",     type: "text", max: 30 },     // Abgabe bis (ISO-Datum), leer = ohne Frist
      { name: "aktiv",   type: "bool" },              // beendete Aufgaben sehen die Schüler nicht mehr
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
    ],
    indexes: ["CREATE INDEX idx_tipp_aufgaben_klasse ON tipp_aufgaben (klasse)"],
  });
  app.save(aufgaben);

  const erg = app.findCollectionByNameOrId("tipp_ergebnisse");
  erg.fields.add(new TextField({ name: "aufgabe", max: 20 }));
  erg.fields.add(new BoolField({ name: "vollstaendig" }));
  app.save(erg);
}, (app) => {
  const erg = app.findCollectionByNameOrId("tipp_ergebnisse");
  erg.fields.removeByName("aufgabe");
  erg.fields.removeByName("vollstaendig");
  app.save(erg);
  try { app.delete(app.findCollectionByNameOrId("tipp_aufgaben")); } catch (e) {}
});
