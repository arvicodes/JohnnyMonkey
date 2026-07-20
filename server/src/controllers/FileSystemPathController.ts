import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { StorageManager } from '../utils/storageManager';
import { fileToJpegBuffer, isHeicPath, readImageFileForServe } from '../utils/imageToJpeg';
import { backupPresentationDeckBeforeOverwrite } from '../utils/presentationDeckBackup';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { convert } from 'libreoffice-convert';

const prisma = new PrismaClient();

export interface FileSystemPath {
  id: string;
  path: string;
  name: string;
  teacherId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DirectoryItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  extension: string;
  children?: DirectoryItem[];
}

export interface DirectoryContent {
  path: string;
  root: DirectoryItem;
  totalItems: number;
  maxDepth: number;
}

export class FileSystemPathController {
  /** PPTX/PPT → PDF (LibreOffice/soffice; lokal installiert) für Folien-Editor */
  private static convertPowerPointBufferToPdf(fileContent: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      convert(fileContent, '.pdf', undefined, (err, done) => {
        if (err) reject(err);
        else resolve(done);
      });
    });
  }

  /**
   * Get all paths
   */
  static async getAllPaths(req: Request, res: Response) {
    try {
      const paths = await prisma.fileSystemPath.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json(paths);
    } catch (error) {
      console.error('Error getting all paths:', error);
      res.status(500).json({ error: 'Fehler beim Abrufen der Pfade' });
    }
  }

  /**
   * Get file extension from filename
   */
  private static getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot).toLowerCase() : '';
  }

  // Pfad speichern
  static async savePath(req: Request, res: Response) {
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
      } else {
        // Normalize and validate local paths
      let normalizedPath: string;
      try {
          normalizedPath = path.resolve(filePath);
      } catch (pathError) {
        console.log('Path normalization error:', pathError);
          return res.status(400).json({ error: 'Ungültiger Pfad' });
      }

      if (!fs.existsSync(normalizedPath)) {
        console.log('Path does not exist:', normalizedPath);
          return res.status(400).json({ error: 'Der angegebene Pfad existiert nicht' });
        }

        const stats = fs.statSync(normalizedPath);
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

    } catch (error) {
      console.error('Error saving path:', error);
      res.status(500).json({ error: 'Fehler beim Speichern des Pfades' });
    }
  }

  // Verzeichnisinhalt lesen
  static async readDirectory(req: Request, res: Response) {
    try {
      const { path: filePath, recursive } = req.query;

      console.log('=== READ DIRECTORY REQUEST ===');
      console.log('Query params:', req.query);
      console.log('File path from query:', filePath);
      console.log('Recursive:', recursive);

      if (!filePath) {
        return res.status(400).json({ error: 'Pfad ist erforderlich' });
      }

      const directoryContent = await StorageManager.readDirectory(filePath as string, recursive === 'true');

      if (directoryContent.error) {
        console.log('Directory read error:', directoryContent.error);
        return res.status(404).json({ error: directoryContent.error });
      }

      console.log('Directory read successfully');
      res.json(directoryContent);

    } catch (error) {
      console.error('Error reading directory:', error);
      res.status(500).json({ error: 'Fehler beim Lesen des Verzeichnisses' });
    }
  }

  // Pfade nach Lehrer abrufen
  static async getPathsByTeacher(req: Request, res: Response) {
    try {
      const { teacherId } = req.params;

      console.log('Getting paths for teacher:', teacherId);

      const paths = await prisma.fileSystemPath.findMany({
        where: { teacherId },
        orderBy: { createdAt: 'desc' }
      });

      console.log('Found paths:', paths.length);
      res.json(paths);

    } catch (error) {
      console.error('Error getting paths by teacher:', error);
      res.status(500).json({ error: 'Fehler beim Abrufen der Pfade' });
    }
  }

  // Pfad löschen
  static async deletePath(req: Request, res: Response) {
    try {
      const { id } = req.params;

      console.log('Deleting path with ID:', id);

      const deletedPath = await prisma.fileSystemPath.delete({
        where: { id }
      });

      console.log('Path deleted successfully:', deletedPath);
      res.json(deletedPath);
      
    } catch (error) {
      console.error('Error deleting path:', error);
      res.status(500).json({ error: 'Fehler beim Löschen des Pfades' });
    }
  }

  // HTML-Datei lesen (für Lehrer und Schüler - keine Authentifizierung erforderlich)
  static async readHtmlFile(req: Request, res: Response) {
    try {
      const { filePath } = req.query;

      if (!filePath) {
        return res.status(400).json({ error: 'filePath is required' });
      }

      console.log('Reading HTML file:', filePath);

      const fileContent = await StorageManager.readFile(filePath as string);
      
      if (!fileContent) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(fileContent.toString('utf-8'));

    } catch (error) {
      console.error('Error reading HTML file:', error);
      res.status(500).json({ error: 'Failed to read HTML file' });
    }
  }

  // DOCX-Datei lesen
  static async readDocxFile(req: Request, res: Response) {
    try {
      const { filePath, preview } = req.query;

      if (!filePath) {
        return res.status(400).json({ error: 'filePath is required' });
      }

      console.log('Reading DOCX file:', filePath);

      const fileContent = await StorageManager.readFile(filePath as string);
      
      if (!fileContent) {
        return res.status(404).json({ error: 'File not found' });
      }

      if (preview === 'true') {
        try {
          // Convert DOCX to HTML using mammoth
          const result = await mammoth.convertToHtml({ buffer: fileContent });
          const html = result.value;
          // Filter out Intense Quote warnings
          const messages = result.messages.filter(msg => 
            !msg.message.includes('Intense Quote') && 
            !msg.message.includes('IntenseQuote')
          );

          // Create a styled HTML preview
          const styledHtml = `
            <html>
              <head>
                <title>DOCX Preview - ${path.basename(filePath as string)}</title>
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
        } catch (conversionError) {
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
                <p><strong>File:</strong> ${path.basename(filePath as string)}</p>
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
      } else {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath as string)}"`);
        res.send(fileContent);
      }
      
    } catch (error) {
      console.error('Error reading DOCX file:', error);
      res.status(500).json({ error: 'Failed to read DOCX file' });
    }
  }

  // Excel-Datei lesen
  static async readExcelFile(req: Request, res: Response) {
    try {
      const { filePath, preview } = req.query;
      
      if (!filePath) {
        return res.status(400).json({ error: 'filePath is required' });
      }

      console.log('Reading Excel file:', filePath);

      const fileContent = await StorageManager.readFile(filePath as string);
      
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
                        ${jsonData.map((row: any[], rowIndex: number) => `
                          <tr class="row-${rowIndex}">
                            ${row.map((cell: any, cellIndex: number) => `
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
                <title>Excel Preview - ${path.basename(filePath as string)}</title>
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
                    <h1>📊 ${path.basename(filePath as string)}</h1>
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
        } catch (conversionError) {
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
                <p><strong>File:</strong> ${path.basename(filePath as string)}</p>
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
      } else {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath as string)}"`);
        res.send(fileContent);
      }
      
    } catch (error) {
      console.error('Error reading Excel file:', error);
      res.status(500).json({ error: 'Failed to read Excel file' });
    }
  }

  // PowerPoint-Datei lesen
  static async readPowerPointFile(req: Request, res: Response) {
    try {
      const { filePath, preview } = req.query;
      
      if (!filePath) {
        return res.status(400).json({ error: 'filePath is required' });
      }

      console.log('Reading PowerPoint file:', filePath);

      const fileContent = await StorageManager.readFile(filePath as string);
      
      if (!fileContent) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      // PowerPoint-Dateien: Wenn preview=true, zeige Download-Seite
      // Ansonsten: Direkter Download
      if (preview === 'true') {
        const fileName = path.basename(filePath as string);
        const encodedPath = encodeURIComponent(filePath as string);
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
      } else {
        // PowerPoint-Dateien werden direkt heruntergeladen
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath as string)}"`);
        res.send(fileContent);
      }
      
    } catch (error) {
      console.error('Error reading PowerPoint file:', error);
      res.status(500).json({ error: 'Failed to read PowerPoint file' });
    }
  }

  /**
   * PowerPoint-Datei nach PDF konvertieren und inline ausliefern (Folien-Editor im Browser).
   * Benötigt eine funktionierende LibreOffice-/soffice-Installation auf dem Server.
   */
  static async readPptxAsPdf(req: Request, res: Response) {
    try {
      const { filePath } = req.query;
      if (!filePath || typeof filePath !== 'string') {
        return res.status(400).json({ error: 'filePath is required' });
      }
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.pptx' && ext !== '.ppt') {
        return res.status(400).json({ error: 'Nur .pptx oder .ppt' });
      }

      const fileContent = await StorageManager.readFile(filePath);
      if (!fileContent) {
        return res.status(404).json({ error: 'File not found' });
      }

      const pdfBuffer = await FileSystemPathController.convertPowerPointBufferToPdf(fileContent);
      const baseName = path.basename(filePath, ext).replace(/[^\w.\-äöüÄÖÜß ]+/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${baseName}.pdf"`);
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.send(pdfBuffer);
    } catch (error: unknown) {
      console.error('readPptxAsPdf:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      const hint = /soffice|libreoffice|spawn|ENOENT|convert/i.test(errMsg)
        ? ' Auf dem Server muss LibreOffice (soffice) installiert und im PATH erreichbar sein.'
        : '';
      res.status(503).json({
        error: 'pptx_to_pdf_failed',
        message: `PowerPoint konnte nicht nach PDF konvertiert werden.${hint}`,
        detail: errMsg,
      });
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
                <p><strong>File:</strong> ${path.basename(filePath as string)}</p>
                <p><strong>Size:</strong> ${fileContent.length} bytes</p>
                <p><em>Full PDF preview not available. Download the file to view complete content.</em></p>
              </div>
            </body>
          </html>
        `;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
      } else {
        // Für PDF-Dateien: Im Browser öffnen, nicht herunterladen
        const fileName = path.basename(filePath as string);
        
        // Echte PDF-Dateien
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
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
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
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
          return `git-intern/${relativePath}`;
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
                <p><strong>File:</strong> ${path.basename(filePath as string)}</p>
                <p><strong>Size:</strong> ${fileContent.length} bytes</p>
                <p><em>Full GoodNotes preview not available. Download the file to view complete content.</em></p>
            </div>
            </body>
          </html>
        `;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
      } else {
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath as string)}"`);
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
      let { filePath, preview, max } = req.query;

      if (!filePath || typeof filePath !== 'string') {
        return res.status(400).json({ error: 'filePath is required' });
      }

      filePath = decodeURIComponent(filePath);
      const fullPath = StorageManager.resolveFilePath(filePath);
      if (!fullPath) {
        return res.status(404).json({ error: 'File not found', path: filePath });
      }

      const maxRaw = parseInt(String(max ?? ''), 10);
      const maxEdge =
        Number.isFinite(maxRaw) && maxRaw > 0 && maxRaw <= 2400 ? maxRaw : undefined;

      const { buffer, mimeType } = await readImageFileForServe(fullPath, maxEdge);

      if (preview === 'true') {
        const response = {
          dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
          url: `data:${mimeType};base64,${buffer.toString('base64')}`,
          fileName: path.basename(fullPath),
          fileSize: buffer.length,
          mimeType,
        };
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.json(response);
      }

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${path.basename(fullPath)}"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(buffer);
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
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
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

      let tp = String(targetPath).replace(/\\/g, '/').trim();
      if (tp.startsWith('git-intern//Users/')) {
        tp = tp.replace(
          'git-intern//Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/J-M-Reihen/',
          'git-intern/'
        );
      }

      let fullTargetPath: string;
      if (tp.startsWith('git-intern/')) {
        let rel = tp.replace(/^git-intern\//, '');
        try {
          rel = decodeURIComponent(rel);
        } catch {
          /* ignore */
        }
        fullTargetPath = StorageManager.resolveGitInternRelativePath(rel);
      } else if (tp === 'J-M-Reihen' || tp.startsWith('J-M-Reihen/')) {
        // Immer Projekt-Root — nicht process.cwd()/server/J-M-Reihen
        fullTargetPath = StorageManager.resolveGitInternRelativePath(tp);
      } else if (tp.startsWith('/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/')) {
        fullTargetPath = tp;
      } else {
        fullTargetPath = path.resolve(tp);
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

      if (
        file.originalname === 'Praesentation.deck.json' &&
        fs.existsSync(finalFilePath)
      ) {
        // Never overwrite a rich deck with a near-empty default (e.g. after failed load + autosave).
        try {
          const existingRaw = fs.readFileSync(finalFilePath, 'utf8');
          const incomingRaw = file.buffer.toString('utf8');
          const existing = JSON.parse(existingRaw);
          const incoming = JSON.parse(incomingRaw);
          const existingSlides = Array.isArray(existing?.slides) ? existing.slides.length : 0;
          const incomingSlides = Array.isArray(incoming?.slides) ? incoming.slides.length : 0;
          const existingBytes = Buffer.byteLength(existingRaw, 'utf8');
          const incomingBytes = Buffer.byteLength(incomingRaw, 'utf8');
          const looksLikeWipe =
            existingSlides >= 5 &&
            incomingSlides <= 2 &&
            existingBytes > 20_000 &&
            incomingBytes < existingBytes * 0.25;
          if (looksLikeWipe) {
            backupPresentationDeckBeforeOverwrite(finalFilePath, {
              force: true,
              reason: 'blocked-wipe',
            });
            console.error(
              'Blocked deck wipe:',
              finalFilePath,
              `existing=${existingSlides}slides/${existingBytes}B`,
              `incoming=${incomingSlides}slides/${incomingBytes}B`
            );
            return res.status(409).json({
              error:
                'Speichern abgelehnt: leeres Deck würde eine umfangreiche Präsentation überschreiben. Bitte Seite neu laden.',
            });
          }
        } catch (guardErr) {
          console.warn('Deck wipe guard skipped:', guardErr);
        }

        backupPresentationDeckBeforeOverwrite(finalFilePath, { reason: 'before-save' });
      }

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
   * Datei im Stundenordner löschen (nur unter J-M-Reihen / git-intern).
   */
  static async deleteFile(req: Request, res: Response) {
    try {
      const filePathRaw = (req.body?.filePath || req.query?.filePath) as string | undefined;
      if (!filePathRaw || typeof filePathRaw !== 'string') {
        return res.status(400).json({ error: 'filePath ist erforderlich' });
      }

      let fp = filePathRaw.replace(/\\/g, '/').trim();
      if (fp.startsWith('git-intern//Users/')) {
        fp = fp.replace(
          'git-intern//Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/J-M-Reihen/',
          'git-intern/'
        );
      }

      const fileName = path.basename(fp);
      const isNamedPdf =
        /^Praesentation_.+\.pdf$/i.test(fileName) && fileName !== 'Praesentation_Original.pdf';
      const isVersionSnapshot = /^Praesentation\.version\..+\.json$/i.test(fileName);
      // Nur benannte Präsentations-Versionen (PDF und/oder Snapshot), nie Original
      if (!isNamedPdf && !isVersionSnapshot) {
        return res.status(403).json({
          error: 'Nur benannte Präsentations-Versionen (nicht Original) können so gelöscht werden.',
        });
      }

      const fullPath = StorageManager.resolveFilePath(fp);
      if (!fullPath) {
        return res.status(404).json({ error: 'Datei nicht gefunden' });
      }

      const jmRoot = StorageManager.resolveGitInternRelativePath('');
      const normalizedFull = path.resolve(fullPath);
      const normalizedRoot = path.resolve(jmRoot);
      if (
        normalizedFull !== normalizedRoot &&
        !normalizedFull.startsWith(normalizedRoot + path.sep)
      ) {
        return res.status(403).json({ error: 'Löschen außerhalb von J-M-Reihen nicht erlaubt' });
      }

      if (!fs.existsSync(normalizedFull) || !fs.statSync(normalizedFull).isFile()) {
        return res.status(404).json({ error: 'Datei nicht gefunden' });
      }

      fs.unlinkSync(normalizedFull);
      console.log('Deleted file:', normalizedFull);
      res.json({ success: true, deleted: fileName });
    } catch (error: any) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: 'Datei konnte nicht gelöscht werden: ' + (error.message || '') });
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
      const normPath = filePath.replace(/\\/g, '/');
      
      if (normPath.startsWith('git-intern/')) {
        const relativePath = decodeURIComponent(normPath.replace('git-intern/', ''));
        fullFilePath = StorageManager.resolveGitInternRelativePath(relativePath);
      } else if (normPath === 'J-M-Reihen' || normPath.startsWith('J-M-Reihen/')) {
        fullFilePath = StorageManager.resolveGitInternRelativePath(normPath);
      } else {
        fullFilePath = path.resolve(normPath);
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
      let filePath = req.params[0]; // Get the wildcard parameter
      
      if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
      }

      // Decode URL-encoded path (e.g., %20 -> space)
      filePath = decodeURIComponent(filePath);
      
      console.log('Serving static file:', filePath);

      // Construct the git-intern path
      const gitInternPath = `git-intern/${filePath}`;
      const fullPath = StorageManager.resolveFilePath(gitInternPath);
      if (!fullPath) {
        return res.status(404).json({ error: 'File not found' });
      }

      const ext = path.extname(filePath).toLowerCase();

      if (isHeicPath(fullPath)) {
        const buf = await fileToJpegBuffer(fullPath, 1200);
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.send(buf);
      }

      const fileContent = await StorageManager.readFile(gitInternPath);
      
      if (!fileContent) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Determine MIME type based on file extension
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
          console.log(`Could not read directory ${currentPath}:`, error);
        }
      }

      scanRecursive(fullPath);

      console.log(`Found ${allItems.length} items recursively in ${fullPath}`);
      
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

  /**
   * Create a new examination file (KA, KU, HU, QZ)
   */
  static async createExamination(req: Request, res: Response) {
    try {
      const { examType, fileName, folderPath, learningGroupId, title, durationMinutes } = req.body;

      if (!examType || !fileName || !folderPath) {
        return res.status(400).json({ error: 'examType, fileName und folderPath sind erforderlich' });
      }

      // Validiere Prüfungstyp
      const validTypes = ['KA', 'KU', 'HU', 'QZ'];
      if (!validTypes.includes(examType)) {
        return res.status(400).json({ error: 'Ungültiger Prüfungstyp. Erlaubt: KA, KU, HU, QZ' });
      }

      // Stelle sicher, dass der Dateiname mit dem richtigen Präfix beginnt
      const prefix = examType === 'KA' ? 'KA_' : examType === 'KU' ? 'KU_' : examType === 'HU' ? 'HU_' : 'QZ_';
      const finalFileName = fileName.startsWith(prefix) ? fileName : `${prefix}${fileName}`;

      // Konvertiere git-intern Pfad zu absolutem Pfad
      let fullFolderPath: string;
      if (folderPath.startsWith('git-intern/')) {
        const relativePath = folderPath.replace('git-intern/', '');
        if (process.env.NODE_ENV === 'production') {
          const serverPath = path.join(process.cwd(), 'J-M-Reihen');
          const projectPath = path.join(process.cwd(), '..', 'J-M-Reihen');
          const jmReihenPath = fs.existsSync(serverPath) ? serverPath : projectPath;
          fullFolderPath = path.join(jmReihenPath, relativePath);
        } else {
          const projectRoot = '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey';
          fullFolderPath = path.join(projectRoot, 'J-M-Reihen', relativePath);
        }
      } else {
        fullFolderPath = path.resolve(folderPath);
      }

      const filePath = path.join(fullFolderPath, `${finalFileName}.html`);

      console.log('📝 Erstelle Prüfungsdatei:', {
        examType,
        fileName: finalFileName,
        folderPath,
        fullFolderPath,
        filePath
      });

      // Lade Template-Datei
      let templatePath: string;
      if (process.env.NODE_ENV === 'production') {
        // Production: Versuche verschiedene Pfade
        const serverPath = path.join(process.cwd(), 'J-M-Reihen', 'Mathe', 'Klasse 7', 'Kap.3 - Geometrische Abbildungen', 'HU_geometrische-abbildungen.html');
        const projectPath = path.join(process.cwd(), '..', 'J-M-Reihen', 'Mathe', 'Klasse 7', 'Kap.3 - Geometrische Abbildungen', 'HU_geometrische-abbildungen.html');
        templatePath = fs.existsSync(serverPath) ? serverPath : projectPath;
      } else {
        // Development: Verwende absoluten Pfad
        templatePath = path.join(
          '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey',
          'J-M-Reihen',
          'Mathe',
          'Klasse 7',
          'Kap.3 - Geometrische Abbildungen',
          'HU_geometrische-abbildungen.html'
        );
      }

      console.log('📄 Template-Pfad:', templatePath);
      console.log('📄 Template existiert:', fs.existsSync(templatePath));

      if (!fs.existsSync(templatePath)) {
        return res.status(404).json({ 
          error: 'Template-Datei nicht gefunden',
          templatePath: templatePath,
          cwd: process.cwd()
        });
      }

      let templateContent = fs.readFileSync(templatePath, 'utf-8');

      // Ersetze KA_KEY im Template
      const kaKey = finalFileName.replace('.html', '');
      templateContent = templateContent.replace(/const KA_KEY = ['"](.*?)['"]/g, `const KA_KEY = '${kaKey}'`);
      templateContent = templateContent.replace(/KA_KEY = ['"](.*?)['"]/g, `KA_KEY = '${kaKey}'`);

      const defaultDurations: Record<string, number> = {
        KA: 60,
        KU: 90,
        HU: 15,
        QZ: 5
      };
      const resolvedDurationMinutes = typeof durationMinutes === 'number' && durationMinutes > 0
        ? durationMinutes
        : (defaultDurations[examType] || 15);

      // Ersetze Titel
      const examTypeNames: Record<string, string> = {
        'KA': 'Klassenarbeit',
        'KU': 'Kursarbeit',
        'HU': 'Hausaufgabenüberprüfung (HÜ)',
        'QZ': 'Quiz'
      };
      const examTypeName = examTypeNames[examType] || 'Prüfung';
      const finalTitle = title || `${examTypeName}: ${finalFileName.replace(prefix, '').replace(/-/g, ' ')}`;
      
      templateContent = templateContent.replace(
        /<title>(.*?)<\/title>/,
        `<title>${finalTitle}</title>`
      );
      templateContent = templateContent.replace(
        /Hausaufgabenüberprüfung \(HÜ\): Geometrische Abbildungen/g,
        finalTitle
      );

      // Entferne "Wichtiger Hinweis" Box
      templateContent = templateContent.replace(/<div class="info-box">[\s\S]*?<\/div>\s*/g, '');

      // Entferne Footer-Hinweise (Viel Erfolg / Punkte / Note)
      templateContent = templateContent.replace(/<div class="footer-right">[\s\S]*?<\/div>/g, '');
      templateContent = templateContent.replace(/<div class="footer-note">[\s\S]*?<\/div>/g, '');

      // Punkte-/Notenanzeige absichern, falls Footer entfernt wurde
      templateContent = templateContent.replace(
        /const pointsDisplay = document\.getElementById\('pointsDisplay'\);\s*const noteText = document\.getElementById\('noteText'\);\s*const noteNumber = document\.getElementById\('noteNumber'\);\s*/g,
        "const pointsDisplay = document.getElementById('pointsDisplay');\n            const noteText = document.getElementById('noteText');\n            const noteNumber = document.getElementById('noteNumber');\n            if (!pointsDisplay || !noteText || !noteNumber) {\n                return;\n            }\n"
      );

      // Setze Timer-Dauer
      const timerLabel = `${resolvedDurationMinutes}:00`;
      templateContent = templateContent.replace(
        /<div class="timer-container" id="timer">\s*[\d:]+\s*<\/div>/,
        `<div class="timer-container" id="timer">\n                ${timerLabel}\n            </div>`
      );
      templateContent = templateContent.replace(
        /let timeLeft = \d+ \* 60;.*$/m,
        `let timeLeft = ${resolvedDurationMinutes} * 60; // ${resolvedDurationMinutes} Minuten in Sekunden`
      );

      // Stelle sicher, dass der Ordner existiert
      if (!fs.existsSync(fullFolderPath)) {
        fs.mkdirSync(fullFolderPath, { recursive: true });
      }

      // Schreibe die neue Datei
      fs.writeFileSync(filePath, templateContent, 'utf-8');

      console.log('✅ Prüfungsdatei erstellt:', filePath);

      // Erstelle git-intern Pfad für die Antwort
      let gitInternPath: string;
      if (folderPath.startsWith('git-intern/')) {
        const relativePath = folderPath.replace('git-intern/', '');
        gitInternPath = `git-intern/${relativePath}/${finalFileName}.html`;
      } else {
        // Falls kein git-intern Pfad, verwende den relativen Pfad
        gitInternPath = filePath;
      }

      res.json({
        success: true,
        filePath: gitInternPath,
        fileName: `${finalFileName}.html`,
        kaKey
      });
    } catch (error) {
      console.error('Fehler beim Erstellen der Prüfungsdatei:', error);
      res.status(500).json({ error: 'Fehler beim Erstellen der Prüfungsdatei' });
    }
  }

  /**
   * Create a new lesson folder with standard markdown files
   */
  static async createLessonFolder(req: Request, res: Response) {
    try {
      const { folderPath, lessonName } = req.body;

      if (!folderPath || !lessonName || !lessonName.trim()) {
        return res.status(400).json({ error: 'folderPath und lessonName sind erforderlich' });
      }

      const normalizedLessonName = lessonName.trim();

      const sanitizeForFolder = (input: string) =>
        input
          .replace(/[\\/:*?"<>|]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const lessonFolderBaseName = sanitizeForFolder(normalizedLessonName);
      if (!lessonFolderBaseName) {
        return res.status(400).json({ error: 'lessonName enthält keine gültigen Zeichen' });
      }

      let fullParentFolderPath: string;
      if (folderPath.startsWith('git-intern/')) {
        const relativePath = folderPath.replace('git-intern/', '');
        if (process.env.NODE_ENV === 'production') {
          const serverPath = path.join(process.cwd(), 'J-M-Reihen');
          const projectPath = path.join(process.cwd(), '..', 'J-M-Reihen');
          const jmReihenPath = fs.existsSync(serverPath) ? serverPath : projectPath;
          fullParentFolderPath = path.join(jmReihenPath, relativePath);
        } else {
          const projectRoot = '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey';
          fullParentFolderPath = path.join(projectRoot, 'J-M-Reihen', relativePath);
        }
      } else {
        fullParentFolderPath = path.resolve(folderPath);
      }

      if (!fs.existsSync(fullParentFolderPath)) {
        return res.status(404).json({ error: 'Ausgewählter Zielordner wurde nicht gefunden' });
      }

      const lessonFolderName = lessonFolderBaseName;
      const fullLessonFolderPath = path.join(fullParentFolderPath, lessonFolderName);

      if (fs.existsSync(fullLessonFolderPath)) {
        return res.status(409).json({ error: 'Ein Stundenordner mit diesem Namen existiert bereits' });
      }
      fs.mkdirSync(fullLessonFolderPath, { recursive: true });

      const relativeFolderPath = folderPath.startsWith('git-intern/')
        ? `${folderPath}/${lessonFolderName}`
        : fullLessonFolderPath;

      res.json({
        success: true,
        lessonFolderName,
        lessonFolderPath: relativeFolderPath,
        children: []
      });
    } catch (error) {
      console.error('Fehler beim Erstellen des Stundenordners:', error);
      res.status(500).json({ error: 'Fehler beim Erstellen des Stundenordners' });
    }
  }

  /**
   * Generiert Prüfungsinhalte basierend auf einem Prompt
   */
  static async generateExaminationContent(req: Request, res: Response) {
    try {
      const { filePath, prompt, examType } = req.body;

      if (!filePath || !prompt) {
        return res.status(400).json({ error: 'filePath und prompt sind erforderlich' });
      }

      // Lese die HTML-Datei
      let fullFilePath: string;
      if (filePath.startsWith('git-intern/')) {
        const relativePath = filePath.replace('git-intern/', '');
        if (process.env.NODE_ENV === 'production') {
          const jmReihenPath = path.join(process.cwd(), 'J-M-Reihen');
          fullFilePath = path.join(jmReihenPath, relativePath);
        } else {
          const projectRoot = '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey';
          fullFilePath = path.join(projectRoot, 'J-M-Reihen', relativePath);
        }
      } else {
        fullFilePath = path.resolve(filePath);
      }

      if (!fs.existsSync(fullFilePath)) {
        return res.status(404).json({ error: 'Datei nicht gefunden' });
      }

      let htmlContent = fs.readFileSync(fullFilePath, 'utf-8');

      console.log('📄 HTML-Datei gelesen, Länge:', htmlContent.length);

      // Analysiere den Prompt und generiere Aufgaben
      const tasks = await FileSystemPathController.parsePromptAndGenerateTasks(prompt, examType);
      console.log('✅ Aufgaben generiert:', tasks.length);

      // Finde die Stelle, wo die Aufgaben eingefügt werden sollen
      const submitSectionMatch = htmlContent.match(/<div class="submit-section">/);
      
      if (!submitSectionMatch) {
        console.error('❌ submit-section nicht gefunden');
        return res.status(400).json({ 
          error: 'Konnte submit-section nicht finden. Bitte überprüfen Sie die HTML-Struktur.',
          details: 'Die HTML-Datei muss ein <div class="submit-section"> Element enthalten.'
        });
      }

      const submitSectionPosition = submitSectionMatch.index!;
      console.log('📍 submit-section Position:', submitSectionPosition);

      // Suche nach bestehenden Aufgaben
      const taskStartMatch = htmlContent.match(/<!-- Aufgabe 1/);
      
      let insertPosition: number;
      let endPosition: number;

      if (taskStartMatch) {
        // Es gibt bereits Aufgaben - ersetze sie
        console.log('📝 Bestehende Aufgaben gefunden, ersetze sie');
        const taskStartPosition = taskStartMatch.index!;
        
        // Finde die letzte schließende </div> vor submit-section, die zu einer Aufgabe gehört
        const beforeSubmitSection = htmlContent.substring(0, submitSectionPosition);
        
        // Suche nach dem letzten </div> mit Einrückung (4 Leerzeichen) vor submit-section
        // Das sollte das Ende der letzten Aufgabe sein
        // Pattern: Suche nach </div> gefolgt von optionalem Whitespace und dann submit-section
        const taskDivEndPattern = /(\n    <\/div>\s*\n\s*)(?=\n\s*<div class="submit-section">)/;
        const lastTaskDivMatch = beforeSubmitSection.match(taskDivEndPattern);
        
        if (lastTaskDivMatch) {
          insertPosition = taskStartPosition;
          endPosition = lastTaskDivMatch.index! + lastTaskDivMatch[1].length;
          console.log('✅ Aufgabe-Ende gefunden mit Pattern:', endPosition);
        } else {
          // Fallback: Suche nach dem letzten </div> mit 4 Leerzeichen Einrückung
          const lastDivIndex = beforeSubmitSection.lastIndexOf('\n    </div>');
          if (lastDivIndex !== -1) {
            // Finde das Ende dieses </div> Tags (inkl. Whitespace bis zum nächsten Tag)
            const afterLastDiv = beforeSubmitSection.substring(lastDivIndex);
            // Suche nach </div> gefolgt von Whitespace bis zum nächsten Tag oder Zeilenende
            const divEndMatch = afterLastDiv.match(/<\/div>(\s*\n\s*)/);
            insertPosition = taskStartPosition;
            endPosition = lastDivIndex + (divEndMatch ? divEndMatch[0].length : 6);
            console.log('✅ Aufgabe-Ende gefunden mit Fallback:', endPosition);
          } else {
            // Letzter Fallback: Einfach vor submit-section einfügen
            insertPosition = taskStartPosition;
            endPosition = submitSectionPosition;
            console.log('⚠️ Verwende submit-section Position als Endposition:', endPosition);
          }
        }
      } else {
        // Keine Aufgaben vorhanden - füge nach .instructions ein
        console.log('📝 Keine bestehenden Aufgaben, füge nach instructions ein');
        const instructionsMatch = htmlContent.match(/<\/div>\s*(?=\n\s*<div class="submit-section">)/);
        
        if (instructionsMatch) {
          insertPosition = instructionsMatch.index! + instructionsMatch[0].length;
          endPosition = submitSectionPosition;
        } else {
          // Fallback: Suche nach dem letzten </div> vor submit-section
          const beforeSubmit = htmlContent.substring(0, submitSectionPosition);
          const lastDivMatch = beforeSubmit.match(/\n    <\/div>\s*$/m);
          
          if (lastDivMatch) {
            insertPosition = lastDivMatch.index! + lastDivMatch[0].length;
          } else {
            insertPosition = submitSectionPosition;
          }
          endPosition = submitSectionPosition;
        }
      }

      console.log('📍 Einfügeposition:', insertPosition);
      console.log('📍 Endposition:', endPosition);

      // Validierung: Stelle sicher, dass die Positionen gültig sind
      if (insertPosition < 0 || endPosition < 0 || insertPosition >= htmlContent.length || endPosition > htmlContent.length) {
        console.error('❌ Ungültige Positionen:', { insertPosition, endPosition, contentLength: htmlContent.length });
        return res.status(500).json({ 
          error: 'Ungültige Einfügepositionen berechnet',
          details: `insertPosition: ${insertPosition}, endPosition: ${endPosition}, contentLength: ${htmlContent.length}`
        });
      }

      if (insertPosition >= endPosition) {
        console.error('❌ insertPosition >= endPosition:', { insertPosition, endPosition });
        return res.status(500).json({ 
          error: 'Einfügeposition ist größer oder gleich Endposition',
          details: `insertPosition: ${insertPosition}, endPosition: ${endPosition}`
        });
      }

      // Ersetze den Aufgabenbereich
      const beforeTasks = htmlContent.substring(0, insertPosition);
      const afterTasks = htmlContent.substring(endPosition);
      
      console.log('📏 Vor Aufgaben:', beforeTasks.length, 'Zeichen');
      console.log('📏 Nach Aufgaben:', afterTasks.length, 'Zeichen');
      console.log('📏 Neue Aufgaben:', tasks.join('\n\n').length, 'Zeichen');
      
      htmlContent = beforeTasks + 
                   '\n\n' + tasks.join('\n\n') + 
                   '\n\n    ' +
                   afterTasks;

      // Validierung: Stelle sicher, dass die neue HTML-Datei gültig ist
      if (!htmlContent.includes('<div class="submit-section">')) {
        console.error('❌ submit-section nach dem Einfügen nicht gefunden!');
        return res.status(500).json({ 
          error: 'Fehler beim Einfügen: submit-section nicht mehr vorhanden',
          details: 'Die HTML-Struktur wurde möglicherweise beschädigt'
        });
      }

      // Schreibe die aktualisierte HTML-Datei
      fs.writeFileSync(fullFilePath, htmlContent, 'utf-8');

      console.log('✅ Prüfungsinhalte erfolgreich generiert:', fullFilePath);

      res.json({
        success: true,
        message: 'Inhalte erfolgreich generiert',
        tasksCount: tasks.length
      });
    } catch (error) {
      console.error('❌ Fehler beim Generieren der Prüfungsinhalte:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('❌ Fehler-Details:', { errorMessage, errorStack });
      
      // Prüfe ob es ein AI-Fehler ist
      if (errorMessage.includes('OpenAI') || errorMessage.includes('API')) {
        res.status(500).json({ 
          error: 'Fehler bei der AI-Generierung',
          details: errorMessage,
          hint: 'Bitte überprüfen Sie Ihren OpenAI API Key in der server/.env Datei'
        });
      } else {
        res.status(500).json({ 
          error: 'Fehler beim Generieren der Prüfungsinhalte',
          details: errorMessage
        });
      }
    }
  }

  /**
   * Analysiert einen Prompt und generiert Aufgaben
   */
  private static async parsePromptAndGenerateTasks(prompt: string, examType?: string): Promise<string[]> {
    const tasks: string[] = [];
    const lowerPrompt = prompt && typeof prompt === 'string' ? prompt.toLowerCase() : '';

    // Extrahiere Thema (vor dem ersten Komma oder "die")
    const topicMatch = prompt.match(/thema\s+([^,]+?)(?:\s*,\s*die|$)/i) || 
                       prompt.match(/zum\s+Thema\s+([^,]+?)(?:\s*,\s*die|$)/i) ||
                       prompt.match(/über\s+([^,]+?)(?:\s*,\s*die|$)/i);
    const topic = topicMatch ? topicMatch[1].trim() : 'dem Thema';

    // Extrahiere Gesamtanzahl der Fragen
    const totalQuestionsMatch = prompt.match(/die\s+(\d+)\s+fragen\s+umfasst/i) ||
                                 prompt.match(/(\d+)\s+fragen\s+umfasst/i) ||
                                 prompt.match(/die\s+(\d+)\s+aufgaben/i);
    const totalQuestions = totalQuestionsMatch ? parseInt(totalQuestionsMatch[1]) : 4;

    // Extrahiere Anzahl Multiple Choice Fragen
    const mcQuestionsMatch = prompt.match(/(\d+)\s+fragen\s+multiple\s+choice/i) ||
                             prompt.match(/davon\s+sollen\s+(\d+)\s+fragen\s+multiple\s+choice/i);
    const mcQuestions = mcQuestionsMatch ? parseInt(mcQuestionsMatch[1]) : (totalQuestions - 1);

    // Extrahiere Anzahl Ankreuzmöglichkeiten
    const optionsMatch = prompt.match(/(\d+)\s+ankreuzmöglichkeiten/i) ||
                         prompt.match(/mit\s+(\d+)\s+ankreuzmöglichkeiten/i);
    const optionsCount = optionsMatch ? parseInt(optionsMatch[1]) : 4;

    // Extrahiere Anzahl Textantwort-Fragen
    const textQuestionsMatch = prompt.match(/(\d+)\s+frage\s+soll\s+eine\s+textantwort/i) ||
                               prompt.match(/(\d+)\s+fragen\s+sollen\s+eine\s+textantwort/i) ||
                               prompt.match(/(\d+)\s+frage\s+textantwort/i);
    const textQuestions = textQuestionsMatch ? parseInt(textQuestionsMatch[1]) : 1;

    // Berechne die tatsächliche Verteilung
    const actualMCQuestions = Math.min(mcQuestions, totalQuestions - textQuestions);
    const actualTextQuestions = Math.min(textQuestions, totalQuestions - actualMCQuestions);
    const remainingQuestions = totalQuestions - actualMCQuestions - actualTextQuestions;

    console.log('📊 Aufgaben-Verteilung:', {
      total: totalQuestions,
      mc: actualMCQuestions,
      text: actualTextQuestions,
      remaining: remainingQuestions,
      topic,
      optionsCount
    });

    // Generiere Aufgaben in der richtigen Reihenfolge
    let taskNumber = 1;
    const generatedQuestions: string[] = []; // Speichere bereits generierte Fragen für Kontext

      // Multiple Choice Fragen (von einfach zu schwer)
      for (let i = 0; i < actualMCQuestions; i++) {
        const difficulty = i === 0 ? 'einfachste' : (i === actualMCQuestions - 1 ? 'schwerste' : 'mittel');
        const taskContent = await FileSystemPathController.generateMultipleChoiceTask(
          taskNumber++, 
          topic, 
          totalQuestions, 
          optionsCount,
          difficulty,
          i === 0, // erste Frage
          i === actualMCQuestions - 1, // letzte MC Frage
          i + 1, // Frage-Nummer für AI-Prompt
          actualMCQuestions, // Gesamtanzahl MC-Fragen
          generatedQuestions // Kontext über bereits generierte Fragen
        );
        // Extrahiere die Frage aus dem generierten HTML für den Kontext
        const questionMatch = taskContent.match(/<label[^>]*>([^<]+)<\/label>/);
        if (questionMatch) {
          generatedQuestions.push(questionMatch[1].trim());
        }
        tasks.push(taskContent);
      }

      // Verbleibende Fragen als Textaufgaben (falls vorhanden)
      for (let i = 0; i < remainingQuestions; i++) {
        const taskContent = await FileSystemPathController.generateTextTask(
          taskNumber++, 
          topic, 
          totalQuestions,
          'mittel',
          false,
          actualMCQuestions + i + 1, // Frage-Nummer für AI-Prompt
          totalQuestions,
          generatedQuestions // Kontext über bereits generierte Fragen
        );
        // Extrahiere die Frage aus dem generierten HTML für den Kontext
        const questionMatch = taskContent.match(/<p[^>]*>([^<]+)<\/p>/);
        if (questionMatch) {
          generatedQuestions.push(questionMatch[1].trim());
        }
        tasks.push(taskContent);
      }

      // Textantwort-Fragen (am Ende, schwerste)
      for (let i = 0; i < actualTextQuestions; i++) {
        const taskContent = await FileSystemPathController.generateTextTask(
          taskNumber++, 
          topic, 
          totalQuestions,
          'schwerste',
          taskNumber === totalQuestions + 1, // letzte Frage insgesamt
          totalQuestions - actualTextQuestions + i + 1, // Frage-Nummer für AI-Prompt
          totalQuestions,
          generatedQuestions // Kontext über bereits generierte Fragen
        );
        // Extrahiere die Frage aus dem generierten HTML für den Kontext
        const questionMatch = taskContent.match(/<p[^>]*>([^<]+)<\/p>/);
        if (questionMatch) {
          generatedQuestions.push(questionMatch[1].trim());
        }
        tasks.push(taskContent);
      }

    return tasks;
  }

  /**
   * Generiert eine Multiple-Choice-Aufgabe mit AI
   */
  private static async generateMultipleChoiceTask(
    taskNumber: number, 
    topic: string, 
    totalTasks: number, 
    optionsCount: number = 4,
    difficulty: string = 'mittel',
    isFirst: boolean = false,
    isLastMC: boolean = false,
    questionNumber: number = 1,
    totalMCQuestions: number = 1,
    previousQuestions: string[] = []
  ): Promise<string> {
    const points = 1;
    // AFB-Level basierend auf Schwierigkeit: einfachste = AFB 1, schwerste = AFB 2
    const afbLevel = difficulty === 'einfachste' ? 1 : (difficulty === 'schwerste' ? 2 : 1);

    const difficultyNote = isFirst ? ' (einfachste Frage)' : (isLastMC ? ' (schwerste Multiple-Choice-Frage)' : '');

    // Generiere Frage und Antworten mit AI
    const aiContent = await FileSystemPathController.generateAIQuestion(
      topic,
      'multiple-choice',
      difficulty,
      questionNumber,
      totalMCQuestions,
      optionsCount,
      previousQuestions
    );

    return `    <!-- Aufgabe ${taskNumber}: AFB ${afbLevel} - Multiple Choice${difficultyNote} -->
    <div class="task">
        <div class="task-header">
            <div class="task-number">Aufgabe ${taskNumber} <span style="font-size: 11px; color: #666; font-weight: normal;">(${points} Punkte)</span></div>
            <div class="task-meta teacher-only">
                <span class="afb-badge afb-${afbLevel}">AFB ${afbLevel}</span>
                <div class="points">${points} Punkte</div>
            </div>
        </div>
        <div class="task-content">
            <div class="input-group full-width" style="margin-bottom: 20px;">
                <label style="font-weight: bold; margin-bottom: 10px; display: block;">${aiContent.question}</label>
                <div style="margin-left: 20px;">
${aiContent.optionsHTML}
                </div>
            </div>

            <div class="solution">
                <h4>Musterlösung:</h4>
                <p>Richtige Antwort: <strong>${aiContent.correctAnswer}</strong></p>
                <p>${aiContent.explanation}</p>
            </div>
        </div>
    </div>`;
  }

  /**
   * Generiert eine Textaufgabe mit AI
   */
  private static async generateTextTask(
    taskNumber: number, 
    topic: string, 
    totalTasks: number,
    difficulty: string = 'mittel',
    isLast: boolean = false,
    questionNumber: number = 1,
    totalQuestions: number = 1,
    previousQuestions: string[] = []
  ): Promise<string> {
    const points = 1;
    // AFB-Level basierend auf Schwierigkeit: einfachste = AFB 1, schwerste = AFB 2
    const afbLevel = difficulty === 'einfachste' ? 1 : (difficulty === 'schwerste' ? 2 : 2);

    const difficultyNote = isLast ? ' (schwerste Frage)' : '';

    // Generiere Frage mit AI
    const aiContent = await FileSystemPathController.generateAIQuestion(
      topic,
      'text',
      difficulty,
      questionNumber,
      totalQuestions,
      0,
      previousQuestions
    );

    return `    <!-- Aufgabe ${taskNumber}: AFB ${afbLevel} - Textaufgabe${difficultyNote} -->
    <div class="task">
        <div class="task-header">
            <div class="task-number">Aufgabe ${taskNumber} <span style="font-size: 11px; color: #666; font-weight: normal;">(${points} Punkte)</span></div>
            <div class="task-meta teacher-only">
                <span class="afb-badge afb-${afbLevel}">AFB ${afbLevel}</span>
                <div class="points">${points} Punkte</div>
            </div>
        </div>
        <div class="task-content">
            <p><strong>Bearbeite</strong> die folgende Aufgabe zu ${topic}:</p>
            
            <div style="background: #f9f9f9; padding: 15px; border-radius: 4px; line-height: 1.8; font-size: 15px; margin-bottom: 15px;">
                <p>${aiContent.question}</p>
            </div>

            <div class="input-group full-width">
                <textarea id="a${taskNumber}" placeholder="Ihre Antwort hier..." style="width: 100%; min-height: ${isLast ? '150' : '100'}px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; font-family: Arial, sans-serif;"></textarea>
            </div>

            <div class="solution">
                <h4>Musterlösung:</h4>
                <p>${aiContent.explanation || '<em>Bitte passen Sie diese Musterlösung an Ihre spezifischen Anforderungen an.</em>'}</p>
            </div>
        </div>
    </div>`;
  }

  /**
   * Generiert eine Frage mit AI (OpenAI oder Fallback)
   */
  private static async generateAIQuestion(
    topic: string,
    questionType: 'multiple-choice' | 'text',
    difficulty: string,
    questionNumber: number,
    totalQuestions: number,
    optionsCount: number,
    previousQuestions: string[] = []
  ): Promise<{
    question: string;
    optionsHTML?: string;
    correctAnswer?: string;
    explanation: string;
  }> {
    // Prüfe ob OpenAI API Key vorhanden ist
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    console.log('🤖 AI-Generierung gestartet:', {
      topic,
      questionType,
      difficulty,
      questionNumber,
      totalQuestions,
      optionsCount,
      hasApiKey: !!openaiApiKey
    });
    
    if (!openaiApiKey) {
      console.log('⚠️ Kein OpenAI API Key gefunden, verwende Fallback-Inhalte');
      console.log('💡 Tipp: Setzen Sie OPENAI_API_KEY in der .env Datei');
      return this.generateFallbackQuestion(topic, questionType, difficulty, optionsCount);
    }

    const looksLikePlaceholder = (text: string) => {
      if (!text || typeof text !== 'string') {
        return true;
      }
      const normalized = text.trim();
      if (!normalized) {
        return true;
      }
      if (normalized.includes('_')) {
        return true;
      }
      const placeholderPatterns = [
        /\bantwort\s*[a-f]\b/i,
        /\boption\s*\d+\b/i,
        /\boption\s*[a-f]\b/i,
        /\bantwort\s*\d+\b/i,
        /\bplaceholder\b/i
      ];
      return placeholderPatterns.some((pattern) => pattern.test(normalized));
    };

    const maxAttempts = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        // Verwende OpenAI API
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: openaiApiKey });
        
        console.log(`✅ OpenAI Client erstellt, starte API-Aufruf (Versuch ${attempt}/${maxAttempts})...`);

        const difficultyText = difficulty && typeof difficulty === 'string' 
          ? (difficulty === 'einfachste' ? 'einfach' : (difficulty === 'schwerste' ? 'schwer' : 'mittel'))
          : 'mittel';
        
        // Erstelle Kontext über bereits generierte Fragen
        const previousQuestionsContext = previousQuestions.length > 0
          ? `\n\nBEREITS GENERIERTE FRAGEN (diese müssen sich UNTERSCHEIDEN):\n${previousQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}\n\nWICHTIG: Deine neue Frage muss sich von ALLEN oben genannten Fragen unterscheiden! Verwende einen ANDEREN Aspekt, ein ANDERES Beispiel oder eine ANDERE Formulierung!`
          : '';
        
        // Erstelle einen spezifischen Aspekt-Index für diese Frage, um Variation zu gewährleisten
        const aspectIndex = questionNumber % 7; // 7 verschiedene Aspekte
        const aspectHints = [
          'Fokussiere dich auf Definitionen und Grundbegriffe',
          'Fokussiere dich auf praktische Anwendungen und Beispiele',
          'Fokussiere dich auf Berechnungen und Formeln',
          'Fokussiere dich auf Vergleiche und Unterschiede',
          'Fokussiere dich auf konkrete Situationen und Szenarien',
          'Fokussiere dich auf Zusammenhänge und Abhängigkeiten',
          'Fokussiere dich auf spezifische Eigenschaften und Merkmale'
        ];
        const aspectHint = aspectHints[aspectIndex];
        
        const prompt = questionType === 'multiple-choice'
          ? `Erstelle eine ${difficultyText}e Multiple-Choice-Frage zum Thema "${topic}" für Schüler der 7. Klasse. 

KRITISCH WICHTIG: 
- Dies ist Frage ${questionNumber} von ${totalQuestions} Fragen. 
- ${aspectHint} des Themas "${topic}"
- Jede Frage muss EINDEUTIG und UNTERSCHIEDLICH sein - verwende verschiedene Aspekte, Formulierungen und Konzepte!
- Erstelle ${optionsCount} konkrete, realistische Antwortmöglichkeiten mit echten Inhalten (NIEMALS "Antwort A", "Antwort B" etc.)
- Alle Antwortoptionen müssen sinnvoll zur Frage passen und plausibel klingen
- Nur eine Antwort ist richtig, die anderen müssen aber auch logisch erscheinen
- Die Frage muss sich von allen anderen Fragen unterscheiden und verschiedene Aspekte des Themas "${topic}" abdecken
- Verwende konkrete Beispiele, Zahlen oder Situationen in der Frage${previousQuestionsContext}

Formatiere die Antwort als JSON mit folgenden Feldern:
- "question": Die konkrete Frage (nicht "Frage zu [Thema]", sondern eine echte Frage mit Kontext)
- "options": Array mit ${optionsCount} konkreten, realistischen Antwortoptionen (z.B. ["Die absolute Häufigkeit ist die Anzahl der Vorkommen eines Merkmals", "Die relative Häufigkeit wird immer als Dezimalzahl zwischen 0 und 1 angegeben", ...])
- "correctAnswer": Buchstabe der richtigen Antwort (A, B, C, etc.)
- "explanation": Kurze, verständliche Erklärung warum diese Antwort richtig ist`
          : `Erstelle eine ${difficultyText}e Textaufgabe zum Thema "${topic}" für Schüler der 7. Klasse.

KRITISCH WICHTIG:
- Dies ist Frage ${questionNumber} von ${totalQuestions} Fragen. 
- ${aspectHint} des Themas "${topic}"
- Jede Frage muss EINDEUTIG und UNTERSCHIEDLICH sein - verwende verschiedene Aspekte und Formulierungen!
- Die Aufgabenstellung muss konkret und präzise sein (nicht "Beschreiben Sie [Thema]", sondern eine spezifische Aufgabe)
- Die Frage muss sich von allen anderen Fragen unterscheiden
- Verwende konkrete Beispiele, Zahlen oder Situationen${previousQuestionsContext}

Formatiere die Antwort als JSON mit folgenden Feldern:
- "question": Die konkrete, präzise Aufgabenstellung
- "explanation": Eine ausführliche, verständliche Musterlösung`;

        console.log('📤 Sende Request an OpenAI...');
        let completion;
        try {
          completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `Du bist ein erfahrener Lehrer, der präzise und altersgerechte Prüfungsfragen erstellt. 

KRITISCH WICHTIG:
- Jede Frage muss EINDEUTIG sein und sich von allen anderen unterscheiden
- Verwende verschiedene Aspekte, Formulierungen, Beispiele und Konzepte des Themas
- Verwende IMMER konkrete, realistische Antwortoptionen mit echten Inhalten (NIEMALS "Antwort A", "Antwort B", "Option 1" etc.)
- Alle Antwortoptionen müssen sinnvoll zur Frage passen und plausibel klingen
- Die richtige Antwort muss klar identifizierbar sein, aber die falschen Antworten sollten auch logisch erscheinen
- Antworte IMMER im JSON-Format
- Stelle sicher, dass jede Frage verschiedene Aspekte des Themas abdeckt
- Verwende konkrete Beispiele, Zahlen oder Situationen in den Fragen`
              },
              {
                role: 'user',
                content: prompt
              }
            ],
          response_format: { type: 'json_object' },
          temperature: 0.95, // Sehr hohe Temperatur für maximale Variation
          seed: Math.floor(Math.random() * 1000000) // Zufälliger Seed für jede Frage, um Variation zu gewährleisten
        });
          console.log('✅ OpenAI Response erhalten');
        } catch (apiError: any) {
          console.error('❌ OpenAI API Fehler:', {
            message: apiError.message,
            status: apiError.status,
            code: apiError.code,
            type: apiError.type
          });
          throw new Error(`OpenAI API Fehler: ${apiError.message || 'Unbekannter Fehler'}`);
        }

        const rawContent = completion.choices[0].message.content || '{}';
        console.log('📥 AI-Response erhalten:', rawContent.substring(0, 200) + '...');
        
        const content = JSON.parse(rawContent);
        console.log('✅ JSON geparst:', {
          hasQuestion: !!content.question,
          hasOptions: !!content.options,
          optionsCount: content.options?.length || 0,
          hasCorrectAnswer: !!content.correctAnswer
        });

        if (looksLikePlaceholder(content.question)) {
          throw new Error('AI-Antwort enthält Platzhalter im Fragetext');
        }

        if (questionType === 'multiple-choice') {
          const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
          if (!Array.isArray(content.options) || content.options.length < optionsCount) {
            throw new Error('AI-Antwort enthält zu wenige Antwortoptionen');
          }

          const actualOptions = content.options.slice(0, Math.min(optionsCount, optionLabels.length));
          if (actualOptions.some((option: any) => looksLikePlaceholder(String(option)))) {
            throw new Error('AI-Antwort enthält Platzhalter in den Antwortoptionen');
          }

          const normalizedCorrectAnswer = typeof content.correctAnswer === 'string'
            ? content.correctAnswer.trim().toUpperCase()
            : '';

          if (!optionLabels.includes(normalizedCorrectAnswer)) {
            throw new Error('AI-Antwort enthält keine gültige richtige Antwort (A-F)');
          }

          const optionsHTML = actualOptions.map((option: any, index: number) => {
            // Stelle sicher, dass der Index gültig ist
            if (index >= optionLabels.length) {
              console.error('❌ Index außerhalb des Bereichs:', index, 'max:', optionLabels.length);
              throw new Error(`Zu viele Optionen: Index ${index} außerhalb des Bereichs`);
            }
            
            const optionLabel = optionLabels[index];
            if (!optionLabel || typeof optionLabel !== 'string') {
              console.error('❌ OptionLabel ist undefined oder kein String für Index:', index, 'optionLabel:', optionLabel);
              throw new Error(`OptionLabel ist undefined oder kein String für Index ${index}`);
            }
            
            const optionText = typeof option === 'string' && option.trim()
              ? option.trim()
              : '';
            
            if (!optionText) {
              throw new Error('AI-Antwort enthält leere Antwortoption');
            }
            
            const optionValue = optionLabel.toLowerCase();
            
            return `                    <label style="display: block; margin-bottom: 8px; cursor: pointer;">
                        <input type="radio" name="a${questionNumber}" value="${optionValue}" style="margin-right: 8px;">
                        ${optionText}
                    </label>`;
          }).join('\n');

          return {
            question: content.question,
            optionsHTML,
            correctAnswer: normalizedCorrectAnswer,
            explanation: content.explanation || 'Bitte passen Sie diese Musterlösung an.'
          };
        }

        return {
          question: content.question,
          explanation: content.explanation || 'Bitte passen Sie diese Musterlösung an.'
        };
      } catch (error) {
        console.error('❌ Fehler bei AI-Generierung:', error);
        console.error('❌ Fehler-Details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxAttempts) {
          console.log('🔁 Erneuter Versuch der AI-Generierung...');
          continue;
        }
      }
    }

    throw lastError || new Error('AI-Generierung fehlgeschlagen');
  }

  /**
   * Generiert Fallback-Inhalte wenn keine AI verfügbar ist
   */
  private static generateFallbackQuestion(
    topic: string,
    questionType: 'multiple-choice' | 'text',
    difficulty: string,
    optionsCount: number
  ): {
    question: string;
    optionsHTML?: string;
    correctAnswer?: string;
    explanation: string;
  } {
    if (questionType === 'multiple-choice') {
      const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
      
      // Generiere verschiedene Fallback-Optionen basierend auf dem Thema
      const fallbackOptions = [
        `Eine wichtige Eigenschaft von ${topic}`,
        `Eine häufige Anwendung von ${topic}`,
        `Ein grundlegendes Konzept zu ${topic}`,
        `Ein Beispiel für ${topic}`,
        `Eine Definition von ${topic}`,
        `Eine Regel zu ${topic}`
      ];
      
      const optionsHTML = Array.from({ length: optionsCount }, (_, i) => {
        if (i >= optionLabels.length) {
          console.error('❌ Fallback: Index außerhalb des Bereichs:', i, 'max:', optionLabels.length);
          return '';
        }
        const optionLabel = optionLabels[i];
        if (!optionLabel || typeof optionLabel !== 'string') {
          console.error('❌ Fallback: OptionLabel ist undefined oder kein String für Index:', i);
          return '';
        }
        const optionValue = optionLabel.toLowerCase();
        const optionText = fallbackOptions[i] || `Option zu ${topic}`;
        return `                    <label style="display: block; margin-bottom: 8px; cursor: pointer;">
                        <input type="radio" name="a1" value="${optionValue}" style="margin-right: 8px;">
                        ${optionText}
                    </label>`;
      }).filter(html => html !== '').join('\n');

      return {
        question: `Welche der folgenden Aussagen zu ${topic} ist korrekt?`,
        optionsHTML,
        correctAnswer: 'B',
        explanation: '⚠️ HINWEIS: Dies sind Platzhalter-Inhalte. Für echte, individuelle Fragen benötigen Sie einen OpenAI API Key. Bitte setzen Sie OPENAI_API_KEY in der .env Datei des Servers (server/.env).'
      };
    } else {
      return {
        question: `Beschreiben Sie die wichtigsten Konzepte zu ${topic}${difficulty === 'schwerste' ? ' in ausführlicher Form' : ''}.`,
        explanation: '⚠️ HINWEIS: Dies sind Platzhalter-Inhalte. Für echte, individuelle Fragen benötigen Sie einen OpenAI API Key. Bitte setzen Sie OPENAI_API_KEY in der .env Datei des Servers (server/.env).'
      };
    }
  }

  /**
   * Liest alle Aufgaben aus einer HTML-Datei
   */
  static async getExaminationQuestions(req: Request, res: Response) {
    try {
      const { filePath } = req.query;

      if (!filePath || typeof filePath !== 'string') {
        return res.status(400).json({ error: 'filePath ist erforderlich' });
      }

      // Lese die HTML-Datei
      let fullFilePath: string;
      if (filePath.startsWith('git-intern/')) {
        const relativePath = filePath.replace('git-intern/', '');
        if (process.env.NODE_ENV === 'production') {
          const jmReihenPath = path.join(process.cwd(), 'J-M-Reihen');
          fullFilePath = path.join(jmReihenPath, relativePath);
        } else {
          const projectRoot = '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey';
          fullFilePath = path.join(projectRoot, 'J-M-Reihen', relativePath);
        }
      } else {
        fullFilePath = path.resolve(filePath);
      }

      if (!fs.existsSync(fullFilePath)) {
        return res.status(404).json({ error: 'Datei nicht gefunden' });
      }

      const htmlContent = fs.readFileSync(fullFilePath, 'utf-8');

      // Extrahiere den Titel
      let title = '';
      // Versuche zuerst den header-title zu extrahieren
      const headerTitleMatch = htmlContent.match(/<div class="header-title">([^<]+)<\/div>/);
      if (headerTitleMatch) {
        title = headerTitleMatch[1].trim();
      } else {
        // Fallback: Extrahiere aus dem <title> Tag
        const titleMatch = htmlContent.match(/<title>([^<]+)<\/title>/);
        if (titleMatch) {
          title = titleMatch[1].trim();
        }
      }

      // Extrahiere alle Aufgaben
      const taskPattern = /<!-- Aufgabe (\d+):([^>]*)-->([\s\S]*?)(?=<!-- Aufgabe |<div class="submit-section">)/g;
      const questions: any[] = [];
      let match;

      while ((match = taskPattern.exec(htmlContent)) !== null) {
        const taskNumber = parseInt(match[1]);
        const taskMeta = match[2].trim();
        const taskHTML = match[3].trim();

        // Bestimme den Fragentyp
        const isMultipleChoice = taskHTML.includes('type="radio"');
        const questionType = isMultipleChoice ? 'multiple-choice' : 'text';

        // Extrahiere die Frage
        let questionText = '';
        if (isMultipleChoice) {
          const questionMatch = taskHTML.match(/<label[^>]*style="font-weight: bold[^"]*"[^>]*>([^<]+)<\/label>/);
          if (questionMatch) {
            questionText = questionMatch[1].trim();
          }
        } else {
          const questionMatch = taskHTML.match(/<p[^>]*>([^<]+)<\/p>/);
          if (questionMatch) {
            questionText = questionMatch[1].trim();
          }
        }

        // Extrahiere Antwortoptionen für Multiple Choice
        const options: string[] = [];
        if (isMultipleChoice) {
          const optionMatches = taskHTML.matchAll(/<label[^>]*>[\s\S]*?<input[^>]*value="([^"]*)"[^>]*>[\s\S]*?([^<]+)<\/label>/g);
          for (const optionMatch of optionMatches) {
            options.push(optionMatch[2].trim());
          }
        }

        // Extrahiere die richtige Antwort
        let correctAnswer = '';
        if (isMultipleChoice) {
          const correctMatch = taskHTML.match(/Richtige Antwort: <strong>([^<]+)<\/strong>/);
          if (correctMatch) {
            correctAnswer = correctMatch[1].trim();
          }
        }

        // Extrahiere die Erklärung
        let explanation = '';
        const explanationMatch = taskHTML.match(/<p>([^<]+)<\/p>/);
        if (explanationMatch && !explanationMatch[1].includes('Richtige Antwort')) {
          explanation = explanationMatch[1].trim();
        }
        // Versuche es mit der Musterlösung
        const solutionMatch = taskHTML.match(/<div class="solution">[\s\S]*?<p>([^<]+)<\/p>/);
        if (solutionMatch) {
          explanation = solutionMatch[1].trim();
        }

        questions.push({
          taskNumber,
          questionType,
          questionText,
          options,
          correctAnswer,
          explanation,
          taskHTML,
          taskMeta
        });
      }

      res.json({
        success: true,
        title: title,
        questions: questions.sort((a, b) => a.taskNumber - b.taskNumber)
      });
    } catch (error) {
      console.error('❌ Fehler beim Lesen der Fragen:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        error: 'Fehler beim Lesen der Fragen',
        details: errorMessage
      });
    }
  }

  /**
   * Aktualisiert eine einzelne Frage in der HTML-Datei
   */
  static async updateSingleQuestion(req: Request, res: Response) {
    try {
      const { filePath, taskNumber, questionText, questionType, options, correctAnswer, explanation } = req.body;

      if (!filePath || !taskNumber || !questionText) {
        return res.status(400).json({ error: 'filePath, taskNumber und questionText sind erforderlich' });
      }

      // Lese die HTML-Datei
      let fullFilePath: string;
      if (filePath.startsWith('git-intern/')) {
        const relativePath = filePath.replace('git-intern/', '');
        if (process.env.NODE_ENV === 'production') {
          const jmReihenPath = path.join(process.cwd(), 'J-M-Reihen');
          fullFilePath = path.join(jmReihenPath, relativePath);
        } else {
          const projectRoot = '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey';
          fullFilePath = path.join(projectRoot, 'J-M-Reihen', relativePath);
        }
      } else {
        fullFilePath = path.resolve(filePath);
      }

      if (!fs.existsSync(fullFilePath)) {
        return res.status(404).json({ error: 'Datei nicht gefunden' });
      }

      let htmlContent = fs.readFileSync(fullFilePath, 'utf-8');

      // Finde die Aufgabe mit der angegebenen Nummer
      const taskPattern = new RegExp(`<!-- Aufgabe ${taskNumber}:([^>]*)-->([\\s\\S]*?)(?=<!-- Aufgabe |<div class="submit-section">)`, 'i');
      const taskMatch = htmlContent.match(taskPattern);

      if (!taskMatch) {
        return res.status(404).json({ error: `Aufgabe ${taskNumber} nicht gefunden` });
      }

      // Extrahiere Punkte und AFB-Level aus der bestehenden Aufgabe
      const pointsMatch = taskMatch[0].match(/\\((\d+)\\s+Punkte\\)/);
      const points = pointsMatch ? parseInt(pointsMatch[1]) : 5;
      const afbMatch = taskMatch[0].match(/AFB (\\d+)/);
      const afbLevel = afbMatch ? parseInt(afbMatch[1]) : 2;

      // Erstelle die aktualisierte Aufgabe
      let newTaskHTML: string;
      if (questionType === 'multiple-choice') {
        const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
        const optionsHTML = (options || []).map((option: string, index: number) => {
          const optionLabel = optionLabels[index] || String.fromCharCode(65 + index);
          const optionValue = optionLabel.toLowerCase();
          return `                    <label style="display: block; margin-bottom: 8px; cursor: pointer;">
                        <input type="radio" name="a${taskNumber}" value="${optionValue}" style="margin-right: 8px;">
                        ${option}
                    </label>`;
        }).join('\n');

        newTaskHTML = `    <!-- Aufgabe ${taskNumber}: AFB ${afbLevel} - Multiple Choice -->
    <div class="task">
        <div class="task-header">
            <div class="task-number">Aufgabe ${taskNumber} <span style="font-size: 11px; color: #666; font-weight: normal;">(${points} Punkte)</span></div>
            <div class="task-meta teacher-only">
                <span class="afb-badge afb-${afbLevel}">AFB ${afbLevel}</span>
                <div class="points">${points} Punkte</div>
            </div>
        </div>
        <div class="task-content">
            <div class="input-group full-width" style="margin-bottom: 20px;">
                <label style="font-weight: bold; margin-bottom: 10px; display: block;">${questionText}</label>
                <div style="margin-left: 20px;">
${optionsHTML}
                </div>
            </div>

            <div class="solution">
                <h4>Musterlösung:</h4>
                <p>Richtige Antwort: <strong>${correctAnswer || 'A'}</strong></p>
                <p>${explanation || ''}</p>
            </div>
        </div>
    </div>`;
      } else {
        newTaskHTML = `    <!-- Aufgabe ${taskNumber}: AFB ${afbLevel} - Textaufgabe -->
    <div class="task">
        <div class="task-header">
            <div class="task-number">Aufgabe ${taskNumber} <span style="font-size: 11px; color: #666; font-weight: normal;">(${points} Punkte)</span></div>
            <div class="task-meta teacher-only">
                <span class="afb-badge afb-${afbLevel}">AFB ${afbLevel}</span>
                <div class="points">${points} Punkte</div>
            </div>
        </div>
        <div class="task-content">
            <p><strong>Bearbeite</strong> die folgende Aufgabe:</p>
            
            <div style="background: #f9f9f9; padding: 15px; border-radius: 4px; line-height: 1.8; font-size: 15px; margin-bottom: 15px;">
                <p>${questionText}</p>
            </div>

            <div class="input-group full-width">
                <textarea id="a${taskNumber}" placeholder="Ihre Antwort hier..." style="width: 100%; min-height: 100px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; font-family: Arial, sans-serif;"></textarea>
            </div>

            <div class="solution">
                <h4>Musterlösung:</h4>
                <p>${explanation || ''}</p>
            </div>
        </div>
    </div>`;
      }

      // Ersetze die alte Aufgabe mit der neuen
      htmlContent = htmlContent.replace(taskPattern, newTaskHTML);

      // Schreibe die aktualisierte HTML-Datei
      fs.writeFileSync(fullFilePath, htmlContent, 'utf-8');

      console.log('✅ Frage erfolgreich aktualisiert:', fullFilePath, 'Aufgabe', taskNumber);

      res.json({
        success: true,
        message: 'Frage erfolgreich aktualisiert',
        taskNumber
      });
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren der Frage:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        error: 'Fehler beim Aktualisieren der Frage',
        details: errorMessage
      });
    }
  }

  /**
   * Aktualisiert den Titel einer Prüfung
   */
  static async updateExaminationTitle(req: Request, res: Response) {
    try {
      const { filePath, title } = req.body;

      if (!filePath || !title) {
        return res.status(400).json({ error: 'filePath und title sind erforderlich' });
      }

      // Lese die HTML-Datei
      let fullFilePath: string;
      if (filePath.startsWith('git-intern/')) {
        const relativePath = filePath.replace('git-intern/', '');
        if (process.env.NODE_ENV === 'production') {
          const jmReihenPath = path.join(process.cwd(), 'J-M-Reihen');
          fullFilePath = path.join(jmReihenPath, relativePath);
        } else {
          const projectRoot = '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey';
          fullFilePath = path.join(projectRoot, 'J-M-Reihen', relativePath);
        }
      } else {
        fullFilePath = path.resolve(filePath);
      }

      if (!fs.existsSync(fullFilePath)) {
        return res.status(404).json({ error: 'Datei nicht gefunden' });
      }

      let htmlContent = fs.readFileSync(fullFilePath, 'utf-8');

      // Aktualisiere den Titel im <title> Tag
      htmlContent = htmlContent.replace(/<title>([^<]+)<\/title>/, `<title>${title}</title>`);

      // Aktualisiere den Titel im header-title
      htmlContent = htmlContent.replace(/<div class="header-title">([^<]+)<\/div>/, `<div class="header-title">${title}</div>`);

      // Schreibe die aktualisierte HTML-Datei
      fs.writeFileSync(fullFilePath, htmlContent, 'utf-8');

      console.log('✅ Titel erfolgreich aktualisiert:', fullFilePath, 'Titel:', title);

      res.json({
        success: true,
        message: 'Titel erfolgreich aktualisiert',
        title
      });
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren des Titels:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        error: 'Fehler beim Aktualisieren des Titels',
        details: errorMessage
      });
    }
  }

  /**
   * Generiert eine einzelne Frage und ersetzt sie in der HTML-Datei
   */
  static async generateSingleQuestion(req: Request, res: Response) {
    try {
      const { filePath, questionNumber, questionType, topic } = req.body;

      if (!filePath || !questionNumber || !questionType || !topic) {
        return res.status(400).json({ error: 'filePath, questionNumber, questionType und topic sind erforderlich' });
      }

      // Lese die HTML-Datei
      let fullFilePath: string;
      if (filePath.startsWith('git-intern/')) {
        const relativePath = filePath.replace('git-intern/', '');
        if (process.env.NODE_ENV === 'production') {
          const jmReihenPath = path.join(process.cwd(), 'J-M-Reihen');
          fullFilePath = path.join(jmReihenPath, relativePath);
        } else {
          const projectRoot = '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey';
          fullFilePath = path.join(projectRoot, 'J-M-Reihen', relativePath);
        }
      } else {
        fullFilePath = path.resolve(filePath);
      }

      if (!fs.existsSync(fullFilePath)) {
        return res.status(404).json({ error: 'Datei nicht gefunden' });
      }

      let htmlContent = fs.readFileSync(fullFilePath, 'utf-8');

      // Finde die Aufgabe mit der angegebenen Nummer
      const taskPattern = new RegExp(`<!-- Aufgabe ${questionNumber}:([^>]*)-->([\\s\\S]*?)(?=<!-- Aufgabe |<div class="submit-section">)`, 'i');
      const taskMatch = htmlContent.match(taskPattern);

      if (!taskMatch) {
        return res.status(404).json({ error: `Aufgabe ${questionNumber} nicht gefunden` });
      }

      // Generiere die neue Frage
      const difficulty = questionNumber === 1 ? 'einfachste' : 'mittel';
      const aiContent = await FileSystemPathController.generateAIQuestion(
        topic,
        questionType,
        difficulty,
        questionNumber,
        1, // totalQuestions (nicht relevant für Einzelfragen)
        questionType === 'multiple-choice' ? 4 : 0
      );

      // Erstelle die neue Aufgabe
      let newTaskHTML: string;
      if (questionType === 'multiple-choice') {
        const points = 5; // Standard-Punkte
        const afbLevel = difficulty === 'einfachste' ? 1 : 2;
        
        newTaskHTML = `    <!-- Aufgabe ${questionNumber}: AFB ${afbLevel} - Multiple Choice -->
    <div class="task">
        <div class="task-header">
            <div class="task-number">Aufgabe ${questionNumber} <span style="font-size: 11px; color: #666; font-weight: normal;">(${points} Punkte)</span></div>
            <div class="task-meta teacher-only">
                <span class="afb-badge afb-${afbLevel}">AFB ${afbLevel}</span>
                <div class="points">${points} Punkte</div>
            </div>
        </div>
        <div class="task-content">
            <div class="input-group full-width" style="margin-bottom: 20px;">
                <label style="font-weight: bold; margin-bottom: 10px; display: block;">${aiContent.question}</label>
                <div style="margin-left: 20px;">
${aiContent.optionsHTML}
                </div>
            </div>

            <div class="solution">
                <h4>Musterlösung:</h4>
                <p>Richtige Antwort: <strong>${aiContent.correctAnswer}</strong></p>
                <p>${aiContent.explanation}</p>
            </div>
        </div>
    </div>`;
      } else {
        const points = 5;
        const afbLevel = 2;
        
        newTaskHTML = `    <!-- Aufgabe ${questionNumber}: AFB ${afbLevel} - Textaufgabe -->
    <div class="task">
        <div class="task-header">
            <div class="task-number">Aufgabe ${questionNumber} <span style="font-size: 11px; color: #666; font-weight: normal;">(${points} Punkte)</span></div>
            <div class="task-meta teacher-only">
                <span class="afb-badge afb-${afbLevel}">AFB ${afbLevel}</span>
                <div class="points">${points} Punkte</div>
            </div>
        </div>
        <div class="task-content">
            <p><strong>Bearbeite</strong> die folgende Aufgabe zu ${topic}:</p>
            
            <div style="background: #f9f9f9; padding: 15px; border-radius: 4px; line-height: 1.8; font-size: 15px; margin-bottom: 15px;">
                <p>${aiContent.question}</p>
            </div>

            <div class="input-group full-width">
                <textarea id="a${questionNumber}" placeholder="Ihre Antwort hier..." style="width: 100%; min-height: 100px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; font-family: Arial, sans-serif;"></textarea>
            </div>

            <div class="solution">
                <h4>Musterlösung:</h4>
                <p>${aiContent.explanation || '<em>Bitte passen Sie diese Musterlösung an Ihre spezifischen Anforderungen an.</em>'}</p>
            </div>
        </div>
    </div>`;
      }

      // Ersetze die alte Aufgabe mit der neuen
      htmlContent = htmlContent.replace(taskPattern, newTaskHTML);

      // Schreibe die aktualisierte HTML-Datei
      fs.writeFileSync(fullFilePath, htmlContent, 'utf-8');

      console.log('✅ Einzelfrage erfolgreich generiert:', fullFilePath, 'Aufgabe', questionNumber);

      res.json({
        success: true,
        message: 'Frage erfolgreich generiert',
        questionNumber
      });
    } catch (error) {
      console.error('❌ Fehler beim Generieren der Einzelfrage:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        error: 'Fehler beim Generieren der Einzelfrage',
        details: errorMessage
      });
    }
  }
}