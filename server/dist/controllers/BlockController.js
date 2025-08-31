"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlock = exports.deleteBlock = exports.updateBlock = exports.getBlocks = exports.createBlock = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const createBlock = async (req, res) => {
    try {
        const { name, description, subjectId } = req.body;
        if (!subjectId)
            return res.status(400).json({ error: 'SubjectId fehlt' });
        const block = await prisma.block.create({
            data: { name, description, subjectId }
        });
        res.json(block);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Anlegen des Blocks' });
    }
};
exports.createBlock = createBlock;
const getBlocks = async (req, res) => {
    try {
        const { subjectId } = req.query;
        if (!subjectId)
            return res.status(400).json({ error: 'SubjectId fehlt' });
        const blocks = await prisma.block.findMany({
            where: { subjectId: String(subjectId) },
            orderBy: { order: 'asc' }
        });
        res.json(blocks);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Laden der Blöcke' });
    }
};
exports.getBlocks = getBlocks;
const updateBlock = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const block = await prisma.block.update({
            where: { id },
            data: { name, description }
        });
        res.json(block);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Blocks' });
    }
};
exports.updateBlock = updateBlock;
const deleteBlock = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.block.delete({ where: { id } });
        res.json({ message: 'Block gelöscht' });
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Löschen des Blocks' });
    }
};
exports.deleteBlock = deleteBlock;
const getBlock = async (req, res) => {
    try {
        const { id } = req.params;
        const block = await prisma.block.findUnique({ where: { id } });
        if (!block)
            return res.status(404).json({ error: 'Block nicht gefunden' });
        res.json(block);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Laden des Blocks' });
    }
};
exports.getBlock = getBlock;
//# sourceMappingURL=BlockController.js.map