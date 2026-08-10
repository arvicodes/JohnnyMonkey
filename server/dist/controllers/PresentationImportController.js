"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresentationImportController = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pptxParse_1 = require("../lib/pptxParse");
class PresentationImportController {
    /** PPTX hochladen oder lokalen Pfad lesen → positionierte Boxen (Text/Bild/Form) */
    static async parsePptx(req, res) {
        var _a, _b;
        try {
            let buffer = null;
            let fileName = 'import.pptx';
            const uploaded = req.file;
            if ((_a = uploaded === null || uploaded === void 0 ? void 0 : uploaded.buffer) === null || _a === void 0 ? void 0 : _a.length) {
                buffer = uploaded.buffer;
                fileName = uploaded.originalname || fileName;
            }
            else {
                const filePath = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.filePath) === 'string' ? req.body.filePath.trim() : '';
                if (!filePath) {
                    return res.status(400).json({ error: 'PPTX-Datei oder filePath erforderlich' });
                }
                const resolved = path_1.default.resolve(filePath);
                if (!fs_1.default.existsSync(resolved)) {
                    return res.status(404).json({ error: 'Datei nicht gefunden' });
                }
                const ext = path_1.default.extname(resolved).toLowerCase();
                if (ext !== '.pptx') {
                    return res.status(400).json({ error: 'Nur .pptx wird unterstützt (kein .ppt)' });
                }
                buffer = fs_1.default.readFileSync(resolved);
                fileName = path_1.default.basename(resolved);
            }
            if (!(buffer === null || buffer === void 0 ? void 0 : buffer.length)) {
                return res.status(400).json({ error: 'Leere Datei' });
            }
            if (buffer.length > 80 * 1024 * 1024) {
                return res.status(400).json({ error: 'Datei zu groß (max. 80 MB)' });
            }
            const parsed = (0, pptxParse_1.parsePptxBuffer)(buffer, fileName);
            if (parsed.slides.length === 0) {
                return res.status(400).json({ error: 'Keine Folien in der PPTX gefunden' });
            }
            return res.json(parsed);
        }
        catch (error) {
            console.error('parsePptx error:', error);
            return res.status(500).json({
                error: 'PPTX konnte nicht gelesen werden',
                detail: error instanceof Error ? error.message : String(error),
            });
        }
    }
}
exports.PresentationImportController = PresentationImportController;
//# sourceMappingURL=PresentationImportController.js.map