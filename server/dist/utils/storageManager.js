"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class StorageManager {
    /**
     * Read directory contents
     */
    static async readDirectory(dirPath, recursive = false) {
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
    static readGitInternDirectory(dirPath, recursive) {
        // Always use the J-M-Reihen directory from the project root
        const projectRoot = path_1.default.resolve(__dirname, '../../../');
        const jmReihenPath = path_1.default.join(projectRoot, 'J-M-Reihen');
        console.log('Reading git-intern J-M-Reihen directory:', jmReihenPath);
        if (!fs_1.default.existsSync(jmReihenPath)) {
            return { error: 'J-M-Reihen directory not found in project root' };
        }
        const stats = fs_1.default.statSync(jmReihenPath);
        if (!stats.isDirectory()) {
            return { error: 'J-M-Reihen is not a directory' };
        }
        // Handle subdirectories if path is git-intern/subfolder
        let targetPath = jmReihenPath;
        let displayPath = 'git-intern';
        if (dirPath.startsWith('git-intern/') && dirPath !== 'git-intern') {
            const subPath = dirPath.replace('git-intern/', '');
            targetPath = path_1.default.join(jmReihenPath, subPath);
            displayPath = dirPath;
            if (!fs_1.default.existsSync(targetPath)) {
                return { error: `Subdirectory ${subPath} not found in J-M-Reihen` };
            }
        }
        const items = fs_1.default.readdirSync(targetPath);
        const children = items.map(item => {
            const itemPath = path_1.default.join(targetPath, item);
            const itemStats = fs_1.default.statSync(itemPath);
            return {
                name: item,
                path: itemStats.isDirectory() ? `${displayPath}/${item}` : `${displayPath}/${item}`,
                type: itemStats.isDirectory() ? 'directory' : 'file',
                size: itemStats.size,
                extension: this.getFileExtension(item)
            };
        });
        return {
            path: displayPath,
            root: {
                name: path_1.default.basename(targetPath),
                path: displayPath,
                type: 'directory',
                children: children,
                totalItems: children.length
            },
            totalItems: children.length,
            maxDepth: 1
        };
    }
    /**
     * Read local directory
     */
    static readLocalDirectory(dirPath, recursive) {
        const normalizedPath = path_1.default.resolve(dirPath);
        if (!fs_1.default.existsSync(normalizedPath)) {
            return { error: 'Path does not exist' };
        }
        const stats = fs_1.default.statSync(normalizedPath);
        if (!stats.isDirectory()) {
            return { error: 'Path is not a directory' };
        }
        const items = fs_1.default.readdirSync(normalizedPath);
        const children = items.map(item => {
            const itemPath = path_1.default.join(normalizedPath, item);
            const itemStats = fs_1.default.statSync(itemPath);
            return {
                name: item,
                path: path_1.default.join(dirPath, item),
                type: itemStats.isDirectory() ? 'directory' : 'file',
                size: itemStats.size,
                extension: this.getFileExtension(item)
            };
        });
        return {
            path: dirPath,
            root: {
                name: path_1.default.basename(dirPath) || 'Root',
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
    static async readFile(filePath) {
        try {
            // Handle git-intern paths
            if (filePath.startsWith('git-intern/')) {
                const projectRoot = path_1.default.resolve(__dirname, '../../../');
                const relativePath = filePath.replace('git-intern/', '');
                const fullPath = path_1.default.join(projectRoot, 'J-M-Reihen', relativePath);
                if (fs_1.default.existsSync(fullPath)) {
                    return fs_1.default.readFileSync(fullPath);
                }
                return null;
            }
            // Handle local paths
            const normalizedPath = path_1.default.resolve(filePath);
            if (fs_1.default.existsSync(normalizedPath)) {
                return fs_1.default.readFileSync(normalizedPath);
            }
            return null;
        }
        catch (error) {
            console.error('Error reading file:', error);
            return null;
        }
    }
    /**
     * Get file information
     */
    static getFileInfo(filePath) {
        try {
            let fullPath;
            // Handle git-intern paths
            if (filePath.startsWith('git-intern/')) {
                const projectRoot = path_1.default.resolve(__dirname, '../../../');
                const relativePath = filePath.replace('git-intern/', '');
                fullPath = path_1.default.join(projectRoot, 'J-M-Reihen', relativePath);
            }
            else {
                fullPath = path_1.default.resolve(filePath);
            }
            if (fs_1.default.existsSync(fullPath)) {
                const stats = fs_1.default.statSync(fullPath);
                return {
                    name: path_1.default.basename(filePath),
                    path: filePath,
                    type: stats.isDirectory() ? 'directory' : 'file',
                    size: stats.size,
                    extension: this.getFileExtension(path_1.default.basename(filePath)),
                    lastModified: stats.mtime
                };
            }
            return null;
        }
        catch (error) {
            console.error('Error getting file info:', error);
            return null;
        }
    }
    /**
     * Get file extension from filename
     */
    static getFileExtension(filename) {
        const lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(lastDot).toLowerCase() : '';
    }
    /**
     * Update configuration
     */
    static updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Get current configuration
     */
    static getConfig() {
        return { ...this.config };
    }
}
exports.StorageManager = StorageManager;
StorageManager.config = {
    type: 'local',
    basePath: process.env.LOCAL_MATERIALS_PATH || '/Users/verachrist/Documents/Z. UNTERRICHT'
};
//# sourceMappingURL=storageManager.js.map