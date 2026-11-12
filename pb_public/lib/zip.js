/* zip.js – ZIP-Datei im Browser erzeugen (für das ByCS-Paket in IT/tools/uebung-erstellen.html)
 *
 *   Zip.erstelle([[name, text], …]) → Promise<Blob> (application/zip)
 *
 * Text wird als UTF-8 gespeichert. Gepackt wird mit CompressionStream('deflate-raw'), wenn der Browser es kann,
 * sonst ungepackt (STORE). Alle Einträge tragen die feste Zeit 01.01.2026 00:00 wie in werkzeuge/bycs-pakete.py
 * (ZEIT), Rechte 644. Keine Ordner, keine ZIP64 (Dateien bleiben weit unter 4 GB).
 */
(function () {
  'use strict';
  const TABELLE = new Uint32Array(256).map((_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  function crc32(b) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < b.length; i++) c = TABELLE[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  const ZEIT = 0, DATUM = ((2026 - 1980) << 9) | (1 << 5) | 1;   // DOS-Format: 01.01.2026 00:00:00

  async function packen(roh) {
    if (typeof CompressionStream !== 'function') return null;
    try {
      const strom = new Blob([roh]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      return new Uint8Array(await new Response(strom).arrayBuffer());
    } catch (e) { return null; }                   // 'deflate-raw' unbekannt (ältere Browser)
  }

  async function erstelle(eintraege) {
    const enc = new TextEncoder(), teile = [], verzeichnis = [];
    let pos = 0;
    for (const [name, text] of eintraege) {
      const n = enc.encode(name), roh = enc.encode(String(text));
      const gepackt = await packen(roh), daten = gepackt && gepackt.length < roh.length ? gepackt : roh;
      const methode = daten === roh ? 0 : 8, crc = crc32(roh);
      const kopf = new DataView(new ArrayBuffer(30));
      kopf.setUint32(0, 0x04034b50, true); kopf.setUint16(4, 20, true); kopf.setUint16(6, 0x0800, true);   // Bit 11: Namen in UTF-8
      kopf.setUint16(8, methode, true); kopf.setUint16(10, ZEIT, true); kopf.setUint16(12, DATUM, true);
      kopf.setUint32(14, crc, true); kopf.setUint32(18, daten.length, true); kopf.setUint32(22, roh.length, true);
      kopf.setUint16(26, n.length, true); kopf.setUint16(28, 0, true);
      teile.push(new Uint8Array(kopf.buffer), n, daten);
      const z = new DataView(new ArrayBuffer(46));
      z.setUint32(0, 0x02014b50, true); z.setUint16(4, 0x0314, true); z.setUint16(6, 20, true); z.setUint16(8, 0x0800, true);
      z.setUint16(10, methode, true); z.setUint16(12, ZEIT, true); z.setUint16(14, DATUM, true);
      z.setUint32(16, crc, true); z.setUint32(20, daten.length, true); z.setUint32(24, roh.length, true);
      z.setUint16(28, n.length, true); z.setUint32(38, (0o100644 << 16) >>> 0, true); z.setUint32(42, pos, true);
      verzeichnis.push(new Uint8Array(z.buffer), n);
      pos += 30 + n.length + daten.length;
    }
    const groesse = verzeichnis.reduce((s, t) => s + t.length, 0);
    const ende = new DataView(new ArrayBuffer(22));
    ende.setUint32(0, 0x06054b50, true); ende.setUint16(8, eintraege.length, true); ende.setUint16(10, eintraege.length, true);
    ende.setUint32(12, groesse, true); ende.setUint32(16, pos, true);
    return new Blob([...teile, ...verzeichnis, new Uint8Array(ende.buffer)], {type: 'application/zip'});
  }

  window.Zip = {erstelle, crc32};
})();
