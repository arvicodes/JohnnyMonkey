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
exports.getLesson = exports.deleteLesson = exports.updateLesson = exports.getLessons = exports.createLesson = void 0;
const prisma_1 = require("../generated/prisma");
const prisma = new prisma_1.PrismaClient();
const createLesson = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description, topicId } = req.body;
        if (!topicId)
            return res.status(400).json({ error: 'TopicId fehlt' });
        const lesson = yield prisma.lesson.create({
            data: { name, description, topicId }
        });
        res.json(lesson);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Anlegen der Stunde' });
    }
});
exports.createLesson = createLesson;
const getLessons = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { topicId } = req.query;
        if (!topicId)
            return res.status(400).json({ error: 'TopicId fehlt' });
        const lessons = yield prisma.lesson.findMany({
            where: { topicId: String(topicId) },
            orderBy: { order: 'asc' }
        });
        res.json(lessons);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Laden der Stunden' });
    }
});
exports.getLessons = getLessons;
const updateLesson = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const lesson = yield prisma.lesson.update({
            where: { id },
            data: { name, description }
        });
        res.json(lesson);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Aktualisieren der Stunde' });
    }
});
exports.updateLesson = updateLesson;
const deleteLesson = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.lesson.delete({ where: { id } });
        res.json({ message: 'Stunde gelöscht' });
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Löschen der Stunde' });
    }
});
exports.deleteLesson = deleteLesson;
const getLesson = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const lesson = yield prisma.lesson.findUnique({ where: { id } });
        if (!lesson)
            return res.status(404).json({ error: 'Lesson nicht gefunden' });
        res.json(lesson);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Laden der Lesson' });
    }
});
exports.getLesson = getLesson;
