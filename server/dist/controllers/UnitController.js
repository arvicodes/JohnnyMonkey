"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnit = exports.deleteUnit = exports.updateUnit = exports.getUnits = exports.createUnit = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const createUnit = async (req, res) => {
    try {
        const { name, description, blockId } = req.body;
        if (!blockId)
            return res.status(400).json({ error: 'BlockId fehlt' });
        const unit = await prisma.unit.create({
            data: { name, description, blockId }
        });
        res.json(unit);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Anlegen der Unterrichtsreihe' });
    }
};
exports.createUnit = createUnit;
const getUnits = async (req, res) => {
    try {
        const { blockId } = req.query;
        if (!blockId)
            return res.status(400).json({ error: 'BlockId fehlt' });
        const units = await prisma.unit.findMany({
            where: { blockId: String(blockId) },
            orderBy: { order: 'asc' }
        });
        res.json(units);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Laden der Unterrichtsreihen' });
    }
};
exports.getUnits = getUnits;
const updateUnit = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const unit = await prisma.unit.update({
            where: { id },
            data: { name, description }
        });
        res.json(unit);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Aktualisieren der Unterrichtsreihe' });
    }
};
exports.updateUnit = updateUnit;
const deleteUnit = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.unit.delete({ where: { id } });
        res.json({ message: 'Unterrichtsreihe gelöscht' });
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Löschen der Unterrichtsreihe' });
    }
};
exports.deleteUnit = deleteUnit;
const getUnit = async (req, res) => {
    try {
        const { id } = req.params;
        const unit = await prisma.unit.findUnique({ where: { id } });
        if (!unit)
            return res.status(404).json({ error: 'Unit nicht gefunden' });
        res.json(unit);
    }
    catch (error) {
        res.status(500).json({ error: 'Fehler beim Laden der Unit' });
    }
};
exports.getUnit = getUnit;
//# sourceMappingURL=UnitController.js.map