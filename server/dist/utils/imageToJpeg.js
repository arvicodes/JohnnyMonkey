"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHeicPath = isHeicPath;
exports.fileToJpegBuffer = fileToJpegBuffer;
exports.readImageFileForServe = readImageFileForServe;
exports.uploadBufferToJpegBuffer = uploadBufferToJpegBuffer;
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const HEIC_EXT = new Set(['.heic', '.heif']);
const RASTER_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tif', '.tiff']);
/** Formate mit Alpha — nicht nach JPEG wandeln (Transparenz weg). */
const ALPHA_EXT = new Set(['.png', '.webp', '.gif']);
function isHeicPath(filePath) {
    return HEIC_EXT.has(path_1.default.extname(filePath).toLowerCase());
}
function mimeForExt(ext) {
    switch (ext) {
        case '.png':
            return 'image/png';
        case '.gif':
            return 'image/gif';
        case '.bmp':
            return 'image/bmp';
        case '.webp':
            return 'image/webp';
        case '.avif':
            return 'image/avif';
        case '.svg':
            return 'image/svg+xml';
        case '.jpg':
        case '.jpeg':
        default:
            return 'image/jpeg';
    }
}
async function sipsHeicToJpeg(inputPath, outputPath, maxEdge) {
    const args = maxEdge
        ? ['-Z', String(maxEdge), '-s', 'format', 'jpeg', inputPath, '--out', outputPath]
        : ['-s', 'format', 'jpeg', inputPath, '--out', outputPath];
    await execFileAsync('sips', args);
    return fs_1.default.readFileSync(outputPath);
}
/** HEIC/HEIF → JPEG (macOS: sips). Optional maxEdge für schnelle Vorschau. */
async function fileToJpegBuffer(filePath, maxEdge) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    if (!HEIC_EXT.has(ext)) {
        return fs_1.default.readFileSync(filePath);
    }
    if (process.platform !== 'darwin') {
        throw new Error('HEIC-Konvertierung nur auf macOS verfügbar');
    }
    const tmpOut = path_1.default.join(os_1.default.tmpdir(), `heic-out-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
    try {
        return await sipsHeicToJpeg(filePath, tmpOut, maxEdge);
    }
    finally {
        try {
            if (fs_1.default.existsSync(tmpOut))
                fs_1.default.unlinkSync(tmpOut);
        }
        catch {
            /* ignore */
        }
    }
}
function readSipsPixelEdge(filePath) {
    try {
        const out = (0, child_process_1.execFileSync)('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', filePath], {
            encoding: 'utf8',
        });
        const w = /pixelWidth:\s*(\d+)/.exec(out);
        const h = /pixelHeight:\s*(\d+)/.exec(out);
        if (!w || !h)
            return null;
        return Math.max(parseInt(w[1], 10), parseInt(h[1], 10));
    }
    catch {
        return null;
    }
}
/**
 * Liest ein Bild; bei maxEdge auf macOS per sips verkleinern,
 * damit Editor/Filmstrip nicht Multi-MB-Originale laden.
 * PNG/WebP/GIF bleiben PNG (kein JPEG — Transparenz bleibt).
 * Kleine Bilder werden nicht hochskaliert.
 */
async function readImageFileForServe(filePath, maxEdge) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    if (isHeicPath(filePath)) {
        const buffer = await fileToJpegBuffer(filePath, maxEdge !== null && maxEdge !== void 0 ? maxEdge : 1200);
        return { buffer, mimeType: 'image/jpeg' };
    }
    if (ext === '.svg' || !RASTER_EXT.has(ext) || !maxEdge || process.platform !== 'darwin') {
        return { buffer: fs_1.default.readFileSync(filePath), mimeType: mimeForExt(ext) };
    }
    const edge = readSipsPixelEdge(filePath);
    if (edge != null && edge <= maxEdge) {
        return { buffer: fs_1.default.readFileSync(filePath), mimeType: mimeForExt(ext) };
    }
    const keepAlpha = ALPHA_EXT.has(ext);
    const outExt = keepAlpha ? '.png' : '.jpg';
    const outFormat = keepAlpha ? 'png' : 'jpeg';
    const tmpOut = path_1.default.join(os_1.default.tmpdir(), `img-max-${Date.now()}-${Math.random().toString(36).slice(2)}${outExt}`);
    try {
        await execFileAsync('sips', [
            '-Z',
            String(maxEdge),
            '-s',
            'format',
            outFormat,
            filePath,
            '--out',
            tmpOut,
        ]);
        return {
            buffer: fs_1.default.readFileSync(tmpOut),
            mimeType: keepAlpha ? 'image/png' : 'image/jpeg',
        };
    }
    catch (e) {
        console.warn('sips resize failed, serving original:', filePath, e);
        return { buffer: fs_1.default.readFileSync(filePath), mimeType: mimeForExt(ext) };
    }
    finally {
        try {
            if (fs_1.default.existsSync(tmpOut))
                fs_1.default.unlinkSync(tmpOut);
        }
        catch {
            /* ignore */
        }
    }
}
async function uploadBufferToJpegBuffer(buf, originalName, maxEdge) {
    const ext = path_1.default.extname(originalName).toLowerCase();
    if (!HEIC_EXT.has(ext))
        return buf;
    if (process.platform !== 'darwin') {
        throw new Error('HEIC-Konvertierung nur auf macOS verfügbar');
    }
    const tmpIn = path_1.default.join(os_1.default.tmpdir(), `heic-up-${Date.now()}${ext}`);
    const tmpOut = path_1.default.join(os_1.default.tmpdir(), `heic-up-${Date.now()}.jpg`);
    try {
        fs_1.default.writeFileSync(tmpIn, buf);
        return await sipsHeicToJpeg(tmpIn, tmpOut, maxEdge);
    }
    finally {
        for (const p of [tmpIn, tmpOut]) {
            try {
                if (fs_1.default.existsSync(p))
                    fs_1.default.unlinkSync(p);
            }
            catch {
                /* ignore */
            }
        }
    }
}
//# sourceMappingURL=imageToJpeg.js.map