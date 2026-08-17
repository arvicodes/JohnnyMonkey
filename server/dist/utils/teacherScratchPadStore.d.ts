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
export declare function readScratchPadLive(userKey: string): ScratchPadPayload | null;
/**
 * Speichert den aktuellen Stand und schreibt Sicherheitskopien.
 * - Live: `J-M-Reihen/Lehrer-Schnellnotizen/<user>/latest.json`
 * - Backup: `Notizen-Sicherheitskopien/<user>/latest.json` (+ zeitgestempelte Kopien)
 */
export declare function writeScratchPad(userKey: string, payload: ScratchPadPayload): {
    live: string;
    backupLatest: string;
    backupStamp: string | null;
};
//# sourceMappingURL=teacherScratchPadStore.d.ts.map