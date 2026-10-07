export declare const EXAM_SUBMISSION_ALIASES_RE: RegExp;
export declare function parseExamSubmissionAliases(html: string): string[];
export declare function appendExamSubmissionAlias(html: string, aliasPath: string): string;
export declare function expandSubmissionAliasPaths(aliases: string[]): string[];
export declare function storedKaPathMatchesRequest(requestPath: string, storedPath: string, aliases: string[], pathMatches: (stored: string) => boolean): boolean;
//# sourceMappingURL=examSubmissionAliases.d.ts.map