/** Von der Lehrerin angelegte Sammelordner unter J-M-Reihen. */
export declare const JM_TEACHER_BACKUP_DIR: {
    readonly notes: "Backup - Notizen";
    readonly slides: "Backup - Folien";
    readonly tickets: "Backup - Tickets";
};
export type TeacherBackupKind = keyof typeof JM_TEACHER_BACKUP_DIR;
export declare function sanitizeBackupLabel(raw: string, maxLen?: number): string;
export declare function ensureTeacherBackupDir(kind: TeacherBackupKind): string;
export declare function ensureTeacherBackupRoots(): string[];
export declare function writeTeacherTimestampedBackup(opts: {
    kind: TeacherBackupKind;
    label?: string;
    payload: unknown;
    force?: boolean;
}): string | null;
//# sourceMappingURL=jmTeacherBackup.d.ts.map