"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSystemPathController = void 0;
const client_1 = require("@prisma/client");
const storageManager_1 = require("../utils/storageManager");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma = new client_1.PrismaClient();
class FileSystemPathController {
    /**
     * Get all paths
     */
    static async getAllPaths(req, res) {
        try {
            const paths = await prisma.fileSystemPath.findMany({
                orderBy: { createdAt: 'desc' }
            });
            res.json(paths);
        }
        catch (error) {
            console.error('Error getting all paths:', error);
            res.status(500).json({ error: 'Fehler beim Abrufen der Pfade' });
        }
    }
    /**
     * Get file extension from filename
     */
    static getFileExtension(filename) {
        const lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(lastDot).toLowerCase() : '';
    }
    // Pfad speichern
    static async savePath(req, res) {
        try {
            const { path: filePath, name, teacherId } = req.body;
            console.log('=== SAVE PATH REQUEST ===');
            console.log('Request body:', req.body);
            console.log('File path:', filePath);
            console.log('Name:', name);
            console.log('Teacher ID:', teacherId);
            if (!filePath || !name || !teacherId) {
                console.log('Missing required fields');
                return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
            }
            // Check if this is a git-intern path
            if (filePath === 'git-intern') {
                console.log('Git-intern path detected, skipping local path validation');
                // For git-intern paths, use the original path without normalization
            }
            else {
                // Normalize and validate local paths
                let normalizedPath;
                try {
                    normalizedPath = path_1.default.resolve(filePath);
                }
                catch (pathError) {
                    console.log('Path normalization error:', pathError);
                    return res.status(400).json({ error: 'Ungültiger Pfad' });
                }
                if (!fs_1.default.existsSync(normalizedPath)) {
                    console.log('Path does not exist:', normalizedPath);
                    return res.status(400).json({ error: 'Der angegebene Pfad existiert nicht' });
                }
                const stats = fs_1.default.statSync(normalizedPath);
                if (!stats.isDirectory()) {
                    console.log('Path is not a directory:', normalizedPath);
                    return res.status(400).json({ error: 'Der angegebene Pfad ist kein Verzeichnis' });
                }
            }
            // Save to database
            const savedPath = await prisma.fileSystemPath.create({
                data: {
                    path: filePath,
                    name: name,
                    teacherId: teacherId
                }
            });
            console.log('Path saved successfully:', savedPath);
            res.json(savedPath);
        }
        catch (error) {
            console.error('Error saving path:', error);
            res.status(500).json({ error: 'Fehler beim Speichern des Pfades' });
        }
    }
    // Verzeichnisinhalt lesen
    static async readDirectory(req, res) {
        try {
            const { path: filePath, recursive } = req.query;
            console.log('=== READ DIRECTORY REQUEST ===');
            console.log('Query params:', req.query);
            console.log('File path from query:', filePath);
            console.log('Recursive:', recursive);
            if (!filePath) {
                return res.status(400).json({ error: 'Pfad ist erforderlich' });
            }
            const directoryContent = await storageManager_1.StorageManager.readDirectory(filePath, recursive === 'true');
            if (directoryContent.error) {
                console.log('Directory read error:', directoryContent.error);
                return res.status(404).json({ error: directoryContent.error });
            }
            console.log('Directory read successfully');
            res.json(directoryContent);
        }
        catch (error) {
            console.error('Error reading directory:', error);
            res.status(500).json({ error: 'Fehler beim Lesen des Verzeichnisses' });
        }
    }
    // Pfade nach Lehrer abrufen
    static async getPathsByTeacher(req, res) {
        try {
            const { teacherId } = req.params;
            console.log('Getting paths for teacher:', teacherId);
            const paths = await prisma.fileSystemPath.findMany({
                where: { teacherId },
                orderBy: { createdAt: 'desc' }
            });
            console.log('Found paths:', paths.length);
            res.json(paths);
        }
        catch (error) {
            console.error('Error getting paths by teacher:', error);
            res.status(500).json({ error: 'Fehler beim Abrufen der Pfade' });
        }
    }
    // Pfad löschen
    static async deletePath(req, res) {
        try {
            const { id } = req.params;
            console.log('Deleting path with ID:', id);
            const deletedPath = await prisma.fileSystemPath.delete({
                where: { id }
            });
            console.log('Path deleted successfully:', deletedPath);
            res.json(deletedPath);
        }
        catch (error) {
            console.error('Error deleting path:', error);
            res.status(500).json({ error: 'Fehler beim Löschen des Pfades' });
        }
    }
    // HTML-Datei lesen
    static async readHtmlFile(req, res) {
        try {
            const { filePath } = req.query;
            if (!filePath) {
                return res.status(400).json({ error: 'filePath is required' });
            }
            console.log('Reading HTML file:', filePath);
            const fileContent = await storageManager_1.StorageManager.readFile(filePath);
            if (!fileContent) {
                return res.status(404).json({ error: 'File not found' });
            }
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(fileContent.toString('utf-8'));
        }
        catch (error) {
            console.error('Error reading HTML file:', error);
            res.status(500).json({ error: 'Failed to read HTML file' });
        }
    }
    // DOCX-Datei lesen
    static async readDocxFile(req, res) {
        try {
            const { filePath, preview } = req.query;
            if (!filePath) {
                return res.status(400).json({ error: 'filePath is required' });
            }
            console.log('Reading DOCX file:', filePath);
            const fileContent = await storageManager_1.StorageManager.readFile(filePath);
            if (!fileContent) {
                return res.status(404).json({ error: 'File not found' });
            }
            if (preview === 'true') {
                // For preview, return a simple HTML representation
                const html = `
          <html>
            <head>
              <title>DOCX Preview</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .preview { border: 1px solid #ccc; padding: 20px; background: #f9f9f9; }
              </style>
            </head>
            <body>
              <div class="preview">
                <h2>DOCX File Preview</h2>
                <p><strong>File:</strong> ${path_1.default.basename(filePath)}</p>
                <p><strong>Size:</strong> ${fileContent.length} bytes</p>
                <p><em>Full DOCX preview not available. Download the file to view complete content.</em></p>
              </div>
            </body>
          </html>
        `;
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.send(html);
            }
            else {
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                res.setHeader('Content-Disposition', `attachment; filename="${path_1.default.basename(filePath)}"`);
                res.send(fileContent);
            }
        }
        catch (error) {
            console.error('Error reading DOCX file:', error);
            res.status(500).json({ error: 'Failed to read DOCX file' });
        }
    }
    // Excel-Datei lesen
    static async readExcelFile(req, res) {
        try {
            const { filePath, preview } = req.query;
            if (!filePath) {
                return res.status(400).json({ error: 'filePath is required' });
            }
            console.log('Reading Excel file:', filePath);
            const fileContent = await storageManager_1.StorageManager.readFile(filePath);
            if (!fileContent) {
                return res.status(404).json({ error: 'File not found' });
            }
            if (preview === 'true') {
                // For preview, return a simple HTML representation
                const html = `
          <html>
            <head>
              <title>Excel Preview</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .preview { border: 1px solid #ccc; padding: 20px; background: #f9f9f9; }
              </style>
            </head>
            <body>
              <div class="preview">
                <h2>Excel File Preview</h2>
                <p><strong>File:</strong> ${path_1.default.basename(filePath)}</p>
                <p><strong>Size:</strong> ${fileContent.length} bytes</p>
                <p><em>Full Excel preview not available. Download the file to view complete content.</em></p>
                  </div>
            </body>
          </html>
        `;
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.send(html);
            }
            else {
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="${path_1.default.basename(filePath)}"`);
                res.send(fileContent);
            }
        }
        catch (error) {
            console.error('Error reading Excel file:', error);
            res.status(500).json({ error: 'Failed to read Excel file' });
        }
    }
    // PowerPoint-Datei lesen
    static async readPowerPointFile(req, res) {
        try {
            const { filePath, preview } = req.query;
            if (!filePath) {
                return res.status(400).json({ error: 'filePath is required' });
            }
            console.log('Reading PowerPoint file:', filePath);
            const fileContent = await storageManager_1.StorageManager.readFile(filePath);
            if (!fileContent) {
                return res.status(404).json({ error: 'File not found' });
            }
            if (preview === 'true') {
                // For preview, return a simple HTML representation
                const html = `
          <html>
            <head>
              <title>PowerPoint Preview</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .preview { border: 1px solid #ccc; padding: 20px; background: #f9f9f9; }
              </style>
            </head>
            <body>
              <div class="preview">
                <h2>PowerPoint File Preview</h2>
                <p><strong>File:</strong> ${path_1.default.basename(filePath)}</p>
                <p><strong>Size:</strong> ${fileContent.length} bytes</p>
                <p><em>Full PowerPoint preview not available. Download the file to view complete content.</em></p>
                  </div>
            </body>
          </html>
        `;
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.send(html);
            }
            else {
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
                res.setHeader('Content-Disposition', `attachment; filename="${path_1.default.basename(filePath)}"`);
                res.send(fileContent);
            }
        }
        catch (error) {
            console.error('Error reading PowerPoint file:', error);
            res.status(500).json({ error: 'Failed to read PowerPoint file' });
        }
    }
    // PDF-Datei lesen
    static async readPdfFile(req, res) {
        try {
            const { filePath, preview } = req.query;
            if (!filePath) {
                return res.status(400).json({ error: 'filePath is required' });
            }
            console.log('Reading PDF file:', filePath);
            const fileContent = await storageManager_1.StorageManager.readFile(filePath);
            if (!fileContent) {
                return res.status(404).json({ error: 'File not found' });
            }
            if (preview === 'true') {
                // For preview, return a simple HTML representation
                const html = `
          <html>
            <head>
              <title>PDF Preview</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .preview { border: 1px solid #ccc; padding: 20px; background: #f9f9f9; }
              </style>
            </head>
            <body>
              <div class="preview">
                <h2>PDF File Preview</h2>
                <p><strong>File:</strong> ${path_1.default.basename(filePath)}</p>
                <p><strong>Size:</strong> ${fileContent.length} bytes</p>
                <p><em>Full PDF preview not available. Download the file to view complete content.</em></p>
              </div>
            </body>
          </html>
        `;
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.send(html);
            }
            else {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="${path_1.default.basename(filePath)}"`);
                res.send(fileContent);
            }
        }
        catch (error) {
            console.error('Error reading PDF file:', error);
            res.status(500).json({ error: 'Failed to read PDF file' });
        }
    }
    // GoodNotes-Datei lesen
    static async readGoodNotesFile(req, res) {
        try {
            const { filePath, preview } = req.query;
            if (!filePath) {
                return res.status(400).json({ error: 'filePath is required' });
            }
            console.log('Reading GoodNotes file:', filePath);
            const fileContent = await storageManager_1.StorageManager.readFile(filePath);
            if (!fileContent) {
                return res.status(404).json({ error: 'File not found' });
            }
            if (preview === 'true') {
                // For preview, return a simple HTML representation
                const html = `
          <html>
            <head>
              <title>GoodNotes Preview</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .preview { border: 1px solid #ccc; padding: 20px; background: #f9f9f9; }
              </style>
            </head>
            <body>
              <div class="preview">
                <h2>GoodNotes File Preview</h2>
                <p><strong>File:</strong> ${path_1.default.basename(filePath)}</p>
                <p><strong>Size:</strong> ${fileContent.length} bytes</p>
                <p><em>Full GoodNotes preview not available. Download the file to view complete content.</em></p>
            </div>
            </body>
          </html>
        `;
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.send(html);
            }
            else {
                res.setHeader('Content-Type', 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename="${path_1.default.basename(filePath)}"`);
                res.send(fileContent);
            }
        }
        catch (error) {
            console.error('Error reading GoodNotes file:', error);
            res.status(500).json({ error: 'Failed to read GoodNotes file' });
        }
    }
    // Image file handler
    static async readImageFile(req, res) {
        try {
            const { filePath } = req.query;
            if (!filePath) {
                return res.status(400).json({ error: 'filePath is required' });
            }
            console.log('Reading image file:', filePath);
            const fileContent = await storageManager_1.StorageManager.readFile(filePath);
            if (!fileContent) {
                return res.status(404).json({ error: 'File not found' });
            }
            res.setHeader('Content-Type', 'image/jpeg');
            res.send(fileContent);
        }
        catch (error) {
            console.error('Error reading image file:', error);
            res.status(500).json({ error: 'Failed to read image file' });
        }
    }
    // Text file handler
    static async readTextFile(req, res) {
        try {
            const { filePath } = req.query;
            if (!filePath) {
                return res.status(400).json({ error: 'filePath is required' });
            }
            console.log('Reading text file:', filePath);
            const fileContent = await storageManager_1.StorageManager.readFile(filePath);
            if (!fileContent) {
                return res.status(404).json({ error: 'File not found' });
            }
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.send(fileContent.toString('utf-8'));
        }
        catch (error) {
            console.error('Error reading text file:', error);
            res.status(500).json({ error: 'Failed to read text file' });
        }
    }
    // Download file handler
    static async downloadFile(req, res) {
        try {
            const { filePath } = req.query;
            if (!filePath) {
                return res.status(400).json({ error: 'filePath is required' });
            }
            console.log('Downloading file:', filePath);
            const fileContent = await storageManager_1.StorageManager.readFile(filePath);
            if (!fileContent) {
                return res.status(404).json({ error: 'File not found' });
            }
            const fileName = path_1.default.basename(filePath);
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Type', 'application/octet-stream');
            res.send(fileContent);
        }
        catch (error) {
            console.error('Error downloading file:', error);
            res.status(500).json({ error: 'Failed to download file' });
        }
    }
}
exports.FileSystemPathController = FileSystemPathController;
//# sourceMappingURL=FileSystemPathController.js.map