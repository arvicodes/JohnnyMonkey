"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncLessonFolderFileShares = exports.batchCheckFileShares = exports.checkFileShare = exports.getSharedFilesForGroup = exports.toggleFileShare = void 0;
const client_1 = require("@prisma/client");
const lessonFolderShareSync_1 = require("../services/lessonFolderShareSync");
const prisma = new client_1.PrismaClient();
const normalizeFilePath = (p) => (p || '').replace(/\\/g, '/').trim();
// Toggle file share for a learning group
const toggleFileShare = async (req, res) => {
    try {
        const { filePath, groupId } = req.body;
        if (!filePath || !groupId) {
            return res.status(400).json({ error: 'Dateipfad und Gruppen-ID sind erforderlich' });
        }
        const normalizedPath = normalizeFilePath(filePath);
        // Check if the share already exists
        const existingShare = await prisma.fileShare.findUnique({
            where: {
                filePath_groupId: {
                    filePath: normalizedPath,
                    groupId
                }
            }
        });
        if (existingShare) {
            // Remove the share
            await prisma.fileShare.delete({
                where: {
                    id: existingShare.id
                }
            });
            return res.json({ shared: false, message: 'Datei-Freigabe entfernt' });
        }
        else {
            // Create new share
            const newShare = await prisma.fileShare.create({
                data: {
                    filePath: normalizedPath,
                    groupId
                }
            });
            return res.json({ shared: true, message: 'Datei freigegeben', share: newShare });
        }
    }
    catch (error) {
        console.error('Error toggling file share:', error);
        const message = (error === null || error === void 0 ? void 0 : error.message) || (error === null || error === void 0 ? void 0 : error.code) || 'Serverfehler beim Ändern der Datei-Freigabe';
        res.status(500).json({ error: message });
    }
};
exports.toggleFileShare = toggleFileShare;
// Get all shared files for a learning group
const getSharedFilesForGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        if (!groupId) {
            return res.status(400).json({ error: 'Gruppen-ID ist erforderlich' });
        }
        const shares = await prisma.fileShare.findMany({
            where: {
                groupId
            }
        });
        const filePaths = shares.map(share => normalizeFilePath(share.filePath));
        res.json({ groupId, filePaths, shares });
    }
    catch (error) {
        console.error('Error getting shared files:', error);
        res.status(500).json({ error: 'Serverfehler beim Abrufen der geteilten Dateien' });
    }
};
exports.getSharedFilesForGroup = getSharedFilesForGroup;
// Check if a file is shared with a group
const checkFileShare = async (req, res) => {
    try {
        const { filePath, groupId } = req.query;
        if (!filePath || !groupId) {
            return res.status(400).json({ error: 'Dateipfad und Gruppen-ID sind erforderlich' });
        }
        const share = await prisma.fileShare.findUnique({
            where: {
                filePath_groupId: {
                    filePath: filePath,
                    groupId: groupId
                }
            }
        });
        res.json({ shared: !!share });
    }
    catch (error) {
        console.error('Error checking file share:', error);
        res.status(500).json({ error: 'Serverfehler beim Prüfen der Datei-Freigabe' });
    }
};
exports.checkFileShare = checkFileShare;
// Get all shares for multiple files and groups (batch check)
const batchCheckFileShares = async (req, res) => {
    try {
        const { filePaths, groupIds } = req.body;
        if (!filePaths || !groupIds || !Array.isArray(filePaths) || !Array.isArray(groupIds)) {
            return res.status(400).json({ error: 'Dateipfade und Gruppen-IDs als Arrays erforderlich' });
        }
        const shares = await prisma.fileShare.findMany({
            where: {
                filePath: { in: filePaths },
                groupId: { in: groupIds }
            }
        });
        // Create a map for easy lookup: "filePath:groupId" -> true
        const shareMap = {};
        shares.forEach(share => {
            shareMap[`${share.filePath}:${share.groupId}`] = true;
        });
        res.json({ shares: shareMap });
    }
    catch (error) {
        console.error('Error batch checking file shares:', error);
        res.status(500).json({ error: 'Serverfehler beim Prüfen der Datei-Freigaben' });
    }
};
exports.batchCheckFileShares = batchCheckFileShares;
/** Lehrkraft: Freigaben im Stundenordner bereinigen (Bilder weg, Folien-PDFs an). */
const syncLessonFolderFileShares = async (req, res) => {
    try {
        const loginCode = typeof req.headers['x-login-code'] === 'string' ? req.headers['x-login-code'].trim() : '';
        if (!loginCode)
            return res.status(401).json({ error: 'Nicht autorisiert' });
        const user = await prisma.user.findUnique({
            where: { loginCode },
            select: { id: true, role: true },
        });
        if (!user || user.role !== 'TEACHER') {
            return res.status(403).json({ error: 'Nur Lehrkräfte' });
        }
        const { groupId, lessonPath } = req.body;
        if (!(groupId === null || groupId === void 0 ? void 0 : groupId.trim()) || !(lessonPath === null || lessonPath === void 0 ? void 0 : lessonPath.trim())) {
            return res.status(400).json({ error: 'groupId und lessonPath sind erforderlich' });
        }
        const owned = await prisma.learningGroup.findFirst({
            where: { id: groupId.trim(), teacherId: user.id },
            select: { id: true },
        });
        if (!owned)
            return res.status(403).json({ error: 'Keine Berechtigung für diese Gruppe' });
        await (0, lessonFolderShareSync_1.syncLessonFolderShares)(groupId.trim(), lessonPath.trim().replace(/\\/g, '/').replace(/\/$/, ''));
        return res.json({ ok: true });
    }
    catch (error) {
        console.error('Error syncing lesson folder shares:', error);
        res.status(500).json({ error: (error === null || error === void 0 ? void 0 : error.message) || 'Serverfehler beim Synchronisieren der Freigaben' });
    }
};
exports.syncLessonFolderFileShares = syncLessonFolderFileShares;
//# sourceMappingURL=fileSharesController.js.map