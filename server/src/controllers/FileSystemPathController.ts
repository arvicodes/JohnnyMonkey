import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';

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
      let result: RecursiveDirectoryContent | DirectoryContent;
      if (recursive === 'true') {
        console.log('Reading directory recursively...');
        const rootItem = readDirectoryRecursive(normalizedPath, 10, 0);
        result = {
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

        result = {
          path: normalizedPath,
          items: directoryItems,
          totalItems: directoryItems.length
        };
      }

      console.log('Directory read successfully');
      res.json(result);
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

  // Neue Methode zum Lesen von PDF-Dateien
  static async readPdfFile(req: Request, res: Response) {
    try {
      console.log('=== PDF FILE READ REQUEST ===');
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
      
      if (fileExtension !== '.pdf') {
        console.log('Error: File is not PDF');
        return res.status(400).json({ error: 'Nur PDF-Dateien sind erlaubt' });
      }

      console.log('Reading PDF file...');
      // PDF-Datei als Buffer lesen
      const pdfBuffer = fs.readFileSync(normalizedPath);
      console.log('PDF buffer length:', pdfBuffer.length);
      
      // Content-Type setzen und PDF-Inhalt zurückgeben
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      res.send(pdfBuffer);
      console.log('PDF file sent successfully');
      
    } catch (error) {
      console.error('Fehler beim Lesen der PDF-Datei:', error);
      res.status(500).json({ error: 'Fehler beim Lesen der PDF-Datei' });
    }
  }

  // Neue Methode zum Lesen von DOCX-Dateien
  static async readDocxFile(req: Request, res: Response) {
    try {
      console.log('=== DOCX FILE READ REQUEST ===');
      console.log('Query params:', req.query);
      console.log('filePath from query:', req.query.filePath);
      
      const { filePath, preview } = req.query;
      
      if (!filePath || typeof filePath !== 'string') {
        console.log('Error: filePath is missing or not a string');
        return res.status(400).json({ error: 'Dateipfad ist erforderlich' });
      }

      console.log('Original filePath:', filePath);
      console.log('Preview mode:', preview);
      
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
      
      if (fileExtension !== '.docx') {
        console.log('Error: File is not DOCX');
        return res.status(400).json({ error: 'Nur DOCX-Dateien sind erlaubt' });
      }

      console.log('Reading DOCX file...');
      // DOCX-Datei als Buffer lesen
      const docxBuffer = fs.readFileSync(normalizedPath);
      console.log('DOCX buffer length:', docxBuffer.length);
      
      // Wenn Vorschau gewünscht ist, konvertiere zu HTML
      if (preview === 'true') {
        console.log('Converting DOCX to HTML for preview...');
        try {
          const result = await mammoth.convertToHtml({ buffer: docxBuffer });
          const htmlContent = result.value;
          const messages = result.messages;
          
          console.log('HTML conversion successful, length:', htmlContent.length);
          if (messages.length > 0) {
            console.log('Conversion messages:', messages);
          }
          
          // HTML-Vorschau mit Styling zurückgeben
          const fullHtml = `
            <!DOCTYPE html>
            <html lang="de">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>DOCX Vorschau: ${path.basename(normalizedPath)}</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 800px;
                  margin: 0 auto;
                  padding: 20px;
                  background-color: #f8f9fa;
                }
                .preview-container {
                  background: white;
                  padding: 30px;
                  border-radius: 8px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .preview-header {
                  border-bottom: 2px solid #e9ecef;
                  padding-bottom: 15px;
                  margin-bottom: 25px;
                  display: flex;
                  flex-direction: column;
                  gap: 15px;
                }
                .preview-title {
                  color: #2c3e50;
                  margin: 0;
                  font-size: 1.8rem;
                }
                .preview-subtitle {
                  color: #6c757d;
                  margin: 5px 0 0 0;
                  font-size: 1rem;
                }
                .preview-content {
                  line-height: 1.8;
                }
                .preview-content h1, .preview-content h2, .preview-content h3 {
                  color: #2c3e50;
                  margin-top: 30px;
                  margin-bottom: 15px;
                }
                .preview-content p {
                  margin-bottom: 15px;
                }
                .preview-content table {
                  border-collapse: collapse;
                  width: 100%;
                  margin: 20px 0;
                }
                .preview-content table, .preview-content th, .preview-content td {
                  border: 1px solid #dee2e6;
                }
                .preview-content th, .preview-content td {
                  padding: 8px 12px;
                  text-align: left;
                }
                .preview-content th {
                  background-color: #f8f9fa;
                  font-weight: 600;
                }
                                              .download-button {
                                display: inline-block;
                                background: #28a745;
                                color: white;
                                padding: 12px 24px;
                                text-decoration: none;
                                border-radius: 6px;
                                margin-top: 15px;
                                transition: all 0.3s ease;
                                font-weight: 600;
                                text-align: center;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                border: none;
                                cursor: pointer;
                                font-size: 14px;
                                font-family: inherit;
                              }
                              .download-button:hover {
                                background: #218838;
                                transform: translateY(-1px);
                                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                              }
                .conversion-info {
                  background: #e7f3ff;
                  border: 1px solid #b3d9ff;
                  border-radius: 5px;
                  padding: 15px;
                  margin: 20px 0;
                  color: #004085;
                }
              </style>
            </head>
            <body>
              <div class="preview-container">
                <div class="preview-header">
                  <h1 class="preview-title">📄 ${path.basename(normalizedPath)}</h1>
                  <p class="preview-subtitle">DOCX Vorschau - Generiert am ${new Date().toLocaleString('de-DE')}</p>
                  
                  <button onclick="downloadDocx('${filePath.replace(/'/g, "\\'").replace(/"/g, '\\"')}', '${path.basename(normalizedPath).replace(/'/g, "\\'").replace(/"/g, '\\"')}')" 
                          class="download-button">
                     📥 Original DOCX herunterladen
                  </button>
                  
                  <script>
                    function downloadDocx(filePath, fileName) {
                      try {
                        console.log('Starting download for:', fileName);
                        console.log('File path:', filePath);
                        
                        // Verwende window.open() um den Download zu starten
                        const url = '/api/file-system-paths/read-docx?filePath=' + encodeURIComponent(filePath);
                        console.log('Opening URL:', url);
                        
                        // Öffne die URL in einem neuen Tab/Fenster
                        const newWindow = window.open(url, '_blank');
                        
                        if (newWindow) {
                          console.log('New window opened successfully');
                          // Schließe das Fenster nach kurzer Zeit, falls es leer ist
                          setTimeout(() => {
                            if (newWindow.location.href === 'about:blank') {
                              newWindow.close();
                              console.log('Empty window closed');
                            }
                          }, 1000);
                        } else {
                          console.log('Window blocked, trying alternative method');
                          // Fallback: Erstelle einen versteckten Link
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = fileName;
                          link.style.display = 'none';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }
                        
                        console.log('Download initiated for:', fileName);
                        
                      } catch (error) {
                        console.error('Download error:', error);
                        alert('Download fehlgeschlagen: ' + error.message);
                      }
                    }
                  </script>
                </div>
                
                <div class="preview-content">
                  ${htmlContent}
                </div>
                
                ${messages.length > 0 ? `
                  <div class="conversion-info">
                    <strong>Konvertierungshinweise:</strong>
                    <ul>
                      ${messages.map(msg => `<li>${msg.message}</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}
              </div>
            </body>
            </html>
          `;
          
          res.setHeader('Content-Type', 'text/html');
          res.send(fullHtml);
          console.log('DOCX HTML preview sent successfully');
          
        } catch (conversionError) {
          console.error('Error converting DOCX to HTML:', conversionError);
          // Fallback: Original DOCX senden
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          res.setHeader('Content-Disposition', 'attachment; filename="' + path.basename(normalizedPath) + '"');
          res.send(docxBuffer);
          console.log('DOCX file sent as fallback');
        }
                          } else {
                      // Original DOCX-Datei als Download senden
                      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                      res.setHeader('Content-Disposition', 'attachment; filename="' + path.basename(normalizedPath) + '"');
                      res.setHeader('Content-Length', docxBuffer.length.toString());
                      res.send(docxBuffer);
                      console.log('DOCX file sent as download successfully');
                    }
      
    } catch (error) {
      console.error('Fehler beim Lesen der DOCX-Datei:', error);
      res.status(500).json({ error: 'Fehler beim Lesen der DOCX-Datei' });
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
}
