import fs from 'fs';
import path from 'path';

export interface StorageConfig {
  type: 'local' | 'git-intern';
  basePath?: string;
}

export class StorageManager {
  private static config: StorageConfig = {
    type: 'local',
    basePath: process.env.LOCAL_MATERIALS_PATH || '/Users/verachrist/Documents/Z. UNTERRICHT'
  };

  /**
   * Read directory contents
   */
  static async readDirectory(dirPath: string, recursive: boolean = false): Promise<any> {
    console.log('StorageManager.readDirectory called with:', dirPath, 'recursive:', recursive);
    
    // Check if this is a git-intern path (exact match or contains J-M-Reihen)
    if (dirPath === 'git-intern' || dirPath.includes('J-M-Reihen') || dirPath.startsWith('git-intern/')) {
      console.log('Git-intern path detected, using J-M-Reihen directory...');
      return this.readGitInternDirectory(dirPath, recursive);
    }
    
    // Check if this is an old OneDrive URL and return error
    if (dirPath.includes('sharepoint.com') || dirPath.includes('onedrive')) {
      console.log('Old OneDrive URL detected, returning error...');
      return { error: 'OneDrive-Integration wurde entfernt. Bitte verwenden Sie die Git-Intern-Option.' };
    }
    
    // Local file system handling
    return this.readLocalDirectory(dirPath, recursive);
  }

  /**
   * Read git-intern directory (J-M-Reihen)
   */
  private static readGitInternDirectory(dirPath: string, recursive: boolean): any {
    // Always use absolute path to project root
    const projectRoot = process.env.NODE_ENV === 'production' 
      ? process.cwd()  // In production, cwd is the project root
      : path.resolve(process.cwd(), '..');  // In development, go up one level
    
    const jmReihenPath = path.join(projectRoot, 'J-M-Reihen');
    
    console.log('Reading git-intern J-M-Reihen directory:', jmReihenPath);
    console.log('Project root:', projectRoot);
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
      const children = items
        .filter(item => !item.startsWith('.')) // Filter out hidden files like .DS_Store
        .map(item => {
          const itemPath = path.join(currentPath, item);
          const itemStats = fs.statSync(itemPath);
          const itemDisplayPath = `${currentDisplayPath}/${item}`;
          
          const result: any = {
            name: item,
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
    const normalizedPath = path.resolve(dirPath);
    
    if (!fs.existsSync(normalizedPath)) {
      return { error: 'Path does not exist' };
    }
    
    const stats = fs.statSync(normalizedPath);
    if (!stats.isDirectory()) {
      return { error: 'Path is not a directory' };
    }
    
    const items = fs.readdirSync(normalizedPath);
    const children = items.map(item => {
      const itemPath = path.join(normalizedPath, item);
      const itemStats = fs.statSync(itemPath);
      
      return {
        name: item,
        path: path.join(dirPath, item),
        type: itemStats.isDirectory() ? 'directory' : 'file',
        size: itemStats.size,
        extension: this.getFileExtension(item)
      };
    });
    
    return {
      path: dirPath,
      root: {
        name: path.basename(dirPath) || 'Root',
        path: dirPath,
        type: 'directory',
        children: children,
        totalItems: children.length
      },
      totalItems: children.length,
      maxDepth: 1
    };
  }

  /**
   * Read file contents
   */
  static async readFile(filePath: string): Promise<Buffer | null> {
    try {
      // Handle git-intern paths
      if (filePath.startsWith('git-intern/')) {
        let fullPath: string;
        const relativePath = filePath.replace('git-intern/', '');
        
        if (process.env.NODE_ENV === 'production') {
          // Production: Use relative path from project root
          const projectRoot = process.env.NODE_ENV === 'production' 
            ? process.cwd()  // In production, cwd is the project root
            : path.resolve(process.cwd(), '..');  // In development, go up one level
          fullPath = path.join(projectRoot, 'J-M-Reihen', relativePath);
        } else {
          // Development: Use absolute path from project root
          const projectRoot = path.resolve(process.cwd(), '..');
          fullPath = path.join(projectRoot, 'J-M-Reihen', relativePath);
        }
        
        if (fs.existsSync(fullPath)) {
          return fs.readFileSync(fullPath);
        }
        return null;
      }
      
      // Handle local paths
      const normalizedPath = path.resolve(filePath);
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
          const projectRoot = process.env.NODE_ENV === 'production' 
            ? process.cwd()  // In production, cwd is the project root
            : path.resolve(process.cwd(), '..');  // In development, go up one level
          fullPath = path.join(projectRoot, 'J-M-Reihen', relativePath);
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