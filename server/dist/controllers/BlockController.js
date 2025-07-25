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
exports.getBlock = exports.deleteBlock = exports.updateBlock = exports.getBlocks = exports.createBlock = void 0;
const prisma_1 = require("../generated/prisma");
const prisma = new prisma_1.PrismaClient();
const createBlock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description, subjectId } = req.body;
        if (!subjectId)
            return res.status(400).json({ error: 'SubjectId fehlt' });
        const block = yield prisma.block.create({
            data: { name, description, subjectId }
        });
        res.json(block);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Anlegen des Blocks' });
    }
});
exports.createBlock = createBlock;
const getBlocks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subjectId } = req.query;
        if (!subjectId)
            return res.status(400).json({ error: 'SubjectId fehlt' });
        const blocks = yield prisma.block.findMany({
            where: { subjectId: String(subjectId) },
            orderBy: { order: 'asc' }
        });
        res.json(blocks);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Laden der Blöcke' });
    }
});
exports.getBlocks = getBlocks;
const updateBlock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const block = yield prisma.block.update({
            where: { id },
            data: { name, description }
        });
        res.json(block);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Blocks' });
    }
});
exports.updateBlock = updateBlock;
const deleteBlock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.block.delete({ where: { id } });
        res.json({ message: 'Block gelöscht' });
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Löschen des Blocks' });
    }
});
exports.deleteBlock = deleteBlock;
const getBlock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const block = yield prisma.block.findUnique({ where: { id } });
        if (!block)
            return res.status(404).json({ error: 'Block nicht gefunden' });
        res.json(block);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Laden des Blocks' });
    }
});
exports.getBlock = getBlock;
