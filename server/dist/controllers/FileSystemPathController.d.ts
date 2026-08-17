import { Request, Response } from 'express';
export interface FileSystemPath {
    id: string;
    path: string;
    name: string;
    teacherId: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface DirectoryItem {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size: number;
    extension: string;
    children?: DirectoryItem[];
}
export interface DirectoryContent {
    path: string;
    root: DirectoryItem;
    totalItems: number;
    maxDepth: number;
}
export declare class FileSystemPathController {
    /** PPTX/PPT → PDF (LibreOffice/soffice; lokal installiert) für Folien-Editor */
    private static convertPowerPointBufferToPdf;
    /**
     * Get all paths
     */
    static getAllPaths(req: Request, res: Response): Promise<void>;
    /**
     * Get file extension from filename
     */
    private static getFileExtension;
    static savePath(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readDirectory(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getPathsByTeacher(req: Request, res: Response): Promise<void>;
    static deletePath(req: Request, res: Response): Promise<void>;
    static readHtmlFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readDocxFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readExcelFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readPowerPointFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * PowerPoint-Datei nach PDF konvertieren und inline ausliefern (Folien-Editor im Browser).
     * Benötigt eine funktionierende LibreOffice-/soffice-Installation auf dem Server.
     */
    static readPptxAsPdf(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readPdfFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readPdfByFilename(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private static findFileInDirectory;
    static readGoodNotesFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readImageFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static readTextFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static downloadFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get J-M-Reihen path for current environment
     */
    static getJmReihenPath(req: Request, res: Response): Promise<void>;
    /**
     * Save a file (e.g., whiteboard) to a specific directory
     */
    static saveFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Bild-URL (z. B. Drag aus anderem Browser-Tab) herunterladen und im Stundenordner speichern.
     */
    static saveFromUrl(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Datei im Stundenordner löschen (nur unter J-M-Reihen / git-intern).
     */
    static deleteFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Load whiteboard file (.wb) as JSON
     */
    static loadWhiteboardFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Serve static files from J-M-Reihen directory
     */
    static serveStaticFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Scan directory for subdirectories only (recursively)
     */
    static scanDirectory(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Save file using sendBeacon (for automatic saving when closing tab)
     */
    static saveFileBeacon(req: Request, res: Response): Promise<void>;
    /**
     * Create a new examination file (KA, KU, HU, QZ)
     */
    static createExamination(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Create a new lesson folder with standard markdown files
     */
    static createLessonFolder(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Generiert Prüfungsinhalte basierend auf einem Prompt
     */
    static generateExaminationContent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Analysiert einen Prompt und generiert Aufgaben
     */
    private static parsePromptAndGenerateTasks;
    /**
     * Generiert eine Multiple-Choice-Aufgabe mit AI
     */
    private static generateMultipleChoiceTask;
    /**
     * Generiert eine Textaufgabe mit AI
     */
    private static generateTextTask;
    /**
     * Generiert eine Frage mit AI (OpenAI oder Fallback)
     */
    private static generateAIQuestion;
    /**
     * Generiert Fallback-Inhalte wenn keine AI verfügbar ist
     */
    private static generateFallbackQuestion;
    /**
     * Liest alle Aufgaben aus einer HTML-Datei
     */
    static getExaminationQuestions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Aktualisiert eine einzelne Frage in der HTML-Datei
     */
    static updateSingleQuestion(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Aktualisiert den Titel einer Prüfung
     */
    static updateExaminationTitle(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Generiert eine einzelne Frage und ersetzt sie in der HTML-Datei
     */
    static generateSingleQuestion(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=FileSystemPathController.d.ts.map