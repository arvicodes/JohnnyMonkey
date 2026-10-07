export declare const EXAM_LIBRARY_ICON_IMAGE_PREFIX = "img:";
export declare const EXAM_LIBRARY_WHITE_BG_VERSION = 2;
/** Gleicher Schlüssel wie im Client (git-intern ↔ J-M-Reihen). */
export declare function canonicalExamLibraryIconKey(filePath: string): string;
export declare function readTeacherExamLibraryIcons(teacherFolderKey: string): Record<string, string>;
export declare function readTeacherExamLibraryWhiteBgVersion(teacherFolderKey: string): number;
export type TeacherExamLibraryIconTemplate = {
    savedAt: string;
    icons: Record<string, string>;
    byExamType: Record<string, string>;
};
export declare function readTeacherExamLibraryIconTemplate(teacherFolderKey: string): TeacherExamLibraryIconTemplate | null;
/** Aktuelle Icon-Zuordnungen als Vorlage (eigene Kopien unter _vorlage/). */
export declare function saveTeacherExamLibraryIconTemplate(teacherFolderKey: string): {
    icons: Record<string, string>;
    iconTemplate: TeacherExamLibraryIconTemplate;
};
export declare function setTeacherExamLibraryWhiteBgVersion(teacherFolderKey: string, version: number): Record<string, string>;
/** Ersetzt eine vorhandene Icon-Datei (PNG mit Alpha), aktualisiert ggf. .jpg → .png in der Map. */
export declare function overwriteTeacherExamLibraryIconAsset(teacherFolderKey: string, examIconKey: string, assetGitPath: string, uploadBuffer: Buffer): Promise<{
    icons: Record<string, string>;
    iconValue: string;
}>;
export declare function setTeacherExamLibraryIcon(teacherFolderKey: string, examFilePath: string, emoji: string | null | undefined): Record<string, string>;
/** Bild hochladen, skaliert (max. 256 px), unter _Meta/…/_assets/<Lehrer>/ speichern. */
export declare function saveTeacherExamLibraryIconFromUpload(teacherFolderKey: string, examFilePath: string, uploadBuffer: Buffer, originalName: string): Promise<{
    icons: Record<string, string>;
    iconValue: string;
}>;
export declare function migrateTeacherExamLibraryIconKey(teacherFolderKey: string, oldExamPath: string, newExamPath: string): void;
export type TeacherExamLibraryCustomIconChoice = {
    value: string;
    label: string;
};
/** Eigene Icons für die Auswahlliste — identische Bilddateien nur einmal (MD5). */
export declare function listTeacherExamLibraryCustomIconChoices(teacherFolderKey: string): TeacherExamLibraryCustomIconChoice[];
//# sourceMappingURL=examLibraryIconsStore.d.ts.map