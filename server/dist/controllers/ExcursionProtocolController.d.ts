import { Request, Response } from 'express';
/** Legacy — wird bei Migration gelesen */
export declare const EXCURSION_PROTOCOL_LEGACY_PATH = "__excursion_protocol_active__";
export declare class ExcursionProtocolController {
    /** Lehrkraft: alle Protokolle */
    static list(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** Lehrkraft: neues Protokoll (Entwurf) */
    static create(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** Lehrkraft: Protokoll bearbeiten */
    static update(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** Lehrkraft: freigeben für gewählte Gruppen */
    static publishById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** Lehrkraft: Protokoll löschen */
    static remove(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** Legacy publish — create + publish in einem Schritt */
    static publish(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getCurrent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static submit(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getSubmissions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=ExcursionProtocolController.d.ts.map