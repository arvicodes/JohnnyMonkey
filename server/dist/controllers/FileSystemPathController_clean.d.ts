import { Request, Response } from 'express';
export interface FileSystemPath {
    id: string;
    path: string;
    name: string;
    type: 'file' | 'directory';
    size?: number;
    lastModified?: Date;
    children?: FileSystemPath[];
}
export declare class FileSystemPathController {
    private static convertPowerPointToPDF;
    static readPowerPointFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=FileSystemPathController_clean.d.ts.map