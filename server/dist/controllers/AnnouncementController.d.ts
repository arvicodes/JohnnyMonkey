import { Request, Response } from 'express';
export declare class AnnouncementController {
    static list(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** Legt Ordner unter J-M-Reihen/Ankündigungen & Briefe/ an */
    static createFolder(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateFolder(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static publishFolder(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static removeFolder(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static create(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static update(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static publishById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static remove(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getCurrent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static markRead(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** HTML-Flyer aus Ordner ausliefern (Vorschau & Druck) */
    static serveFlyer(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getFlyerDesign(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static saveFlyerDesign(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static uploadFolderImage(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=AnnouncementController.d.ts.map