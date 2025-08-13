"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const JMReihenController_1 = require("../controllers/JMReihenController");
const router = express_1.default.Router();
const jmReihenController = new JMReihenController_1.JMReihenController();
// Alle Ordner-Strukturen für alle Lerngruppen laden
router.get('/all', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield jmReihenController.getAllFolderStructures();
        if (result.success) {
            res.json(result.data);
        }
        else {
            res.status(500).json({ error: result.error });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Interner Server-Fehler' });
    }
}));
// Ordner-Struktur für eine spezifische Lerngruppe laden
router.get('/:groupId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { groupId } = req.params;
        const result = yield jmReihenController.getFolderStructure(groupId);
        if (result.success) {
            res.json(result.data);
        }
        else {
            res.status(500).json({ error: result.error });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Interner Server-Fehler' });
    }
}));
// Ordner-Struktur für eine Lerngruppe speichern
router.post('/:groupId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { groupId } = req.params;
        const folderData = req.body;
        const result = yield jmReihenController.saveFolderStructure(groupId, folderData);
        if (result.success) {
            res.json({ message: 'Ordner-Struktur erfolgreich gespeichert' });
        }
        else {
            res.status(500).json({ error: result.error });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Interner Server-Fehler' });
    }
}));
// Ordner-Struktur für eine Lerngruppe löschen
router.delete('/:groupId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { groupId } = req.params;
        const result = yield jmReihenController.deleteFolderStructure(groupId);
        if (result.success) {
            res.json({ message: 'Ordner-Struktur erfolgreich gelöscht' });
        }
        else {
            res.status(500).json({ error: result.error });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Interner Server-Fehler' });
    }
}));
// Neue Route: Live-Ordner-Inhalt für eine Lerngruppe
router.get('/:groupId/live', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { groupId } = req.params;
        const liveFolders = yield jmReihenController.getLiveFolderStructureForGroup(groupId);
        res.json(liveFolders);
    }
    catch (error) {
        console.error('Fehler beim Laden der Live-Ordner-Struktur:', error);
        res.status(500).json({
            error: 'Fehler beim Laden der Live-Ordner-Struktur',
            details: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
}));
exports.default = router;
