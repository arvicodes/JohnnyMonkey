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
exports.deleteSchema = exports.getSchemas = exports.createSchema = void 0;
const prisma_1 = require("../generated/prisma");
const GradingSchemaService_1 = require("../services/GradingSchemaService");
const prisma = new prisma_1.PrismaClient();
const schemaService = new GradingSchemaService_1.GradingSchemaService();
const createSchema = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, structure, groupId } = req.body;
        // Parse and validate the schema
        const schemaNode = schemaService.parseSchemaString(structure);
        if (!schemaService.validateSchema(schemaNode)) {
            return res.status(400).json({ error: 'Invalid schema: Weights must sum to 1 at each level' });
        }
        const schema = yield prisma.gradingSchema.create({
            data: {
                name,
                structure: JSON.stringify(schemaNode),
                groupId
            }
        });
        res.json(schema);
    }
    catch (error) {
        console.error('Error creating grading schema:', error);
        res.status(500).json({ error: 'Failed to create grading schema' });
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
        const formattedSchemas = schemas.map(schema => (Object.assign(Object.assign({}, schema), { structure: schemaService.formatSchemaToString(JSON.parse(schema.structure)) })));
        res.json(formattedSchemas);
    }
    catch (error) {
        console.error('Error fetching grading schemas:', error);
        res.status(500).json({ error: 'Failed to fetch grading schemas' });
    }
});
exports.getSchemas = getSchemas;
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
