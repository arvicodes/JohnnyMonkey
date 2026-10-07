import { Request, Response } from 'express';
export declare class EpoNotenController {
    static list(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static create(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static update(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static publishById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** Einzelnen Kurs freischalten (und ggf. zur Runde hinzufügen) */
    static publishGroupById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** Kurs als „fertig“ markieren (Lehrkraft) */
    static patchGroupMeta(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listVariants(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static saveVariant(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createVariant(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static deleteVariant(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static unpublishById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static remove(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getCurrent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static submitSelf(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static submitGoals(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static saveTeacherEntry(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static releaseToStudents(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** Lehrkraft: ganze Lerngruppe auf „Nur Note“ (oder zurück auf Standard) */
    static bulkGradeOnlyForGroup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** Lehrkraft: ganze Lerngruppe „Keine Ziele nötig“ */
    static bulkGoalsWaivedForGroup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** Freigegebene EPO-Noten einer Lerngruppe ins Notenschema übernehmen (Kategorie = Rundentitel). */
    static integrateGradingSchema(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** Lehrkraft: Einträge löschen (ganze Runde oder eine Lerngruppe) */
    static resetAllEntries(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=EpoNotenController.d.ts.map