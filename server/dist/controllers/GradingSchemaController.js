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
exports.createMSSSchema = exports.deleteGradingSchema = exports.updateGradingSchema = exports.getGradingSchemas = exports.createGradingSchema = exports.deleteSchema = exports.updateSchema = exports.getAllSchemas = exports.getSchemas = exports.createSchema = void 0;
const prisma_1 = require("../generated/prisma");
const GradingSchemaService_1 = require("../services/GradingSchemaService");
const prisma = new prisma_1.PrismaClient();
const schemaService = new GradingSchemaService_1.GradingSchemaService();
const createSchema = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, structure, groupId, gradingSystem } = req.body;
        if (!name || !structure || !groupId) {
            return res.status(400).json({ error: 'Missing required fields: name, structure, groupId' });
        }
        // Check if the learning group exists
        const learningGroup = yield prisma.learningGroup.findUnique({
            where: { id: groupId }
        });
        if (!learningGroup) {
            return res.status(400).json({ error: `Learning group with ID ${groupId} not found` });
        }
        // Parse and validate the schema
        const schemaNode = schemaService.parseSchemaString(structure);
        const isValid = schemaService.validateSchema(schemaNode);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid schema: Root level weights must sum to 100%' });
        }
        const createData = {
            name,
            structure: structure, // Speichere als String, nicht als JSON
            groupId
        };
        // Füge gradingSystem hinzu, falls es im Request vorhanden ist
        if (gradingSystem) {
            createData.gradingSystem = gradingSystem;
        }
        const schema = yield prisma.gradingSchema.create({
            data: createData
        });
        res.json(schema);
    }
    catch (error) {
        console.error('Error creating grading schema:', error);
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Failed to create grading schema' });
        }
    }
});
exports.createSchema = createSchema;
const getSchemas = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { groupId } = req.params;
        const schemas = yield prisma.gradingSchema.findMany({
            where: { groupId }
        });
        // Format the schemas for display
        const formattedSchemas = schemas.map(schema => (Object.assign(Object.assign({}, schema), { structure: schema.structure // Bereits als String gespeichert
         })));
        res.json(formattedSchemas);
    }
    catch (error) {
        console.error('Error fetching grading schemas:', error);
        res.status(500).json({ error: 'Failed to fetch grading schemas' });
    }
});
exports.getSchemas = getSchemas;
const getAllSchemas = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const schemas = yield prisma.gradingSchema.findMany({
            include: {
                learningGroup: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        // Format the schemas for display
        const formattedSchemas = schemas.map(schema => (Object.assign(Object.assign({}, schema), { structure: schema.structure // Bereits als String gespeichert
         })));
        res.json(formattedSchemas);
    }
    catch (error) {
        console.error('Error fetching all grading schemas:', error);
        res.status(500).json({ error: 'Failed to fetch grading schemas' });
    }
});
exports.getAllSchemas = getAllSchemas;
const updateSchema = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, structure, groupId, gradingSystem } = req.body;
        if (!name || !structure || !groupId) {
            return res.status(400).json({ error: 'Missing required fields: name, structure, groupId' });
        }
        // Check if the learning group exists
        const learningGroup = yield prisma.learningGroup.findUnique({
            where: { id: groupId }
        });
        if (!learningGroup) {
            return res.status(400).json({ error: `Learning group with ID ${groupId} not found` });
        }
        // Parse and validate the schema
        const schemaNode = schemaService.parseSchemaString(structure);
        const isValid = schemaService.validateSchema(schemaNode);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid schema: Root level weights must sum to 100%' });
        }
        const updateData = {
            name,
            structure: structure, // Speichere als String, nicht als JSON
            groupId
        };
        // Füge gradingSystem hinzu, falls es im Request vorhanden ist
        if (gradingSystem) {
            updateData.gradingSystem = gradingSystem;
        }
        const schema = yield prisma.gradingSchema.update({
            where: { id },
            data: updateData
        });
        res.json(schema);
    }
    catch (error) {
        console.error('Error updating grading schema:', error);
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Failed to update grading schema' });
        }
    }
});
exports.updateSchema = updateSchema;
const deleteSchema = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.gradingSchema.delete({
            where: { id }
        });
        res.json({ message: 'Schema deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting grading schema:', error);
        res.status(500).json({ error: 'Failed to delete grading schema' });
    }
});
exports.deleteSchema = deleteSchema;
const createGradingSchema = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, structure, groupId, gradingSystem } = req.body;
        if (!name || !structure || !groupId || !gradingSystem) {
            return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
        }
        const schema = yield prisma.gradingSchema.create({
            data: {
                name,
                structure,
                groupId,
                gradingSystem
            }
        });
        res.status(201).json(schema);
    }
    catch (error) {
        console.error('Error creating grading schema:', error);
        res.status(500).json({ error: 'Fehler beim Erstellen des Bewertungsschemas' });
    }
});
exports.createGradingSchema = createGradingSchema;
const getGradingSchemas = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { groupId } = req.params;
        const schemas = yield prisma.gradingSchema.findMany({
            where: { groupId },
            include: {
                learningGroup: true
            }
        });
        res.json(schemas);
    }
    catch (error) {
        console.error('Error fetching grading schemas:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Bewertungsschemas' });
    }
});
exports.getGradingSchemas = getGradingSchemas;
const updateGradingSchema = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, structure, gradingSystem } = req.body;
        const schema = yield prisma.gradingSchema.update({
            where: { id },
            data: {
                name,
                structure,
                gradingSystem
            }
        });
        res.json(schema);
    }
    catch (error) {
        console.error('Error updating grading schema:', error);
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Bewertungsschemas' });
    }
});
exports.updateGradingSchema = updateGradingSchema;
const deleteGradingSchema = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.gradingSchema.delete({
            where: { id }
        });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting grading schema:', error);
        res.status(500).json({ error: 'Fehler beim Löschen des Bewertungsschemas' });
    }
});
exports.deleteGradingSchema = deleteGradingSchema;
// Spezielle Funktion für MSS-Schema
const createMSSSchema = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { groupId } = req.params;
        // Überprüfe ob die Lerngruppe existiert
        const learningGroup = yield prisma.learningGroup.findUnique({
            where: { id: groupId }
        });
        if (!learningGroup) {
            return res.status(404).json({ error: 'Lerngruppe nicht gefunden' });
        }
        // Erstelle das MSS-Schema mit korrigierter Struktur
        const mssStructure = `Oberstufe - MSS (100%)
  Kursarbeit (50%)
    Klausur 1 (25%)
    Klausur 2 (25%)
  Andere Leistungen (50%)
    Mündliche Leistungen (33.3%)
      EPO 1 (50%)
      RPO 2 (50%)
    Quizze / Hausaufgaben (33.3%)
      Quiz 1 (20%)
      Quiz 2 (20%)
      Quiz 3 (20%)
      Quiz 4 (20%)
      Quiz 5 (20%)
    Projekte und Sonstige (33.4%)`;
        const schema = yield prisma.gradingSchema.create({
            data: {
                name: 'Oberstufe - MSS',
                structure: mssStructure,
                groupId,
                gradingSystem: 'MSS' // Wichtig: Korrekt auf MSS gesetzt
            }
        });
        res.status(201).json(schema);
    }
    catch (error) {
        console.error('Error creating MSS schema:', error);
        res.status(500).json({ error: 'Fehler beim Erstellen des MSS-Schemas' });
    }
});
exports.createMSSSchema = createMSSSchema;
