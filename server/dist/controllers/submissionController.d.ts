import { Request, Response } from 'express';
import multer from 'multer';
export declare const upload: multer.Multer;
/**
 * Erstellt oder findet ein Assignment für eine H_ Datei
 */
export declare const getOrCreateAssignment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Schüler lädt eine Abgabe hoch
 */
export declare const submitAssignment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Ruft eine spezifische Submission ab (für Schüler oder Lehrer)
 */
export declare const getSubmission: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Ruft alle Submissions für ein Assignment ab (für Lehrer)
 */
export declare const getAssignmentSubmissions: (req: Request, res: Response) => Promise<void>;
/**
 * Liefert die hochgeladene Datei aus
 */
export declare const downloadSubmission: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Prüft ob ein Schüler bereits eine Abgabe für ein Assignment hat
 */
export declare const checkStudentSubmission: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Fügt einen Lehrer-Kommentar zu einer Submission hinzu
 */
export declare const addTeacherComment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Löscht eine Submission (nur für den Schüler selbst)
 */
export declare const deleteSubmission: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Holt alle Abgaben eines Schülers mit Kommentaren für die Statistik
 */
export declare const getStudentSubmissionStats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=submissionController.d.ts.map