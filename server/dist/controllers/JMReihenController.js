"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JMReihenController = void 0;
const prisma_1 = require("../generated/prisma");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const prisma = new prisma_1.PrismaClient();
class JMReihenController {
    // Ordner-Struktur für eine Lerngruppe speichern
    saveFolderStructure(groupId, folderData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Zuerst alle bestehenden Einträge für diese Gruppe löschen
                yield prisma.jMReihen.deleteMany({
                    where: { groupId }
                });
                // Neue Struktur rekursiv speichern
                const savedItems = yield this.saveFolderRecursive(groupId, folderData, null);
                return { success: true, data: savedItems };
            }
            catch (error) {
                console.error('Fehler beim Speichern der Ordner-Struktur:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
            }
        });
    }
    // Rekursiv Ordner und Dateien speichern
    saveFolderRecursive(groupId, item, parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const savedItem = yield prisma.jMReihen.create({
                data: {
                    groupId,
                    path: item.path,
                    name: item.name,
                    type: item.type || 'folder',
                    parentId,
                    order: 0
                }
            });
            // Wenn es ein Ordner ist, Unterordner und Dateien speichern
            if (item.subfolders && item.subfolders.length > 0) {
                for (let i = 0; i < item.subfolders.length; i++) {
                    yield this.saveFolderRecursive(groupId, item.subfolders[i], savedItem.id);
                }
            }
            if (item.files && item.files.length > 0) {
                for (let i = 0; i < item.files.length; i++) {
                    const file = item.files[i];
                    if (!file.name.startsWith('.')) { // Versteckte Dateien überspringen
                        yield prisma.jMReihen.create({
                            data: {
                                groupId,
                                path: file.path,
                                name: file.name,
                                type: 'file',
                                parentId: savedItem.id,
                                order: i
                            }
                        });
                    }
                }
            }
            return savedItem;
        });
    }
    // Ordner-Struktur für eine Lerngruppe laden
    getFolderStructure(groupId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const items = yield prisma.jMReihen.findMany({
                    where: { groupId },
                    orderBy: [
                        { parentId: 'asc' },
                        { order: 'asc' }
                    ]
                });
                // Hierarchische Struktur aufbauen
                const structure = this.buildHierarchy(items);
                return { success: true, data: structure };
            }
            catch (error) {
                console.error('Fehler beim Laden der Ordner-Struktur:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
            }
        });
    }
    // Hierarchische Struktur aus flachen Daten aufbauen
    buildHierarchy(items) {
        const itemMap = new Map();
        const roots = [];
        // Alle Items in Map einfügen
        items.forEach(item => {
            itemMap.set(item.id, Object.assign(Object.assign({}, item), { subfolders: [], files: [] }));
        });
        // Hierarchie aufbauen
        items.forEach(item => {
            if (item.parentId) {
                const parent = itemMap.get(item.parentId);
                if (parent) {
                    if (item.type === 'folder') {
                        parent.subfolders.push(itemMap.get(item.id));
                    }
                    else {
                        parent.files.push(itemMap.get(item.id));
                    }
                }
            }
            else {
                roots.push(itemMap.get(item.id));
            }
        });
        return roots;
    }
    // Alle Ordner-Strukturen für alle Lerngruppen laden
    getAllFolderStructures() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const groups = yield prisma.learningGroup.findMany({
                    include: {
                        jmReihen: {
                            orderBy: [
                                { parentId: 'asc' },
                                { order: 'asc' }
                            ]
                        }
                    }
                });
                const result = {};
                groups.forEach(group => {
                    if (group.jmReihen.length > 0) {
                        result[group.id] = this.buildHierarchy(group.jmReihen);
                    }
                });
                return { success: true, data: result };
            }
            catch (error) {
                console.error('Fehler beim Laden aller Ordner-Strukturen:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
            }
        });
    }
    // Ordner-Struktur für eine Lerngruppe löschen
    deleteFolderStructure(groupId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma.jMReihen.deleteMany({
                    where: { groupId }
                });
                return { success: true };
            }
            catch (error) {
                console.error('Fehler beim Löschen der Ordner-Struktur:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
            }
        });
    }
    // Neue Methode: Live-Ordner-Inhalt laden
    getLiveFolderContent(folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!fs.existsSync(folderPath)) {
                    throw new Error(`Ordner existiert nicht: ${folderPath}`);
                }
                const items = fs.readdirSync(folderPath, { withFileTypes: true });
                const folderStructure = {
                    name: path.basename(folderPath),
                    path: folderPath,
                    subfolders: [],
                    files: []
                };
                for (const item of items) {
                    if (item.isDirectory()) {
                        // Versteckte Ordner überspringen
                        if (!item.name.startsWith('.')) {
                            const subfolderPath = path.join(folderPath, item.name);
                            const subfolder = yield this.getLiveFolderContent(subfolderPath);
                            folderStructure.subfolders.push(subfolder);
                        }
                    }
                    else if (item.isFile()) {
                        // Versteckte Dateien überspringen
                        if (!item.name.startsWith('.')) {
                            folderStructure.files.push({
                                name: item.name,
                                path: path.join(folderPath, item.name),
                                type: this.getFileType(item.name)
                            });
                        }
                    }
                }
                return folderStructure;
            }
            catch (error) {
                console.error('Fehler beim Laden des Live-Ordner-Inhalts:', error);
                throw error;
            }
        });
    }
    // Hilfsmethode: Dateityp bestimmen
    getFileType(filename) {
        const ext = path.extname(filename).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext))
            return 'image';
        if (['.pdf'].includes(ext))
            return 'pdf';
        if (['.doc', '.docx'].includes(ext))
            return 'document';
        if (['.xls', '.xlsx'].includes(ext))
            return 'spreadsheet';
        if (['.txt', '.md'].includes(ext))
            return 'text';
        if (['.mp4', '.avi', '.mov'].includes(ext))
            return 'video';
        if (['.mp3', '.wav', '.flac'].includes(ext))
            return 'audio';
        return 'unknown';
    }
    // Neue Methode: Live-Ordner-Inhalt für eine Lerngruppe laden
    getLiveFolderStructureForGroup(groupId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Gespeicherte Ordner-Pfade für die Lerngruppe abrufen
                const savedFolders = yield prisma.jMReihen.findMany({
                    where: {
                        groupId,
                        parentId: null // Nur Hauptordner
                    },
                    orderBy: { order: 'asc' }
                });
                const liveFolders = [];
                for (const savedFolder of savedFolders) {
                    try {
                        // Live-Inhalt des Ordners laden
                        const liveContent = yield this.getLiveFolderContent(savedFolder.path);
                        liveFolders.push(liveContent);
                    }
                    catch (error) {
                        console.error(`Fehler beim Laden des Ordners ${savedFolder.path}:`, error);
                        // Fallback: Gespeicherte Struktur verwenden
                        const fallbackStructure = yield this.getFolderStructure(groupId);
                        if (fallbackStructure) {
                            liveFolders.push(fallbackStructure);
                        }
                    }
                }
                return liveFolders;
            }
            catch (error) {
                console.error('Fehler beim Laden der Live-Ordner-Struktur:', error);
                throw error;
            }
        });
    }
}
exports.JMReihenController = JMReihenController;
