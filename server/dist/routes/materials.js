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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const prisma_1 = require("../generated/prisma");
const router = express_1.default.Router();
const prisma = new prisma_1.PrismaClient();
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const materialDir = path_1.default.join(__dirname, '../../../material');
        // Ensure material directory exists
        if (!fs_1.default.existsSync(materialDir)) {
            fs_1.default.mkdirSync(materialDir, { recursive: true });
        }
        cb(null, materialDir);
    },
    filename: (req, file, cb) => {
        // Use original filename, but sanitize it
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, sanitizedName);
    }
});
const upload = (0, multer_1.default)({
    storage,
    fileFilter: (req, file, cb) => {
        // Allow only specific file types
        const allowedTypes = ['html', 'pdf', 'docx', 'pptx', 'txt', 'md', 'doc'];
        const ext = path_1.default.extname(file.originalname).toLowerCase().substring(1);
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        }
        else {
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
        const materialDir = path_1.default.join(__dirname, '../../../material');
        if (!fs_1.default.existsSync(materialDir)) {
            return res.json([]);
        }
        const files = fs_1.default.readdirSync(materialDir)
            .filter(file => {
            const ext = path_1.default.extname(file).toLowerCase();
            return ['.html', '.pdf', '.docx', '.pptx', '.txt', '.md', '.doc'].includes(ext);
        })
            .map(file => {
            const filePath = path_1.default.join(materialDir, file);
            const stats = fs_1.default.statSync(filePath);
            return {
                name: file,
                path: `/material/${file}`,
                size: stats.size,
                type: path_1.default.extname(file).toLowerCase().substring(1)
            };
        });
        res.json(files);
    }
    catch (error) {
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
        const uploadedFiles = req.files.map(file => file.originalname);
        res.json({
            message: `${uploadedFiles.length} file(s) uploaded successfully`,
            files: uploadedFiles
        });
    }
    catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({ error: 'Failed to upload files' });
    }
});
// Upload Word file for quiz creation
router.post('/word-upload', upload.single('wordFile'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // Check if the uploaded file is a supported document
        const fileExt = path_1.default.extname(req.file.originalname).toLowerCase();
        if (!['.doc', '.docx', '.txt'].includes(fileExt)) {
            return res.status(400).json({ error: 'Only Word documents (.doc, .docx) and text files (.txt) are allowed' });
        }
        const sourceFile = `/material/${req.file.filename}`;
        res.json({
            message: 'File uploaded successfully',
            sourceFile: sourceFile,
            fileName: req.file.originalname
        });
    }
    catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});
// Delete a file
router.delete('/files/:filename', (req, res) => {
    try {
        const filename = decodeURIComponent(req.params.filename);
        const filePath = path_1.default.join(__dirname, '../../../material', filename);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        fs_1.default.unlinkSync(filePath);
        res.json({ message: 'File deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});
// Get available materials for lessons
router.get('/available', (req, res) => {
    try {
        const materialDir = path_1.default.join(__dirname, '../../../material');
        if (!fs_1.default.existsSync(materialDir)) {
            return res.json([]);
        }
        const files = fs_1.default.readdirSync(materialDir)
            .filter(file => {
            const ext = path_1.default.extname(file).toLowerCase();
            return ['.html', '.pdf', '.docx', '.pptx', '.txt', '.md', '.doc'].includes(ext);
        })
            .map(file => ({
            fileName: file,
            filePath: `/material/${file}`,
            type: path_1.default.extname(file).toLowerCase().substring(1)
        }));
        res.json(files);
    }
    catch (error) {
        console.error('Error reading available materials:', error);
        res.status(500).json({ error: 'Failed to read available materials' });
    }
});
// Get materials for a specific lesson
router.get('/lesson/:lessonId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const lessonId = req.params.lessonId;
        const lessonMaterials = yield prisma.lessonMaterial.findMany({
            where: { lessonId },
            include: {
                material: true
            }
        });
        res.json(lessonMaterials);
    }
    catch (error) {
        console.error('Error fetching lesson materials:', error);
        res.status(500).json({ error: 'Failed to fetch lesson materials' });
    }
}));
// Add material to lesson
router.post('/lesson', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { lessonId, fileName, filePath } = req.body;
        // Remove all existing quizzes from this lesson first
        yield prisma.lessonQuiz.deleteMany({
            where: { lessonId }
        });
        // First, create or find the material
        let material = yield prisma.material.findFirst({
            where: { fileName }
        });
        if (!material) {
            material = yield prisma.material.create({
                data: {
                    fileName,
                    filePath,
                    type: path_1.default.extname(fileName).toLowerCase().substring(1)
                }
            });
        }
        // Then create the lesson-material relationship
        const lessonMaterial = yield prisma.lessonMaterial.create({
            data: {
                lessonId,
                materialId: material.id
            },
            include: {
                material: true
            }
        });
        res.json(lessonMaterial);
    }
    catch (error) {
        console.error('Error adding material to lesson:', error);
        res.status(500).json({ error: 'Failed to add material to lesson' });
    }
}));
// Remove material from lesson
router.delete('/lesson/:lessonId/:materialId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { lessonId, materialId } = req.params;
        yield prisma.lessonMaterial.deleteMany({
            where: {
                lessonId,
                materialId
            }
        });
        res.json({ message: 'Material removed from lesson successfully' });
    }
    catch (error) {
        console.error('Error removing material from lesson:', error);
        res.status(500).json({ error: 'Failed to remove material from lesson' });
    }
}));
exports.default = router;
