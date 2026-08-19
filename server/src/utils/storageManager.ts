import fs from 'fs';
import path from 'path';
import { filenameLookupVariants } from './multerFilename';

export interface StorageConfig {
  type: 'local' | 'git-intern';
  basePath?: string;
}

export class StorageManager {
  private static config: StorageConfig = {
    type: 'local',
    basePath: process.env.LOCAL_MATERIALS_PATH || '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey'
  };

  /**
   * Physical root of J-M-Reihen (Docker: usually /app/J-M-Reihen when LOCAL_MATERIALS_PATH=/app).
   */
  private static resolveJmReihenRoot(): string {
    if (process.env.JM_REIHEN_PATH && fs.existsSync(process.env.JM_REIHEN_PATH)) {
      return process.env.JM_REIHEN_PATH;
    }
    const base = process.env.LOCAL_MATERIALS_PATH;
    if (base) {
      const candidate = path.join(base, 'J-M-Reihen');
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    if (process.env.NODE_ENV !== 'production') {
      const projectRoot = path.resolve(__dirname, '../../..');
      return path.join(projectRoot, 'J-M-Reihen');
    }
    const serverPath = path.join(process.cwd(), 'J-M-Reihen');
    const projectPath = path.join(process.cwd(), '..', 'J-M-Reihen');
    if (fs.existsSync(serverPath)) {
      return serverPath;
    }
    if (fs.existsSync(projectPath)) {
      return projectPath;
    }
    return projectPath;
  }

  /**
   * UI/DB sometimes stores "J-M-Reihen/..." instead of "git-intern/..." — normalize for one code path.
   */
  private static normalizeDirRequestPath(raw: string): string {
    const p = raw.replace(/\\/g, '/');
    const trimmed = p.trim();
    if (trimmed === 'J-M-Reihen' || trimmed === './J-M-Reihen') {
      return 'git-intern';
    }
    if (trimmed.startsWith('J-M-Reihen/')) {
      return `git-intern/${trimmed.slice('J-M-Reihen/'.length)}`;
    }
    return p;
  }

  /**
   * Read directory contents
   */
  static async readDirectory(dirPath: string, recursive: boolean = false): Promise<any> {
    const normalized = this.normalizeDirRequestPath(dirPath);
    console.log('StorageManager.readDirectory called with:', dirPath, '→', normalized, 'recursive:', recursive);

    // Check if this is a git-intern path (exact match or starts with git-intern/)
    if (normalized === 'git-intern' || normalized.startsWith('git-intern/')) {
      console.log('Git-intern path detected, using J-M-Reihen directory...');
      return this.readGitInternDirectory(normalized, recursive);
    }
    
    // Check if this is an old OneDrive URL and return error
    if (normalized.includes('sharepoint.com') || normalized.includes('onedrive')) {
      console.log('Old OneDrive URL detected, returning error...');
      return { error: 'OneDrive-Integration wurde entfernt. Bitte verwenden Sie die Git-Intern-Option.' };
    }
    
    // Local file system handling
    return this.readLocalDirectory(normalized, recursive);
  }

  /**
   * Read git-intern directory (J-M-Reihen)
   */
  private static readGitInternDirectory(dirPath: string, recursive: boolean): any {
    const jmReihenPath = this.resolveJmReihenRoot();

    console.log('Reading git-intern J-M-Reihen directory:', jmReihenPath);
    console.log('Directory exists:', fs.existsSync(jmReihenPath));
    
    if (!fs.existsSync(jmReihenPath)) {
      return { error: 'J-M-Reihen directory not found in project root' };
    }
    
    const stats = fs.statSync(jmReihenPath);
    if (!stats.isDirectory()) {
      return { error: 'J-M-Reihen is not a directory' };
    }
    
    // Handle subdirectories if path is git-intern/subfolder
    let targetPath = jmReihenPath;
    let displayPath = 'git-intern';
    
    if (dirPath.startsWith('git-intern/') && dirPath !== 'git-intern') {
      const subPath = dirPath.replace('git-intern/', '');
      targetPath = path.join(jmReihenPath, subPath);
      displayPath = dirPath;
      
      if (!fs.existsSync(targetPath)) {
        return { error: `Subdirectory ${subPath} not found in J-M-Reihen` };
      }
    }
    
    // Recursive function to build directory tree
    const buildDirectoryTree = (currentPath: string, currentDisplayPath: string, currentDepth: number = 0): any => {
      const items = fs.readdirSync(currentPath);
      // NFC-Dedupe: Mac legt manchmal NFD- und NFC-Ordner parallel an (sieht aus wie Doppel-Kap 1).
      const visible: string[] = [];
      const seenNfc = new Set<string>();
      for (const item of items) {
        if (item.startsWith('.')) continue;
        const key = item.normalize('NFC');
        if (seenNfc.has(key)) continue;
        seenNfc.add(key);
        // NFC-Namen bevorzugen, wenn beide existieren
        const nfcName = key;
        const prefer = items.includes(nfcName) ? nfcName : item;
        visible.push(prefer);
      }
      const children = visible
        .map(item => {
          const itemPath = path.join(currentPath, item);
          const itemStats = fs.statSync(itemPath);
          const itemDisplayPath = `${currentDisplayPath}/${item.normalize('NFC')}`;
          
          const result: any = {
            name: item.normalize('NFC'),
            path: itemDisplayPath,
            type: itemStats.isDirectory() ? 'directory' : 'file',
            size: itemStats.size,
            extension: this.getFileExtension(item)
          };
          
          // If it's a directory and we want recursive or it's the root level, add children
          if (itemStats.isDirectory() && (recursive || currentDepth === 0)) {
            result.children = buildDirectoryTree(itemPath, itemDisplayPath, currentDepth + 1).children;
          }
          
          return result;
        });
      
      return { children, totalItems: children.length };
    };
    
    const tree = buildDirectoryTree(targetPath, displayPath);
    
    return {
      path: displayPath,
      root: {
        name: path.basename(targetPath),
        path: displayPath,
        type: 'directory',
        children: tree.children,
        totalItems: tree.totalItems
      },
      totalItems: tree.totalItems,
      maxDepth: recursive ? 10 : 1 // Allow deeper nesting for recursive calls
    };
  }

  /**
   * Read local directory
   */
  private static readLocalDirectory(dirPath: string, recursive: boolean): any {
    // Convert macOS paths to container paths
    let normalizedPath = dirPath;
    if (dirPath.startsWith('/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/')) {
      // Replace macOS path with container path
      normalizedPath = dirPath.replace('/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey', this.config.basePath || '/app');
      console.log('🔄 Converted path:', dirPath, '→', normalizedPath);
    }
    normalizedPath = path.resolve(normalizedPath);
    
    if (!fs.existsSync(normalizedPath)) {
      console.error('❌ Path does not exist:', normalizedPath);
      return { error: 'Path does not exist' };
    }
    
    const stats = fs.statSync(normalizedPath);
    if (!stats.isDirectory()) {
      return { error: 'Path is not a directory' };
    }
    
    // Recursive function to build directory tree
    const buildDirectoryTree = (currentPath: string, currentDepth: number = 0): any => {
      const items = fs.readdirSync(currentPath);
      const children = items
        .filter(item => !item.startsWith('.')) // Filter out hidden files like .DS_Store
        .map(item => {
          const itemPath = path.join(currentPath, item);
          const itemStats = fs.statSync(itemPath);
          
          const result: any = {
            name: item,
            path: itemPath,
            type: itemStats.isDirectory() ? 'directory' : 'file',
            size: itemStats.size,
            extension: this.getFileExtension(item)
          };
          
          // If it's a directory and we want recursive or it's the root level, add children
          if (itemStats.isDirectory() && (recursive || currentDepth === 0)) {
            result.children = buildDirectoryTree(itemPath, currentDepth + 1).children;
          }
          
          return result;
        });
      
      return { children, totalItems: children.length };
    };
    
    const tree = buildDirectoryTree(normalizedPath);
    
    return {
      path: dirPath,
      root: {
        name: path.basename(dirPath) || 'Root',
        path: dirPath,
        type: 'directory',
        children: tree.children,
        totalItems: tree.totalItems
      },
      totalItems: tree.totalItems,
      maxDepth: recursive ? 10 : 1 // Allow deeper nesting for recursive calls
    };
  }

  private static normalizeCompare(s: string): string {
    return s.normalize('NFC').toLowerCase();
  }

  /** macOS NFD/NFC-tolerant: Ordner- und Dateinamen segmentweise auflösen */
  private static resolveUnicodePath(baseDir: string, relativeParts: string[]): string | null {
    let current = baseDir;
    for (const part of relativeParts) {
      const target = this.normalizeCompare(part);
      const direct = path.join(current, part);
      if (fs.existsSync(direct)) {
        current = direct;
        continue;
      }
      let found: string | null = null;
      try {
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
          if (this.normalizeCompare(entry.name) === target) {
            found = path.join(current, entry.name);
            break;
          }
        }
      } catch {
        return null;
      }
      if (!found) return null;
      current = found;
    }
    return current;
  }

