/** Kleines PDF mit Helvetica (WinAnsi) — für Notizen, Tickets und Folientext. */
export type PdfBlock = {
    title?: string;
    body?: string;
};
export declare function buildTextPdf(docTitle: string, blocks: PdfBlock[]): Buffer;
//# sourceMappingURL=simpleTextPdf.d.ts.map