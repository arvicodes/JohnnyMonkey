import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '../generated/prisma';

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const materialDir = path.join(__dirname, '../../../material');
    // Ensure material directory exists
    if (!fs.existsSync(materialDir)) {
      fs.mkdirSync(materialDir, { recursive: true });
    }
    cb(null, materialDir);
  },
  filename: (req, file, cb) => {
    // Use original filename, but sanitize it
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, sanitizedName);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Allow only specific file types
    const allowedTypes = ['html', 'pdf', 'docx', 'pptx', 'txt', 'md', 'doc'];
    const ext = path.extname(file.originalname).toLowerCase().substring(1);
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type .${ext} is not allowed`));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Get all available files
router.get('/files', (req, res) => {
  try {
    const materialDir = path.join(__dirname, '../../../material');
    
    if (!fs.existsSync(materialDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(materialDir)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.html', '.pdf', '.docx', '.pptx', '.txt', '.md', '.doc'].includes(ext);
      })
      .map(file => {
        const filePath = path.join(materialDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: `/material/${file}`,
          size: stats.size,
          type: path.extname(file).toLowerCase().substring(1)
        };
      });

    res.json(files);
  } catch (error) {
    console.error('Error reading material files:', error);
    res.status(500).json({ error: 'Failed to read material files' });
  }
});

// Upload files
router.post('/upload', upload.array('files'), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = (req.files as Express.Multer.File[]).map(file => file.originalname);
    
    res.json({ 
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// Delete a file
router.delete('/files/:filename', (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(__dirname, '../../../material', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    fs.unlinkSync(filePath);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Get available materials for lessons
router.get('/available', (req, res) => {
  try {
    const materialDir = path.join(__dirname, '../../../material');
    
    if (!fs.existsSync(materialDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(materialDir)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.html', '.pdf', '.docx', '.pptx', '.txt', '.md', '.doc'].includes(ext);
      })
      .map(file => ({
        fileName: file,
        filePath: `/material/${file}`,
        type: path.extname(file).toLowerCase().substring(1)
      }));

    res.json(files);
  } catch (error) {
    console.error('Error reading available materials:', error);
    res.status(500).json({ error: 'Failed to read available materials' });
  }
});

// Get materials for a specific lesson
router.get('/lesson/:lessonId', async (req, res) => {
  try {
    const lessonId = req.params.lessonId;
    
    const lessonMaterials = await prisma.lessonMaterial.findMany({
      where: { lessonId },
      include: {
        material: true
      }
    });

    res.json(lessonMaterials);
  } catch (error) {
    console.error('Error fetching lesson materials:', error);
    res.status(500).json({ error: 'Failed to fetch lesson materials' });
  }
});

// Add material to lesson
router.post('/lesson', async (req, res) => {
  try {
    const { lessonId, fileName, filePath } = req.body;

    // First, create or find the material
    let material = await prisma.material.findFirst({
      where: { fileName }
    });

    if (!material) {
      material = await prisma.material.create({
        data: {
          fileName,
          filePath,
          type: path.extname(fileName).toLowerCase().substring(1)
        }
      });
    }

    // Then create the lesson-material relationship
    const lessonMaterial = await prisma.lessonMaterial.create({
      data: {
        lessonId,
        materialId: material.id
      },
      include: {
        material: true
      }
    });

    res.json(lessonMaterial);
  } catch (error) {
    console.error('Error adding material to lesson:', error);
    res.status(500).json({ error: 'Failed to add material to lesson' });
  }
});

// Remove material from lesson
router.delete('/lesson/:lessonId/:materialId', async (req, res) => {
  try {
    const { lessonId, materialId } = req.params;

    await prisma.lessonMaterial.deleteMany({
      where: {
        lessonId,
        materialId
      }
    });

    res.json({ message: 'Material removed from lesson successfully' });
  } catch (error) {
    console.error('Error removing material from lesson:', error);
    res.status(500).json({ error: 'Failed to remove material from lesson' });
  }
});

export default router; 