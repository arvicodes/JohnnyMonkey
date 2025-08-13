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
exports.TeacherSettingsController = void 0;
const prisma_1 = require("../generated/prisma");
const MaterialDiscoveryService_1 = require("../services/MaterialDiscoveryService");
const path = __importStar(require("path"));
const prisma = new prisma_1.PrismaClient();
class TeacherSettingsController {
    // Materialpfad für einen Lehrer abrufen
    static getMaterialPath(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { teacherId } = req.params;
                const user = yield prisma.user.findUnique({
                    where: { id: teacherId },
                    select: { materialPath: true }
                });
                if (!user) {
                    return res.status(404).json({ error: 'Lehrer nicht gefunden' });
                }
                res.json({ materialPath: user.materialPath });
            }
            catch (error) {
                console.error('Fehler beim Abrufen des Materialpfads:', error);
                res.status(500).json({ error: 'Interner Serverfehler' });
            }
        });
    }
    // Materialpfad für einen Lehrer aktualisieren
    static updateMaterialPath(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { teacherId } = req.params;
                const { materialPath } = req.body;
                if (!materialPath) {
                    return res.status(400).json({ error: 'Materialpfad ist erforderlich' });
                }
                const updatedUser = yield prisma.user.update({
                    where: { id: teacherId },
                    data: { materialPath },
                    select: { id: true, materialPath: true }
                });
                res.json(updatedUser);
            }
            catch (error) {
                console.error('Fehler beim Aktualisieren des Materialpfads:', error);
                res.status(500).json({ error: 'Interner Serverfehler' });
            }
        });
    }
    // Alle Lehrer-Einstellungen für einen Lehrer abrufen
    static getTeacherSettings(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { teacherId } = req.params;
                const user = yield prisma.user.findUnique({
                    where: { id: teacherId },
                    select: {
                        id: true,
                        name: true,
                        materialPath: true,
                        createdAt: true,
                        updatedAt: true
                    }
                });
                if (!user) {
                    return res.status(404).json({ error: 'Lehrer nicht gefunden' });
                }
                res.json(user);
            }
            catch (error) {
                console.error('Fehler beim Abrufen der Lehrer-Einstellungen:', error);
                res.status(500).json({ error: 'Interner Serverfehler' });
            }
        });
    }
    // Materialien in einem Verzeichnis automatisch erkennen
    static discoverMaterials(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { teacherId } = req.params;
                const { recursive = false, maxDepth = 3, path: customPath } = req.query;
                // Entweder den konfigurierten Materialpfad oder einen benutzerdefinierten Pfad verwenden
                let targetPath;
                if (customPath) {
                    // Benutzerdefinierten Pfad verwenden (für Verzeichnisauswahl)
                    targetPath = customPath;
                }
                else {
                    // Konfigurierten Materialpfad des Lehrers verwenden
                    const user = yield prisma.user.findUnique({
                        where: { id: teacherId },
                        select: { materialPath: true }
                    });
                    if (!user) {
                        return res.status(404).json({ error: 'Lehrer nicht gefunden' });
                    }
                    if (!user.materialPath) {
                        return res.status(400).json({ error: 'Kein Materialpfad konfiguriert' });
                    }
                    targetPath = user.materialPath;
                }
                // Sicherheitsprüfung: Verhindere Zugriff auf sensible Verzeichnisse
                const normalizedPath = path.normalize(targetPath);
                const forbiddenPaths = [
                    '/etc', '/var', '/usr', '/bin', '/sbin', '/dev', '/proc', '/sys',
                    'C:\\Windows', 'C:\\System32', 'C:\\Program Files', 'C:\\Program Files (x86)'
                ];
                for (const forbidden of forbiddenPaths) {
                    if (normalizedPath.startsWith(forbidden)) {
                        return res.status(403).json({ error: 'Zugriff auf dieses Verzeichnis nicht erlaubt' });
                    }
                }
                let materials;
                if (recursive === 'true') {
                    materials = yield MaterialDiscoveryService_1.MaterialDiscoveryService.discoverMaterialsRecursive(targetPath, parseInt(maxDepth));
                }
                else {
                    materials = yield MaterialDiscoveryService_1.MaterialDiscoveryService.discoverMaterials(targetPath);
                }
                // Verzeichnisgröße berechnen
                const totalSize = yield MaterialDiscoveryService_1.MaterialDiscoveryService.getDirectorySize(targetPath);
                res.json({
                    materials,
                    totalSize,
                    path: targetPath,
                    count: materials.length
                });
            }
            catch (error) {
                console.error('Fehler bei der Materialerkennung:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
                res.status(500).json({ error: 'Fehler bei der Materialerkennung: ' + errorMessage });
            }
        });
    }
    // Verzeichnisstruktur für einen Lehrer abrufen
    static getDirectoryStructure(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { teacherId } = req.params;
                const user = yield prisma.user.findUnique({
                    where: { id: teacherId },
                    select: { materialPath: true }
                });
                if (!user || !user.materialPath) {
                    return res.status(400).json({ error: 'Kein Materialpfad konfiguriert' });
                }
                const materials = yield MaterialDiscoveryService_1.MaterialDiscoveryService.discoverMaterialsRecursive(user.materialPath, 5);
                const totalSize = yield MaterialDiscoveryService_1.MaterialDiscoveryService.getDirectorySize(user.materialPath);
                res.json({
                    path: user.materialPath,
                    structure: materials,
                    totalSize,
                    count: materials.length
                });
            }
            catch (error) {
                console.error('Fehler beim Abrufen der Verzeichnisstruktur:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
                res.status(500).json({ error: 'Fehler beim Abrufen der Verzeichnisstruktur: ' + errorMessage });
            }
        });
    }
}
exports.TeacherSettingsController = TeacherSettingsController;
