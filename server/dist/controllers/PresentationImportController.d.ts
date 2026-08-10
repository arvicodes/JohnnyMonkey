import { Request, Response } from 'express';
export declare class PresentationImportController {
    /** PPTX hochladen oder lokalen Pfad lesen → positionierte Boxen (Text/Bild/Form) */
    static parsePptx(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=PresentationImportController.d.ts.map