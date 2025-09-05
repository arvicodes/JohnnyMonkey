"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSystemPathController = void 0;
const client_1 = require("@prisma/client");
const storageManager_1 = require("../utils/storageManager");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const mammoth_1 = __importDefault(require("mammoth"));
const XLSX = __importStar(require("xlsx"));
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
                try {
                    // Convert DOCX to HTML using mammoth
                    const result = await mammoth_1.default.convertToHtml({ buffer: fileContent });
                    const html = result.value;
                    const messages = result.messages;
                    // Create a styled HTML preview
                    const styledHtml = `
            <html>
              <head>
                <title>DOCX Preview - ${path_1.default.basename(filePath)}</title>
                <style>
                  body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background: #f5f5f5;
                    line-height: 1.6;
                  }
                  .preview-container { 
                    max-width: 800px; 
                    margin: 0 auto; 
                    background: white; 
                    border-radius: 8px; 
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    overflow: hidden;
                  }
                  .preview-header { 
                    background: #1976d2; 
                    color: white; 
                    padding: 15px 20px; 
                    border-bottom: 1px solid #e0e0e0;
                  }
                  .preview-header h1 { 
                    margin: 0; 
                    font-size: 18px; 
                    font-weight: 600;
                  }
                  .preview-content { 
                    padding: 30px; 
                    min-height: 400px;
                  }
                  .preview-content h1, .preview-content h2, .preview-content h3 { 
                    color: #1976d2; 
                    margin-top: 25px; 
                    margin-bottom: 15px;
                  }
                  .preview-content p { 
                    margin-bottom: 15px; 
                    text-align: justify;
                  }
                  .preview-content ul, .preview-content ol { 
                    margin-bottom: 15px; 
                    padding-left: 25px;
                  }
                  .preview-content table { 
                    border-collapse: collapse; 
                    width: 100%; 
                    margin: 20px 0;
                  }
                  .preview-content table, .preview-content th, .preview-content td { 
                    border: 1px solid #ddd; 
                  }
                  .preview-content th, .preview-content td { 
                    padding: 8px 12px; 
                    text-align: left;
                  }
                  .preview-content th { 
                    background-color: #f2f2f2; 
                    font-weight: 600;
                  }
                  .warnings { 
                    background: #fff3cd; 
                    border: 1px solid #ffeaa7; 
                    padding: 10px; 
                    margin: 15px 0; 
                    border-radius: 4px; 
                    font-size: 14px;
                  }
                  .warning-title { 
                    font-weight: 600; 
                    color: #856404; 
                    margin-bottom: 5px;
                  }
                </style>
              </head>
              <body>
                <div class="preview-container">
                  <div class="preview-header">
                    <h1>📄 ${path_1.default.basename(filePath)}</h1>
                  </div>
                  <div class="preview-content">
                    ${html}
                    ${messages.length > 0 ? `
                      <div class="warnings">
                        <div class="warning-title">⚠️ Hinweise:</div>
                        ${messages.map(msg => `<div>• ${msg.message}</div>`).join('')}
                      </div>
                    ` : ''}
                  </div>
                </div>
              </body>
            </html>
          `;
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.send(styledHtml);
                }
                catch (conversionError) {
                    console.error('Error converting DOCX to HTML:', conversionError);
                    // Fallback to simple preview
                    const fallbackHtml = `
          <html>
            <head>
              <title>DOCX Preview</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .preview { border: 1px solid #ccc; padding: 20px; background: #f9f9f9; }
                  .error { color: #d32f2f; background: #ffebee; padding: 10px; border-radius: 4px; }
              </style>
            </head>
            <body>
              <div class="preview">
                <h2>DOCX File Preview</h2>
                <p><strong>File:</strong> ${path_1.default.basename(filePath)}</p>
                <p><strong>Size:</strong> ${fileContent.length} bytes</p>
                  <div class="error">
                    <strong>Fehler beim Konvertieren:</strong> ${conversionError.message}
                  </div>
                  <p><em>Bitte laden Sie die Datei herunter, um den Inhalt zu betrachten.</em></p>
              </div>
            </body>
          </html>
        `;
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.send(fallbackHtml);
                }
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
                try {
                    // Parse Excel file using xlsx
                    const workbook = XLSX.read(fileContent, { type: 'buffer' });
                    const sheetNames = workbook.SheetNames;
                    let htmlContent = '';
                    // Generate HTML for each sheet
                    sheetNames.forEach((sheetName, index) => {
                        const worksheet = workbook.Sheets[sheetName];
                        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                        if (jsonData.length > 0) {
                            htmlContent += `
                <div class="sheet-container">
                  <h3 class="sheet-title">📊 ${sheetName}</h3>
                  <div class="table-wrapper">
                    <table class="excel-table">
                      <tbody>
                        ${jsonData.map((row, rowIndex) => `
                          <tr class="row-${rowIndex}">
                            ${row.map((cell, cellIndex) => `
                              <td class="cell-${cellIndex} ${rowIndex === 0 ? 'header-cell' : ''}">
                                ${cell !== null && cell !== undefined ? String(cell) : ''}
                              </td>
                            `).join('')}
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              `;
                        }
                    });
                    // Create styled HTML preview
                    const styledHtml = `
            <html>
              <head>
                <title>Excel Preview - ${path_1.default.basename(filePath)}</title>
                <style>
                  body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background: #f5f5f5;
                    line-height: 1.6;
                  }
                  .preview-container { 
                    max-width: 1200px; 
                    margin: 0 auto; 
                    background: white; 
                    border-radius: 8px; 
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    overflow: hidden;
                  }
                  .preview-header { 
                    background: #2e7d32; 
                    color: white; 
                    padding: 15px 20px; 
                    border-bottom: 1px solid #e0e0e0;
                  }
                  .preview-header h1 { 
                    margin: 0; 
                    font-size: 18px; 
                    font-weight: 600;
                  }
                  .preview-content { 
                    padding: 30px; 
                    min-height: 400px;
                  }
                  .sheet-container { 
                    margin-bottom: 40px; 
                  }
                  .sheet-title { 
                    color: #2e7d32; 
                    margin-bottom: 15px; 
                    font-size: 16px; 
                    font-weight: 600;
                    border-bottom: 2px solid #e8f5e8;
                    padding-bottom: 8px;
                  }
                  .table-wrapper { 
                    overflow-x: auto; 
                    border: 1px solid #ddd; 
                    border-radius: 4px;
                  }
                  .excel-table { 
                    border-collapse: collapse; 
                    width: 100%; 
                    min-width: 500px;
                    font-size: 14px;
                  }
                  .excel-table td { 
                    border: 1px solid #ddd; 
                    padding: 8px 12px; 
                    text-align: left;
                    vertical-align: top;
                    white-space: nowrap;
                  }
                  .excel-table .header-cell { 
                    background-color: #e8f5e8; 
                    font-weight: 600; 
                    color: #2e7d32;
                  }
                  .excel-table tr:nth-child(even) { 
                    background-color: #f9f9f9; 
                  }
                  .excel-table tr:hover { 
                    background-color: #f0f8f0; 
                  }
                  .info-box { 
                    background: #e3f2fd; 
                    border: 1px solid #bbdefb; 
                    padding: 15px; 
                    margin: 20px 0; 
                    border-radius: 4px; 
                    font-size: 14px;
                  }
                  .info-title { 
                    font-weight: 600; 
                    color: #1976d2; 
                    margin-bottom: 8px;
                  }
                </style>
              </head>
              <body>
                <div class="preview-container">
                  <div class="preview-header">
                    <h1>📊 ${path_1.default.basename(filePath)}</h1>
                  </div>
                  <div class="preview-content">
                    <div class="info-box">
                      <div class="info-title">📋 Datei-Informationen:</div>
                      <div><strong>Dateigröße:</strong> ${fileContent.length} bytes</div>
                      <div><strong>Anzahl Arbeitsblätter:</strong> ${sheetNames.length}</div>
                      <div><strong>Arbeitsblätter:</strong> ${sheetNames.join(', ')}</div>
                    </div>
                    ${htmlContent || '<p><em>Keine Daten in der Excel-Datei gefunden.</em></p>'}
                  </div>
                </div>
              </body>
            </html>
          `;
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.send(styledHtml);
                }
                catch (conversionError) {
                    console.error('Error converting Excel to HTML:', conversionError);
                    // Fallback to simple preview
                    const fallbackHtml = `
          <html>
            <head>
              <title>Excel Preview</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .preview { border: 1px solid #ccc; padding: 20px; background: #f9f9f9; }
                  .error { color: #d32f2f; background: #ffebee; padding: 10px; border-radius: 4px; }
              </style>
            </head>
            <body>
              <div class="preview">
                <h2>Excel File Preview</h2>
                <p><strong>File:</strong> ${path_1.default.basename(filePath)}</p>
                <p><strong>Size:</strong> ${fileContent.length} bytes</p>
                  <div class="error">
                    <strong>Fehler beim Konvertieren:</strong> ${conversionError.message}
                  </div>
                  <p><em>Bitte laden Sie die Datei herunter, um den Inhalt zu betrachten.</em></p>
                  </div>
            </body>
          </html>
        `;
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.send(fallbackHtml);
                }
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
            const { filePath, preview } = req.query;
            if (!filePath) {
                return res.status(400).json({ error: 'filePath is required' });
            }
            console.log('Reading image file:', filePath);
            const fileContent = await storageManager_1.StorageManager.readFile(filePath);
            if (!fileContent) {
                return res.status(404).json({ error: 'File not found' });
            }
            if (preview === 'true') {
                // For preview, return JSON with base64 encoded image
                const base64Image = fileContent.toString('base64');
                const fileExtension = path_1.default.extname(filePath).toLowerCase();
                let mimeType = 'image/jpeg'; // default
                // Determine MIME type based on file extension
                switch (fileExtension) {
                    case '.png':
                        mimeType = 'image/png';
                        break;
                    case '.gif':
                        mimeType = 'image/gif';
                        break;
                    case '.bmp':
                        mimeType = 'image/bmp';
                        break;
                    case '.webp':
                        mimeType = 'image/webp';
                        break;
                    case '.svg':
                        mimeType = 'image/svg+xml';
                        break;
                    case '.jpg':
                    case '.jpeg':
                    default:
                        mimeType = 'image/jpeg';
                        break;
                }
                const response = {
                    dataUrl: `data:${mimeType};base64,${base64Image}`,
                    url: `data:${mimeType};base64,${base64Image}`,
                    fileName: path_1.default.basename(filePath),
                    fileSize: fileContent.length,
                    mimeType: mimeType
                };
                res.json(response);
            }
            else {
                // For direct download, return the raw image
                const fileExtension = path_1.default.extname(filePath).toLowerCase();
                let mimeType = 'image/jpeg'; // default
                // Determine MIME type based on file extension
                switch (fileExtension) {
                    case '.png':
                        mimeType = 'image/png';
                        break;
                    case '.gif':
                        mimeType = 'image/gif';
                        break;
                    case '.bmp':
                        mimeType = 'image/bmp';
                        break;
                    case '.webp':
                        mimeType = 'image/webp';
                        break;
                    case '.svg':
                        mimeType = 'image/svg+xml';
                        break;
                    case '.jpg':
                    case '.jpeg':
                    default:
                        mimeType = 'image/jpeg';
                        break;
                }
                res.setHeader('Content-Type', mimeType);
                res.setHeader('Content-Disposition', `inline; filename="${path_1.default.basename(filePath)}"`);
                res.send(fileContent);
            }
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
    /**
     * Get J-M-Reihen path for current environment
     */
    static async getJmReihenPath(req, res) {
        try {
            // Verwende relativen Pfad für Produktion, absoluten für Entwicklung
            const jmReihenPath = process.env.NODE_ENV === 'production'
                ? 'J-M-Reihen'
                : '/Users/verachrist/Documents/Monkey/JohnnyMonkey/J-M-Reihen';
            res.json({ path: jmReihenPath });
        }
        catch (error) {
            console.error('Error getting J-M-Reihen path:', error);
            res.status(500).json({ error: 'Failed to get J-M-Reihen path' });
        }
    }
}
exports.FileSystemPathController = FileSystemPathController;
//# sourceMappingURL=FileSystemPathController.js.map