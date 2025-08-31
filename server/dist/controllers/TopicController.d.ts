import { Request, Response } from 'express';
export declare const createTopic: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTopics: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateTopic: (req: Request, res: Response) => Promise<void>;
export declare const deleteTopic: (req: Request, res: Response) => Promise<void>;
export declare const getTopic: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=TopicController.d.ts.map