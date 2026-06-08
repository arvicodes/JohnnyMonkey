"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exifValueToDateISO = exifValueToDateISO;
exports.firstExifDateISO = firstExifDateISO;
exports.extractDateFromFileName = extractDateFromFileName;
exports.readCaptureDateISOFromPath = readCaptureDateISOFromPath;
exports.readCaptureDateISOFromBuffer = readCaptureDateISOFromBuffer;
const exifr_1 = __importDefault(require("exifr"));
const EXIF_DATE_PICK = [
    'DateTimeOriginal',
    'CreateDate',
    'ModifyDate',
    'CreationDate',
    'MediaCreateDate',
    'ContentCreateDate',
];
const EXIF_PARSE_OPTS = {
    pick: [...EXIF_DATE_PICK],
    reviveValues: false,
};
/** EXIF-Zeitstempel → YYYY-MM-DD (Kalenderdatum aus EXIF-String, ohne Zeitzonen-Verschiebung). */
function exifValueToDateISO(raw) {
    if (raw == null)
        return null;
    if (typeof raw === 'string') {
        const m = raw.match(/(\d{4})[:\-.](\d{2})[:\-.](\d{2})/);
        if (m)
            return `${m[1]}-${m[2]}-${m[3]}`;
    }
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
        const y = raw.getFullYear();
        const m = raw.getMonth() + 1;
        const d = raw.getDate();
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
}
function firstExifDateISO(tags) {
    if (!tags)
        return null;
    for (const key of EXIF_DATE_PICK) {
        const iso = exifValueToDateISO(tags[key]);
        if (iso)
            return iso;
    }
    return null;
}
function extractDateFromFileName(fileName) {
    const base = fileName.replace(/\.[^.]+$/, '');
    const patterns = [
        /(?:^|[^\d])(\d{4})[-_]?(\d{2})[-_]?(\d{2})(?:[^\d]|$)/,
        /(?:^|[^\d])(\d{2})[-_]?(\d{2})[-_]?(\d{4})(?:[^\d]|$)/,
    ];
    for (const re of patterns) {
        const m = base.match(re);
        if (!m)
            continue;
        if (m[1].length === 4) {
            const iso = `${m[1]}-${m[2]}-${m[3]}`;
            if (/^\d{4}-\d{2}-\d{2}$/.test(iso))
                return iso;
        }
        else {
            const iso = `${m[3]}-${m[2]}-${m[1]}`;
            if (/^\d{4}-\d{2}-\d{2}$/.test(iso))
                return iso;
        }
    }
    return null;
}
async function readCaptureDateISOFromPath(fullPath) {
    try {
        const tags = await exifr_1.default.parse(fullPath, EXIF_PARSE_OPTS);
        const fromExif = firstExifDateISO(tags);
        if (fromExif)
            return fromExif;
    }
    catch {
        /* EXIF optional */
    }
    return extractDateFromFileName(fullPath);
}
async function readCaptureDateISOFromBuffer(buffer, fileName) {
    try {
        const tags = await exifr_1.default.parse(buffer, EXIF_PARSE_OPTS);
        const fromExif = firstExifDateISO(tags);
        if (fromExif)
            return fromExif;
    }
    catch {
        /* EXIF optional */
    }
    return extractDateFromFileName(fileName);
}
//# sourceMappingURL=exifCaptureDate.js.map