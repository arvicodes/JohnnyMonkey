import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

export class FileSystemPathController {
  // Alle Pfade eines Lehrers abrufen
  static async getPathsByTeacher(req: Request, res: Response) {
    try {
      const { teacherId } = req.params;
      
      const paths = await prisma.fileSystemPath.findMany({
        where: { teacherId },
        orderBy: { createdAt: 'desc' }
      });
      
      res.json(paths);
    } catch (error) {
      console.error('Error fetching file system paths:', error);
      res.status(500).json({ error: 'Failed to fetch file system paths' });
    }
  }

  // Neuen Pfad erstellen
  static async createPath(req: Request, res: Response) {
    try {
      const { name, path: filePath, description, teacherId } = req.body;
      
      // Prüfen ob der Pfad existiert und lesbar ist
      if (!fs.existsSync(filePath)) {
        return res.status(400).json({ error: 'Path does not exist' });
      }
      
      const stats = fs.statSync(filePath);
      if (!stats.isDirectory()) {
        return res.status(400).json({ error: 'Path must be a directory' });
      }
      
      const newPath = await prisma.fileSystemPath.create({
        data: {
          name,
          path: filePath,
          description,
          teacherId
        }
      });
      
      res.status(201).json(newPath);
    } catch (error) {
      console.error('Error creating file system path:', error);
      res.status(500).json({ error: 'Failed to create file system path' });
    }
  }

  // Pfad aktualisieren
  static async updatePath(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, path: filePath, description } = req.body;
      
      // Prüfen ob der neue Pfad existiert und lesbar ist
      if (filePath && !fs.existsSync(filePath)) {
        return res.status(400).json({ error: 'Path does not exist' });
      }
      
      if (filePath) {
        const stats = fs.statSync(filePath);
        if (!stats.isDirectory()) {
          return res.status(400).json({ error: 'Path must be a directory' });
        }
      }
      
      const updatedPath = await prisma.fileSystemPath.update({
        where: { id },
        data: {
          name,
          path: filePath,
          description
        }
      });
      
      res.json(updatedPath);
    } catch (error) {
      console.error('Error updating file system path:', error);
      res.status(500).json({ error: 'Failed to update file system path' });
    }
  }

  // Pfad löschen
  static async deletePath(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await prisma.fileSystemPath.delete({
        where: { id }
      });
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting file system path:', error);
      res.status(500).json({ error: 'Failed to delete file system path' });
    }
  }

  // Ordnerstruktur eines Pfads lesen
  static async getFolderStructure(req: Request, res: Response) {
    try {
      const { path: filePath } = req.params;
      
      if (!fs.existsSync(filePath)) {
        return res.status(400).json({ error: 'Path does not exist' });
      }
      
      const stats = fs.statSync(filePath);
      if (!stats.isDirectory()) {
        return res.status(400).json({ error: 'Path must be a directory' });
      }
      
      const structure = this.readDirectoryRecursively(filePath);
      res.json(structure);
    } catch (error) {
      console.error('Error reading folder structure:', error);
      res.status(500).json({ error: 'Failed to read folder structure' });
    }
  }

  // Rekursiv Verzeichnisstruktur lesen (ohne versteckte Dateien)
  private static readDirectoryRecursively(dirPath: string, maxDepth: number = 3, currentDepth: number = 0): any {
    if (currentDepth >= maxDepth) {
      return null;
    }

    try {
      const items = fs.readdirSync(dirPath);
      const structure: any = {
        name: path.basename(dirPath),
        path: dirPath,
        type: 'directory',
        children: []
      };

      for (const item of items) {
        // Versteckte Dateien/Ordner überspringen
        if (item.startsWith('.')) {
          continue;
        }

        const itemPath = path.join(dirPath, item);
        const itemStats = fs.statSync(itemPath);

        if (itemStats.isDirectory()) {
          const childStructure = this.readDirectoryRecursively(itemPath, maxDepth, currentDepth + 1);
          if (childStructure) {
            structure.children.push(childStructure);
          }
        } else {
          // Nur bestimmte Dateitypen anzeigen
          const ext = path.extname(item).toLowerCase();
          const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.html', '.htm', '.jpg', '.jpeg', '.png', '.gif', '.mp4', '.avi', '.mov'];
          
          if (allowedExtensions.includes(ext)) {
            structure.children.push({
              name: item,
              path: itemPath,
              type: 'file',
              extension: ext,
              size: itemStats.size
            });
          }
        }
      }

      return structure;
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
      return null;
    }
  }
}
