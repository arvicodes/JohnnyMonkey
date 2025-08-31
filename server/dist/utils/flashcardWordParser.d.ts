export interface FlashcardData {
    front: string;
    back: string;
    hint?: string;
}
export interface ParsedFlashcardDocument {
    title: string;
    cards: FlashcardData[];
}
export declare function parseFlashcardWordFile(filePath: string): Promise<ParsedFlashcardDocument>;
//# sourceMappingURL=flashcardWordParser.d.ts.map