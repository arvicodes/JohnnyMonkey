export type ParsedPptxBox = {
    kind: 'text';
    x: number;
    y: number;
    w: number;
    h: number;
    html: string;
    fillColor?: string | null;
    strokeColor?: string | null;
    fontSizePt?: number | null;
    bold?: boolean;
    color?: string | null;
} | {
    kind: 'image';
    x: number;
    y: number;
    w: number;
    h: number;
    name: string;
    mime: string;
    base64: string;
} | {
    kind: 'shape';
    x: number;
    y: number;
    w: number;
    h: number;
    fillColor?: string | null;
    strokeColor?: string | null;
    shapeKind: 'rect' | 'ellipse';
};
export type ParsedPptxSlide = {
    index: number;
    title: string;
    notes: string;
    boxes: ParsedPptxBox[];
    backgroundColor?: string | null;
    /** Legacy-Felder für ältere Clients */
    bodyLines: string[];
    images: Array<{
        name: string;
        mime: string;
        base64: string;
    }>;
};
export type ParsedPptx = {
    fileName: string;
    slideCount: number;
    slideWidthEmu: number;
    slideHeightEmu: number;
    slides: ParsedPptxSlide[];
};
/**
 * PPTX → positionierte Boxen (Text / Bild / Form) in % der Folie.
 * Layout der PPTX wird räumlich übernommen; Johnny-Stil kommt beim Einfügen.
 */
export declare function parsePptxBuffer(buffer: Buffer, fileName?: string): ParsedPptx;
//# sourceMappingURL=pptxParse.d.ts.map