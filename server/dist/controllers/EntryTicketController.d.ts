import { Request, Response } from 'express';
export declare class EntryTicketController {
    /** Lehrkraft startet Entry Ticket (Schüler sehen Hinweis-Popup) */
    static signal(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** Lehrer oder Klassen-Moderator: Entry Ticket beenden → archivieren für SuS-Materialien, Signal löschen */
    static complete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Abgeschlossenes Entry Ticket (für SuS-Materialien inkl. Lösungen).
     * Query: groupId, und lessonPath und/oder index (1 = zuerst erledigt).
     * Ohne index: neuestes Archiv dieser Stunde.
     */
    static getCompleted(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Alle erledigten Entry Tickets einer Lerngruppe (SuS-Dashboard).
     * Query: groupId — Nummerierung 1 = zuerst erledigt.
     */
    static getCompletedList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Lehrkraft: erledigtes Entry Ticket aus der gemeinsamen Liste entfernen.
     * Body/Query: groupId, index (1 = zuerst erledigt).
     */
    static deleteCompleted(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Lehrer-Historie: erledigte Entry-Ticket-Durchläufe.
     * Query optional: groupId, setId (Fragenset) — Nummerierung jeweils 1 = zuerst.
     */
    static getHistory(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getCurrent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** Eigene Fragensets der Lehrkraft (Server-Backup + Wiederherstellung aus Signalen). */
    static getCustomSets(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static saveCustomSets(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
/** Gleiches Motiv wie aktuelles Entry-Ticket (für Exit-Ticket-UI in derselben Stunde) */
export declare function resolveActiveEntryHeroImageIndexForUser(userId: string, role: string): Promise<number | null>;
//# sourceMappingURL=EntryTicketController.d.ts.map