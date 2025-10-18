import { Request, Response } from 'express';
export declare const toggleFileShare: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSharedFilesForGroup: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const checkFileShare: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const batchCheckFileShares: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=fileSharesController.d.ts.map