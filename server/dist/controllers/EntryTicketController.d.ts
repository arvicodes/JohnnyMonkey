import { Request, Response } from 'express';
export declare class EntryTicketController {
    /** Lehrkraft startet Entry Ticket (Schüler sehen Hinweis-Popup) */
    static signal(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getCurrent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
/** Gleiches Motiv wie aktuelles Entry-Ticket (für Exit-Ticket-UI in derselben Stunde) */
export declare function resolveActiveEntryHeroImageIndexForUser(userId: string, role: string): Promise<number | null>;
//# sourceMappingURL=EntryTicketController.d.ts.map