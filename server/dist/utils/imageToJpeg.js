"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHeicPath = isHeicPath;
exports.fileToJpegBuffer = fileToJpegBuffer;
exports.uploadBufferToJpegBuffer = uploadBufferToJpegBuffer;
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const HEIC_EXT = new Set(['.heic', '.heif']);
function isHeicPath(filePath) {
    return HEIC_EXT.has(path_1.default.extname(filePath).toLowerCase());
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