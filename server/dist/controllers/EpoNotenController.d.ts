import { Request, Response } from 'express';
export declare class EpoNotenController {
    static list(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static create(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static update(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static publishById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static unpublishById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static remove(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getCurrent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static submitSelf(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static submitGoals(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static saveTeacherEntry(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static releaseToStudents(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** Lehrkraft: Einträge löschen (ganze Runde oder eine Lerngruppe) */
    static resetAllEntries(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=EpoNotenController.d.ts.map