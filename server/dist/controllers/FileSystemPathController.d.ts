import { Request, Response } from 'express';
export interface FileSystemPath {
    id: string;
    path: string;
    name: string;
    teacherId: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface DirectoryItem {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size: number;
    extension: string;
    children?: DirectoryItem[];
}
export interface DirectoryContent {
    path: string;
    root: DirectoryItem;
    totalItems: number;
    maxDepth: number;
}
export declare class FileSystemPathController {
    /**
     * Get all paths
     */
    static getAllPaths(req: Request, res: Response): Promise<void>;
    /**
     * Get file extension from filename
     */
    private static getFileExtension;
    static savePath(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readDirectory(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getPathsByTeacher(req: Request, res: Response): Promise<void>;
    static deletePath(req: Request, res: Response): Promise<void>;
    static readHtmlFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readDocxFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readExcelFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readPowerPointFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readPdfFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readGoodNotesFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readImageFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readTextFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static downloadFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get J-M-Reihen path for current environment
     */
    static getJmReihenPath(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=FileSystemPathController.d.ts.map