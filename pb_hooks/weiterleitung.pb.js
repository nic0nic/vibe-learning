/// <reference path="../pb_data/types.d.ts" />
// Alte Adressen weiterleiten: Seit dem 04.11. liegen die IT-Übungen unter pb_public/IT/
// (vorher z. B. /excel/wenn.html, jetzt /IT/excel/wenn.html). Lesezeichen und Links der Schüler
// funktionieren so weiter. Jeder Handler läuft für sich, daher steht der Code fünfmal da.
routerAdd("GET", "/excel/{pfad...}", (e) => e.redirect(301, "/IT" + e.request.url.path + (e.request.url.rawQuery ? "?" + e.request.url.rawQuery : "")));
routerAdd("GET", "/python/{pfad...}", (e) => e.redirect(301, "/IT" + e.request.url.path + (e.request.url.rawQuery ? "?" + e.request.url.rawQuery : "")));
routerAdd("GET", "/datenbanken/{pfad...}", (e) => e.redirect(301, "/IT" + e.request.url.path + (e.request.url.rawQuery ? "?" + e.request.url.rawQuery : "")));
routerAdd("GET", "/tippen/{pfad...}", (e) => e.redirect(301, "/IT" + e.request.url.path + (e.request.url.rawQuery ? "?" + e.request.url.rawQuery : "")));
routerAdd("GET", "/tools/{pfad...}", (e) => e.redirect(301, "/IT" + e.request.url.path + (e.request.url.rawQuery ? "?" + e.request.url.rawQuery : "")));
