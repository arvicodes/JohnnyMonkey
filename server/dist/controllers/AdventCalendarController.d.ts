import { Request, Response } from 'express';
export declare const getDoors: (req: Request, res: Response) => Promise<void>;
export declare const getDoor: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const submitAnswer: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getDoorResults: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createDoor: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createDoorsForYear: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=AdventCalendarController.d.ts.map