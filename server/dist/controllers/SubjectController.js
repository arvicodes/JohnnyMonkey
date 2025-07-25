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
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderLessons = exports.reorderTopics = exports.reorderUnits = exports.reorderBlocks = exports.reorderSubjects = exports.deleteSubject = exports.updateSubject = exports.getSubject = exports.getSubjects = exports.createSubject = void 0;
const prisma_1 = require("../generated/prisma");
const prisma = new prisma_1.PrismaClient();
const createSubject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description } = req.body;
        const teacherId = req.body.teacherId || req.query.teacherId || req.headers['x-user-id'];
        if (!teacherId)
            return res.status(400).json({ error: 'Lehrer-ID fehlt' });
        const subject = yield prisma.subject.create({
            data: { name, description, teacherId }
        });
        res.json(subject);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Anlegen des Fachs' });
    }
});
exports.createSubject = createSubject;
const getSubjects = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const teacherId = req.query.teacherId || req.headers['x-user-id'];
        if (!teacherId)
            return res.status(400).json({ error: 'Lehrer-ID fehlt' });
        const subjects = yield prisma.subject.findMany({
            where: { teacherId: String(teacherId) },
            orderBy: { order: 'asc' }
        });
        res.json(subjects);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Laden der Fächer' });
    }
});
exports.getSubjects = getSubjects;
const getSubject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const subject = yield prisma.subject.findUnique({ where: { id } });
        if (!subject)
            return res.status(404).json({ error: 'Subject nicht gefunden' });
        res.json(subject);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Laden des Subjects' });
    }
});
exports.getSubject = getSubject;
const updateSubject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const subject = yield prisma.subject.update({
            where: { id },
            data: { name, description }
        });
        res.json(subject);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Fachs' });
    }
});
exports.updateSubject = updateSubject;
const deleteSubject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.subject.delete({ where: { id } });
        res.json({ message: 'Fach gelöscht' });
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Löschen des Fachs' });
    }
});
exports.deleteSubject = deleteSubject;
const reorderSubjects = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subjectIds } = req.body;
        const teacherId = req.body.teacherId || req.query.teacherId || req.headers['x-user-id'];
        if (!teacherId)
            return res.status(400).json({ error: 'Lehrer-ID fehlt' });
        if (!Array.isArray(subjectIds))
            return res.status(400).json({ error: 'Ungültige Reihenfolge' });
        // Update order for each subject
        for (let i = 0; i < subjectIds.length; i++) {
            yield prisma.subject.update({
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
});
exports.reorderSubjects = reorderSubjects;
const reorderBlocks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { blockIds, subjectId } = req.body;
        if (!subjectId)
            return res.status(400).json({ error: 'Fach-ID fehlt' });
        if (!Array.isArray(blockIds))
            return res.status(400).json({ error: 'Ungültige Reihenfolge' });
        for (let i = 0; i < blockIds.length; i++) {
            yield prisma.block.update({
                where: { id: blockIds[i], subjectId },
                data: { order: i }
            });
        }
        res.json({ message: 'Reihenfolge aktualisiert' });
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Aktualisieren der Reihenfolge' });
    }
});
exports.reorderBlocks = reorderBlocks;
const reorderUnits = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { unitIds, blockId } = req.body;
        if (!blockId)
            return res.status(400).json({ error: 'Block-ID fehlt' });
        if (!Array.isArray(unitIds))
            return res.status(400).json({ error: 'Ungültige Reihenfolge' });
        for (let i = 0; i < unitIds.length; i++) {
            yield prisma.unit.update({
                where: { id: unitIds[i], blockId },
                data: { order: i }
            });
        }
        res.json({ message: 'Reihenfolge aktualisiert' });
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Aktualisieren der Reihenfolge' });
    }
});
exports.reorderUnits = reorderUnits;
const reorderTopics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { topicIds, unitId } = req.body;
        if (!unitId)
            return res.status(400).json({ error: 'Unit-ID fehlt' });
        if (!Array.isArray(topicIds))
            return res.status(400).json({ error: 'Ungültige Reihenfolge' });
        for (let i = 0; i < topicIds.length; i++) {
            yield prisma.topic.update({
                where: { id: topicIds[i], unitId },
                data: { order: i }
            });
        }
        res.json({ message: 'Reihenfolge aktualisiert' });
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Aktualisieren der Reihenfolge' });
    }
});
exports.reorderTopics = reorderTopics;
const reorderLessons = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { lessonIds, topicId } = req.body;
        if (!topicId)
            return res.status(400).json({ error: 'Themen-ID fehlt' });
        if (!Array.isArray(lessonIds))
            return res.status(400).json({ error: 'Ungültige Reihenfolge' });
        for (let i = 0; i < lessonIds.length; i++) {
            yield prisma.lesson.update({
                where: { id: lessonIds[i], topicId },
                data: { order: i }
            });
        }
        res.json({ message: 'Reihenfolge aktualisiert' });
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Aktualisieren der Reihenfolge' });
    }
});
exports.reorderLessons = reorderLessons;
