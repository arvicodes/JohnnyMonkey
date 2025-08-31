"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLesson = exports.deleteLesson = exports.updateLesson = exports.getLessons = exports.createLesson = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const createLesson = async (req, res) => {
    try {
        const { name, description, topicId } = req.body;
        if (!topicId)
            return res.status(400).json({ error: 'TopicId fehlt' });
        const lesson = await prisma.lesson.create({
            data: { name, description, topicId }
        });
        res.json(lesson);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Anlegen der Stunde' });
    }
};
exports.createLesson = createLesson;
const getLessons = async (req, res) => {
    try {
        const { topicId } = req.query;
        if (!topicId)
            return res.status(400).json({ error: 'TopicId fehlt' });
        const lessons = await prisma.lesson.findMany({
            where: { topicId: String(topicId) },
            orderBy: { order: 'asc' }
        });
        res.json(lessons);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Laden der Stunden' });
    }
};
exports.getLessons = getLessons;
const updateLesson = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const lesson = await prisma.lesson.update({
            where: { id },
            data: { name, description }
        });
        res.json(lesson);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Aktualisieren der Stunde' });
    }
};
exports.updateLesson = updateLesson;
const deleteLesson = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.lesson.delete({ where: { id } });
        res.json({ message: 'Stunde gelöscht' });
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Löschen der Stunde' });
    }
};
exports.deleteLesson = deleteLesson;
const getLesson = async (req, res) => {
    try {
        const { id } = req.params;
        const lesson = await prisma.lesson.findUnique({ where: { id } });
        if (!lesson)
            return res.status(404).json({ error: 'Lesson nicht gefunden' });
        res.json(lesson);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Laden der Lesson' });
    }
};
exports.getLesson = getLesson;
//# sourceMappingURL=LessonController.js.map