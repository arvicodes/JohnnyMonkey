interface QuizQuestion {
    question: string;
    correctAnswer: string;
    options: string[];
    tip: string;
    explanation: string;
}
export declare function parseWordFile(filePath: string): Promise<QuizQuestion[]>;
export {};
//# sourceMappingURL=wordParser.d.ts.map