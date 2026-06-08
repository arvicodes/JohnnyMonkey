import { Request, Response } from 'express';
export declare const EXCURSION_PROTOCOL_LEGACY_PATH = "__excursion_protocol_active__";
export declare class ExcursionProtocolController {
    static publish(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getCurrent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static submit(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getSubmissions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=ExcursionProtocolController.d.ts.map