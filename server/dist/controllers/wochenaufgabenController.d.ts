import { Request, Response } from 'express';
export declare const WA_PHASE1_DAYS = 5;
export declare const WA_PHASE2_DAYS = 2;
export declare const WA_PHASE3_DAYS = 2;
export type WaPhase = 'draft' | 'phase1' | 'phase2' | 'phase3' | 'completed';
export declare function waVirtualPath(lessonPath: string, key: string): string;
export declare const WA_KEYS: {
    readonly solution: "WA_L1_loesung";
    readonly video: "WA_V_erklaervideo";
    readonly audio: "WA_L3_audio";
    readonly correction: "WA_L5_korrektur";
};
export declare function computePhase(activatedAt: Date | null, now?: Date): WaPhase;
/** Status aller Wochenaufgaben in einem Ordner. */
export declare const listWochenaufgabeStates: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/** Lehrer schaltet Wochenaufgabe frei (grau → gelb). Legt DB-Eintrag an bzw. setzt Phase zurück. */
export declare const activateWochenaufgabe: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/** Schüler reserviert V (Erklärvideo). */
export declare const claimWochenaufgabeVideo: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=wochenaufgabenController.d.ts.map