import { Request, Response } from 'express';
export declare const createSubject: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSubjects: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSubject: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateSubject: (req: Request, res: Response) => Promise<void>;
export declare const deleteSubject: (req: Request, res: Response) => Promise<void>;
export declare const reorderSubjects: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const reorderBlocks: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const reorderUnits: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const reorderTopics: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const reorderLessons: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=SubjectController.d.ts.map