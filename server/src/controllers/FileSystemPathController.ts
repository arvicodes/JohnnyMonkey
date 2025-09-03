import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';
import * as XLSX from 'xlsx';
import { StorageManager } from '../utils/storageManager';

const prisma = new PrismaClient();

// Erweiterte Interfaces für hierarchische Verzeichnisstruktur
interface DirectoryItem {
  name: string;
  type: 'directory' | 'file';
  path: string;
  children: DirectoryItem[];
  size?: number;
  itemCount?: number;
  isTruncated?: boolean;
  error?: string;
}

interface DirectoryContent {
  path: string;
  items: DirectoryItem[];
  totalItems: number;
}

interface RecursiveDirectoryContent {
  path: string;
  root: DirectoryItem;
  totalItems: number;
  maxDepth: number;
}

export class FileSystemPathController {
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

      // Pfad normalisieren und Leerzeichen behandeln
      let normalizedPath: string;
      try {
        // Entferne Escape-Zeichen und normalisiere den Pfad
        const cleanPath = filePath.replace(/\\/g, '').replace(/\\ /g, ' ');
        normalizedPath = path.resolve(cleanPath);
        console.log('Clean path:', cleanPath);
        console.log('Normalized path:', normalizedPath);
      } catch (pathError) {
        console.log('Path normalization error:', pathError);
        return res.status(400).json({ error: 'Ungültiger Pfad-Format' });
      }

      // Prüfen ob der Pfad existiert und lesbar ist
      if (!fs.existsSync(normalizedPath)) {
        console.log('Path does not exist:', normalizedPath);
        
        // Versuche den übergeordneten Ordner zu finden
        const parentDir = path.dirname(normalizedPath);
        if (fs.existsSync(parentDir)) {
          console.log('Parent directory exists:', parentDir);
          return res.status(400).json({ 
            error: 'Der angegebene Pfad existiert nicht',
            details: `Der Ordner "${path.basename(normalizedPath)}" existiert nicht in "${parentDir}"`,
            suggestion: 'Überprüfen Sie den Ordnernamen oder erstellen Sie den Ordner zuerst'
          });
        } else {
          return res.status(400).json({ 
            error: 'Der angegebene Pfad existiert nicht',
            details: `Weder der Pfad noch der übergeordnete Ordner existieren`,
            suggestion: 'Überprüfen Sie den vollständigen Pfad'
          });
        }
      }

      // Prüfen ob der Lehrer existiert
      const teacher = await prisma.user.findUnique({
        where: { id: teacherId }
      });

      if (!teacher || teacher.role !== 'TEACHER') {
        console.log('Invalid teacher:', teacherId);
        return res.status(400).json({ error: 'Ungültiger Lehrer' });
      }

      // Pfad speichern oder aktualisieren
      const savedPath = await prisma.fileSystemPath.upsert({
        where: { path: normalizedPath },
        update: { name, updatedAt: new Date() },
        create: {
          path: normalizedPath,
          name,
          teacherId
        }
      });

