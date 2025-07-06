import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import { GradingSchemaService } from '../services/GradingSchemaService';

const prisma = new PrismaClient();
const schemaService = new GradingSchemaService();

export const createSchema = async (req: Request, res: Response) => {
  try {
    const { name, structure, groupId } = req.body;

    // Parse and validate the schema
    const schemaNode = schemaService.parseSchemaString(structure);
    if (!schemaService.validateSchema(schemaNode)) {
      return res.status(400).json({ error: 'Invalid schema: Weights must sum to 1 at each level' });
    }

    const schema = await prisma.gradingSchema.create({
      data: {
        name,
        structure: JSON.stringify(schemaNode),
        groupId
      }
    });

    res.json(schema);
  } catch (error) {
    console.error('Error creating grading schema:', error);
    res.status(500).json({ error: 'Failed to create grading schema' });
  }
};

export const getSchemas = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const schemas = await prisma.gradingSchema.findMany({
      where: { groupId }
    });

    // Format the schemas for display
    const formattedSchemas = schemas.map(schema => ({
      ...schema,
      structure: schemaService.formatSchemaToString(JSON.parse(schema.structure))
    }));

    res.json(formattedSchemas);
  } catch (error) {
    console.error('Error fetching grading schemas:', error);
    res.status(500).json({ error: 'Failed to fetch grading schemas' });
  }
};

export const deleteSchema = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.gradingSchema.delete({
      where: { id }
    });
    res.json({ message: 'Schema deleted successfully' });
  } catch (error) {
    console.error('Error deleting grading schema:', error);
    res.status(500).json({ error: 'Failed to delete grading schema' });
  }
}; 