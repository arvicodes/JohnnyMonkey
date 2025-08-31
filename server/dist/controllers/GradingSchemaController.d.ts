import { Request, Response } from 'express';
export declare const createSchema: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSchemas: (req: Request, res: Response) => Promise<void>;
export declare const getAllSchemas: (req: Request, res: Response) => Promise<void>;
export declare const updateSchema: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteSchema: (req: Request, res: Response) => Promise<void>;
export declare const createGradingSchema: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getGradingSchemas: (req: Request, res: Response) => Promise<void>;
export declare const updateGradingSchema: (req: Request, res: Response) => Promise<void>;
export declare const deleteGradingSchema: (req: Request, res: Response) => Promise<void>;
export declare const createMSSSchema: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=GradingSchemaController.d.ts.map