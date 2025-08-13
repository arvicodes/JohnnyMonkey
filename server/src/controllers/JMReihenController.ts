import { PrismaClient } from '../generated/prisma';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

export class JMReihenController {
  // Ordner-Struktur für eine Lerngruppe speichern
  async saveFolderStructure(groupId: string, folderData: any) {
    try {
      // Zuerst alle bestehenden Einträge für diese Gruppe löschen
      await prisma.jMReihen.deleteMany({
        where: { groupId }
      });

      // Neue Struktur rekursiv speichern
      const savedItems = await this.saveFolderRecursive(groupId, folderData, null);
      
      return { success: true, data: savedItems };
    } catch (error) {
      console.error('Fehler beim Speichern der Ordner-Struktur:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
    }
  }

  // Rekursiv Ordner und Dateien speichern
  private async saveFolderRecursive(groupId: string, item: any, parentId: string | null) {
    const savedItem = await prisma.jMReihen.create({
      data: {
        groupId,
        path: item.path,
        name: item.name,
        type: item.type || 'folder',
        parentId,
        order: 0
      }
    });

    // Wenn es ein Ordner ist, Unterordner und Dateien speichern
    if (item.subfolders && item.subfolders.length > 0) {
      for (let i = 0; i < item.subfolders.length; i++) {
        await this.saveFolderRecursive(groupId, item.subfolders[i], savedItem.id);
      }
    }

    if (item.files && item.files.length > 0) {
      for (let i = 0; i < item.files.length; i++) {
        const file = item.files[i];
        if (!file.name.startsWith('.')) { // Versteckte Dateien überspringen
          await prisma.jMReihen.create({
            data: {
              groupId,
              path: file.path,
              name: file.name,
              type: 'file',
              parentId: savedItem.id,
              order: i
            }
          });
        }
      }
    }

    return savedItem;
  }

  // Ordner-Struktur für eine Lerngruppe laden
  async getFolderStructure(groupId: string) {
    try {
      const items = await prisma.jMReihen.findMany({
        where: { groupId },
        orderBy: [
          { parentId: 'asc' },
          { order: 'asc' }
        ]
      });

      // Hierarchische Struktur aufbauen
      const structure = this.buildHierarchy(items);
      return { success: true, data: structure };
    } catch (error) {
      console.error('Fehler beim Laden der Ordner-Struktur:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
    }
  }

  // Hierarchische Struktur aus flachen Daten aufbauen
  private buildHierarchy(items: any[]) {
    const itemMap = new Map();
    const roots: any[] = [];

    // Alle Items in Map einfügen
    items.forEach(item => {
      itemMap.set(item.id, {
        ...item,
        subfolders: [],
        files: []
      });
    });

    // Hierarchie aufbauen
    items.forEach(item => {
      if (item.parentId) {
        const parent = itemMap.get(item.parentId);
        if (parent) {
          if (item.type === 'folder') {
            parent.subfolders.push(itemMap.get(item.id));
          } else {
            parent.files.push(itemMap.get(item.id));
          }
        }
      } else {
        roots.push(itemMap.get(item.id));
      }
    });

    return roots;
  }

  // Alle Ordner-Strukturen für alle Lerngruppen laden
  async getAllFolderStructures() {
    try {
      const groups = await prisma.learningGroup.findMany({
        include: {
          jmReihen: {
            orderBy: [
              { parentId: 'asc' },
              { order: 'asc' }
            ]
          }
        }
      });

      const result: { [groupId: string]: any[] } = {};
      
      groups.forEach(group => {
        if (group.jmReihen.length > 0) {
          result[group.id] = this.buildHierarchy(group.jmReihen);
        }
      });

      return { success: true, data: result };
    } catch (error) {
      console.error('Fehler beim Laden aller Ordner-Strukturen:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
    }
  }

  // Ordner-Struktur für eine Lerngruppe löschen
  async deleteFolderStructure(groupId: string) {
    try {
      await prisma.jMReihen.deleteMany({
        where: { groupId }
      });
      
      return { success: true };
    } catch (error) {
      console.error('Fehler beim Löschen der Ordner-Struktur:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
    }
  }

  // Neue Methode: Live-Ordner-Inhalt laden
  async getLiveFolderContent(folderPath: string) {
    try {
      if (!fs.existsSync(folderPath)) {
        throw new Error(`Ordner existiert nicht: ${folderPath}`);
      }

      const items = fs.readdirSync(folderPath, { withFileTypes: true });
      const folderStructure = {
        name: path.basename(folderPath),
        path: folderPath,
        subfolders: [] as any[],
        files: [] as any[]
      };

      for (const item of items) {
        if (item.isDirectory()) {
          // Versteckte Ordner überspringen
          if (!item.name.startsWith('.')) {
            const subfolderPath = path.join(folderPath, item.name);
            const subfolder = await this.getLiveFolderContent(subfolderPath);
            folderStructure.subfolders.push(subfolder);
          }
        } else if (item.isFile()) {
          // Versteckte Dateien überspringen
          if (!item.name.startsWith('.')) {
            folderStructure.files.push({
              name: item.name,
              path: path.join(folderPath, item.name),
              type: this.getFileType(item.name)
            });
          }
        }
      }

      return folderStructure;
    } catch (error) {
      console.error('Fehler beim Laden des Live-Ordner-Inhalts:', error);
      throw error;
    }
  }

  // Hilfsmethode: Dateityp bestimmen
  private getFileType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext)) return 'image';
    if (['.pdf'].includes(ext)) return 'pdf';
    if (['.doc', '.docx'].includes(ext)) return 'document';
    if (['.xls', '.xlsx'].includes(ext)) return 'spreadsheet';
    if (['.txt', '.md'].includes(ext)) return 'text';
    if (['.mp4', '.avi', '.mov'].includes(ext)) return 'video';
    if (['.mp3', '.wav', '.flac'].includes(ext)) return 'audio';
    return 'unknown';
  }

  // Neue Methode: Live-Ordner-Inhalt für eine Lerngruppe laden
  async getLiveFolderStructureForGroup(groupId: string) {
    try {
      // Gespeicherte Ordner-Pfade für die Lerngruppe abrufen
      const savedFolders = await prisma.jMReihen.findMany({
        where: { 
          groupId,
          parentId: null // Nur Hauptordner
        },
        orderBy: { order: 'asc' }
      });

      const liveFolders = [];

      for (const savedFolder of savedFolders) {
        try {
          // Live-Inhalt des Ordners laden
          const liveContent = await this.getLiveFolderContent(savedFolder.path);
          liveFolders.push(liveContent);
        } catch (error) {
          console.error(`Fehler beim Laden des Ordners ${savedFolder.path}:`, error);
          // Fallback: Gespeicherte Struktur verwenden
          const fallbackStructure = await this.getFolderStructure(groupId);
          if (fallbackStructure) {
            liveFolders.push(fallbackStructure);
          }
        }
      }

      return liveFolders;
    } catch (error) {
      console.error('Fehler beim Laden der Live-Ordner-Struktur:', error);
      throw error;
    }
  }
}
