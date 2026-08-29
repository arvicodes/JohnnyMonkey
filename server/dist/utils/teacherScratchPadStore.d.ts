/** Aktueller Stand der Lehrer-Schnellnotizen (pro Lehrkraft). */
export declare const SCRATCH_PAD_LIVE_DIR_NAME = "Lehrer-Schnellnotizen";
/** Separater Ordner für regelmäßige Sicherheitskopien (Projektwurzel). */
export declare const SCRATCH_PAD_BACKUP_ROOT_NAME = "Notizen-Sicherheitskopien";
/** DB-Schlüssel in TeacherLessonInstruction.lessonPath (pro Lehrkraft). */
export declare const SCRATCH_PAD_DB_PATH = "__teacher_scratch_pad__";
export declare function sanitizeScratchPadFolderPart(raw: string, maxLen?: number): string;
export declare function scratchPadUserFolderKey(userId: string, userName?: string): string;
/** Live-Ordner: `J-M-Reihen/Lehrer-Schnellnotizen/<user>/` */
export declare function ensureScratchPadLiveDir(userKey: string): string;
/** Backup-Ordner: `Notizen-Sicherheitskopien/<user>/` */
export declare function ensureScratchPadBackupDir(userKey: string): string;
/** Legt beide Wurzelordner an (auch ohne User), damit sie im Dateisystem sichtbar sind. */
export declare function ensureScratchPadRoots(): {
    liveRoot: string;
    backupRoot: string;
};
export type ScratchPadPayload = {
    pages: unknown[];
    pageIndex: number;
    updatedAt: string;
    userId?: string;
    userName?: string;
    savedAt?: string;
};
/** Sichtbare Text-/Tintenmenge — zum Schutz vor versehentlichem Leerlauf-Überschreiben. */
export declare function scratchPadContentLen(payload: ScratchPadPayload | null | undefined): number;
export declare function wouldWipeScratchPad(existing: ScratchPadPayload | null | undefined, incoming: ScratchPadPayload | null | undefined): boolean;
/** Rohe Textmenge (HTML), damit ein älterer Tab einen längeren Schulstand nicht zurückschreibt. */
export declare function scratchPadRawLen(payload: ScratchPadPayload | null | undefined): number;
export declare function wouldShrinkScratchPad(existing: ScratchPadPayload | null | undefined, incoming: ScratchPadPayload | null | undefined): boolean;
export declare function readScratchPadLive(userKey: string): ScratchPadPayload | null;
/**
 * Speichert den aktuellen Stand und schreibt Sicherheitskopien.
 * - Live: `J-M-Reihen/Lehrer-Schnellnotizen/<user>/latest.json`
 * - Backup: `Notizen-Sicherheitskopien/<user>/latest.json` (+ zeitgestempelte Kopien)
 */
export declare function writeScratchPad(userKey: string, payload: ScratchPadPayload, options?: {
    timestamped?: boolean;
    forceStamp?: boolean;
}): {
    live: string;
    backupLatest: string;
    backupStamp: string | null;
    teacherBackup?: string | null;
};
//# sourceMappingURL=teacherScratchPadStore.d.ts.map