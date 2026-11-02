/// <reference path="../pb_data/types.d.ts" />
// Version 2: Klassen gehören Lehrkräften, Schüler können statt eines Codes
// ein Konto mit Benutzername und Passwort haben.
//
// - lehrer:   Konten der Lehrkräfte (der Admin ist weiterhin der PocketBase-Superuser)
// - klassen:  jede Klasse gehört einer Lehrkraft; leer = gehört dem Admin
// - schueler: neue Felder benutzername, password, klasse_ref
// Bestehende Klassen werden dem Admin zugeordnet.
migrate((app) => {
  const lehrer = new Collection({
    type: "base",
    name: "lehrer",
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: "benutzername", type: "text", required: true, max: 40 },
      { name: "anzeigename",  type: "text", max: 80 },
      { name: "password",     type: "password", hidden: true },
      { name: "tokenKey",     type: "text", hidden: true, max: 60 },
      { name: "created",      type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated",      type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_lehrer_benutzername ON lehrer (benutzername)"],
  });
  app.save(lehrer);

  const klassen = new Collection({
    type: "base",
    name: "klassen",
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: "name",    type: "text", required: true, max: 40 },
      { name: "lehrer",  type: "relation", collectionId: lehrer.id, cascadeDelete: false, maxSelect: 1 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_klassen_lehrer_name ON klassen (lehrer, name)"],
  });
  app.save(klassen);

  const schueler = app.findCollectionByNameOrId("schueler");
  schueler.fields.getByName("code").required = false;
  schueler.fields.add(new TextField({ name: "benutzername", max: 40 }));
  schueler.fields.add(new PasswordField({ name: "password", hidden: true }));
  schueler.fields.add(new TextField({ name: "tokenKey", hidden: true, max: 60 }));
  schueler.fields.add(new RelationField({ name: "klasse_ref", collectionId: klassen.id, cascadeDelete: true, maxSelect: 1 }));
  schueler.indexes = [
    "CREATE UNIQUE INDEX idx_schueler_code ON schueler (code) WHERE code != ''",
    "CREATE UNIQUE INDEX idx_schueler_benutzername ON schueler (benutzername) WHERE benutzername != ''",
    "CREATE INDEX idx_schueler_klasse ON schueler (klasse)",
    "CREATE INDEX idx_schueler_klasse_ref ON schueler (klasse_ref)",
  ];
  app.save(schueler);

  // bestehende Klassen (bisher nur ein Text im Schüler) als Klassen des Admins anlegen
  const ids = {};
  for (const s of app.findRecordsByFilter("schueler", "id != ''", "", 0, 0)) {
    const name = s.getString("klasse");
    if (!ids[name]) {
      const k = new Record(klassen);
      k.set("name", name);
      app.save(k);
      ids[name] = k.id;
    }
    s.set("klasse_ref", ids[name]);
    app.save(s);
  }
}, (app) => {
  const schueler = app.findCollectionByNameOrId("schueler");
  for (const f of ["benutzername", "password", "tokenKey", "klasse_ref"]) schueler.fields.removeByName(f);
  schueler.fields.getByName("code").required = true;
  schueler.indexes = [
    "CREATE UNIQUE INDEX idx_schueler_code ON schueler (code)",
    "CREATE INDEX idx_schueler_klasse ON schueler (klasse)",
  ];
  app.save(schueler);
  for (const name of ["klassen", "lehrer"]) {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (e) {}
  }
});
