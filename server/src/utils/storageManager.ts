import fs from 'fs';
import path from 'path';

export interface StorageConfig {
  type: 'local' | 'onedrive';
  basePath?: string;
  onedriveUrl?: string;
}

export class StorageManager {
  private static config: StorageConfig = {
    type: process.env.NODE_ENV === 'production' ? 'onedrive' : 'local',
    basePath: process.env.LOCAL_MATERIALS_PATH || '/Users/verachrist/Documents/Z. UNTERRICHT',
    onedriveUrl: process.env.ONEDRIVE_URL
  };

  /**
   * Get the appropriate path based on environment
   */
  static getPath(relativePath: string): string {
    if (this.config.type === 'onedrive' && this.config.onedriveUrl) {
      // For OneDrive, we'll use the URL directly
      return this.config.onedriveUrl;
    }
    
    // For local development, use the local path
    return path.join(this.config.basePath || '', relativePath);
  }

  /**
   * Check if a path exists (only works for local paths)
   */
  static pathExists(filePath: string): boolean {
    if (this.config.type === 'onedrive') {
      // For OneDrive, we assume the path exists
      // In a real implementation, you'd check via OneDrive API
      return true;
    }
    
    return fs.existsSync(filePath);
  }

  /**
   * Read directory contents
   */
  static async readDirectory(dirPath: string, recursive: boolean = false): Promise<any> {
    // Check if this is a OneDrive URL or if we're in production mode
    if (this.config.type === 'onedrive' || dirPath.includes('sharepoint.com')) {
      // For OneDrive, return a mock structure or call OneDrive API
      return this.getOneDriveMockStructure();
    }
    
    return this.readLocalDirectory(dirPath, recursive);
  }

  /**
   * Read local directory
   */
  private static readLocalDirectory(dirPath: string, recursive: boolean): any {
    if (!fs.existsSync(dirPath)) {
      return { error: 'Path does not exist' };
    }

    const stats = fs.statSync(dirPath);
    if (!stats.isDirectory()) {
      return { error: 'Path is not a directory' };
    }

    const items = fs.readdirSync(dirPath);
    const result = {
      name: path.basename(dirPath),
      path: dirPath,
      type: 'directory',
      children: [] as any[],
      totalItems: 0
    };

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const itemStats = fs.statSync(itemPath);
      
      if (itemStats.isDirectory()) {
        if (recursive) {
          const subDir = this.readLocalDirectory(itemPath, recursive);
          result.children.push(subDir);
        } else {
          result.children.push({
            name: item,
            path: itemPath,
            type: 'directory',
            children: [],
            totalItems: 0
          });
        }
      } else {
        result.children.push({
          name: item,
          path: itemPath,
          type: 'file',
          size: itemStats.size,
          extension: path.extname(item).toLowerCase()
        });
      }
    }

    result.totalItems = this.countTotalItems(result);
    return result;
  }

  /**
   * Get OneDrive mock structure (placeholder for real OneDrive API)
   */
  private static getOneDriveMockStructure(): any {
    const baseUrl = this.config.onedriveUrl || 'https://johannesgym-my.sharepoint.com';
    return {
      name: 'J-M-Reihen',
      path: baseUrl,
      type: 'directory',
      children: [
        {
          name: 'Informatik',
          path: `${baseUrl}/Informatik`,
          type: 'directory',
          children: [
            {
              name: 'MSS Grundthemen',
              path: `${baseUrl}/Informatik/MSS Grundthemen`,
              type: 'directory',
              children: [
                {
                  name: 'Quiz TechnischeInfo1.docx',
                  path: `${baseUrl}/Informatik/MSS Grundthemen/Quiz TechnischeInfo1.docx`,
                  type: 'file',
                  size: 39338,
                  extension: '.docx'
                }
              ],
              totalItems: 1
            },
            {
              name: 'MSS Wahl-und Projektthemen',
              path: `${baseUrl}/Informatik/MSS Wahl-und Projektthemen`,
              type: 'directory',
              children: [
                {
                  name: '3D Druck',
                  path: `${baseUrl}/Informatik/MSS Wahl-und Projektthemen/3D Druck`,
                  type: 'directory',
                  children: [],
                  totalItems: 0
                },
                {
                  name: 'Micro Bit',
                  path: `${baseUrl}/Informatik/MSS Wahl-und Projektthemen/Micro Bit`,
                  type: 'directory',
                  children: [],
                  totalItems: 0
                }
              ],
              totalItems: 2
            },
            {
              name: 'ITB - Klasse 6',
              path: `${baseUrl}/Informatik/ITB - Klasse 6`,
              type: 'directory',
              children: [
                {
                  name: 'Quiz TechnischeInfo1.docx',
                  path: `${baseUrl}/Informatik/ITB - Klasse 6/Quiz TechnischeInfo1.docx`,
                  type: 'file',
                  size: 39338,
                  extension: '.docx'
                },
                {
                  name: 'Spielesammlung.pptx',
                  path: `${baseUrl}/Informatik/ITB - Klasse 6/Spielesammlung.pptx`,
                  type: 'file',
                  size: 3038937,
                  extension: '.pptx'
                }
              ],
              totalItems: 2
            }
          ],
          totalItems: 5
        },
        {
          name: 'Mathe',
          path: `${baseUrl}/Mathe`,
          type: 'directory',
          children: [
            {
              name: 'Klasse 7',
              path: `${baseUrl}/Mathe/Klasse 7`,
              type: 'directory',
              children: [
                {
                  name: '1. Ganze und rationale Zahlen (Kapitel 5)',
                  path: `${baseUrl}/Mathe/Klasse 7/1. Ganze und rationale Zahlen (Kapitel 5)`,
                  type: 'directory',
                  children: [],
                  totalItems: 0
                }
              ],
              totalItems: 1
            }
          ],
          totalItems: 1
        }
      ],
      totalItems: 6
    };
  }

  /**
   * Count total items recursively
   */
  private static countTotalItems(item: any): number {
    let count = 0;
    if (item.children) {
      for (const child of item.children) {
        count += this.countTotalItems(child);
        if (child.type === 'file') {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Read file content
   */
  static async readFile(filePath: string): Promise<Buffer | null> {
    if (this.config.type === 'onedrive') {
      // For OneDrive, you'd fetch the file via OneDrive API
      // For now, return null to indicate file not found
      return null;
    }
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    return fs.readFileSync(filePath);
  }

  /**
   * Get file info
   */
  static getFileInfo(filePath: string): any {
    if (this.config.type === 'onedrive') {
      // For OneDrive, return mock info
      return {
        name: path.basename(filePath),
        path: filePath,
        type: 'file',
        size: 0,
        extension: path.extname(filePath).toLowerCase()
      };
    }
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const stats = fs.statSync(filePath);
    return {
      name: path.basename(filePath),
      path: filePath,
      type: stats.isDirectory() ? 'directory' : 'file',
      size: stats.size,
      extension: path.extname(filePath).toLowerCase(),
      modified: stats.mtime
    };
  }

  /**
   * Update configuration
   */
  static updateConfig(config: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  static getConfig(): StorageConfig {
    return { ...this.config };
  }
}
