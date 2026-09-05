"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMSSSchema = exports.deleteGradingSchema = exports.updateGradingSchema = exports.getGradingSchemas = exports.createGradingSchema = exports.deleteSchema = exports.updateSchema = exports.getAllSchemas = exports.getSchemas = exports.createSchema = void 0;
const client_1 = require("@prisma/client");
const GradingSchemaService_1 = require("../services/GradingSchemaService");
const prisma = new client_1.PrismaClient();
const schemaService = new GradingSchemaService_1.GradingSchemaService();
const createSchema = async (req, res) => {
    try {
        const { name, structure, groupId, gradingSystem } = req.body;
        if (!name || !structure || !groupId) {
            return res.status(400).json({ error: 'Missing required fields: name, structure, groupId' });
        }
        // Check if the learning group exists
        const learningGroup = await prisma.learningGroup.findUnique({
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
        const schema = await prisma.gradingSchema.create({
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
};
exports.createSchema = createSchema;
const getSchemas = async (req, res) => {
    try {
        const { groupId } = req.params;
        const schemas = await prisma.gradingSchema.findMany({
            where: { groupId },
            orderBy: { updatedAt: 'desc' },
        });
        // Format the schemas for display
        const formattedSchemas = schemas.map(schema => ({
            ...schema,
            structure: schema.structure // Bereits als String gespeichert
        }));
        res.json(formattedSchemas);
    }
    catch (error) {
        console.error('Error fetching grading schemas:', error);
        res.status(500).json({ error: 'Failed to fetch grading schemas' });
    }
};
exports.getSchemas = getSchemas;
const getAllSchemas = async (req, res) => {
    try {
        const schemas = await prisma.gradingSchema.findMany({
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
        const formattedSchemas = schemas.map(schema => ({
            ...schema,
            structure: schema.structure // Bereits als String gespeichert
        }));
        res.json(formattedSchemas);
    }
    catch (error) {
        console.error('Error fetching all grading schemas:', error);
        res.status(500).json({ error: 'Failed to fetch grading schemas' });
    }
};
exports.getAllSchemas = getAllSchemas;
const updateSchema = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, structure, groupId, gradingSystem } = req.body;
        if (!name || !structure || !groupId) {
            return res.status(400).json({ error: 'Missing required fields: name, structure, groupId' });
        }
        // Check if the learning group exists
        const learningGroup = await prisma.learningGroup.findUnique({
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
        const schema = await prisma.gradingSchema.update({
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
};
exports.updateSchema = updateSchema;
const deleteSchema = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.gradingSchema.delete({
            where: { id }
        });
        res.json({ message: 'Schema deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting grading schema:', error);
        res.status(500).json({ error: 'Failed to delete grading schema' });
    }
};
exports.deleteSchema = deleteSchema;
const createGradingSchema = async (req, res) => {
    try {
        const { name, structure, groupId, gradingSystem } = req.body;
        if (!name || !structure || !groupId || !gradingSystem) {
            return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
        }
        const schema = await prisma.gradingSchema.create({
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
};
exports.createGradingSchema = createGradingSchema;
const getGradingSchemas = async (req, res) => {
    try {
        const { groupId } = req.params;
        const schemas = await prisma.gradingSchema.findMany({
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
};
exports.getGradingSchemas = getGradingSchemas;
const updateGradingSchema = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const { name, structure, gradingSystem, groupId } = req.body;
        console.log('🔄 Updating grading schema:', { id, name, hasStructure: !!structure, gradingSystem, groupId });
        console.log('📄 Structure preview (first 500 chars):', structure.substring(0, 500));
        if (!name || !structure) {
            return res.status(400).json({ error: 'Missing required fields: name, structure' });
        }
        // Check if the schema exists
        const existingSchema = await prisma.gradingSchema.findUnique({
            where: { id }
        });
        if (!existingSchema) {
            console.error('❌ Schema not found:', id);
            return res.status(404).json({ error: 'Bewertungsschema nicht gefunden' });
        }
        console.log('📋 Existing schema:', {
            id: existingSchema.id,
            name: existingSchema.name,
            structureLength: existingSchema.structure.length,
            gradingSystem: existingSchema.gradingSystem,
            groupId: existingSchema.groupId
        });
        // If groupId is provided, validate it
        if (groupId) {
            const learningGroup = await prisma.learningGroup.findUnique({
                where: { id: groupId }
            });
            if (!learningGroup) {
                return res.status(400).json({ error: `Lerngruppe mit ID ${groupId} nicht gefunden` });
            }
        }
        // Parse and validate the schema
        let schemaNode;
        try {
            console.log('📄 Parsing schema structure (first 500 chars):', structure.substring(0, 500));
            schemaNode = schemaService.parseSchemaString(structure);
            console.log('✅ Schema parsed successfully, root name:', schemaNode.name, 'children count:', ((_a = schemaNode.children) === null || _a === void 0 ? void 0 : _a.length) || 0);
            if (schemaNode.children && schemaNode.children.length > 0) {
                const weightSum = schemaNode.children.reduce((sum, child) => sum + child.weight, 0);
                console.log('📊 Root level weight sum:', weightSum);
            }
        }
        catch (parseError) {
            console.error('❌ Error parsing schema:', parseError);
            console.error('❌ Error stack:', parseError instanceof Error ? parseError.stack : 'No stack trace');
            const errorMessage = parseError instanceof Error ? parseError.message : 'Ungültiges Schema-Format';
            return res.status(400).json({ error: `Fehler beim Parsen des Schemas: ${errorMessage}` });
        }
        const isValid = schemaService.validateSchema(schemaNode);
        if (!isValid) {
            console.error('❌ Schema validation failed - weights do not sum to 100%');
            if (schemaNode.children && schemaNode.children.length > 0) {
                const weightSum = schemaNode.children.reduce((sum, child) => sum + child.weight, 0);
                console.error('❌ Actual weight sum:', weightSum);
                schemaNode.children.forEach((child, index) => {
                    console.error(`   Child ${index}: ${child.name} = ${child.weight}%`);
                });
            }
            return res.status(400).json({ error: 'Ungültiges Schema: Die Hauptkategorien müssen zusammen 100% ergeben' });
        }
        const updateData = {
            name,
            structure: structure, // Speichere als String, nicht als JSON
        };
        // Füge gradingSystem hinzu, falls es im Request vorhanden ist
        if (gradingSystem) {
            updateData.gradingSystem = gradingSystem;
        }
        // Füge groupId hinzu, falls es im Request vorhanden ist (normalerweise sollte es nicht geändert werden)
        if (groupId) {
            updateData.groupId = groupId;
        }
        console.log('💾 Update data:', {
            name: updateData.name,
            structureLength: updateData.structure.length,
            gradingSystem: updateData.gradingSystem,
            groupId: updateData.groupId
        });
        let schema;
        try {
            schema = await prisma.gradingSchema.update({
                where: { id },
                data: updateData
            });
            console.log('✅ Schema updated successfully:', {
                id: schema.id,
                name: schema.name,
                structureLength: schema.structure.length,
                gradingSystem: schema.gradingSystem,
                groupId: schema.groupId
            });
        }
        catch (dbError) {
            console.error('❌ Database error updating schema:', dbError);
            if (dbError instanceof Error) {
                // Prisma-spezifische Fehler
                if (dbError.message.includes('Unique constraint')) {
                    return res.status(400).json({ error: 'Ein Schema mit diesem Namen existiert bereits' });
                }
                if (dbError.message.includes('Foreign key constraint')) {
                    return res.status(400).json({ error: 'Die angegebene Lerngruppe existiert nicht' });
                }
                return res.status(400).json({ error: `Datenbankfehler: ${dbError.message}` });
            }
            throw dbError; // Re-throw für den äußeren catch-Block
        }
        res.json(schema);
    }
    catch (error) {
        console.error('❌ Error updating grading schema:', error);
        if (error instanceof Error) {
            // Wenn es bereits eine Response gesendet wurde, nicht erneut senden
            if (!res.headersSent) {
                res.status(400).json({ error: error.message });
            }
        }
        else {
            if (!res.headersSent) {
                res.status(500).json({ error: 'Fehler beim Aktualisieren des Bewertungsschemas' });
            }
        }
    }
};
exports.updateGradingSchema = updateGradingSchema;
const deleteGradingSchema = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.gradingSchema.delete({
            where: { id }
        });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting grading schema:', error);
        res.status(500).json({ error: 'Fehler beim Löschen des Bewertungsschemas' });
    }
};
exports.deleteGradingSchema = deleteGradingSchema;
// Spezielle Funktion für MSS-Schema
const createMSSSchema = async (req, res) => {
    try {
        const { groupId } = req.params;
        // Überprüfe ob die Lerngruppe existiert
        const learningGroup = await prisma.learningGroup.findUnique({
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
        const schema = await prisma.gradingSchema.create({
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
};
exports.createMSSSchema = createMSSSchema;
//# sourceMappingURL=GradingSchemaController.js.map