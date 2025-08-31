import { Request, Response } from 'express';
export declare const startParticipation: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const submitAnswers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getParticipationResults: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getParticipationResultsForTeacher: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getParticipationStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const resetParticipation: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getQuizStatistics: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteParticipation: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=QuizParticipationController.d.ts.map