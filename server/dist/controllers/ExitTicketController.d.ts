import { Request, Response } from 'express';
/** Global pro Lehrkraft (Exit-Ticket-Seite ohne Gruppenkontext) */
export declare const EXIT_TICKET_LEGACY_PATH = "__exit_ticket_active__";
export declare class ExitTicketController {
    static publish(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getCurrent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * SuS: eigene Abgabe zur gruppenspezifischen Exit-Ticket-Zeile (für dauerhafte Anzeige z. B. im Stundenbaum).
     */
    static getMySubmission(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static submit(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getResponses(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=ExitTicketController.d.ts.map