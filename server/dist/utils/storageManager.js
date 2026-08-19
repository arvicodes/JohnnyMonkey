"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multerFilename_1 = require("./multerFilename");
class StorageManager {
    /**
     * Physical root of J-M-Reihen (Docker: usually /app/J-M-Reihen when LOCAL_MATERIALS_PATH=/app).
     */
    static resolveJmReihenRoot() {
        if (process.env.JM_REIHEN_PATH && fs_1.default.existsSync(process.env.JM_REIHEN_PATH)) {
            return process.env.JM_REIHEN_PATH;
        }
        const base = process.env.LOCAL_MATERIALS_PATH;
        if (base) {
            const candidate = path_1.default.join(base, 'J-M-Reihen');
            if (fs_1.default.existsSync(candidate)) {
                return candidate;
            }
        }
        if (process.env.NODE_ENV !== 'production') {
            const projectRoot = path_1.default.resolve(__dirname, '../../..');
            return path_1.default.join(projectRoot, 'J-M-Reihen');
        }
        const serverPath = path_1.default.join(process.cwd(), 'J-M-Reihen');
        const projectPath = path_1.default.join(process.cwd(), '..', 'J-M-Reihen');
        if (fs_1.default.existsSync(serverPath)) {
            return serverPath;
        }
        if (fs_1.default.existsSync(projectPath)) {
            return projectPath;
        }
        return projectPath;
    }
    /**
     * UI/DB sometimes stores "J-M-Reihen/..." instead of "git-intern/..." — normalize for one code path.
     */
    static normalizeDirRequestPath(raw) {
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
    static async readDirectory(dirPath, recursive = false) {
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
    static readGitInternDirectory(dirPath, recursive) {
        const jmReihenPath = this.resolveJmReihenRoot();
        console.log('Reading git-intern J-M-Reihen directory:', jmReihenPath);
        console.log('Directory exists:', fs_1.default.existsSync(jmReihenPath));
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
        // Recursive function to build directory tree
        const buildDirectoryTree = (currentPath, currentDisplayPath, currentDepth = 0) => {
            const items = fs_1.default.readdirSync(currentPath);
            // NFC-Dedupe: Mac legt manchmal NFD- und NFC-Ordner parallel an (sieht aus wie Doppel-Kap 1).
            const visible = [];
            const seenNfc = new Set();
            for (const item of items) {
                if (item.startsWith('.'))
                    continue;
                const key = item.normalize('NFC');
                if (seenNfc.has(key))
                    continue;
                seenNfc.add(key);
                // NFC-Namen bevorzugen, wenn beide existieren
                const nfcName = key;
                const prefer = items.includes(nfcName) ? nfcName : item;
                visible.push(prefer);
            }
            const children = visible
                .map(item => {
                const itemPath = path_1.default.join(currentPath, item);
                const itemStats = fs_1.default.statSync(itemPath);
                const itemDisplayPath = `${currentDisplayPath}/${item.normalize('NFC')}`;
                const result = {
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
                name: path_1.default.basename(targetPath),
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
    static readLocalDirectory(dirPath, recursive) {
        // Convert macOS paths to container paths
        let normalizedPath = dirPath;
        if (dirPath.startsWith('/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/')) {
            // Replace macOS path with container path
            normalizedPath = dirPath.replace('/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey', this.config.basePath || '/app');
            console.log('🔄 Converted path:', dirPath, '→', normalizedPath);
        }
        normalizedPath = path_1.default.resolve(normalizedPath);
        if (!fs_1.default.existsSync(normalizedPath)) {
            console.error('❌ Path does not exist:', normalizedPath);
            return { error: 'Path does not exist' };
        }
        const stats = fs_1.default.statSync(normalizedPath);
        if (!stats.isDirectory()) {
            return { error: 'Path is not a directory' };
        }
        // Recursive function to build directory tree
        const buildDirectoryTree = (currentPath, currentDepth = 0) => {
            const items = fs_1.default.readdirSync(currentPath);
            const children = items
                .filter(item => !item.startsWith('.')) // Filter out hidden files like .DS_Store
                .map(item => {
                const itemPath = path_1.default.join(currentPath, item);
                const itemStats = fs_1.default.statSync(itemPath);
                const result = {
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
                name: path_1.default.basename(dirPath) || 'Root',
                path: dirPath,
                type: 'directory',
                children: tree.children,
                totalItems: tree.totalItems
            },
            totalItems: tree.totalItems,
            maxDepth: recursive ? 10 : 1 // Allow deeper nesting for recursive calls
        };
    }
    static normalizeCompare(s) {
        return s.normalize('NFC').toLowerCase();
    }
    /** macOS NFD/NFC-tolerant: Ordner- und Dateinamen segmentweise auflösen */
    static resolveUnicodePath(baseDir, relativeParts) {
        let current = baseDir;
        for (const part of relativeParts) {
            const target = this.normalizeCompare(part);
            const direct = path_1.default.join(current, part);
            if (fs_1.default.existsSync(direct)) {
                current = direct;
                continue;
            }
            let found = null;
            try {
                for (const entry of fs_1.default.readdirSync(current, { withFileTypes: true })) {
                    if (this.normalizeCompare(entry.name) === target) {
                        found = path_1.default.join(current, entry.name);
                        break;
                    }
                }
            }
            catch {
                return null;
            }
            if (!found)
                return null;
            current = found;
        }
        return current;
    }
    /**
     * Absoluter Pfad zu einer Datei oder einem Ordner unter git-intern (Relativpfad ohne Präfix "git-intern/").
     * Gleiche Logik wie readFile — wichtig für saveFile, damit Speichern und Lesen dasselbe Verzeichnis nutzen.
     */
    static resolveGitInternRelativePath(relativePath) {
        const rel = relativePath.replace(/\\/g, '/');
        const jmReihenPath = this.resolveJmReihenRoot();
        const inner = rel.startsWith('J-M-Reihen/') ? rel.slice('J-M-Reihen/'.length) : rel;
        const parts = inner.split('/').filter(Boolean);
        const resolved = this.resolveUnicodePath(jmReihenPath, parts);
        return resolved !== null && resolved !== void 0 ? resolved : path_1.default.join(jmReihenPath, inner);
    }
    /**
     * Folien speichern oft absolute macOS-Pfade. Auf dem Schulserver/Docker
     * auf LOCAL_MATERIALS_PATH bzw. git-intern umbiegen.
     */
    static remapLegacyAbsolutePath(filePath) {
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
        return path_1.default.posix.join(base.replace(/\\/g, '/'), rest);
    }
    static resolveFilePath(filePath) {
        let norm = this.remapLegacyAbsolutePath(filePath);
        if (norm === 'J-M-Reihen' || norm.startsWith('J-M-Reihen/')) {
            norm =
                norm === 'J-M-Reihen'
                    ? 'git-intern'
                    : `git-intern/${norm.slice('J-M-Reihen/'.length)}`;
        }
        const candidates = (0, multerFilename_1.filenameLookupVariants)(norm);
        for (const candidate of candidates) {
            if (candidate.startsWith('git-intern/')) {
                const full = this.resolveGitInternRelativePath(candidate.replace('git-intern/', ''));
                if (fs_1.default.existsSync(full))
                    return full;
                continue;
            }
            const resolved = path_1.default.resolve(candidate);
            if (fs_1.default.existsSync(resolved))
                return resolved;
        }
        return null;
    }
    /**
     * Read file contents
     */
    static async readFile(filePath) {
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
                console.log('StorageManager.readFile - exists:', fs_1.default.existsSync(fullPath));
                if (fs_1.default.existsSync(fullPath)) {
                    const content = fs_1.default.readFileSync(fullPath);
                    console.log('StorageManager.readFile - file size:', content.length);
                    return content;
                }
                console.log('StorageManager.readFile - file not found');
                return null;
            }
            // Handle local paths
            const normalizedPath = path_1.default.resolve(filePathNorm);
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
                const relativePath = filePath.replace('git-intern/', '');
                if (process.env.NODE_ENV === 'production') {
                    // Production: Use relative path from project root
                    let jmReihenPath;
                    if (process.env.NODE_ENV === 'production') {
                        // Production: Look in server directory first, then project root
                        const serverPath = path_1.default.join(process.cwd(), 'J-M-Reihen');
                        const projectPath = path_1.default.join(process.cwd(), '..', 'J-M-Reihen');
                        if (fs_1.default.existsSync(serverPath)) {
                            jmReihenPath = serverPath;
                        }
                        else if (fs_1.default.existsSync(projectPath)) {
                            jmReihenPath = projectPath;
                        }
                        else {
                            jmReihenPath = serverPath; // Default to server path
                        }
                    }
                    else {
                        // Development: Use absolute path from project root
                        const projectRoot = '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey';
                        jmReihenPath = path_1.default.join(projectRoot, 'J-M-Reihen');
                    }
                    fullPath = path_1.default.join(jmReihenPath, relativePath);
                }
                else {
                    // Development: Use absolute path from project root
                    const projectRoot = path_1.default.resolve(__dirname, '../../../');
                    fullPath = path_1.default.join(projectRoot, 'J-M-Reihen', relativePath);
                }
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
    basePath: process.env.LOCAL_MATERIALS_PATH || '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey'
};
//# sourceMappingURL=storageManager.js.map