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
exports.getTopic = exports.deleteTopic = exports.updateTopic = exports.getTopics = exports.createTopic = void 0;
const prisma_1 = require("../generated/prisma");
const prisma = new prisma_1.PrismaClient();
const createTopic = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description, unitId } = req.body;
        if (!unitId)
            return res.status(400).json({ error: 'UnitId fehlt' });
        const topic = yield prisma.topic.create({
            data: { name, description, unitId }
        });
        res.json(topic);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Anlegen des Themas' });
    }
});
exports.createTopic = createTopic;
const getTopics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { unitId } = req.query;
        if (!unitId)
            return res.status(400).json({ error: 'UnitId fehlt' });
        const topics = yield prisma.topic.findMany({
            where: { unitId: String(unitId) },
            orderBy: { order: 'asc' }
        });
        res.json(topics);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Laden der Themen' });
    }
});
exports.getTopics = getTopics;
const updateTopic = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const topic = yield prisma.topic.update({
            where: { id },
            data: { name, description }
        });
        res.json(topic);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Themas' });
    }
});
exports.updateTopic = updateTopic;
const deleteTopic = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.topic.delete({ where: { id } });
        res.json({ message: 'Thema gelöscht' });
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Löschen des Themas' });
    }
});
exports.deleteTopic = deleteTopic;
const getTopic = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const topic = yield prisma.topic.findUnique({ where: { id } });
        if (!topic)
            return res.status(404).json({ error: 'Topic nicht gefunden' });
        res.json(topic);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Laden des Topics' });
    }
});
exports.getTopic = getTopic;
