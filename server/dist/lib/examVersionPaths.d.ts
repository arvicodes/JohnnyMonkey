export declare const EXAM_VERSIONS_META_RE: RegExp;
export declare const EXAM_VERSION_LETTERS_JS_RE: RegExp;
export type ExamVersionsMeta = {
    letters: string[];
};
export declare function normalizeVersionLetter(raw: string): string | null;
export declare function defaultExamVersionLetters(): string[];
/** Varianten-Dateien im gleichen Ordner (…__B.html) neben der Basis-Datei A. */
export declare function discoverExamVersionLettersNextToBase(baseFullPath: string): string[];
export declare function mergeExamVersionLetters(metaLetters: string[], baseFullPath: string): string[];
/** A/B/C-Metadaten für eine Prüfungsfamilie (gleiche Pfadlogik wie StorageManager.readFile). */
export declare function buildExamVersionInfo(anyVariantGitPath: string, resolveFullFromGit: (gitPath: string) => string | null): {
    letters: string[];
    paths: Record<string, string>;
    baseFilePath: string;
};
export declare function parseExamVersionsMeta(html: string): ExamVersionsMeta;
export declare function writeExamVersionsMeta(html: string, letters: string[]): string;
export declare function syncExamVersionLettersJs(html: string, letters: string[]): string;
export declare function fileStemFromName(fileName: string): string;
export declare function versionLetterFromStem(stem: string): string;
export declare function baseStemFromStem(stem: string): string;
export declare function variantStem(baseStem: string, letter: string): string;
export declare function gitPathVariant(baseGitPath: string, letter: string): string;
export declare function examFamilyStemFromKaPath(kaPath: string): string;
export declare function kaPathsMatchFamily(requestPath: string, storedPath: string): boolean;
export declare function versionLetterFromKaPath(kaPath: string): string;
export declare function ensureVersionLetterMarkup(html: string, letter: string): string;
export declare function examDisplayTitleFromKaKey(kaKey: string): string;
export declare function patchKaKeyInHtml(html: string, kaKey: string): string;
/** KA_KEY, Browser-Tab (<title>) und Kopfzeile (.header-title) an Dateinamen anpassen */
export declare function patchExamPresentationInHtml(html: string, kaKey: string, displayTitle?: string): string;
export declare function extractKaKeyFromExamHtml(html: string): string | null;
/** Tab- und Kopfzeilen-Titel an Dateiname bzw. KA_KEY anpassen (nur für read-html). */
export declare function syncExamPresentationForDelivery(html: string, filePath?: string): string;
export declare function patchAllExamVersionPresentationFiles(baseGit: string, letters: string[], resolveFullPath: (gitPath: string) => string, displayTitle: string): number;
export declare function applyVersionsToExamHtml(html: string, letters: string[], fileLetter: string): string;
export declare function resolveFullPathFromGitIntern(gitInternPath: string, devProjectRoot: string): string;
export declare function readExamHtmlFullPath(fullFilePath: string): string;
export declare function writeExamHtmlFullPath(fullFilePath: string, html: string): void;
//# sourceMappingURL=examVersionPaths.d.ts.map