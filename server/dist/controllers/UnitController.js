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
exports.getUnit = exports.deleteUnit = exports.updateUnit = exports.getUnits = exports.createUnit = void 0;
const prisma_1 = require("../generated/prisma");
const prisma = new prisma_1.PrismaClient();
const createUnit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description, blockId } = req.body;
        if (!blockId)
            return res.status(400).json({ error: 'BlockId fehlt' });
        const unit = yield prisma.unit.create({
            data: { name, description, blockId }
        });
        res.json(unit);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Anlegen der Unterrichtsreihe' });
    }
});
exports.createUnit = createUnit;
const getUnits = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { blockId } = req.query;
        if (!blockId)
            return res.status(400).json({ error: 'BlockId fehlt' });
        const units = yield prisma.unit.findMany({
            where: { blockId: String(blockId) },
            orderBy: { order: 'asc' }
        });
        res.json(units);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Laden der Unterrichtsreihen' });
    }
});
exports.getUnits = getUnits;
const updateUnit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const unit = yield prisma.unit.update({
            where: { id },
            data: { name, description }
        });
        res.json(unit);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Aktualisieren der Unterrichtsreihe' });
    }
});
exports.updateUnit = updateUnit;
const deleteUnit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.unit.delete({ where: { id } });
        res.json({ message: 'Unterrichtsreihe gelöscht' });
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Löschen der Unterrichtsreihe' });
    }
});
exports.deleteUnit = deleteUnit;
const getUnit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const unit = yield prisma.unit.findUnique({ where: { id } });
        if (!unit)
            return res.status(404).json({ error: 'Unit nicht gefunden' });
        res.json(unit);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Laden der Unit' });
    }
});
exports.getUnit = getUnit;
