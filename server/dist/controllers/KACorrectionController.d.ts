import { Request, Response } from 'express';
export declare class KACorrectionController {
    /**
     * Abgabe einer Klassenarbeit speichern
     */
    static submitKA(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Alle Abgaben für eine Klassenarbeit abrufen (für Lehrer)
     */
    static getSubmissions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Einzelne Abgabe mit Details abrufen
     */
    static getSubmission(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Korrektur speichern/aktualisieren
     */
    static saveCorrection(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Alle Abgaben für eine Klassenarbeit zurücksetzen (nur für Lehrer, nur zu Testzwecken)
     */
    static resetAllSubmissions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Status der Abgabe aktualisieren (z.B. wenn Zeit abgelaufen)
     */
    static updateStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Prüfe ob eine Submission für einen Schüler existiert (für Schüler)
     */
    static checkMySubmission(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Alle Noten für eine Klassenarbeit freigeben/zurücknehmen (nur für Lehrer)
     */
    static releaseAllGrades(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Prüfe Freigabestatus für eine Klassenarbeit (nur für Lehrer)
     */
    static getReleaseStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Freigegebene Prüfungsergebnisse für den angemeldeten Schüler
     * Optional: lessonPath filtert auf Abgaben dieser Stunde
     */
    static getMyReleasedResults(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=KACorrectionController.d.ts.map