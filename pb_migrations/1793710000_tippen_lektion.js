/// <reference path="../pb_data/types.d.ts" />
// Version 4: Tipp-Ergebnisse merken die TIPP10-Lektion („Lektion üben“, pb_public/tippen/lektionen.html).
migrate((app) => {
  const col = app.findCollectionByNameOrId("tipp_ergebnisse");
  col.fields.add(new NumberField({ name: "lektion" }));   // 0 = freier Test in pockettype
  app.save(col);
}, (app) => {
  const col = app.findCollectionByNameOrId("tipp_ergebnisse");
  col.fields.removeByName("lektion");
  app.save(col);
});
