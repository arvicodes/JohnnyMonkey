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
exports.MaterialDiscoveryService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class MaterialDiscoveryService {
    // Materialien in einem Verzeichnis automatisch erkennen
    static discoverMaterials(directoryPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!fs_1.default.existsSync(directoryPath)) {
                    throw new Error(`Verzeichnis existiert nicht: ${directoryPath}`);
                }
                const materials = [];
                const items = fs_1.default.readdirSync(directoryPath);
                for (const item of items) {
                    const fullPath = path_1.default.join(directoryPath, item);
                    const stats = fs_1.default.statSync(fullPath);
                    const material = {
                        name: item,
                        path: fullPath,
                        type: stats.isDirectory() ? 'directory' : 'file',
                        size: stats.size,
                        lastModified: stats.mtime,
                        extension: path_1.default.extname(item).toLowerCase(),
                        isQuiz: this.isQuizFile(item),
                        isMaterial: this.isMaterialFile(item)
                    };
                    materials.push(material);
                }
                // Sortiere nach Typ (Verzeichnisse zuerst) und dann nach Namen
                return materials.sort((a, b) => {
                    if (a.type !== b.type) {
                        return a.type === 'directory' ? -1 : 1;
                    }
                    return a.name.localeCompare(b.name);
                });
            }
            catch (error) {
                console.error('Fehler bei der Materialerkennung:', error);
                throw error;
            }
        });
    }
    // Prüfen, ob eine Datei ein Quiz ist
    static isQuizFile(filename) {
        const quizExtensions = ['.docx', '.doc', '.txt', '.html'];
        const quizKeywords = ['quiz', 'test', 'aufgabe', 'frage', 'antwort'];
        const lowerFilename = filename.toLowerCase();
        const extension = path_1.default.extname(lowerFilename);
        // Prüfe Dateiendung
        if (quizExtensions.includes(extension)) {
            return true;
        }
        // Prüfe Schlüsselwörter im Dateinamen
        return quizKeywords.some(keyword => lowerFilename.includes(keyword));
    }
    // Prüfen, ob eine Datei Material ist
    static isMaterialFile(filename) {
        const materialExtensions = ['.pdf', '.docx', '.doc', '.txt', '.html', '.pptx', '.ppt', '.jpg', '.jpeg', '.png', '.gif'];
        const materialKeywords = ['material', 'inhalt', 'lektion', 'stunde', 'unterricht'];
        const lowerFilename = filename.toLowerCase();
        const extension = path_1.default.extname(lowerFilename);
        // Prüfe Dateiendung
        if (materialExtensions.includes(extension)) {
            return true;
        }
        // Prüfe Schlüsselwörter im Dateinamen
        return materialKeywords.some(keyword => lowerFilename.includes(keyword));
    }
    // Verzeichnisstruktur rekursiv durchsuchen
    static discoverMaterialsRecursive(directoryPath_1) {
        return __awaiter(this, arguments, void 0, function* (directoryPath, maxDepth = 3) {
            const materials = [];
            const scanDirectory = (currentPath, depth) => {
                if (depth > maxDepth)
                    return;
                try {
                    const items = fs_1.default.readdirSync(currentPath);
                    for (const item of items) {
                        const fullPath = path_1.default.join(currentPath, item);
                        const stats = fs_1.default.statSync(fullPath);
                        if (stats.isDirectory()) {
                            const material = {
                                name: item,
                                path: fullPath,
                                type: 'directory',
                                size: 0,
                                lastModified: stats.mtime,
                                isMaterial: true
                            };
                            materials.push(material);
                            // Rekursiv weiter scannen
                            scanDirectory(fullPath, depth + 1);
                        }
                        else {
                            const material = {
                                name: item,
                                path: fullPath,
                                type: 'file',
                                size: stats.size,
                                extension: path_1.default.extname(item).toLowerCase(),
                                lastModified: stats.mtime,
                                isQuiz: this.isQuizFile(item),
                                isMaterial: this.isMaterialFile(item)
                            };
                            materials.push(material);
                        }
                    }
                }
                catch (error) {
                    console.error(`Fehler beim Scannen von ${currentPath}:`, error);
                }
            };
            scanDirectory(directoryPath, 0);
            return materials;
        });
    }
    // Verzeichnisgröße berechnen
    static getDirectorySize(directoryPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let totalSize = 0;
                const scanDirectory = (currentPath) => {
                    const items = fs_1.default.readdirSync(currentPath);
                    for (const item of items) {
                        const fullPath = path_1.default.join(currentPath, item);
                        const stats = fs_1.default.statSync(fullPath);
                        if (stats.isDirectory()) {
                            scanDirectory(fullPath);
                        }
                        else {
                            totalSize += stats.size;
                        }
                    }
                };
                scanDirectory(directoryPath);
                return totalSize;
            }
            catch (error) {
                console.error('Fehler beim Berechnen der Verzeichnisgröße:', error);
                return 0;
            }
        });
    }
}
exports.MaterialDiscoveryService = MaterialDiscoveryService;
