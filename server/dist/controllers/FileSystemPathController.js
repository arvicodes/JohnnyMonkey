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
    // HTML-Datei lesen (für Lehrer und Schüler - keine Authentifizierung erforderlich)
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
                    // Filter out Intense Quote warnings
                    const messages = result.messages.filter(msg => !msg.message.includes('Intense Quote') &&
                        !msg.message.includes('IntenseQuote'));
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
                  .preview-content { 
                    padding: 10px; 
                    min-height: 400px;
                  }
                  .preview-content h1, .preview-content h2, .preview-content h3 { 
                    color: #1976d2; 
                    margin-top: 5px; 
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
                  .intense-quote {
                    border-left: 4px solid #1976d2;
                    padding-left: 15px;
                    margin: 15px 0;
                    font-style: italic;
                    background-color: #f5f5f5;
                    padding: 10px 15px;
                    border-radius: 4px;
                  }
                </style>
              </head>
              <body>
                <div class="preview-container">
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
                    padding: 10px; 
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
            // PowerPoint-Dateien: Wenn preview=true, zeige Download-Seite
            // Ansonsten: Direkter Download
            if (preview === 'true') {
                const fileName = path_1.default.basename(filePath);
                const encodedPath = encodeURIComponent(filePath);
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.send(`<!DOCTYPE html>
<html>
<head>
  <title>PowerPoint Viewer</title>
  <meta charset="utf-8">
  <style>
    body {
      margin: 0;
      padding: 40px 20px;
      font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      max-width: 600px;
      background: white;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      text-align: center;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }
    .filename {
      color: #666;
      font-size: 14px;
      margin-bottom: 30px;
      word-break: break-all;
    }
    .message {
      color: #555;
      line-height: 1.6;
      margin-bottom: 30px;
      font-size: 15px;
    }
    .download-btn {
      display: inline-block;
      padding: 14px 28px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }
    .download-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
    }
    .icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📊</div>
    <h1>PowerPoint-Präsentation</h1>
    <div class="filename">${fileName}</div>
    <div class="message">
      PowerPoint-Dateien können nicht direkt im Browser angezeigt werden.<br>
      Bitte laden Sie die Datei herunter und öffnen Sie sie mit PowerPoint oder einer anderen Office-Anwendung.
    </div>
    <a href="/api/file-system-paths/read-powerpoint?filePath=${encodedPath}" class="download-btn">
      📥 Datei herunterladen
    </a>
  </div>
</body>
</html>`);
                return;
            }
            else {
                // PowerPoint-Dateien werden direkt heruntergeladen
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
                // Für PDF-Dateien: Im Browser öffnen, nicht herunterladen
                const fileName = path_1.default.basename(filePath);
                // Echte PDF-Dateien
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Accept-Ranges', 'bytes');
                res.setHeader('Content-Length', fileContent.length.toString());
                res.setHeader('X-Content-Type-Options', 'nosniff');
                res.send(fileContent);
            }
        }
        catch (error) {
            console.error('Error reading PDF file:', error);
            res.status(500).json({ error: 'Failed to read PDF file' });
        }
    }
    // PDF-Datei lesen mit sauberer URL (nur Dateiname)
    static async readPdfByFilename(req, res) {
        try {
            const { filename } = req.params;
            if (!filename) {
                return res.status(400).json({ error: 'filename is required' });
            }
            console.log('Reading PDF file by filename:', filename);
            // Suche die PDF-Datei im J-M-Reihen Verzeichnis
            const searchPath = '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/J-M-Reihen';
            const foundPath = await FileSystemPathController.findFileInDirectory(searchPath, filename);
            if (!foundPath) {
                return res.status(404).json({ error: 'PDF file not found' });
            }
            const fileContent = await storageManager_1.StorageManager.readFile(foundPath);
            if (!fileContent) {
                return res.status(404).json({ error: 'File not found' });
            }
            // Für PDF-Dateien: Im Browser öffnen, nicht herunterladen
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Content-Length', fileContent.length.toString());
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.send(fileContent);
        }
        catch (error) {
            console.error('Error reading PDF file by filename:', error);
            res.status(500).json({ error: 'Failed to read PDF file' });
        }
    }
    // Hilfsfunktion zum Suchen einer Datei im Verzeichnis
    static async findFileInDirectory(dirPath, filename) {
        try {
            const fs = require('fs');
            const path = require('path');
            if (!fs.existsSync(dirPath)) {
                return null;
            }
            const items = fs.readdirSync(dirPath);
            for (const item of items) {
                const fullPath = path.join(dirPath, item);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    // Rekursiv in Unterverzeichnissen suchen
                    const found = await this.findFileInDirectory(fullPath, filename);
                    if (found) {
                        return found;
                    }
                }
                else if (stat.isFile() && item === filename) {
                    // Datei gefunden - konvertiere zu git-intern Pfad
                    const relativePath = fullPath.replace('/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/J-M-Reihen/', '');
                    return `git-intern/${relativePath}`;
                }
            }
            return null;
        }
        catch (error) {
            console.error('Error searching for file:', error);
            return null;
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
            let { filePath, preview } = req.query;
            if (!filePath) {
                return res.status(400).json({ error: 'filePath is required' });
            }
            // Dekodiere den Pfad falls er URL-kodiert ist
            if (typeof filePath === 'string') {
                filePath = decodeURIComponent(filePath);
            }
            console.log('Reading image file:', filePath);
            console.log('File exists:', fs_1.default.existsSync(filePath));
            // Prüfe direkt mit fs, ob die Datei existiert
            if (!fs_1.default.existsSync(filePath)) {
                console.error('File does not exist at path:', filePath);
                return res.status(404).json({ error: 'File not found', path: filePath });
            }
            const fileContent = await storageManager_1.StorageManager.readFile(filePath);
            if (!fileContent) {
                console.error('StorageManager.readFile returned null for:', filePath);
                // Versuche direkt mit fs zu lesen als Fallback
                try {
                    const directContent = fs_1.default.readFileSync(filePath);
                    console.log('Successfully read file directly with fs');
                    // Verwende den direkten Inhalt weiter unten
                    const fileContentToUse = directContent;
                    if (preview === 'true') {
                        // For preview, return JSON with base64 encoded image
                        const base64Image = fileContentToUse.toString('base64');
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
                            fileSize: fileContentToUse.length,
                            mimeType: mimeType
                        };
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Cache-Control', 'public, max-age=3600');
                        return res.json(response);
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
                        res.setHeader('Cache-Control', 'public, max-age=3600');
                        return res.send(fileContentToUse);
                    }
                }
                catch (error) {
                    console.error('Error reading file directly:', error);
                    return res.status(500).json({ error: 'Failed to read image file', details: error });
                }
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
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'public, max-age=3600');
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
                res.setHeader('Cache-Control', 'public, max-age=3600');
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
                : '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/J-M-Reihen';
            res.json({ path: jmReihenPath });
        }
        catch (error) {
            console.error('Error getting J-M-Reihen path:', error);
            res.status(500).json({ error: 'Failed to get J-M-Reihen path' });
        }
    }
    /**
     * Save a file (e.g., whiteboard) to a specific directory
     */
    static async saveFile(req, res) {
        try {
            const file = req.file;
            const targetPath = req.body.targetPath || req.query.targetPath;
            if (!file) {
                return res.status(400).json({ error: 'Keine Datei hochgeladen' });
            }
            if (!targetPath) {
                return res.status(400).json({ error: 'Zielverzeichnis fehlt' });
            }
            console.log('=== SAVE FILE REQUEST ===');
            console.log('File:', file.originalname);
            console.log('Target path:', targetPath);
            // Determine the full path
            let fullTargetPath;
            if (targetPath.startsWith('git-intern/')) {
                // Handle git-intern paths
                const relativePath = decodeURIComponent(targetPath.replace('git-intern/', ''));
                // Use absolute path to project root for development
                const projectRoot = '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey';
                fullTargetPath = path_1.default.join(projectRoot, 'J-M-Reihen', relativePath);
            }
            else if (targetPath.startsWith('/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/')) {
                // Handle already absolute paths
                fullTargetPath = targetPath;
            }
            else if (targetPath.startsWith('git-intern//Users/')) {
                // Handle double git-intern paths (fix for the bug)
                const relativePath = decodeURIComponent(targetPath.replace('git-intern//Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/J-M-Reihen/', ''));
                const projectRoot = '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey';
                fullTargetPath = path_1.default.join(projectRoot, 'J-M-Reihen', relativePath);
            }
            else {
                // Handle local paths
                fullTargetPath = path_1.default.resolve(targetPath);
            }
            console.log('Full target path:', fullTargetPath);
            // Ensure directory exists
            if (!fs_1.default.existsSync(fullTargetPath)) {
                console.log('Creating directory:', fullTargetPath);
                fs_1.default.mkdirSync(fullTargetPath, { recursive: true });
            }
            // Save file
            const finalFilePath = path_1.default.join(fullTargetPath, file.originalname);
            console.log('Saving file to:', finalFilePath);
            fs_1.default.writeFileSync(finalFilePath, file.buffer);
            console.log('File saved successfully');
            res.json({
                success: true,
                path: finalFilePath,
                filename: file.originalname
            });
        }
        catch (error) {
            console.error('Error saving file:', error);
            // Handle specific Multer errors
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ error: 'Datei ist zu groß. Maximale Größe: 50MB' });
            }
            if (error.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({ error: 'Unerwartete Datei' });
            }
            res.status(500).json({ error: 'Fehler beim Speichern der Datei: ' + (error.message || 'Unbekannter Fehler') });
        }
    }
    /**
     * Load whiteboard file (.wb) as JSON
     */
    static async loadWhiteboardFile(req, res) {
        try {
            const { filePath } = req.query;
            if (!filePath || typeof filePath !== 'string') {
                return res.status(400).json({ error: 'Dateipfad ist erforderlich' });
            }
            console.log('Loading whiteboard file:', filePath);
            // Determine the full path
            let fullFilePath;
            if (filePath.startsWith('git-intern/')) {
                // Handle git-intern paths
                const relativePath = decodeURIComponent(filePath.replace('git-intern/', ''));
                // Use absolute path to project root for development
                const projectRoot = '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey';
                fullFilePath = path_1.default.join(projectRoot, 'J-M-Reihen', relativePath);
            }
            else {
                // Handle local paths
                fullFilePath = path_1.default.resolve(filePath);
            }
            console.log('Full file path:', fullFilePath);
            // Check if file exists
            if (!fs_1.default.existsSync(fullFilePath)) {
                return res.status(404).json({ error: 'Datei existiert nicht' });
            }
            // Read and parse the .wb file
            const fileContent = fs_1.default.readFileSync(fullFilePath, 'utf8');
            const whiteboardData = JSON.parse(fileContent);
            console.log('Whiteboard file loaded successfully');
            res.json(whiteboardData);
        }
        catch (error) {
            console.error('Error loading whiteboard file:', error);
            res.status(500).json({ error: 'Fehler beim Laden der Whiteboard-Datei' });
        }
    }
    /**
     * Serve static files from J-M-Reihen directory
     */
    static async serveStaticFile(req, res) {
        try {
            let filePath = req.params[0]; // Get the wildcard parameter
            if (!filePath) {
                return res.status(400).json({ error: 'File path is required' });
            }
            // Decode URL-encoded path (e.g., %20 -> space)
            filePath = decodeURIComponent(filePath);
            console.log('Serving static file:', filePath);
            // Construct the git-intern path
            const gitInternPath = `git-intern/${filePath}`;
            const fileContent = await storageManager_1.StorageManager.readFile(gitInternPath);
            if (!fileContent) {
                return res.status(404).json({ error: 'File not found' });
            }
            // Determine MIME type based on file extension
            const ext = path_1.default.extname(filePath).toLowerCase();
            let mimeType = 'text/plain';
            switch (ext) {
                case '.css':
                    mimeType = 'text/css';
                    break;
                case '.js':
                    mimeType = 'application/javascript';
                    break;
                case '.html':
                    mimeType = 'text/html';
                    break;
                case '.json':
                    mimeType = 'application/json';
                    break;
                case '.png':
                    mimeType = 'image/png';
                    break;
                case '.jpg':
                case '.jpeg':
                    mimeType = 'image/jpeg';
                    break;
                case '.gif':
                    mimeType = 'image/gif';
                    break;
                case '.svg':
                    mimeType = 'image/svg+xml';
                    break;
                case '.webp':
                    mimeType = 'image/webp';
                    break;
                case '.ico':
                    mimeType = 'image/x-icon';
                    break;
            }
            res.setHeader('Content-Type', mimeType);
            // For binary files (images), send the buffer directly
            if (mimeType.startsWith('image/')) {
                res.send(fileContent);
            }
            else {
                // For text files, convert to string
                res.send(fileContent.toString('utf-8'));
            }
        }
        catch (error) {
            console.error('Error serving static file:', error);
            res.status(500).json({ error: 'Failed to serve static file' });
        }
    }
    /**
     * Scan directory for subdirectories only (recursively)
     */
    static async scanDirectory(req, res) {
        try {
            const { path: targetPath } = req.query;
            if (!targetPath || typeof targetPath !== 'string') {
                return res.status(400).json({ error: 'Pfad ist erforderlich' });
            }
            const fullPath = path_1.default.resolve(targetPath);
            console.log('Scanning directory recursively:', fullPath);
            // Check if path exists and is a directory
            if (!fs_1.default.existsSync(fullPath)) {
                return res.status(404).json({ error: 'Pfad existiert nicht' });
            }
            if (!fs_1.default.statSync(fullPath).isDirectory()) {
                return res.status(400).json({ error: 'Pfad ist kein Verzeichnis' });
            }
            // Recursively find all directories and files
            const allItems = [];
            function scanRecursive(currentPath, relativePath = '') {
                try {
                    const items = fs_1.default.readdirSync(currentPath, { withFileTypes: true });
                    items.forEach(item => {
                        const itemPath = path_1.default.join(currentPath, item.name);
                        const itemRelativePath = relativePath ? path_1.default.join(relativePath, item.name) : item.name;
                        if (item.isDirectory()) {
                            // Add this directory
                            allItems.push({
                                name: itemRelativePath,
                                path: itemPath,
                                type: 'directory'
                            });
                            // Recursively scan subdirectories
                            scanRecursive(itemPath, itemRelativePath);
                        }
                        else if (item.isFile() && (item.name.endsWith('.wb') || item.name.endsWith('.pdf'))) {
                            // Add whiteboard files
                            allItems.push({
                                name: itemRelativePath,
                                path: itemPath,
                                type: 'file',
                                extension: path_1.default.extname(item.name)
                            });
                        }
                    });
                }
                catch (error) {
                    console.log(`Could not read directory ${currentPath}:`, error);
                }
            }
            scanRecursive(fullPath);
            console.log(`Found ${allItems.length} items recursively in ${fullPath}`);
            res.json({
                path: fullPath,
                directories: allItems
            });
        }
        catch (error) {
            console.error('Error scanning directory:', error);
            res.status(500).json({ error: 'Fehler beim Scannen des Verzeichnisses' });
        }
    }
    /**
     * Save file using sendBeacon (for automatic saving when closing tab)
     */
    static async saveFileBeacon(req, res) {
        try {
            console.log('=== SAVE FILE BEACON REQUEST ===');
            // Get the raw body data
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                var _a;
                try {
                    // Parse the JSON data
                    const whiteboardData = JSON.parse(body);
                    // Extract metadata from the embedded saveMetadata
                    const saveMetadata = (_a = whiteboardData.metadata) === null || _a === void 0 ? void 0 : _a.saveMetadata;
                    if (!saveMetadata) {
                        console.error('No saveMetadata found in request');
                        return res.status(400).json({ error: 'Keine Speicher-Metadaten gefunden' });
                    }
                    const { filename, targetPath, format } = saveMetadata;
                    console.log('Beacon save - File:', filename);
                    console.log('Beacon save - Target path:', targetPath);
                    console.log('Beacon save - Format:', format);
                    // Determine the full path
                    let fullTargetPath;
                    if (targetPath.startsWith('git-intern/')) {
                        // Handle git-intern paths
                        const relativePath = decodeURIComponent(targetPath.replace('git-intern/', ''));
                        // Use absolute path to project root for development
                        const projectRoot = '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey';
                        fullTargetPath = path_1.default.join(projectRoot, 'J-M-Reihen', relativePath);
                    }
                    else {
                        // Handle local paths
                        fullTargetPath = path_1.default.resolve(targetPath);
                    }
                    console.log('Beacon save - Full target path:', fullTargetPath);
                    // Ensure directory exists
                    if (!fs_1.default.existsSync(fullTargetPath)) {
                        console.log('Beacon save - Creating directory:', fullTargetPath);
                        fs_1.default.mkdirSync(fullTargetPath, { recursive: true });
                    }
                    // Save file
                    const finalFilePath = path_1.default.join(fullTargetPath, filename);
                    console.log('Beacon save - Saving file to:', finalFilePath);
                    // Write the JSON data to file
                    fs_1.default.writeFileSync(finalFilePath, JSON.stringify(whiteboardData, null, 2));
                    console.log('Beacon save - File saved successfully');
                    res.json({
                        success: true,
                        path: finalFilePath,
                        filename: filename
                    });
                }
                catch (parseError) {
                    console.error('Error parsing beacon request body:', parseError);
                    res.status(400).json({ error: 'Fehler beim Parsen der Anfrage' });
                }
            });
        }
        catch (error) {
            console.error('Error in saveFileBeacon:', error);
            res.status(500).json({ error: 'Fehler beim Speichern der Datei' });
        }
    }
}
exports.FileSystemPathController = FileSystemPathController;
//# sourceMappingURL=FileSystemPathController.js.map