import { Request, Response } from 'express';
export declare const createBlock: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBlocks: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateBlock: (req: Request, res: Response) => Promise<void>;
export declare const deleteBlock: (req: Request, res: Response) => Promise<void>;
export declare const getBlock: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=BlockController.d.ts.map