  /**
   * Absoluter Pfad zu einer Datei oder einem Ordner unter git-intern (Relativpfad ohne Präfix "git-intern/").
   * Gleiche Logik wie readFile — wichtig für saveFile, damit Speichern und Lesen dasselbe Verzeichnis nutzen.
   */
  static resolveGitInternRelativePath(relativePath: string): string {
    const rel = relativePath.replace(/\\/g, '/');
    const jmReihenPath = this.resolveJmReihenRoot();
    const inner = rel.startsWith('J-M-Reihen/') ? rel.slice('J-M-Reihen/'.length) : rel;
    const parts = inner.split('/').filter(Boolean);
    const resolved = this.resolveUnicodePath(jmReihenPath, parts);
    return resolved ?? path.join(jmReihenPath, inner);
  }

  /**
   * Folien speichern oft absolute macOS-Pfade. Auf dem Schulserver/Docker
   * auf LOCAL_MATERIALS_PATH bzw. git-intern umbiegen.
   */
  private static remapLegacyAbsolutePath(filePath: string): string {
    const norm = filePath.replace(/\\/g, '/');
    const macRoot = '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey';
    if (!norm.startsWith(`${macRoot}/`) && norm !== macRoot) {
      return norm;
    }
    const rest = norm === macRoot ? '' : norm.slice(macRoot.length + 1);
    if (!rest || rest === 'J-M-Reihen' || rest.startsWith('J-M-Reihen/')) {
      return !rest || rest === 'J-M-Reihen'
        ? 'git-intern'
        : `git-intern/${rest.slice('J-M-Reihen/'.length)}`;
    }
    const base = this.config.basePath || process.env.LOCAL_MATERIALS_PATH || '/app';
    return path.posix.join(base.replace(/\\/g, '/'), rest);
  }

