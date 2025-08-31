import { Request, Response } from 'express';
export declare const assignQuizToLesson: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getLessonQuiz: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAvailableQuizzes: (req: Request, res: Response) => Promise<void>;
export declare const removeQuizFromLesson: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=LessonQuizController.d.ts.map