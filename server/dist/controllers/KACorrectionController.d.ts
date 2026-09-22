import { Request, Response } from 'express';
export declare class KACorrectionController {
    private static recomputeSubmissionById;
    private static recalculateAllForExam;
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
    /** Lehrer: Abgabe als krank markieren (hellgelb in UI, nicht im Klassenschnitt). */
    static setMarkedSick(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
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
    /** Lehrer: leere Abgabe für Schüler anlegen (z. B. Papierabgabe nachtragen) */
    static createSubmissionForStudent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** Lehrer: Abgabe eines Schülers nachträglich ändern */
    static updateSubmissionAnswers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** Lehrer: Musterlösung (correctAnswers) in der Prüfungs-HTML ändern und neu bewerten */
    static updateAnswerKey(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** Lehrer: Alle Abgaben einer Prüfung neu automatisch bewerten */
    static recalculateExam(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** Lehrer: Prüfungsversion (Buchstabe) nachträglich korrigieren — Masterpasswort „vertippt“. */
    static updateSubmissionExamVersion(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=KACorrectionController.d.ts.map