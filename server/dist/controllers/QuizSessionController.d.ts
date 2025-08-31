import { Request, Response } from 'express';
export declare const startQuizSession: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getActiveSession: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getQuizForSession: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSessionById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSessionsForQuiz: (req: Request, res: Response) => Promise<void>;
export declare const getSessionResults: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const stopQuizSession: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const releaseResults: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=QuizSessionController.d.ts.map