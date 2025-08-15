import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import * as fs from 'fs';
import * as path from 'path';

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
      const readDirectoryRecursive = (dirPath: string, maxDepth: number = 3, currentDepth: number = 0): DirectoryItem => {
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
        const rootItem = readDirectoryRecursive(normalizedPath, 5, 0);
        result = {
          path: normalizedPath,
          root: rootItem,
          totalItems: FileSystemPathController.countTotalItems(rootItem),
          maxDepth: 5
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
