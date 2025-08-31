import { Request, Response } from 'express';
export declare class FileSystemPathController {
    static savePath(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getPathsByTeacher(req: Request, res: Response): Promise<void>;
    static downloadFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readDirectory(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readHtmlFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readExcelFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readPowerPointFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readImageFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readGoodNotesFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readTextFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readPdfFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private static countTotalItems;
    static deletePath(req: Request, res: Response): Promise<void>;
    static getMimeType(fileExtension: string): string;
    static readDocxFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getAllPaths(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=FileSystemPathController.d.ts.map