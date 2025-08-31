import { Request, Response } from 'express';
export declare const createQuiz: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getQuizzes: (req: Request, res: Response) => Promise<void>;
export declare const getQuiz: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateQuiz: (req: Request, res: Response) => Promise<void>;
export declare const deleteQuiz: (req: Request, res: Response) => Promise<void>;
export declare const getQuizzesByTeacher: (req: Request, res: Response) => Promise<void>;
export declare const updateQuizQuestions: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const checkQuizExists: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const reloadQuizFromSource: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=QuizController.d.ts.map