  static resolveFilePath(filePath: string): string | null {
    let norm = this.remapLegacyAbsolutePath(filePath);
    if (norm === 'J-M-Reihen' || norm.startsWith('J-M-Reihen/')) {
      norm =
        norm === 'J-M-Reihen'
          ? 'git-intern'
          : `git-intern/${norm.slice('J-M-Reihen/'.length)}`;
    }

    const candidates = filenameLookupVariants(norm);

    for (const candidate of candidates) {
      if (candidate.startsWith('git-intern/')) {
        const full = this.resolveGitInternRelativePath(candidate.replace('git-intern/', ''));
        if (fs.existsSync(full)) return full;
        continue;
      }
      const resolved = path.resolve(candidate);
      if (fs.existsSync(resolved)) return resolved;
    }
    return null;
  }

  /**
   * Read file contents
   */
  static async readFile(filePath: string): Promise<Buffer | null> {
    try {
      let filePathNorm = this.remapLegacyAbsolutePath(filePath);
      if (filePathNorm === 'J-M-Reihen' || filePathNorm.startsWith('J-M-Reihen/')) {
        filePathNorm =
          filePathNorm === 'J-M-Reihen'
            ? 'git-intern'
            : `git-intern/${filePathNorm.slice('J-M-Reihen/'.length)}`;
      }
      // Handle git-intern paths
      if (filePathNorm.startsWith('git-intern/')) {
        const relativePath = filePathNorm.replace('git-intern/', '');
        const fullPath = this.resolveGitInternRelativePath(relativePath);

        console.log('StorageManager.readFile - fullPath:', fullPath);
        console.log('StorageManager.readFile - exists:', fs.existsSync(fullPath));
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath);
          console.log('StorageManager.readFile - file size:', content.length);
          return content;
        }
        console.log('StorageManager.readFile - file not found');
        return null;
      }
      
      // Handle local paths
      const normalizedPath = path.resolve(filePathNorm);
      if (fs.existsSync(normalizedPath)) {
        return fs.readFileSync(normalizedPath);
      }
      
      return null;
    } catch (error) {
      console.error('Error reading file:', error);
      return null;
    }
  }

  /**
   * Get file information
   */
  static getFileInfo(filePath: string): any {
    try {
      let fullPath: string;
      
      // Handle git-intern paths
      if (filePath.startsWith('git-intern/')) {
        const relativePath = filePath.replace('git-intern/', '');
        
        if (process.env.NODE_ENV === 'production') {
          // Production: Use relative path from project root
          let jmReihenPath: string;
          if (process.env.NODE_ENV === 'production') {
            // Production: Look in server directory first, then project root
            const serverPath = path.join(process.cwd(), 'J-M-Reihen');
            const projectPath = path.join(process.cwd(), '..', 'J-M-Reihen');
            
            if (fs.existsSync(serverPath)) {
              jmReihenPath = serverPath;
            } else if (fs.existsSync(projectPath)) {
              jmReihenPath = projectPath;
            } else {
              jmReihenPath = serverPath; // Default to server path
            }
          } else {
            // Development: Use absolute path from project root
            const projectRoot = '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey';
            jmReihenPath = path.join(projectRoot, 'J-M-Reihen');
          }
          fullPath = path.join(jmReihenPath, relativePath);
        } else {
          // Development: Use absolute path from project root
          const projectRoot = path.resolve(__dirname, '../../../');
          fullPath = path.join(projectRoot, 'J-M-Reihen', relativePath);
        }
      } else {
        fullPath = path.resolve(filePath);
      }
      
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        return {
          name: path.basename(filePath),
          path: filePath,
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          extension: this.getFileExtension(path.basename(filePath)),
          lastModified: stats.mtime
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting file info:', error);
      return null;
    }
  }

  /**
   * Get file extension from filename
   */
  private static getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot).toLowerCase() : '';
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