import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import { GradingSchemaService } from '../services/GradingSchemaService';

const prisma = new PrismaClient();
const schemaService = new GradingSchemaService();

export const createSchema = async (req: Request, res: Response) => {
  try {
    const { name, structure, groupId } = req.body;

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

    const schema = await prisma.gradingSchema.create({
      data: {
        name,
        structure: structure, // Speichere als String, nicht als JSON
        groupId
      }
    });

    res.json(schema);
  } catch (error) {
    console.error('Error creating grading schema:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create grading schema' });
    }
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
      structure: schema.structure // Bereits als String gespeichert
    }));

    res.json(formattedSchemas);
  } catch (error) {
    console.error('Error fetching grading schemas:', error);
    res.status(500).json({ error: 'Failed to fetch grading schemas' });
  }
};

export const updateSchema = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, structure, groupId } = req.body;

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

    const schema = await prisma.gradingSchema.update({
      where: { id },
      data: {
        name,
        structure: structure, // Speichere als String, nicht als JSON
        groupId
      }
    });

    res.json(schema);
  } catch (error) {
    console.error('Error updating grading schema:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update grading schema' });
    }
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