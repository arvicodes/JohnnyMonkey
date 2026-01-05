import { Request, Response } from 'express';
export declare const saveGrades: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getGrades: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getGradesByStudent: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const toggleGradeRelease: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getGradeRelease: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const saveBulkGrades: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const releaseBulkGrades: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=GradesController.d.ts.map