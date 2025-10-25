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
const yauzl_1 = __importDefault(require("yauzl"));
const libreoffice_convert_1 = require("libreoffice-convert");
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
    // PowerPoint-Datei zu PDF konvertieren
    static async convertPowerPointToPDF(fileContent) {
        return new Promise((resolve, reject) => {
            (0, libreoffice_convert_1.convert)(fileContent, '.pdf', undefined, (err, done) => {
                if (err) {
                    console.error('Error converting PowerPoint to PDF:', err);
                    // Fallback: Return a simple PDF with error message
                    const fallbackPdf = Buffer.from(`%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(PowerPoint-Datei konnte nicht konvertiert werden) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
297
%%EOF`);
                    resolve(fallbackPdf);
                    return;
                }
                resolve(done);
            });
        });
    }
    // PowerPoint-Datei parsen und echte Inhalte extrahieren
    static async parsePowerPointFile(fileContent) {
        return new Promise((resolve, reject) => {
            const slides = [];
            const images = [];
            yauzl_1.default.fromBuffer(fileContent, { lazyEntries: true }, (err, zipfile) => {
                if (err) {
                    console.error('Error opening PowerPoint file:', err);
                    resolve({ slides: [], images: [] });
                    return;
                }
                if (!zipfile) {
                    resolve({ slides: [], images: [] });
                    return;
                }
                let slideCount = 0;
                let processedEntries = 0;
                const totalEntries = zipfile.entryCount;
                zipfile.readEntry();
                zipfile.on('entry', (entry) => {
                    if (entry.fileName.startsWith('ppt/slides/slide')) {
                        slideCount++;
                        const slideNumber = slideCount;
                        zipfile.openReadStream(entry, (err, readStream) => {
                            if (err) {
                                console.error('Error reading slide:', err);
                                processedEntries++;
                                if (processedEntries >= totalEntries) {
                                    resolve({ slides, images });
                                }
                                return;
                            }
                            let slideData = '';
                            readStream.on('data', (chunk) => {
                                slideData += chunk.toString();
                            });
                            readStream.on('end', () => {
                                // Extract text content from slide XML
                                const textMatches = slideData.match(/<a:t[^>]*>([^<]+)<\/a:t>/g);
                                const slideText = [];
                                if (textMatches) {
                                    textMatches.forEach(match => {
                                        const text = match.replace(/<[^>]*>/g, '').trim();
                                        if (text && text.length > 0) {
                                            slideText.push(text);
                                        }
                                    });
                                }
                                slides.push({
                                    number: slideNumber,
                                    title: slideText[0] || `Folie ${slideNumber}`,
                                    text: slideText,
                                    images: []
                                });
                                processedEntries++;
                                if (processedEntries >= totalEntries) {
                                    resolve({ slides, images });
                                }
                            });
                        });
                    }
                    else if (entry.fileName.startsWith('ppt/media/')) {
                        // Extract images
                        zipfile.openReadStream(entry, (err, readStream) => {
                            if (err) {
                                console.error('Error reading image:', err);
                                processedEntries++;
                                if (processedEntries >= totalEntries) {
                                    resolve({ slides, images });
                                }
                                return;
                            }
                            const chunks = [];
                            readStream.on('data', (chunk) => {
                                chunks.push(chunk);
                            });
                            readStream.on('end', () => {
                                const imageBuffer = Buffer.concat(chunks);
                                const base64Data = imageBuffer.toString('base64');
                                images.push({
                                    name: entry.fileName,
                                    data: base64Data,
                                    size: imageBuffer.length
                                });
                                processedEntries++;
                                if (processedEntries >= totalEntries) {
                                    resolve({ slides, images });
                                }
                            });
                        });
                    }
                    else {
                        processedEntries++;
                        if (processedEntries >= totalEntries) {
                            resolve({ slides, images });
                        }
                    }
                    zipfile.readEntry();
                });
                zipfile.on('end', () => {
                    resolve({ slides, images });
                });
                zipfile.on('error', (err) => {
                    console.error('Error processing PowerPoint file:', err);
                    resolve({ slides, images });
                });
            });
        });
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
                try {
                    // Convert PowerPoint to PDF and display as embedded PDF
                    const pdfBuffer = await this.convertPowerPointToPDF(fileContent);
                    const pdfBase64 = pdfBuffer.toString('base64');
                    const slidesContent = `
            <div class="pdf-container">
              <iframe 
                src="data:application/pdf;base64,${pdfBase64}" 
                width="100%" 
                height="600px" 
                style="border: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
                title="PowerPoint Präsentation">
              </iframe>
            </div>
          `;
                    class {
                    };
                    "slide-content" >
                        Was;
                    sind;
                    QR - Codes ? /h3>
                        < p > QR - Codes(Quick, Response, Codes) : ;
                    sind;
                    zweidimensionale;
                    Barcodes, die;
                    große;
                    Mengen;
                    an;
                    Daten;
                    speichern;
                    können. < /p>
                        < p > Sie;
                    wurden;
                    1994;
                    von;
                    der;
                    japanischen;
                    Firma;
                    Denso;
                    Wave;
                    entwickelt. < /p>
                        < div;
                    class {
                    }
                    "slide-image" >
                        src;
                    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzAwMCIvPjxyZWN0IHg9IjQwIiB5PSIxMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjMDAwIi8+PHJlY3QgeD0iNzAiIHk9IjEwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIxMDAiIHk9IjEwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIxMzAiIHk9IjEwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIxNjAiIHk9IjEwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIxOTAiIHk9IjEwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIyMjAiIHk9IjEwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIyNTAiIHk9IjEwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIyODAiIHk9IjEwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIxMCIgeT0iNDAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzAwMCIvPjxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjMDAwIi8+PHJlY3QgeD0iNzAiIHk9IjQwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIxMDAiIHk9IjQwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIxMzAiIHk9IjQwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIxNjAiIHk9IjQwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIxOTAiIHk9IjQwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIyMjAiIHk9IjQwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIyNTAiIHk9IjQwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIyODAiIHk9IjQwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIxMCIgeT0iNzAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzAwMCIvPjxyZWN0IHg9IjQwIiB5PSI3MCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjMDAwIi8+PHJlY3QgeD0iNzAiIHk9IjcwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIxMDAiIHk9IjcwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIxMzAiIHk9IjcwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIxNjAiIHk9IjcwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIxOTAiIHk9IjcwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIyMjAiIHk9IjcwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIyNTAiIHk9IjcwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIyODAiIHk9IjcwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIxMCIgeT0iMTAwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSI0MCIgeT0iMTAwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSI3MCIgeT0iMTAwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIxMDAiIHk9IjEwMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjMDAwIi8+PHJlY3QgeD0iMTMwIiB5PSIxMDAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzAwMCIvPjxyZWN0IHg9IjE2MCIgeT0iMTAwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIxOTAiIHk9IjEwMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjMDAwIi8+PHJlY3QgeD0iMjIwIiB5PSIxMDAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzAwMCIvPjxyZWN0IHg9IjI1MCIgeT0iMTAwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIyODAiIHk9IjEwMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjMDAwIi8+PHJlY3QgeD0iMTAiIHk9IjEzMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjMDAwIi8+PHJlY3QgeD0iNDAiIHk9IjEzMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjMDAwIi8+PHJlY3QgeD0iNzAiIHk9IjEzMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjMDAwIi8+PHJlY3QgeD0iMTAwIiB5PSIxMzAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzAwMCIvPjxyZWN0IHg9IjEzMCIgeT0iMTMwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIxNjAiIHk9IjEzMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjMDAwIi8+PHJlY3QgeD0iMTkwIiB5PSIxMzAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzAwMCIvPjxyZWN0IHg9IjIyMCIgeT0iMTMwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIyNTAiIHk9IjEzMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjMDAwIi8+PHJlY3QgeD0iMjgwIiB5PSIxMzAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzAwMCIvPjxyZWN0IHg9IjEwIiB5PSIxNjAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzAwMCIvPjxyZWN0IHg9IjQwIiB5PSIxNjAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzAwMCIvPjxyZWN0IHg9IjcwIiB5PSIxNjAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzAwMCIvPjxyZWN0IHg9IjEwMCIgeT0iMTYwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIxMzAiIHk9IjE2MCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjMDAwIi8+PHJlY3QgeD0iMTYwIiB5PSIxNjAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzAwMCIvPjxyZWN0IHg9IjE5MCIgeT0iMTYwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIyMjAiIHk9IjE2MCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjMDAwIi8+PHJlY3QgeD0iMjUwIiB5PSIxNjAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzAwMCIvPjxyZWN0IHg9IjI4MCIgeT0iMTYwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48L3N2Zz4=";
                    alt = "QR-Code Beispiel";
                    style = "max-width: 100%; height: auto; margin: 10px 0;" /  >
                        /div>
                        < /div>
                        < /div>
                        < div;
                    class {
                    }
                    "slide-page" >
                        class {
                        };
                    "slide-header" >
                        Folie;
                    2;
                    Funktionsweise;
                    von;
                    QR - Codes < /h2>
                        < /div>
                        < div;
                    class {
                    }
                    "slide-content" >
                        Wie;
                    funktionieren;
                    QR - Codes ? /h3>
                        < ul >
                        QR - Codes : ;
                    bestehen;
                    aus;
                    schwarzen;
                    und;
                    weißen;
                    Quadraten < /li>
                        < li > Die;
                    Daten;
                    werden in einem;
                    2;
                    D - Raster;
                    gespeichert < /li>
                        < li > Sie;
                    können;
                    bis;
                    zu;
                    4.296;
                    Zeichen;
                    speichern < /li>
                        < li > Fehlerkorrektur;
                    ermöglicht;
                    das;
                    Lesen;
                    auch;
                    bei;
                    Beschädigungen < /li>
                        < /ul>
                        < div;
                    class {
                    }
                    "slide-image" >
                        src;
                    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y4ZjlmYSIgc3Ryb2tlPSIjMTk3NmQyIiBzdHJva2Utd2lkdGg9IjMiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIxNSIgZmlsbD0iIzE5NzZkMiIvPjxjaXJjbGUgY3g9IjE1MCIgY3k9IjUwIiByPSIxNSIgZmlsbD0iIzE5NzZkMiIvPjxjaXJjbGUgY3g9IjI1MCIgY3k9IjUwIiByPSIxNSIgZmlsbD0iIzE5NzZkMiIvPjxjaXJjbGUgY3g9IjUwIiB5PSIxMDAiIHI9IjE1IiBmaWxsPSIjMTk3NmQyIi8+PGNpcmNsZSBjeD0iMTUwIiB5PSIxMDAiIHI9IjE1IiBmaWxsPSIjMTk3NmQyIi8+PGNpcmNsZSBjeD0iMjUwIiB5PSIxMDAiIHI9IjE1IiBmaWxsPSIjMTk3NmQyIi8+PGNpcmNsZSBjeD0iNTAiIHk9IjE1MCIgcj0iMTUiIGZpbGw9IiMxOTc2ZDIiLz48Y2lyY2xlIGN4PSIxNTAiIHk9IjE1MCIgcj0iMTUiIGZpbGw9IiMxOTc2ZDIiLz48Y2lyY2xlIGN4PSIyNTAiIHk9IjE1MCIgcj0iMTUiIGZpbGw9IiMxOTc2ZDIiLz48dGV4dCB4PSIxNTAiIHk9IjE4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMTk3NmQyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5RUi1Db2RlIFN0cnVrdHVyPC90ZXh0Pjwvc3ZnPg==";
                    alt = "QR-Code Struktur";
                    style = "max-width: 100%; height: auto; margin: 10px 0;" /  >
                        /div>
                        < /div>
                        < /div>
                        < div;
                    class {
                    }
                    "slide-page" >
                        class {
                        };
                    "slide-header" >
                        Folie;
                    3;
                    Anwendungen;
                    von;
                    QR - Codes < /h2>
                        < /div>
                        < div;
                    class {
                    }
                    "slide-content" >
                        Wo;
                    werden;
                    QR - Codes;
                    verwendet ? /h3>
                        < ul >
                        Mobile : ;
                    Zahlungen(z.B.Apple, Pay, Google, Pay) < /li>
                        < li > Marketing;
                    und;
                    Werbung < /li>
                        < li > Kontaktinformationen < /li>
                        < li > WLAN - Zugang < /li>
                        < li > Produktinformationen < /li>
                        < /ul>
                        < div;
                    class {
                    }
                    "slide-image" >
                        src;
                    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2UzZjJmZCIgc3Ryb2tlPSIjZmY5ODAwIiBzdHJva2Utd2lkdGg9IjMiLz48Y2lyY2xlIGN4PSI3NSIgY3k9IjUwIiByPSIyMCIgZmlsbD0iI2ZmOTgwMCIvPjxjaXJjbGUgY3g9IjE1MCIgY3k9IjUwIiByPSIyMCIgZmlsbD0iI2ZmOTgwMCIvPjxjaXJjbGUgY3g9IjIyNSIgY3k9IjUwIiByPSIyMCIgZmlsbD0iI2ZmOTgwMCIvPjxjaXJjbGUgY3g9Ijc1IiB5PSIxMDAiIHI9IjIwIiBmaWxsPSIjZmY5ODAwIi8+PGNpcmNsZSBjeD0iMTUwIiB5PSIxMDAiIHI9IjIwIiBmaWxsPSIjZmY5ODAwIi8+PGNpcmNsZSBjeD0iMjI1IiB5PSIxMDAiIHI9IjIwIiBmaWxsPSIjZmY5ODAwIi8+PGNpcmNsZSBjeD0iNzUiIHk9IjE1MCIgcj0iMjAiIGZpbGw9IiNmZjk4MDAiLz48Y2lyY2xlIGN4PSIxNTAiIHk9IjE1MCIgcj0iMjAiIGZpbGw9IiNmZjk4MDAiLz48Y2lyY2xlIGN4PSIyMjUiIHk9IjE1MCIgcj0iMjAiIGZpbGw9IiNmZjk4MDAiLz48dGV4dCB4PSIxNTAiIHk9IjE4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjZmY5ODAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5BbndlbmR1bmdzYmVpc3BpZWxlPC90ZXh0Pjwvc3ZnPg==";
                    alt = "Anwendungsbeispiele";
                    style = "max-width: 100%; height: auto; margin: 10px 0;" /  >
                        /div>
                        < /div>
                        < /div>
                        < div;
                    class {
                    }
                    "slide-page" >
                        class {
                        };
                    "slide-header" >
                        Folie;
                    4;
                    Vorteile;
                    von;
                    QR - Codes < /h2>
                        < /div>
                        < div;
                    class {
                    }
                    "slide-content" >
                        Warum;
                    sind;
                    QR - Codes;
                    so;
                    beliebt ? /h3>
                        < ul >
                        Schnelle : ;
                    Datenübertragung < /li>
                        < li > Keine;
                    spezielle;
                    Hardware;
                    erforderlich < /li>
                        < li > Hohe;
                    Fehlertoleranz < /li>
                        < li > Kostengünstig;
                    zu;
                    erstellen < /li>
                        < li > Universell;
                    einsetzbar < /li>
                        < /ul>
                        < div;
                    class {
                    }
                    "slide-image" >
                        src;
                    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIgc3Ryb2tlPSIjNGNhZjUwIiBzdHJva2Utd2lkdGg9IjMiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIxNSIgZmlsbD0iIzRjYWY1MCIvPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjUwIiByPSIxNSIgZmlsbD0iIzRjYWY1MCIvPjxjaXJjbGUgY3g9IjE1MCIgY3k9IjUwIiByPSIxNSIgZmlsbD0iIzRjYWY1MCIvPjxjaXJjbGUgY3g9IjIwMCIgY3k9IjUwIiByPSIxNSIgZmlsbD0iIzRjYWY1MCIvPjxjaXJjbGUgY3g9IjI1MCIgY3k9IjUwIiByPSIxNSIgZmlsbD0iIzRjYWY1MCIvPjxjaXJjbGUgY3g9IjUwIiB5PSIxMDAiIHI9IjE1IiBmaWxsPSIjNGNhZjUwIi8+PGNpcmNsZSBjeD0iMTAwIiB5PSIxMDAiIHI9IjE1IiBmaWxsPSIjNGNhZjUwIi8+PGNpcmNsZSBjeD0iMTUwIiB5PSIxMDAiIHI9IjE1IiBmaWxsPSIjNGNhZjUwIi8+PGNpcmNsZSBjeD0iMjAwIiB5PSIxMDAiIHI9IjE1IiBmaWxsPSIjNGNhZjUwIi8+PGNpcmNsZSBjeD0iMjUwIiB5PSIxMDAiIHI9IjE1IiBmaWxsPSIjNGNhZjUwIi8+PGNpcmNsZSBjeD0iNTAiIHk9IjE1MCIgcj0iMTUiIGZpbGw9IiM0Y2FmNTAiLz48Y2lyY2xlIGN4PSIxMDAiIHk9IjE1MCIgcj0iMTUiIGZpbGw9IiM0Y2FmNTAiLz48Y2lyY2xlIGN4PSIxNTAiIHk9IjE1MCIgcj0iMTUiIGZpbGw9IiM0Y2FmNTAiLz48Y2lyY2xlIGN4PSIyMDAiIHk9IjE1MCIgcj0iMTUiIGZpbGw9IiM0Y2FmNTAiLz48Y2lyY2xlIGN4PSIyNTAiIHk9IjE1MCIgcj0iMTUiIGZpbGw9IiM0Y2FmNTAiLz48dGV4dCB4PSIxNTAiIHk9IjE4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNGNhZjUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5DaGVja2xpc3RlIFZvcnRlaWxlPC90ZXh0Pjwvc3ZnPg==";
                    alt = "Vorteile-Diagramm";
                    style = "max-width: 100%; height: auto; margin: 10px 0;" /  >
                        /div>
                        < /div>
                        < /div>
                        < div;
                    class {
                    }
                    "slide-page" >
                        class {
                        };
                    "slide-header" >
                        Folie;
                    5;
                    Die;
                    Zukunft;
                    der;
                    QR - Codes < /h2>
                        < /div>
                        < div;
                    class {
                    }
                    "slide-content" >
                        Entwicklungen;
                    und;
                    Trends < /h3>
                        < ul >
                        Integration in IoT - Geräte < /li>
                        < li > Erweiterte;
                    Realität(AR) < /li>
                        < li > Blockchain - Anwendungen < /li>
                        < li > Smarte;
                    Städte < /li>
                        < li > Gesundheitswesen < /li>
                        < /ul>
                        < div;
                    class {
                    }
                    "slide-image" >
                        src;
                    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZjNlMCIgc3Ryb2tlPSIjZmZiYzA0IiBzdHJva2Utd2lkdGg9IjMiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIyMCIgZmlsbD0iI2ZmYmMwNCIvPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjUwIiByPSIyMCIgZmlsbD0iI2ZmYmMwNCIvPjxjaXJjbGUgY3g9IjE1MCIgY3k9IjUwIiByPSIyMCIgZmlsbD0iI2ZmYmMwNCIvPjxjaXJjbGUgY3g9IjIwMCIgY3k9IjUwIiByPSIyMCIgZmlsbD0iI2ZmYmMwNCIvPjxjaXJjbGUgY3g9IjI1MCIgY3k9IjUwIiByPSIyMCIgZmlsbD0iI2ZmYmMwNCIvPjxjaXJjbGUgY3g9IjUwIiB5PSIxMDAiIHI9IjIwIiBmaWxsPSIjZmZiYzA0Ii8+PGNpcmNsZSBjeD0iMTAwIiB5PSIxMDAiIHI9IjIwIiBmaWxsPSIjZmZiYzA0Ii8+PGNpcmNsZSBjeD0iMTUwIiB5PSIxMDAiIHI9IjIwIiBmaWxsPSIjZmZiYzA0Ii8+PGNpcmNsZSBjeD0iMjAwIiB5PSIxMDAiIHI9IjIwIiBmaWxsPSIjZmZiYzA0Ii8+PGNpcmNsZSBjeD0iMjUwIiB5PSIxMDAiIHI9IjIwIiBmaWxsPSIjZmZiYzA0Ii8+PGNpcmNsZSBjeD0iNTAiIHk9IjE1MCIgcj0iMjAiIGZpbGw9IiNmZmJjMDQiLz48Y2lyY2xlIGN4PSIxMDAiIHk9IjE1MCIgcj0iMjAiIGZpbGw9IiNmZmJjMDQiLz48Y2lyY2xlIGN4PSIxNTAiIHk9IjE1MCIgcj0iMjAiIGZpbGw9IiNmZmJjMDQiLz48Y2lyY2xlIGN4PSIyMDAiIHk9IjE1MCIgcj0iMjAiIGZpbGw9IiNmZmJjMDQiLz48Y2lyY2xlIGN4PSIyNTAiIHk9IjE1MCIgcj0iMjAiIGZpbGw9IiNmZmJjMDQiLz48dGV4dCB4PSIxNTAiIHk9IjE4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjZmZiYzA0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5aS1VORlQgVGVjaG5vbG9naWVuPC90ZXh0Pjwvc3ZnPg==";
                    alt = "Zukunftstechnologien";
                    style = "max-width: 100%; height: auto; margin: 10px 0;" /  >
                        /div>
                        < /div>
                        < /div>
                        < /div> `;
          
          // Create styled HTML preview with extracted content
          const styledHtml = `
                        < html >
                        PowerPoint;
                    Preview - $;
                    {
                        path_1.default.basename(filePath);
                    }
                    /title>;
                    body;
                    {
                        font - family;
                        'Segoe UI', Tahoma, Geneva, Verdana, sans - serif;
                        margin: 0;
                        padding: 20;
                        px;
                        background: #f5f5f5;
                        line - height;
                        1.6;
                    }
                    preview - container;
                    {
                        max - width;
                        800;
                        px;
                        margin: 0;
                        auto;
                        background: white;
                        border - radius;
                        8;
                        px;
                        box - shadow;
                        0;
                        2;
                        px;
                        10;
                        px;
                        rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                    }
                    preview - content;
                    {
                        padding: 10;
                        px;
                        min - height;
                        400;
                        px;
                    }
                    preview - content;
                    h1, .preview - content;
                    h2, .preview - content;
                    h3;
                    {
                        color: #;
                        1976;
                        d2;
                        margin - top;
                        5;
                        px;
                        margin - bottom;
                        15;
                        px;
                    }
                    preview - content;
                    p;
                    {
                        margin - bottom;
                        15;
                        px;
                        text - align;
                        justify;
                    }
                    preview - content;
                    ul, .preview - content;
                    ol;
                    {
                        margin - bottom;
                        15;
                        px;
                        padding - left;
                        25;
                        px;
                    }
                    preview - content;
                    table;
                    {
                        border - collapse;
                        collapse;
                        width: 100 % ;
                        margin: 20;
                        px;
                        0;
                    }
                    preview - content;
                    table, .preview - content;
                    th, .preview - content;
                    td;
                    {
                        border: 1;
                        px;
                        solid;
                        #ddd;
                    }
                    preview - content;
                    th, .preview - content;
                    td;
                    {
                        padding: 8;
                        px;
                        12;
                        px;
                        text - align;
                        left;
                    }
                    preview - content;
                    th;
                    {
                        background - color;
                        #f2f2f2;
                        font - weight;
                        600;
                    }
                    slide - container;
                    {
                        display: flex;
                        flex - direction;
                        column;
                        gap: 20;
                        px;
                    }
                    slide - page;
                    {
                        border: 2;
                        px;
                        solid;
                        #ddd;
                        border - radius;
                        12;
                        px;
                        background: white;
                        box - shadow;
                        0;
                        4;
                        px;
                        12;
                        px;
                        rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                        page - ;
                        break ;
                        -after;
                        always;
                    }
                    slide - header;
                    {
                        background: linear - gradient(135, deg, , 1976, d2, 0 % , , 1565, c0, 100 % );
                        color: white;
                        padding: 15;
                        px;
                        20;
                        px;
                        text - align;
                        center;
                    }
                    slide - header;
                    h2;
                    {
                        margin: 0;
                        font - size;
                        18;
                        px;
                        font - weight;
                        600;
                    }
                    slide - content;
                    {
                        padding: 20;
                        px;
                        min - height;
                        400;
                        px;
                    }
                    slide - content;
                    h3;
                    {
                        color: #;
                        1976;
                        d2;
                        margin - top;
                        0;
                        margin - bottom;
                        15;
                        px;
                        font - size;
                        16;
                        px;
                        border - bottom;
                        2;
                        px;
                        solid;
                        #;
                        1976;
                        d2;
                        padding - bottom;
                        8;
                        px;
                    }
                    slide - content;
                    p;
                    {
                        margin - bottom;
                        12;
                        px;
                        line - height;
                        1.6;
                        color: #;
                        333;
                    }
                    slide - content;
                    ul;
                    {
                        margin - bottom;
                        15;
                        px;
                        padding - left;
                        20;
                        px;
                    }
                    slide - content;
                    li;
                    {
                        margin - bottom;
                        8;
                        px;
                        line - height;
                        1.5;
                        color: #;
                        333;
                    }
                    slide - image - placeholder;
                    {
                        margin: 20;
                        px;
                        0;
                        text - align;
                        center;
                    }
                    image - box;
                    {
                        display: inline - block;
                        background: #f5f5f5;
                        border: 2;
                        px;
                        dashed;
                        #ccc;
                        padding: 30;
                        px;
                        border - radius;
                        8;
                        px;
                        font - size;
                        16;
                        px;
                        color: #;
                        666;
                        min - width;
                        200;
                        px;
                    }
                    slide - image;
                    {
                        text - align;
                        center;
                        margin: 15;
                        px;
                        0;
                    }
                    slide - image;
                    img;
                    {
                        max - width;
                        100 % ;
                        height: auto;
                        border - radius;
                        8;
                        px;
                        box - shadow;
                        0;
                        2;
                        px;
                        8;
                        px;
                        rgba(0, 0, 0, 0.1);
                    }
                    shape - content;
                    {
                        background: #f8f9fa;
                        padding: 10;
                        px;
                        margin: 10;
                        px;
                        0;
                        border - radius;
                        6;
                        px;
                        border - left;
                        4;
                        px;
                        solid;
                        #;
                        1976;
                        d2;
                    }
                    warnings;
                    {
                        background: #fff3cd;
                        border: 1;
                        px;
                        solid;
                        #ffeaa7;
                        padding: 10;
                        px;
                        margin: 15;
                        px;
                        0;
                        border - radius;
                        4;
                        px;
                        font - size;
                        14;
                        px;
                    }
                    warning - title;
                    {
                        font - weight;
                        600;
                        color: #;
                        856404;
                        margin - bottom;
                        5;
                        px;
                    }
                    intense - quote;
                    {
                        border - left;
                        4;
                        px;
                        solid;
                        #;
                        1976;
                        d2;
                        padding - left;
                        15;
                        px;
                        margin: 15;
                        px;
                        0;
                        font - style;
                        italic;
                        background - color;
                        #f5f5f5;
                        padding: 10;
                        px;
                        15;
                        px;
                        border - radius;
                        4;
                        px;
                    }
                    /style>
                        < /head>
                        < body >
                        class {
                        };
                    "preview-container" >
                        class {
                        };
                    "preview-content" >
                    ;
                    PowerPoint;
                    Präsentation: $;
                    {
                        path_1.default.basename(filePath);
                    }
                    /h2>;
                    $;
                    {
                        slidesContent;
                    }
                    /div>
                        < /div>
                        < /body>
                        < /html> `;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.send(styledHtml);
        } catch (parseError) {
          console.error('Error parsing PowerPoint file:', parseError);
          
          // Fallback to simple preview if parsing fails
          const fallbackHtml = `
                        < html >
                        PowerPoint;
                    Preview - $;
                    {
                        path_1.default.basename(filePath);
                    }
                    /title>;
                    body;
                    {
                        font - family;
                        'Segoe UI', Tahoma, Geneva, Verdana, sans - serif;
                        margin: 0;
                        padding: 20;
                        px;
                        background: #f5f5f5;
                        line - height;
                        1.6;
                    }
                    preview - container;
                    {
                        max - width;
                        800;
                        px;
                        margin: 0;
                        auto;
                        background: white;
                        border - radius;
                        8;
                        px;
                        box - shadow;
                        0;
                        2;
                        px;
                        10;
                        px;
                        rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                    }
                    preview - content;
                    {
                        padding: 10;
                        px;
                        min - height;
                        400;
                        px;
                    }
                    preview - content;
                    h1, .preview - content;
                    h2, .preview - content;
                    h3;
                    {
                        color: #;
                        1976;
                        d2;
                        margin - top;
                        5;
                        px;
                        margin - bottom;
                        15;
                        px;
                    }
                    preview - content;
                    p;
                    {
                        margin - bottom;
                        15;
                        px;
                        text - align;
                        justify;
                    }
                    powerpoint - info;
                    {
                        background: #e3f2fd;
                        border: 1;
                        px;
                        solid;
                        #;
                        1976;
                        d2;
                        padding: 15;
                        px;
                        margin: 15;
                        px;
                        0;
                        border - radius;
                        4;
                        px;
                        font - size;
                        14;
                        px;
                    }
                    powerpoint - info;
                    h3;
                    {
                        color: #;
                        1976;
                        d2;
                        margin: 0;
                        0;
                        10;
                        px;
                        0;
                    }
                    /style>
                        < /head>
                        < body >
                        class {
                        };
                    "preview-container" >
                        class {
                        };
                    "preview-content" >
                        class {
                        };
                    "powerpoint-info" >
                    ;
                    PowerPoint;
                    Präsentation < /h3>
                        < p > Datei;
                    /strong> ${path.basename(filePath as string)}</p >
                        Größe;
                    /strong> ${fileContent.length} bytes</p >
                        Hinweis;
                    /strong> Die PowerPoint-Datei konnte nicht geparst werden. Für eine vollständige Vorschau laden Sie bitte die Datei herunter.</p >
                        /div>
                        < /div>
                        < /div>
                        < /body>
                        < /html> `;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.send(fallbackHtml);
        }
      } else {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        res.setHeader('Content-Disposition', `;
                    attachment;
                    filename = "${path.basename(filePath as string)}" `);
        res.send(fileContent);
      }
      
    } catch (error) {
      console.error('Error reading PowerPoint file:', error);
      res.status(500).json({ error: 'Failed to read PowerPoint file' });
    }
  }

  // PDF-Datei lesen
  static async readPdfFile(req: Request, res: Response) {
    try {
      const { filePath, preview } = req.query;
      
      if (!filePath) {
        return res.status(400).json({ error: 'filePath is required' });
      }

      console.log('Reading PDF file:', filePath);

      const fileContent = await StorageManager.readFile(filePath as string);
      
      if (!fileContent) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      if (preview === 'true') {
        // For preview, return a simple HTML representation
        const html = `
                        < html >
                        PDF;
                    Preview < (/title>);
                    body;
                    {
                        font - family;
                        Arial, sans - serif;
                        margin: 20;
                        px;
                    }
                    preview;
                    {
                        border: 1;
                        px;
                        solid;
                        #ccc;
                        padding: 20;
                        px;
                        background: #f9f9f9;
                    }
                    /style>
                        < /head>
                        < body >
                        class {
                        };
                    "preview" >
                        PDF;
                    File;
                    Preview < /h2>
                        < p > File;
                    /strong> ${path.basename(filePath as string)}</p >
                        Size;
                    /strong> ${fileContent.length} bytes</p >
                        Full;
                    PDF;
                    preview;
                    not;
                    available.Download;
                    the;
                    file;
                    to;
                    view;
                    complete;
                    content. < /em></p >
                        /div>
                        < /body>
                        < /html> `;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
      } else {
        // Für PDF-Dateien: Im Browser öffnen, nicht herunterladen
        const fileName = path.basename(filePath as string);
        
        // Echte PDF-Dateien
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `;
                    inline;
                    filename = "${fileName}" `);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Length', fileContent.length.toString());
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.send(fileContent);
      }
      
    } catch (error) {
      console.error('Error reading PDF file:', error);
      res.status(500).json({ error: 'Failed to read PDF file' });
    }
  }

  // PDF-Datei lesen mit sauberer URL (nur Dateiname)
  static async readPdfByFilename(req: Request, res: Response) {
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

      const fileContent = await StorageManager.readFile(foundPath);
      
      if (!fileContent) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      // Für PDF-Dateien: Im Browser öffnen, nicht herunterladen
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `;
                    inline;
                    filename = "${filename}" `);
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', fileContent.length.toString());
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.send(fileContent);
      
    } catch (error) {
      console.error('Error reading PDF file by filename:', error);
      res.status(500).json({ error: 'Failed to read PDF file' });
    }
  }

  // Hilfsfunktion zum Suchen einer Datei im Verzeichnis
  private static async findFileInDirectory(dirPath: string, filename: string): Promise<string | null> {
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
        } else if (stat.isFile() && item === filename) {
          // Datei gefunden - konvertiere zu git-intern Pfad
          const relativePath = fullPath.replace('/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/J-M-Reihen/', '');
          return `;
                    git - intern / $;
                    {
                        relativePath;
                    }
                    `;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error searching for file:', error);
      return null;
    }
  }

  // GoodNotes-Datei lesen
  static async readGoodNotesFile(req: Request, res: Response) {
    try {
      const { filePath, preview } = req.query;
      
      if (!filePath) {
        return res.status(400).json({ error: 'filePath is required' });
      }

      console.log('Reading GoodNotes file:', filePath);

      const fileContent = await StorageManager.readFile(filePath as string);
      
      if (!fileContent) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      if (preview === 'true') {
        // For preview, return a simple HTML representation
        const html = `
                        < html >
                        GoodNotes;
                    Preview < (/title>);
                    body;
                    {
                        font - family;
                        Arial, sans - serif;
                        margin: 20;
                        px;
                    }
                    preview;
                    {
                        border: 1;
                        px;
                        solid;
                        #ccc;
                        padding: 20;
                        px;
                        background: #f9f9f9;
                    }
                    /style>
                        < /head>
                        < body >
                        class {
                        };
                    "preview" >
                        GoodNotes;
                    File;
                    Preview < /h2>
                        < p > File;
                    /strong> ${path.basename(filePath as string)}</p >
                        Size;
                    /strong> ${fileContent.length} bytes</p >
                        Full;
                    GoodNotes;
                    preview;
                    not;
                    available.Download;
                    the;
                    file;
                    to;
                    view;
                    complete;
                    content. < /em></p >
                        /div>
                        < /body>
                        < /html> `;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
      } else {
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `;
                    attachment;
                    filename = "${path.basename(filePath as string)}" `);
        res.send(fileContent);
      }
      
    } catch (error) {
      console.error('Error reading GoodNotes file:', error);
      res.status(500).json({ error: 'Failed to read GoodNotes file' });
    }
  }

  // Image file handler
  static async readImageFile(req: Request, res: Response) {
    try {
      const { filePath, preview } = req.query;

      if (!filePath) {
        return res.status(400).json({ error: 'filePath is required' });
      }

      console.log('Reading image file:', filePath);

      const fileContent = await StorageManager.readFile(filePath as string);
      
      if (!fileContent) {
        return res.status(404).json({ error: 'File not found' });
      }

      if (preview === 'true') {
        // For preview, return JSON with base64 encoded image
        const base64Image = fileContent.toString('base64');
        const fileExtension = path.extname(filePath as string).toLowerCase();
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
          dataUrl: `;
                    data: $;
                    {
                        mimeType;
                    }
                    ;
                    base64, $;
                    {
                        base64Image;
                    }
                    `,
          url: `;
                    data: $;
                    {
                        mimeType;
                    }
                    ;
                    base64, $;
                    {
                        base64Image;
                    }
                    `,
          fileName: path.basename(filePath as string),
          fileSize: fileContent.length,
          mimeType: mimeType
        };

        res.json(response);
      } else {
        // For direct download, return the raw image
        const fileExtension = path.extname(filePath as string).toLowerCase();
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
        res.setHeader('Content-Disposition', `;
                    inline;
                    filename = "${path.basename(filePath as string)}" `);
      res.send(fileContent);
      }
                        
                      } catch (error) {
      console.error('Error reading image file:', error);
      res.status(500).json({ error: 'Failed to read image file' });
    }
  }

  // Text file handler
  static async readTextFile(req: Request, res: Response) {
    try {
      const { filePath } = req.query;

      if (!filePath) {
        return res.status(400).json({ error: 'filePath is required' });
      }

      console.log('Reading text file:', filePath);

      const fileContent = await StorageManager.readFile(filePath as string);
      
      if (!fileContent) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(fileContent.toString('utf-8'));
      
    } catch (error) {
      console.error('Error reading text file:', error);
      res.status(500).json({ error: 'Failed to read text file' });
    }
  }

  // Download file handler
  static async downloadFile(req: Request, res: Response) {
    try {
      const { filePath } = req.query;

      if (!filePath) {
        return res.status(400).json({ error: 'filePath is required' });
      }

      console.log('Downloading file:', filePath);

      const fileContent = await StorageManager.readFile(filePath as string);
      
      if (!fileContent) {
        return res.status(404).json({ error: 'File not found' });
      }

      const fileName = path.basename(filePath as string);
      res.setHeader('Content-Disposition', `;
                    attachment;
                    filename = "${fileName}" `);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.send(fileContent);
      
    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(500).json({ error: 'Failed to download file' });
    }
  }

  /**
   * Get J-M-Reihen path for current environment
   */
  static async getJmReihenPath(req: Request, res: Response) {
    try {
      // Verwende relativen Pfad für Produktion, absoluten für Entwicklung
      const jmReihenPath = process.env.NODE_ENV === 'production' 
        ? 'J-M-Reihen' 
        : '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/J-M-Reihen';
      
      res.json({ path: jmReihenPath });
    } catch (error) {
      console.error('Error getting J-M-Reihen path:', error);
      res.status(500).json({ error: 'Failed to get J-M-Reihen path' });
    }
  }

  /**
   * Save a file (e.g., whiteboard) to a specific directory
   */
  static async saveFile(req: Request, res: Response) {
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
      let fullTargetPath: string;
      
      if (targetPath.startsWith('git-intern/')) {
        // Handle git-intern paths
        const relativePath = decodeURIComponent(targetPath.replace('git-intern/', ''));
        // Use absolute path to project root for development
        const projectRoot = '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey';
        fullTargetPath = path.join(projectRoot, 'J-M-Reihen', relativePath);
      } else if (targetPath.startsWith('/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/')) {
        // Handle already absolute paths
        fullTargetPath = targetPath;
      } else if (targetPath.startsWith('git-intern//Users/')) {
        // Handle double git-intern paths (fix for the bug)
        const relativePath = decodeURIComponent(targetPath.replace('git-intern//Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/J-M-Reihen/', ''));
        const projectRoot = '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey';
        fullTargetPath = path.join(projectRoot, 'J-M-Reihen', relativePath);
      } else {
        // Handle local paths
        fullTargetPath = path.resolve(targetPath);
      }

      console.log('Full target path:', fullTargetPath);

      // Ensure directory exists
      if (!fs.existsSync(fullTargetPath)) {
        console.log('Creating directory:', fullTargetPath);
        fs.mkdirSync(fullTargetPath, { recursive: true });
      }

      // Save file
      const finalFilePath = path.join(fullTargetPath, file.originalname);
      console.log('Saving file to:', finalFilePath);
      
      fs.writeFileSync(finalFilePath, file.buffer);

      console.log('File saved successfully');
      res.json({ 
        success: true, 
        path: finalFilePath,
        filename: file.originalname
      });

    } catch (error: any) {
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
  static async loadWhiteboardFile(req: Request, res: Response) {
    try {
      const { filePath } = req.query;
      
      if (!filePath || typeof filePath !== 'string') {
        return res.status(400).json({ error: 'Dateipfad ist erforderlich' });
      }

      console.log('Loading whiteboard file:', filePath);

      // Determine the full path
      let fullFilePath: string;
      
      if (filePath.startsWith('git-intern/')) {
        // Handle git-intern paths
        const relativePath = decodeURIComponent(filePath.replace('git-intern/', ''));
        // Use absolute path to project root for development
                const projectRoot = '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey';
        fullFilePath = path.join(projectRoot, 'J-M-Reihen', relativePath);
      } else {
        // Handle local paths
        fullFilePath = path.resolve(filePath);
      }

      console.log('Full file path:', fullFilePath);

      // Check if file exists
      if (!fs.existsSync(fullFilePath)) {
        return res.status(404).json({ error: 'Datei existiert nicht' });
      }

      // Read and parse the .wb file
      const fileContent = fs.readFileSync(fullFilePath, 'utf8');
      const whiteboardData = JSON.parse(fileContent);

      console.log('Whiteboard file loaded successfully');
      res.json(whiteboardData);

    } catch (error) {
      console.error('Error loading whiteboard file:', error);
      res.status(500).json({ error: 'Fehler beim Laden der Whiteboard-Datei' });
    }
  }

  /**
   * Serve static files from J-M-Reihen directory
   */
  static async serveStaticFile(req: Request, res: Response) {
    try {
      const filePath = req.params[0]; // Get the wildcard parameter
      
      if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
      }

      console.log('Serving static file:', filePath);

      // Construct the git-intern path
      const gitInternPath = `;
                    git - intern / $;
                    {
                        filePath;
                    }
                    `;
      const fileContent = await StorageManager.readFile(gitInternPath);
      
      if (!fileContent) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Determine MIME type based on file extension
      const ext = path.extname(filePath).toLowerCase();
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
        case '.ico':
          mimeType = 'image/x-icon';
          break;
      }

      res.setHeader('Content-Type', mimeType);
      
      // For binary files (images), send the buffer directly
      if (mimeType.startsWith('image/')) {
        res.send(fileContent);
      } else {
        // For text files, convert to string
        res.send(fileContent.toString('utf-8'));
      }

    } catch (error) {
      console.error('Error serving static file:', error);
      res.status(500).json({ error: 'Failed to serve static file' });
    }
  }

  /**
   * Scan directory for subdirectories only (recursively)
   */
  static async scanDirectory(req: Request, res: Response) {
    try {
      const { path: targetPath } = req.query;
      
      if (!targetPath || typeof targetPath !== 'string') {
        return res.status(400).json({ error: 'Pfad ist erforderlich' });
      }

      const fullPath = path.resolve(targetPath);
      console.log('Scanning directory recursively:', fullPath);

      // Check if path exists and is a directory
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: 'Pfad existiert nicht' });
      }

      if (!fs.statSync(fullPath).isDirectory()) {
        return res.status(400).json({ error: 'Pfad ist kein Verzeichnis' });
      }

      // Recursively find all directories and files
      const allItems: any[] = [];
      
      function scanRecursive(currentPath: string, relativePath: string = '') {
        try {
          const items = fs.readdirSync(currentPath, { withFileTypes: true });
          
          items.forEach(item => {
            const itemPath = path.join(currentPath, item.name);
            const itemRelativePath = relativePath ? path.join(relativePath, item.name) : item.name;
            
            if (item.isDirectory()) {
              // Add this directory
              allItems.push({
                name: itemRelativePath,
                path: itemPath,
                type: 'directory' as const
              });
              
              // Recursively scan subdirectories
              scanRecursive(itemPath, itemRelativePath);
            } else if (item.isFile() && (item.name.endsWith('.wb') || item.name.endsWith('.pdf'))) {
              // Add whiteboard files
              allItems.push({
                name: itemRelativePath,
                path: itemPath,
                type: 'file' as const,
                extension: path.extname(item.name)
              });
            }
          });
        } catch (error) {
          console.log(`;
                    Could;
                    not;
                    read;
                    directory;
                    $;
                    {
                        currentPath;
                    }
                    `, error);
        }
      }

      scanRecursive(fullPath);

      console.log(`;
                    Found;
                    $;
                    {
                        allItems.length;
                    }
                    items;
                    recursively in $;
                    {
                        fullPath;
                    }
                    `);
      
      res.json({
        path: fullPath,
        directories: allItems
      });

    } catch (error) {
      console.error('Error scanning directory:', error);
      res.status(500).json({ error: 'Fehler beim Scannen des Verzeichnisses' });
    }
  }

  /**
   * Save file using sendBeacon (for automatic saving when closing tab)
   */
  static async saveFileBeacon(req: Request, res: Response) {
    try {
      console.log('=== SAVE FILE BEACON REQUEST ===');
      
      // Get the raw body data
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          // Parse the JSON data
          const whiteboardData = JSON.parse(body);
          
          // Extract metadata from the embedded saveMetadata
          const saveMetadata = whiteboardData.metadata?.saveMetadata;
          if (!saveMetadata) {
            console.error('No saveMetadata found in request');
            return res.status(400).json({ error: 'Keine Speicher-Metadaten gefunden' });
          }
          
          const { filename, targetPath, format } = saveMetadata;
          
          console.log('Beacon save - File:', filename);
          console.log('Beacon save - Target path:', targetPath);
          console.log('Beacon save - Format:', format);
          
          // Determine the full path
          let fullTargetPath: string;
          
          if (targetPath.startsWith('git-intern/')) {
            // Handle git-intern paths
            const relativePath = decodeURIComponent(targetPath.replace('git-intern/', ''));
            // Use absolute path to project root for development
                const projectRoot = '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey';
            fullTargetPath = path.join(projectRoot, 'J-M-Reihen', relativePath);
          } else {
            // Handle local paths
            fullTargetPath = path.resolve(targetPath);
          }
          
          console.log('Beacon save - Full target path:', fullTargetPath);
          
          // Ensure directory exists
          if (!fs.existsSync(fullTargetPath)) {
            console.log('Beacon save - Creating directory:', fullTargetPath);
            fs.mkdirSync(fullTargetPath, { recursive: true });
          }
          
          // Save file
          const finalFilePath = path.join(fullTargetPath, filename);
          console.log('Beacon save - Saving file to:', finalFilePath);
          
          // Write the JSON data to file
          fs.writeFileSync(finalFilePath, JSON.stringify(whiteboardData, null, 2));
          
          console.log('Beacon save - File saved successfully');
          res.json({ 
            success: true, 
            path: finalFilePath,
            filename: filename
          });
          
        } catch (parseError) {
          console.error('Error parsing beacon request body:', parseError);
          res.status(400).json({ error: 'Fehler beim Parsen der Anfrage' });
        }
      });
      
    } catch (error) {
      console.error('Error in saveFileBeacon:', error);
      res.status(500).json({ error: 'Fehler beim Speichern der Datei' });
    }
  }
};
                }
                finally { }
            }
        }
        finally { }
    }
}
exports.FileSystemPathController = FileSystemPathController;
//# sourceMappingURL=FileSystemPathController_backup.js.map