"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTopic = exports.deleteTopic = exports.updateTopic = exports.getTopics = exports.createTopic = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const createTopic = async (req, res) => {
    try {
        const { name, description, unitId } = req.body;
        if (!unitId)
            return res.status(400).json({ error: 'UnitId fehlt' });
        const topic = await prisma.topic.create({
            data: { name, description, unitId }
        });
        res.json(topic);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Anlegen des Themas' });
    }
};
exports.createTopic = createTopic;
const getTopics = async (req, res) => {
    try {
        const { unitId } = req.query;
        if (!unitId)
            return res.status(400).json({ error: 'UnitId fehlt' });
        const topics = await prisma.topic.findMany({
            where: { unitId: String(unitId) },
            orderBy: { order: 'asc' }
        });
        res.json(topics);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Laden der Themen' });
    }
};
exports.getTopics = getTopics;
const updateTopic = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const topic = await prisma.topic.update({
            where: { id },
            data: { name, description }
        });
        res.json(topic);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Themas' });
    }
};
exports.updateTopic = updateTopic;
const deleteTopic = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.topic.delete({ where: { id } });
        res.json({ message: 'Thema gelöscht' });
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Löschen des Themas' });
    }
};
exports.deleteTopic = deleteTopic;
const getTopic = async (req, res) => {
    try {
        const { id } = req.params;
        const topic = await prisma.topic.findUnique({ where: { id } });
        if (!topic)
            return res.status(404).json({ error: 'Topic nicht gefunden' });
        res.json(topic);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Laden des Topics' });
    }
};
exports.getTopic = getTopic;
//# sourceMappingURL=TopicController.js.map