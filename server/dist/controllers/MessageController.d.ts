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
     * Alle empfangenen Nachrichten für einen Schüler abrufen (vom Lehrer gesendet)
     * Da beide Nachrichtentypen die gleiche Struktur haben, geben wir alle zurück
     * und unterscheiden im Frontend basierend auf dem Kontext
     */
    static getStudentMessages(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Alle gesendeten Nachrichten eines Schülers abrufen (an Lehrer gesendet)
     * Da die Struktur gleich ist, geben wir alle Nachrichten zurück, bei denen der Schüler beteiligt ist
     * Die Unterscheidung erfolgt im Frontend basierend auf dem Kontext
     */
    static getStudentSentMessages(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
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
    /**
     * Nachricht löschen (Lehrer kann nur eigene gesendete Nachrichten löschen)
     */
    static deleteMessage(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Empfangene Nachrichten eines Lehrers (von Schülern)
     * Diese Funktion gibt alle Nachrichten zurück, bei denen der Lehrer der Empfänger ist
     * (teacherId = Lehrer-ID und die Nachricht wurde von einem Schüler gesendet)
     */
    static getTeacherReceivedMessages(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Nachricht an Lehrer senden (Schüler)
     */
    static sendMessageToTeacher(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=MessageController.d.ts.map