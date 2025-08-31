"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderLessons = exports.reorderTopics = exports.reorderUnits = exports.reorderBlocks = exports.reorderSubjects = exports.deleteSubject = exports.updateSubject = exports.getSubject = exports.getSubjects = exports.createSubject = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const createSubject = async (req, res) => {
    var _a;
    try {
        const { name, description } = req.body;
        const teacherId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Use authenticated user's ID
        if (!teacherId) {
            return res.status(401).json({ error: 'Nicht authentifiziert' });
        }
        const subject = await prisma.subject.create({
            data: { name, description, teacherId }
        });
        res.json(subject);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Anlegen des Fachs' });
    }
};
exports.createSubject = createSubject;
const getSubjects = async (req, res) => {
    var _a;
    try {
        const teacherId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Use authenticated user's ID
        if (!teacherId) {
            return res.status(401).json({ error: 'Nicht authentifiziert' });
        }
        const subjects = await prisma.subject.findMany({
            where: { teacherId: String(teacherId) },
            orderBy: { order: 'asc' }
        });
        res.json(subjects);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Laden der Fächer' });
    }
};
exports.getSubjects = getSubjects;
const getSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const subject = await prisma.subject.findUnique({ where: { id } });
        if (!subject)
            return res.status(404).json({ error: 'Subject nicht gefunden' });
        res.json(subject);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Laden des Subjects' });
    }
};
exports.getSubject = getSubject;
const updateSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const subject = await prisma.subject.update({
            where: { id },
            data: { name, description }
        });
        res.json(subject);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Fachs' });
    }
};
exports.updateSubject = updateSubject;
const deleteSubject = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.subject.delete({ where: { id } });
        res.json({ message: 'Fach gelöscht' });
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Löschen des Fachs' });
    }
};
exports.deleteSubject = deleteSubject;
const reorderSubjects = async (req, res) => {
    var _a;
    try {
        const { subjectIds } = req.body;
        const teacherId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Use authenticated user's ID
        if (!teacherId) {
            return res.status(401).json({ error: 'Nicht authentifiziert' });
        }
        if (!Array.isArray(subjectIds))
            return res.status(400).json({ error: 'Ungültige Reihenfolge' });
        // Update order for each subject
        for (let i = 0; i < subjectIds.length; i++) {
            await prisma.subject.update({
                where: {
                    id: subjectIds[i],
                    teacherId: String(teacherId) // Ensure teacher owns the subject
                },
                data: { order: i }
            });
        }
        res.json({ message: 'Reihenfolge aktualisiert' });
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Aktualisieren der Reihenfolge' });
    }
};
exports.reorderSubjects = reorderSubjects;
const reorderBlocks = async (req, res) => {
    try {
        const { blockIds, subjectId } = req.body;
        if (!subjectId)
            return res.status(400).json({ error: 'Fach-ID fehlt' });
        if (!Array.isArray(blockIds))
            return res.status(400).json({ error: 'Ungültige Reihenfolge' });
        for (let i = 0; i < blockIds.length; i++) {
            await prisma.block.update({
                where: { id: blockIds[i], subjectId },
                data: { order: i }
            });
        }
        res.json({ message: 'Reihenfolge aktualisiert' });
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Aktualisieren der Reihenfolge' });
    }
};
exports.reorderBlocks = reorderBlocks;
const reorderUnits = async (req, res) => {
    try {
        const { unitIds, blockId } = req.body;
        if (!blockId)
            return res.status(400).json({ error: 'Block-ID fehlt' });
        if (!Array.isArray(unitIds))
            return res.status(400).json({ error: 'Ungültige Reihenfolge' });
        for (let i = 0; i < unitIds.length; i++) {
            await prisma.unit.update({
                where: { id: unitIds[i], blockId },
                data: { order: i }
            });
        }
        res.json({ message: 'Reihenfolge aktualisiert' });
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Aktualisieren der Reihenfolge' });
    }
};
exports.reorderUnits = reorderUnits;
const reorderTopics = async (req, res) => {
    try {
        const { topicIds, unitId } = req.body;
        if (!unitId)
            return res.status(400).json({ error: 'Unit-ID fehlt' });
        if (!Array.isArray(topicIds))
            return res.status(400).json({ error: 'Ungültige Reihenfolge' });
        for (let i = 0; i < topicIds.length; i++) {
            await prisma.topic.update({
                where: { id: topicIds[i], unitId },
                data: { order: i }
            });
        }
        res.json({ message: 'Reihenfolge aktualisiert' });
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Aktualisieren der Reihenfolge' });
    }
};
exports.reorderTopics = reorderTopics;
const reorderLessons = async (req, res) => {
    try {
        const { lessonIds, topicId } = req.body;
        if (!topicId)
            return res.status(400).json({ error: 'Themen-ID fehlt' });
        if (!Array.isArray(lessonIds))
            return res.status(400).json({ error: 'Ungültige Reihenfolge' });
        for (let i = 0; i < lessonIds.length; i++) {
            await prisma.lesson.update({
                where: { id: lessonIds[i], topicId },
                data: { order: i }
            });
        }
        res.json({ message: 'Reihenfolge aktualisiert' });
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Aktualisieren der Reihenfolge' });
    }
};
exports.reorderLessons = reorderLessons;
//# sourceMappingURL=SubjectController.js.map