// vibe learning: Ersatz für @pdfme/converter. Berichte nutzen nur leere Seiten (basePdf {width, height, padding}),
// eigene PDF-Hintergründe werden nicht unterstützt. Spart den PDF-Renderer pdfium (mehrere MB).
const nein = () => Promise.reject(new Error('PDF-Hintergründe werden nicht unterstützt'));
export const pdf2img = nein, pdf2size = nein;
