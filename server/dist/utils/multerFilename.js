"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeMulterFilename = decodeMulterFilename;
exports.filenameLookupVariants = filenameLookupVariants;
/**
 * Multer/busboy liest Content-Disposition-Dateinamen als Latin-1.
 * UTF-8-Bytes (z. B. „Münzen.png“) landen dann als Mojibake auf der Platte,
 * während der Client den korrekten Unicode-Namen im Deck speichert → 404.
 */
function decodeMulterFilename(name) {
    const raw = (name || '').trim() || 'file';
    // Schon echte Unicode-Zeichen außerhalb Latin-1 → nicht nochmal „decoden“
    if (/[^\u0000-\u00FF]/.test(raw)) {
        return raw.normalize('NFC');
    }
    try {
        const decoded = Buffer.from(raw, 'latin1').toString('utf8');
        if (decoded && !decoded.includes('\uFFFD')) {
            return decoded.normalize('NFC');
        }
    }
    catch {
        /* ignore */
    }
    return raw.normalize('NFC');
}
/** Sichere Varianten fürs Auflösen existierender Dateien (NFC/NFD/Mojibake). */
function filenameLookupVariants(filePath) {
    const norm = filePath.replace(/\\/g, '/');
    const variants = new Set([norm]);
    try {
        variants.add(norm.normalize('NFC'));
        variants.add(norm.normalize('NFD'));
    }
    catch {
        /* ignore */
    }
    const base = norm.split('/').pop() || '';
    const dir = norm.slice(0, Math.max(0, norm.length - base.length));
    try {
        // Client hat korrekten Unicode, Datei liegt als Latin-1-Mojibake
        const mojibake = Buffer.from(base, 'utf8').toString('latin1');
        if (mojibake && mojibake !== base) {
            variants.add(`${dir}${mojibake}`);
        }
    }
    catch {
        /* ignore */
    }
    try {
        // Umgekehrt: Pfad ist Mojibake, Datei wurde inzwischen korrigiert
        const fixed = Buffer.from(base, 'latin1').toString('utf8');
        if (fixed && !fixed.includes('\uFFFD') && fixed !== base) {
            variants.add(`${dir}${fixed.normalize('NFC')}`);
            variants.add(`${dir}${fixed.normalize('NFD')}`);
        }
    }
    catch {
        /* ignore */
    }
    return Array.from(variants);
}
//# sourceMappingURL=multerFilename.js.map