      console.log('Path saved successfully:', savedPath);
      res.json(savedPath);
    } catch (error) {
      console.error('Fehler beim Speichern des Pfades:', error);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }

  // Alle Pfade eines Lehrers abrufen
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
      console.error('Fehler beim Abrufen der Pfade:', error);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }

  // Datei für Download bereitstellen
  static async downloadFile(req: Request, res: Response) {
    try {
      const { filePath } = req.query;
      
      console.log('=== DOWNLOAD FILE REQUEST ===');
      console.log('Query params:', req.query);
      console.log('File path from query:', filePath);
      
      if (!filePath || typeof filePath !== 'string') {
        console.log('Missing or invalid filePath parameter');
        return res.status(400).json({ error: 'Dateipfad ist erforderlich' });
      }
      
      // Pfad normalisieren
      const normalizedPath = path.resolve(filePath);
      console.log('Normalized path:', normalizedPath);
      
      // Sicherheitsprüfung: Pfad muss existieren und lesbar sein
      if (!fs.existsSync(normalizedPath)) {
        console.log('File does not exist:', normalizedPath);
        return res.status(404).json({ error: 'Datei nicht gefunden' });
      }
      
      const stats = fs.statSync(normalizedPath);
      if (!stats.isFile()) {
        console.log('Path is not a file:', normalizedPath);
        return res.status(400).json({ error: 'Pfad ist keine Datei' });
      }
      
      // Datei-Informationen abrufen
      const fileName = path.basename(normalizedPath);
      const fileSize = stats.size;
      
      console.log('File info:', { fileName, fileSize, path: normalizedPath });
      
      // Für sehr große Dateien (> 50 MB) Warnung ausgeben
      if (fileSize > 50 * 1024 * 1024) {
        console.log('Large file detected:', (fileSize / (1024 * 1024)).toFixed(2), 'MB');
      }
      
      // Datei-Stream erstellen und senden
      const fileStream = fs.createReadStream(normalizedPath);
      
      // Content-Type basierend auf Dateiendung setzen
      const ext = path.extname(fileName).toLowerCase();
      let contentType = 'application/octet-stream';
      
      if (ext === '.pdf') contentType = 'application/pdf';
      else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (ext === '.doc') contentType = 'application/msword';
      else if (ext === '.txt') contentType = 'text/plain';
      else if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.svg') contentType = 'image/svg+xml';
      else if (ext === '.html' || ext === '.htm') contentType = 'text/html';
      else if (ext === '.xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      else if (ext === '.xls') contentType = 'application/vnd.ms-excel';
      else if (ext === '.pptx') contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      else if (ext === '.ppt') contentType = 'application/vnd.ms-powerpoint';
      else if (ext === '.goodnotes' || ext === '.gn') contentType = 'application/octet-stream';
      
      // Response-Header setzen
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Length', fileSize.toString());
      
      // Timeout für große Dateien erhöhen
      if (fileSize > 10 * 1024 * 1024) { // > 10 MB
        res.setTimeout(300000); // 5 Minuten
        console.log('Extended timeout set for large file');
      }
      
      // Datei senden
      fileStream.pipe(res);
      
      // Fehlerbehandlung für den Stream
      fileStream.on('error', (error) => {
        console.error('File stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Fehler beim Lesen der Datei' });
        }
      });
      
      // Erfolg
      fileStream.on('end', () => {
        console.log('File download completed successfully');
      });
      
      console.log('File download started successfully');
      
    } catch (error) {
      console.error('Error in downloadFile:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Fehler beim Download der Datei' });
      }
    }
  }

  // Verzeichnisstruktur eines Pfades lesen
  static async readDirectory(req: Request, res: Response) {
    try {
      const { path: filePath, recursive = 'false' } = req.query;
      console.log('=== READ DIRECTORY REQUEST ===');
      console.log('Query params:', req.query);
      console.log('File path from query:', filePath);
      console.log('Recursive:', recursive);

      if (!filePath || typeof filePath !== 'string') {
        console.log('No path provided or invalid type');
        return res.status(400).json({ error: 'Pfad ist erforderlich' });
      }

      // Pfad normalisieren
      const normalizedPath = path.resolve(filePath);
      console.log('Normalized path:', normalizedPath);

      // Sicherheitsprüfung: Nur absolute Pfade erlauben
      if (!path.isAbsolute(normalizedPath)) {
        console.log('Path is not absolute:', normalizedPath);
        return res.status(400).json({ error: 'Nur absolute Pfade sind erlaubt' });
      }

      // Prüfen ob der Pfad existiert
      if (!fs.existsSync(normalizedPath)) {
        console.log('Path does not exist:', normalizedPath);
        return res.status(400).json({ error: 'Der angegebene Pfad existiert nicht' });
      }

      // Prüfen ob es ein Verzeichnis ist
      const stats = fs.statSync(normalizedPath);
      if (!stats.isDirectory()) {
        console.log('Path is not a directory:', normalizedPath);
        return res.status(400).json({ error: 'Der angegebene Pfad ist kein Verzeichnis' });
      }

      // Funktion zum rekursiven Lesen von Verzeichnissen
      const readDirectoryRecursive = (dirPath: string, maxDepth: number = 10, currentDepth: number = 0): DirectoryItem => {
        if (currentDepth >= maxDepth) {
          return {
            name: path.basename(dirPath),
            type: 'directory',
            path: dirPath,
            children: [],
            isTruncated: true
          };
        }

        try {
          const items = fs.readdirSync(dirPath, { withFileTypes: true });
          
          const children = items
            .filter(item => !item.name.startsWith('.')) // Versteckte Dateien ausfiltern
            .map(item => {
              const itemPath = path.join(dirPath, item.name);
              if (item.isDirectory()) {
                return readDirectoryRecursive(itemPath, maxDepth, currentDepth + 1);
              } else {
                return {
                  name: item.name,
                  type: 'file' as const,
                  path: itemPath,
                  children: [],
                  size: fs.statSync(itemPath).size
                };
              }
            })
            .sort((a, b) => {
              // Verzeichnisse zuerst, dann Dateien, beide alphabetisch sortiert
              if (a.type === b.type) {
                return a.name.localeCompare(b.name);
              }
              return a.type === 'directory' ? -1 : 1;
            });

          return {
            name: path.basename(dirPath),
            type: 'directory',
            path: dirPath,
            children,
            itemCount: children.length
          };
        } catch (error) {
          console.log(`Error reading directory ${dirPath}:`, error);
          return {
            name: path.basename(dirPath),
            type: 'directory',
            path: dirPath,
            children: [],
            error: 'Zugriff verweigert'
          };
        }
      };

      // Verzeichnisinhalt lesen (rekursiv oder flach)
      let directoryContent: RecursiveDirectoryContent | DirectoryContent;
      if (recursive === 'true') {
        console.log('Reading directory recursively...');
        const rootItem = readDirectoryRecursive(normalizedPath, 10, 0);
        directoryContent = {
          path: normalizedPath,
          root: rootItem,
          totalItems: FileSystemPathController.countTotalItems(rootItem),
          maxDepth: 10
        };
      } else {
        console.log('Reading directory flat...');
        const items = fs.readdirSync(normalizedPath, { withFileTypes: true });
        
        const directoryItems = items
          .filter(item => !item.name.startsWith('.')) // Versteckte Dateien ausfiltern
          .map(item => ({
            name: item.name,
            type: (item.isDirectory() ? 'directory' : 'file') as 'directory' | 'file',
            path: path.join(normalizedPath, item.name),
            children: [],
            size: item.isFile() ? fs.statSync(path.join(normalizedPath, item.name)).size : undefined
          }))
          .sort((a, b) => {
            // Verzeichnisse zuerst, dann Dateien, beide alphabetisch sortiert
            if (a.type === b.type) {
              return a.name.localeCompare(b.name);
            }
            return a.type === 'directory' ? -1 : 1;
          });

        directoryContent = {
          path: normalizedPath,
          items: directoryItems,
          totalItems: directoryItems.length
        };
      }

      console.log('Directory read successfully');
      res.json(directoryContent);
    } catch (error) {
      console.error('Fehler beim Lesen des Verzeichnisses:', error);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }

  // Neue Methode zum Lesen von HTML-Dateien
  static async readHtmlFile(req: Request, res: Response) {
    try {
      console.log('=== HTML FILE READ REQUEST ===');
      console.log('Query params:', req.query);
      console.log('filePath from query:', req.query.filePath);
      
      const { filePath } = req.query;
      
      if (!filePath || typeof filePath !== 'string') {
        console.log('Error: filePath is missing or not a string');
        return res.status(400).json({ error: 'Dateipfad ist erforderlich' });
      }

      console.log('Original filePath:', filePath);
      
      // Pfad normalisieren und validieren
      const normalizedPath = path.resolve(filePath);
      console.log('Normalized path:', normalizedPath);
      
      // Sicherheitscheck: Pfad muss existieren und eine Datei sein
      if (!fs.existsSync(normalizedPath)) {
        console.log('Error: Path does not exist:', normalizedPath);
        return res.status(404).json({ error: 'Datei existiert nicht' });
      }

      const stats = fs.statSync(normalizedPath);
      console.log('File stats:', stats);
      
      if (!stats.isFile()) {
        console.log('Error: Path is not a file');
        return res.status(400).json({ error: 'Pfad ist keine Datei' });
      }

      // Dateiendung prüfen
      const fileExtension = path.extname(normalizedPath).toLowerCase();
      console.log('File extension:', fileExtension);
      
      if (fileExtension !== '.html' && fileExtension !== '.htm') {
        console.log('Error: File is not HTML');
        return res.status(400).json({ error: 'Nur HTML-Dateien sind erlaubt' });
      }

      console.log('Reading HTML file...');
      // HTML-Datei lesen
      const htmlContent = fs.readFileSync(normalizedPath, 'utf-8');
      console.log('HTML content length:', htmlContent.length);
      
      // Content-Type setzen und HTML-Inhalt zurückgeben
      res.setHeader('Content-Type', 'text/html');
      res.send(htmlContent);
      console.log('HTML file sent successfully');
      
    } catch (error) {
      console.error('Fehler beim Lesen der HTML-Datei:', error);
      res.status(500).json({ error: 'Fehler beim Lesen der HTML-Datei' });
    }
  }

  // Excel-Datei lesen
  static async readExcelFile(req: Request, res: Response) {
    try {
      const { filePath, preview } = req.query;
      
      console.log('=== EXCEL FILE READ REQUEST ===');
      console.log('Query params:', req.query);
      console.log('File path from query:', filePath);
      
      if (!filePath || typeof filePath !== 'string') {
        console.log('Missing or invalid filePath parameter');
        return res.status(400).json({ error: 'Dateipfad ist erforderlich' });
      }

      // Pfad normalisieren
      const normalizedPath = path.resolve(filePath);
      console.log('Normalized path:', normalizedPath);
      
      // Sicherheitsprüfung: Pfad muss existieren und lesbar sein
      if (!fs.existsSync(normalizedPath)) {
        console.log('File does not exist:', normalizedPath);
        return res.status(404).json({ error: 'Datei nicht gefunden' });
      }

      const stats = fs.statSync(normalizedPath);
      if (!stats.isFile()) {
        console.log('Path is not a file:', normalizedPath);
        return res.status(400).json({ error: 'Pfad ist keine Datei' });
      }

      // Datei-Informationen abrufen
      const fileName = path.basename(normalizedPath);
      const fileSize = stats.size;
      const fileExtension = path.extname(fileName).toLowerCase();
      
      console.log('File info:', { fileName, fileSize, path: normalizedPath, extension: fileExtension });
      
      if (!['.xlsx', '.xls'].includes(fileExtension)) {
        console.log('File is not an Excel file:', fileExtension);
        return res.status(400).json({ error: 'Datei ist keine Excel-Datei' });
      }
      
      if (preview === 'true') {
        // Für Vorschau: Excel-Inhalt mit XLSX-Bibliothek lesen
        try {
          const fileBuffer = fs.readFileSync(normalizedPath);
          const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
          
          let htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #1976d2; margin-bottom: 20px;">Excel-Vorschau: ${fileName}</h2>
          `;
          
          // Alle Arbeitsblätter durchgehen
          workbook.SheetNames.forEach((sheetName, index) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length > 0) {
              htmlContent += `
                <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #4caf50; margin-bottom: 20px;">
                  <h3 style="margin: 0 0 15px 0; color: #2e7d32;">📊 Arbeitsblatt: ${sheetName}</h3>
                  <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #c8e6c9; max-height: 300px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              `;
              
              // Tabelle erstellen (maximal 20 Zeilen für Vorschau)
              const maxRows = Math.min(jsonData.length, 20);
              for (let i = 0; i < maxRows; i++) {
                const row = jsonData[i];
                htmlContent += '<tr>';
                if (Array.isArray(row)) {
                  row.forEach((cell, cellIndex) => {
                    const cellValue = cell !== undefined && cell !== null ? String(cell) : '';
                    htmlContent += `<td style="border: 1px solid #ddd; padding: 6px; text-align: left;">${cellValue}</td>`;
                  });
                }
                htmlContent += '</tr>';
              }
              
              htmlContent += `
                    </table>
                    ${jsonData.length > 20 ? `<p style="margin-top: 10px; color: #666; font-style: italic;">Zeige ${maxRows} von ${jsonData.length} Zeilen</p>` : ''}
                  </div>
                </div>
              `;
            }
          });
          
          htmlContent += '</div>';
          
          console.log('Excel HTML preview with content sent successfully');
          res.send(htmlContent);
        } catch (excelError) {
          console.error('Error parsing Excel file:', excelError);
          res.send(`
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #1976d2;">Excel-Vorschau: ${fileName}</h2>
              <p>Excel-Inhalt konnte nicht gelesen werden.</p>
            </div>
          `);
        }
      } else {
        // Für Download: Datei als Blob senden
        const fileBuffer = fs.readFileSync(normalizedPath);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.send(fileBuffer);
      }
      
    } catch (error) {
      console.error('Error in readExcelFile:', error);
      res.status(500).json({ error: 'Fehler beim Lesen der Excel-Datei' });
    }
  }

  // PowerPoint-Datei lesen
  static async readPowerPointFile(req: Request, res: Response) {
    try {
      const { filePath, preview } = req.query;
      
      console.log('=== POWERPOINT FILE READ REQUEST ===');
      console.log('Query params:', req.query);
      console.log('File path from query:', filePath);
      
      if (!filePath || typeof filePath !== 'string') {
        console.log('Missing or invalid filePath parameter');
        return res.status(400).json({ error: 'Dateipfad ist erforderlich' });
      }

      // Pfad normalisieren
      const normalizedPath = path.resolve(filePath);
      console.log('Normalized path:', normalizedPath);
      
      // Sicherheitsprüfung: Pfad muss existieren und lesbar sein
      if (!fs.existsSync(normalizedPath)) {
        console.log('File does not exist:', normalizedPath);
        return res.status(404).json({ error: 'Datei nicht gefunden' });
      }

      const stats = fs.statSync(normalizedPath);
      if (!stats.isFile()) {
        console.log('Path is not a file:', normalizedPath);
        return res.status(400).json({ error: 'Pfad ist keine Datei' });
      }

      // Datei-Informationen abrufen
      const fileName = path.basename(normalizedPath);
      const fileSize = stats.size;
      const fileExtension = path.extname(fileName).toLowerCase();
      
      console.log('File info:', { fileName, fileSize, path: normalizedPath, extension: fileExtension });
      
      if (!['.pptx', '.ppt'].includes(fileExtension)) {
        console.log('File is not a PowerPoint file:', fileExtension);
        return res.status(400).json({ error: 'Datei ist keine PowerPoint-Datei' });
      }
      
      if (preview === 'true') {
        // Für Vorschau: PowerPoint-Inhalt direkt anzeigen
        try {
          const fileBuffer = fs.readFileSync(normalizedPath);
          
          if (fileExtension === '.pptx') {
            // Für .pptx-Dateien: Nur Header anzeigen (wie im Screenshot)
            try {
              const bufferString = fileBuffer.toString('utf8', 0, Math.min(fileBuffer.length, 200000));
              const slideCount = bufferString.match(/<p:sld[^>]*>/g)?.length || 0;
              
              // Nur der Header wird angezeigt - wie im Screenshot
              const htmlContent = `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                  <h2 style="color: #1976d2; margin-bottom: 20px;">PowerPoint-Vorschau: ${fileName}</h2>
                  <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="color: #495057; margin: 0 0 10px 0;">📊 Präsentation: ${slideCount} Folien</h3>
                  </div>
                </div>
              `;
              
              res.send(htmlContent);
              
            } catch (extractError) {
              console.error('Error extracting PPTX content:', extractError);
              res.send(`
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                  <h2 style="color: #1976d2;">PowerPoint-Vorschau: ${fileName}</h2>
                  <p>PowerPoint-Inhalt konnte nicht extrahiert werden.</p>
                </div>
              `);
            }
          } else {
            // Für .ppt-Dateien: Nur Header anzeigen (wie im Screenshot)
            try {
              // Nur der Header wird angezeigt - wie im Screenshot
              const htmlContent = `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                  <h2 style="color: #1976d2; margin-bottom: 20px;">PowerPoint-Vorschau: ${fileName}</h2>
                  <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="color: #495057; margin: 0 0 10px 0;">📊 Präsentation: Folien-Info nicht verfügbar</h3>
                  </div>
                </div>
              `;
              
              res.send(htmlContent);
              
            } catch (pptError) {
              console.error('Error reading PPT file:', pptError);
              res.send(`
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                  <h2 style="color: #1976d2;">PowerPoint-Vorschau: ${fileName}</h2>
                  <p>PowerPoint-Inhalt konnte nicht gelesen werden.</p>
                </div>
              `);
            }
          }
        } catch (error) {
          console.error('Error in PowerPoint preview:', error);
          res.send(`
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #1976d2;">PowerPoint-Vorschau: ${fileName}</h2>
              <p>PowerPoint-Vorschau konnte nicht geladen werden.</p>
            </div>
          `);
        }
      } else {
        // Für Download: Datei als Blob senden
        const fileBuffer = fs.readFileSync(normalizedPath);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.send(fileBuffer);
      }
      
    } catch (error) {
      console.error('Error in readPowerPointFile:', error);
      res.status(500).json({ error: 'Fehler beim Lesen der PowerPoint-Datei' });
    }
  }

  // Bild-Datei lesen
  static async readImageFile(req: Request, res: Response) {
    try {
      const { filePath, preview } = req.query;
      
      console.log('=== IMAGE FILE READ REQUEST ===');
      console.log('Query params:', req.query);
      console.log('File path from query:', filePath);
      
      if (!filePath || typeof filePath !== 'string') {
        console.log('Missing or invalid filePath parameter');
        return res.status(400).json({ error: 'Dateipfad ist erforderlich' });
      }
      
      // Pfad normalisieren
      const normalizedPath = path.resolve(filePath);
      console.log('Normalized path:', normalizedPath);
      
      // Sicherheitsprüfung: Pfad muss existieren und lesbar sein
      if (!fs.existsSync(normalizedPath)) {
        console.log('File does not exist:', normalizedPath);
        return res.status(404).json({ error: 'Datei nicht gefunden' });
      }
      
      const stats = fs.statSync(normalizedPath);
      if (!stats.isFile()) {
        console.log('Path is not a file:', normalizedPath);
        return res.status(400).json({ error: 'Pfad ist keine Datei' });
      }
      
      // Datei-Informationen abrufen
      const fileName = path.basename(normalizedPath);
      const fileSize = stats.size;
      const fileExtension = path.extname(fileName).toLowerCase();
      
      console.log('File info:', { fileName, fileSize, path: normalizedPath, extension: fileExtension });
      
      if (!['.jpg', '.jpeg', '.png', '.gif', '.svg', '.bmp', '.webp'].includes(fileExtension)) {
        console.log('File is not an image file:', fileExtension);
        return res.status(400).json({ error: 'Datei ist keine Bilddatei' });
      }
      
      if (preview === 'true') {
        // Für Vorschau: Bild als Base64 konvertieren
        const fileBuffer = fs.readFileSync(normalizedPath);
        const base64Data = fileBuffer.toString('base64');
        const mimeType = FileSystemPathController.getMimeType(fileExtension);
        const dataUrl = `data:${mimeType};base64,${base64Data}`;
        
        const imageData = {
          fileName,
          fileSize,
          filePath: normalizedPath,
          mimeType,
          dataUrl,
          dimensions: 'Vorschau verfügbar'
        };
        
        console.log('Image preview data sent successfully');
        res.json(imageData);
      } else {
        // Für Download: Datei als Blob senden
        const fileBuffer = fs.readFileSync(normalizedPath);
        const mimeType = FileSystemPathController.getMimeType(fileExtension);
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.send(fileBuffer);
      }
      
    } catch (error) {
      console.error('Error in readImageFile:', error);
      res.status(500).json({ error: 'Fehler beim Lesen der Bilddatei' });
    }
  }

  // GoodNotes-Datei lesen
  static async readGoodNotesFile(req: Request, res: Response) {
    try {
      const { filePath, preview } = req.query;
      
      console.log('=== GOODNOTES FILE READ REQUEST ===');
      console.log('Query params:', req.query);
      console.log('File path from query:', filePath);
      
      if (!filePath || typeof filePath !== 'string') {
        console.log('Missing or invalid filePath parameter');
        return res.status(400).json({ error: 'Dateipfad ist erforderlich' });
      }
      
      // Pfad normalisieren
      const normalizedPath = path.resolve(filePath);
      console.log('Normalized path:', normalizedPath);
      
      // Sicherheitsprüfung: Pfad muss existieren und lesbar sein
      if (!fs.existsSync(normalizedPath)) {
        console.log('File does not exist:', normalizedPath);
        return res.status(404).json({ error: 'Datei nicht gefunden' });
      }
      
      const stats = fs.statSync(normalizedPath);
      if (!stats.isFile()) {
        console.log('Path is not a file:', normalizedPath);
        return res.status(400).json({ error: 'Pfad ist keine Datei' });
      }
      
      // Datei-Informationen abrufen
      const fileName = path.basename(normalizedPath);
      const fileSize = stats.size;
      const fileExtension = path.extname(fileName).toLowerCase();
      
      console.log('File info:', { fileName, fileSize, path: normalizedPath, extension: fileExtension });
      
      if (!['.goodnotes', '.gn'].includes(fileExtension)) {
        console.log('File is not a GoodNotes file:', fileExtension);
        return res.status(400).json({ error: 'Datei ist keine GoodNotes-Datei' });
      }
      
      if (preview === 'true') {
        // Für Vorschau: Einfache HTML-Info erstellen
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #1976d2; border-bottom: 2px solid #e3f2fd; padding-bottom: 10px;">
              GoodNotes-Vorschau: ${fileName}
            </h2>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Dateiname:</strong> ${fileName}</p>
              <p><strong>Größe:</strong> ${(fileSize / 1024).toFixed(2)} KB</p>
              <p><strong>Typ:</strong> GoodNotes-Datei (${fileExtension.toUpperCase()})</p>
              <p><strong>Pfad:</strong> ${normalizedPath}</p>
            </div>
            <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #4caf50;">
              <p><strong>Hinweis:</strong> GoodNotes-Dateien können nur in der GoodNotes-App geöffnet werden.</p>
              <p>Sie können die Datei über den Download-Button herunterladen und in GoodNotes öffnen.</p>
            </div>
          </div>
        `;
        
        console.log('GoodNotes HTML preview sent successfully');
        res.send(htmlContent);
      } else {
        // Für Download: Datei als Blob senden
        const fileBuffer = fs.readFileSync(normalizedPath);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.send(fileBuffer);
      }
      
    } catch (error) {
      console.error('Error in readGoodNotesFile:', error);
      res.status(500).json({ error: 'Fehler beim Lesen der GoodNotes-Datei' });
    }
  }

  // Text-Datei lesen
  static async readTextFile(req: Request, res: Response) {
    try {
      const { filePath, preview } = req.query;
      
      console.log('=== TEXT FILE READ REQUEST ===');
      console.log('Query params:', req.query);
      console.log('File path from query:', filePath);
      
      if (!filePath || typeof filePath !== 'string') {
        console.log('Missing or invalid filePath parameter');
        return res.status(400).json({ error: 'Dateipfad ist erforderlich' });
      }
      
      // Pfad normalisieren
      const normalizedPath = path.resolve(filePath);
      console.log('Normalized path:', normalizedPath);
      
      // Sicherheitsprüfung: Pfad muss existieren und lesbar sein
      if (!fs.existsSync(normalizedPath)) {
        console.log('File does not exist:', normalizedPath);
        return res.status(404).json({ error: 'Datei nicht gefunden' });
      }
      
      const stats = fs.statSync(normalizedPath);
      if (!stats.isFile()) {
        console.log('Path is not a file:', normalizedPath);
        return res.status(400).json({ error: 'Pfad ist keine Datei' });
      }
      
      // Datei-Informationen abrufen
      const fileName = path.basename(normalizedPath);
      const fileSize = stats.size;
      const fileExtension = path.extname(fileName).toLowerCase();
      
      console.log('File info:', { fileName, fileSize, path: normalizedPath, extension: fileExtension });
      
      if (!['.txt', '.md', '.rtf'].includes(fileExtension)) {
        console.log('File is not a text file:', fileExtension);
        return res.status(400).json({ error: 'Datei ist keine Textdatei' });
      }
      
      if (preview === 'true') {
        // Für Vorschau: Textinhalt lesen und senden
        const textContent = fs.readFileSync(normalizedPath, 'utf8');
        console.log('Text file content read successfully, length:', textContent.length);
        res.send(textContent);
      } else {
        // Für Download: Datei als Blob senden
        const fileBuffer = fs.readFileSync(normalizedPath);
        const mimeType = FileSystemPathController.getMimeType(fileExtension);
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.send(fileBuffer);
      }
                        
                      } catch (error) {
      console.error('Error in readTextFile:', error);
      res.status(500).json({ error: 'Fehler beim Lesen der Textdatei' });
    }
  }

  // PDF-Datei lesen
  static async readPdfFile(req: Request, res: Response) {
    try {
      const { filePath, preview } = req.query;
      
      console.log('=== PDF FILE READ REQUEST ===');
      console.log('Query params:', req.query);
      console.log('File path from query:', filePath);
      
      if (!filePath || typeof filePath !== 'string') {
        console.log('Missing or invalid filePath parameter');
        return res.status(400).json({ error: 'Dateipfad ist erforderlich' });
      }
      
      // Pfad normalisieren
      const normalizedPath = path.resolve(filePath);
      console.log('Normalized path:', normalizedPath);
      
      // Sicherheitsprüfung: Pfad muss existieren und lesbar sein
      if (!fs.existsSync(normalizedPath)) {
        console.log('File does not exist:', normalizedPath);
        return res.status(404).json({ error: 'Datei nicht gefunden' });
      }
      
      const stats = fs.statSync(normalizedPath);
      if (!stats.isFile()) {
        console.log('Path is not a file:', normalizedPath);
        return res.status(400).json({ error: 'Pfad ist keine Datei' });
      }
      
      // Datei-Informationen abrufen
      const fileName = path.basename(normalizedPath);
      const fileSize = stats.size;
      const fileExtension = path.extname(fileName).toLowerCase();
      
      console.log('File info:', { fileName, fileSize, path: normalizedPath, extension: fileExtension });
      
      if (fileExtension !== '.pdf') {
        console.log('File is not a PDF file:', fileExtension);
        return res.status(400).json({ error: 'Datei ist keine PDF-Datei' });
      }
      
      if (preview === 'true') {
        // Für Vorschau: PDF-Inhalt mit pdf-parse lesen
        try {
          const fileBuffer = fs.readFileSync(normalizedPath);
          const pdfData = await pdf(fileBuffer);
          
          const htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #1976d2; margin-bottom: 20px;">PDF-Vorschau: ${fileName}</h2>
              <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #4caf50; margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #2e7d32;">📄 PDF-Inhalt:</h3>
                <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #c8e6c9; max-height: 400px; overflow-y: auto;">
                  <pre style="margin: 0; white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4;">${pdfData.text}</pre>
                </div>
              </div>
            </div>
          `;
          
          console.log('PDF HTML preview with content sent successfully');
          res.send(htmlContent);
        } catch (pdfError) {
          console.error('Error parsing PDF:', pdfError);
          res.send(`
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #1976d2;">PDF-Vorschau: ${fileName}</h2>
              <p>PDF-Inhalt konnte nicht gelesen werden.</p>
            </div>
          `);
        }
                          } else {
        // Für Download: Datei als Blob senden
        const fileBuffer = fs.readFileSync(normalizedPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.send(fileBuffer);
                    }
      
    } catch (error) {
      console.error('Error in readPdfFile:', error);
      res.status(500).json({ error: 'Fehler beim Lesen der PDF-Datei' });
    }
  }

  // Hilfsfunktion zum Zählen der Gesamtanzahl von Elementen
  private static countTotalItems(item: DirectoryItem): number {
    let count = 1; // Das aktuelle Element
    if (item.children) {
      for (const child of item.children) {
        count += this.countTotalItems(child);
      }
    }
    return count;
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
      res.json({ message: 'Pfad erfolgreich gelöscht', deletedPath });
    } catch (error) {
      console.error('Fehler beim Löschen des Pfades:', error);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }

  // Hilfsfunktion: MIME-Type basierend auf Dateiendung
  static getMimeType(fileExtension: string): string {
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.rtf': 'application/rtf',
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.ppt': 'application/vnd.ms-powerpoint'
    };
    
    return mimeTypes[fileExtension.toLowerCase()] || 'application/octet-stream';
  }

  // DOCX-Datei lesen
  static async readDocxFile(req: Request, res: Response) {
    try {
      const { filePath, preview } = req.query;
      
      console.log('=== DOCX FILE READ REQUEST ===');
      console.log('Query params:', req.query);
      console.log('File path from query:', filePath);
      
      if (!filePath || typeof filePath !== 'string') {
        console.log('Missing or invalid filePath parameter');
        return res.status(400).json({ error: 'Dateipfad ist erforderlich' });
      }
      
      // Pfad normalisieren
      const normalizedPath = path.resolve(filePath);
      console.log('Normalized path:', normalizedPath);
      
      // Sicherheitsprüfung: Pfad muss existieren und lesbar sein
      if (!fs.existsSync(normalizedPath)) {
        console.log('File does not exist:', normalizedPath);
        return res.status(404).json({ error: 'Datei nicht gefunden' });
      }
      
      const stats = fs.statSync(normalizedPath);
      if (!stats.isFile()) {
        console.log('Path is not a file:', normalizedPath);
        return res.status(400).json({ error: 'Pfad ist keine Datei' });
      }
      
      // Datei-Informationen abrufen
      const fileName = path.basename(normalizedPath);
      const fileSize = stats.size;
      const fileExtension = path.extname(fileName).toLowerCase();
      
      console.log('File info:', { fileName, fileSize, path: normalizedPath, extension: fileExtension });
      
      if (fileExtension !== '.docx') {
        console.log('File is not a DOCX file:', fileExtension);
        return res.status(400).json({ error: 'Datei ist keine DOCX-Datei' });
      }
      
      if (preview === 'true') {
        // Für Vorschau: DOCX zu HTML konvertieren
        console.log('Reading DOCX file...');
        const docxBuffer = fs.readFileSync(normalizedPath);
        console.log('DOCX buffer length:', docxBuffer.length);
        
        console.log('Converting DOCX to HTML for preview...');
        try {
          const result = await mammoth.convertToHtml({ buffer: docxBuffer });
          const htmlContent = result.value;
          const messages = result.messages;
          
          console.log('HTML conversion successful, length:', htmlContent.length);
          if (messages.length > 0) {
            console.log('Conversion messages:', messages);
          }
          
          console.log('DOCX HTML preview sent successfully');
          res.send(htmlContent);
          
        } catch (conversionError) {
          console.error('Error converting DOCX to HTML:', conversionError);
          res.status(500).json({ error: 'Fehler bei der DOCX-zu-HTML-Konvertierung' });
        }
      } else {
        // Für Download: Datei als Blob senden
        const fileBuffer = fs.readFileSync(normalizedPath);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.send(fileBuffer);
      }
      
    } catch (error) {
      console.error('Error in readDocxFile:', error);
      res.status(500).json({ error: 'Fehler beim Lesen der DOCX-Datei' });
    }
  }

  // Alle Pfade abrufen (für die Ordner-Zuordnung)
  static async getAllPaths(req: Request, res: Response) {
    try {
      console.log('=== GET ALL PATHS REQUEST ===');
      
      const paths = await prisma.fileSystemPath.findMany({
        orderBy: { createdAt: 'desc' }
      });
      
      console.log('Found paths:', paths.length);
      res.json(paths);
      
    } catch (error) {
      console.error('Error in getAllPaths:', error);
      res.status(500).json({ error: 'Fehler beim Laden der Pfade' });
    }
  }
}
