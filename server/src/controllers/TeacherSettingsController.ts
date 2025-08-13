import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import { MaterialDiscoveryService } from '../services/MaterialDiscoveryService';
import * as path from 'path';

const prisma = new PrismaClient();

export class TeacherSettingsController {
  // Materialpfad für einen Lehrer abrufen
  static async getMaterialPath(req: Request, res: Response) {
    try {
      const { teacherId } = req.params;
      
      const user = await prisma.user.findUnique({
        where: { id: teacherId },
        select: { materialPath: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'Lehrer nicht gefunden' });
      }

      res.json({ materialPath: user.materialPath });
    } catch (error) {
      console.error('Fehler beim Abrufen des Materialpfads:', error);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }

  // Materialpfad für einen Lehrer aktualisieren
  static async updateMaterialPath(req: Request, res: Response) {
    try {
      const { teacherId } = req.params;
      const { materialPath } = req.body;

      if (!materialPath) {
        return res.status(400).json({ error: 'Materialpfad ist erforderlich' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: teacherId },
        data: { materialPath },
        select: { id: true, materialPath: true }
      });

      res.json(updatedUser);
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Materialpfads:', error);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }

  // Alle Lehrer-Einstellungen für einen Lehrer abrufen
  static async getTeacherSettings(req: Request, res: Response) {
    try {
      const { teacherId } = req.params;
      
      const user = await prisma.user.findUnique({
        where: { id: teacherId },
        select: { 
          id: true, 
          name: true, 
          materialPath: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'Lehrer nicht gefunden' });
      }

      res.json(user);
    } catch (error) {
      console.error('Fehler beim Abrufen der Lehrer-Einstellungen:', error);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }

  // Materialien in einem Verzeichnis automatisch erkennen
  static async discoverMaterials(req: Request, res: Response) {
    try {
      const { teacherId } = req.params;
      const { recursive = false, maxDepth = 3, path: customPath } = req.query;
      
      // Entweder den konfigurierten Materialpfad oder einen benutzerdefinierten Pfad verwenden
      let targetPath: string;
      
      if (customPath) {
        // Benutzerdefinierten Pfad verwenden (für Verzeichnisauswahl)
        targetPath = customPath as string;
      } else {
        // Konfigurierten Materialpfad des Lehrers verwenden
        const user = await prisma.user.findUnique({
          where: { id: teacherId },
          select: { materialPath: true }
        });

        if (!user) {
          return res.status(404).json({ error: 'Lehrer nicht gefunden' });
        }

        if (!user.materialPath) {
          return res.status(400).json({ error: 'Kein Materialpfad konfiguriert' });
        }
        
        targetPath = user.materialPath;
      }

      // Sicherheitsprüfung: Verhindere Zugriff auf sensible Verzeichnisse
      const normalizedPath = path.normalize(targetPath);
      const forbiddenPaths = [
        '/etc', '/var', '/usr', '/bin', '/sbin', '/dev', '/proc', '/sys',
        'C:\\Windows', 'C:\\System32', 'C:\\Program Files', 'C:\\Program Files (x86)'
      ];
      
      for (const forbidden of forbiddenPaths) {
        if (normalizedPath.startsWith(forbidden)) {
          return res.status(403).json({ error: 'Zugriff auf dieses Verzeichnis nicht erlaubt' });
        }
      }

      let materials;
      if (recursive === 'true') {
        materials = await MaterialDiscoveryService.discoverMaterialsRecursive(
          targetPath, 
          parseInt(maxDepth as string)
        );
      } else {
        materials = await MaterialDiscoveryService.discoverMaterials(targetPath);
      }

      // Verzeichnisgröße berechnen
      const totalSize = await MaterialDiscoveryService.getDirectorySize(targetPath);

      res.json({
        materials,
        totalSize,
        path: targetPath,
        count: materials.length
      });

    } catch (error) {
      console.error('Fehler bei der Materialerkennung:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      res.status(500).json({ error: 'Fehler bei der Materialerkennung: ' + errorMessage });
    }
  }

  // Verzeichnisstruktur für einen Lehrer abrufen
  static async getDirectoryStructure(req: Request, res: Response) {
    try {
      const { teacherId } = req.params;
      
      const user = await prisma.user.findUnique({
        where: { id: teacherId },
        select: { materialPath: true }
      });

      if (!user || !user.materialPath) {
        return res.status(400).json({ error: 'Kein Materialpfad konfiguriert' });
      }

      const materials = await MaterialDiscoveryService.discoverMaterialsRecursive(user.materialPath, 5);
      const totalSize = await MaterialDiscoveryService.getDirectorySize(user.materialPath);

      res.json({
        path: user.materialPath,
        structure: materials,
        totalSize,
        count: materials.length
      });

    } catch (error) {
      console.error('Fehler beim Abrufen der Verzeichnisstruktur:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      res.status(500).json({ error: 'Fehler beim Abrufen der Verzeichnisstruktur: ' + errorMessage });
    }
  }
}
