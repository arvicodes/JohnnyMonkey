import fs from 'fs';
import path from 'path';

export interface DiscoveredMaterial {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  extension?: string;
  lastModified: Date;
  isQuiz?: boolean;
  isMaterial?: boolean;
}

export class MaterialDiscoveryService {
  // Materialien in einem Verzeichnis automatisch erkennen
  static async discoverMaterials(directoryPath: string): Promise<DiscoveredMaterial[]> {
    try {
      if (!fs.existsSync(directoryPath)) {
        throw new Error(`Verzeichnis existiert nicht: ${directoryPath}`);
      }

      const materials: DiscoveredMaterial[] = [];
      const items = fs.readdirSync(directoryPath);

      for (const item of items) {
        const fullPath = path.join(directoryPath, item);
        const stats = fs.statSync(fullPath);
        
        const material: DiscoveredMaterial = {
          name: item,
          path: fullPath,
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          lastModified: stats.mtime,
          extension: path.extname(item).toLowerCase(),
          isQuiz: this.isQuizFile(item),
          isMaterial: this.isMaterialFile(item)
        };

        materials.push(material);
      }

      // Sortiere nach Typ (Verzeichnisse zuerst) und dann nach Namen
      return materials.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

    } catch (error) {
      console.error('Fehler bei der Materialerkennung:', error);
      throw error;
    }
  }

  // Prüfen, ob eine Datei ein Quiz ist
  private static isQuizFile(filename: string): boolean {
    const quizExtensions = ['.docx', '.doc', '.txt', '.html'];
    const quizKeywords = ['quiz', 'test', 'aufgabe', 'frage', 'antwort'];
    
    const lowerFilename = filename.toLowerCase();
    const extension = path.extname(lowerFilename);
    
    // Prüfe Dateiendung
    if (quizExtensions.includes(extension)) {
      return true;
    }
    
    // Prüfe Schlüsselwörter im Dateinamen
    return quizKeywords.some(keyword => lowerFilename.includes(keyword));
  }

  // Prüfen, ob eine Datei Material ist
  private static isMaterialFile(filename: string): boolean {
    const materialExtensions = ['.pdf', '.docx', '.doc', '.txt', '.html', '.pptx', '.ppt', '.jpg', '.jpeg', '.png', '.gif'];
    const materialKeywords = ['material', 'inhalt', 'lektion', 'stunde', 'unterricht'];
    
    const lowerFilename = filename.toLowerCase();
    const extension = path.extname(lowerFilename);
    
    // Prüfe Dateiendung
    if (materialExtensions.includes(extension)) {
      return true;
    }
    
    // Prüfe Schlüsselwörter im Dateinamen
    return materialKeywords.some(keyword => lowerFilename.includes(keyword));
  }

  // Verzeichnisstruktur rekursiv durchsuchen
  static async discoverMaterialsRecursive(directoryPath: string, maxDepth: number = 3): Promise<DiscoveredMaterial[]> {
    const materials: DiscoveredMaterial[] = [];
    
    const scanDirectory = (currentPath: string, depth: number): void => {
      if (depth > maxDepth) return;
      
      try {
        const items = fs.readdirSync(currentPath);
        
        for (const item of items) {
          const fullPath = path.join(currentPath, item);
          const stats = fs.statSync(fullPath);
          
          if (stats.isDirectory()) {
            const material: DiscoveredMaterial = {
              name: item,
              path: fullPath,
              type: 'directory',
              size: 0,
              lastModified: stats.mtime,
              isMaterial: true
            };
            materials.push(material);
            
            // Rekursiv weiter scannen
            scanDirectory(fullPath, depth + 1);
          } else {
            const material: DiscoveredMaterial = {
              name: item,
              path: fullPath,
              type: 'file',
              size: stats.size,
              extension: path.extname(item).toLowerCase(),
              lastModified: stats.mtime,
              isQuiz: this.isQuizFile(item),
              isMaterial: this.isMaterialFile(item)
            };
            materials.push(material);
          }
        }
      } catch (error) {
        console.error(`Fehler beim Scannen von ${currentPath}:`, error);
      }
    };
    
    scanDirectory(directoryPath, 0);
    return materials;
  }

  // Verzeichnisgröße berechnen
  static async getDirectorySize(directoryPath: string): Promise<number> {
    try {
      let totalSize = 0;
      
      const scanDirectory = (currentPath: string): void => {
        const items = fs.readdirSync(currentPath);
        
        for (const item of items) {
          const fullPath = path.join(currentPath, item);
          const stats = fs.statSync(fullPath);
          
          if (stats.isDirectory()) {
            scanDirectory(fullPath);
          } else {
            totalSize += stats.size;
          }
        }
      };
      
      scanDirectory(directoryPath);
      return totalSize;
    } catch (error) {
      console.error('Fehler beim Berechnen der Verzeichnisgröße:', error);
      return 0;
    }
  }
}
