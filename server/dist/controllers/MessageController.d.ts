import { Request, Response } from 'express';
export declare class MessageController {
    /**
     * Nachricht an einen Schüler senden (Lehrer)
     */
    static sendMessage(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Mehrere Nachrichten an mehrere Schüler senden (Lehrer)
     */
    static sendBulkMessages(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Alle Nachrichten für einen Schüler abrufen
     */
    static getStudentMessages(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Nachricht als gelesen markieren
     */
    static markAsRead(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Anzahl ungelesener Nachrichten für einen Schüler
     */
    static getUnreadCount(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Alle gesendeten Nachrichten eines Lehrers abrufen
     */
    static getTeacherMessages(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=MessageController.d.ts.map