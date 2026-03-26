import { Request, Response } from 'express';
export declare class ExitTicketController {
    static publish(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getCurrent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static submit(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getResponses(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=ExitTicketController.d.ts.map