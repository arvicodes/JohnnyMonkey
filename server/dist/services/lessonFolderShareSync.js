"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectFilesInDirectory = collectFilesInDirectory;
exports.syncLessonFolderShares = syncLessonFolderShares;
exports.revokeNonMaterialSharesInTree = revokeNonMaterialSharesInTree;
const client_1 = require("@prisma/client");
const path_1 = __importDefault(require("path"));
const storageManager_1 = require("../utils/storageManager");
const lessonMaterialVisibility_1 = require("../lib/lessonMaterialVisibility");
const prisma = new client_1.PrismaClient();
const normalizeFilePath = (p) => (p || '').replace(/\\/g, '/').trim();
async function collectFilesInDirectory(dirPath) {
    const files = [];
    try {
        const content = await storageManager_1.StorageManager.readDirectory(dirPath, true);
        const walk = (node) => {
            if (!node)
                return;
            if (node.type === 'file' && node.path) {
                files.push(normalizeFilePath(node.path));
            }
            if (node.children && Array.isArray(node.children)) {
                node.children.forEach(walk);
            }
        };
        if (content === null || content === void 0 ? void 0 : content.root) {
            walk(content.root);
        }
        else if (Array.isArray(content)) {
            content.forEach(walk);
        }
        else {
            walk(content);
        }
    }
    catch (err) {
        console.warn('[LessonShareSync] Could not read folder:', dirPath, err);
    }
    return files;
}
/**
 * Stundenordner-Freigaben bereinigen:
 * - Bilder / interne Präsentationsdateien entfernen
 * - Folien-PDFs (Original + bearbeitet) automatisch freigeben
 */
async function syncLessonFolderShares(groupId, lessonPath) {
    const files = await collectFilesInDirectory(lessonPath);
    for (const filePath of files) {
        const name = path_1.default.basename(filePath);
        const existing = await prisma.fileShare.findUnique({
            where: { filePath_groupId: { filePath, groupId } },
        });
        if (!(0, lessonMaterialVisibility_1.isStudentVisibleLessonMaterialFile)(name)) {
            if (existing) {
                await prisma.fileShare.delete({ where: { id: existing.id } });
            }
            continue;
        }
        if ((0, lessonMaterialVisibility_1.isLessonPresentationMaterialPdf)(name) && !existing) {
            await prisma.fileShare.create({ data: { filePath, groupId } });
        }
    }
}
/** Entfernt fälschlich freigegebene Bilder/Systemdateien in zugewiesenen Ordnerbäumen. */
async function revokeNonMaterialSharesInTree(groupId, rootPath) {
    const files = await collectFilesInDirectory(rootPath);
    for (const filePath of files) {
        const name = path_1.default.basename(filePath);
        if ((0, lessonMaterialVisibility_1.isStudentVisibleLessonMaterialFile)(name))
            continue;
        const existing = await prisma.fileShare.findUnique({
            where: { filePath_groupId: { filePath, groupId } },
        });
        if (existing) {
            await prisma.fileShare.delete({ where: { id: existing.id } });
        }
    }
}
//# sourceMappingURL=lessonFolderShareSync.js.map