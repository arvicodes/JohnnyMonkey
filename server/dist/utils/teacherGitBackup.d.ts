export type TeacherGitBackupStatus = {
    available: boolean;
    reason: 'ok' | 'no-git' | 'not-main' | 'busy' | 'error';
    hint: string;
    where?: 'laptop' | 'school';
};
export type TeacherGitBackupResult = {
    ok: boolean;
    committed: boolean;
    pushed: boolean;
    message: string;
};
export declare function findGitRoot(): string | null;
export declare function getTeacherGitBackupStatus(): TeacherGitBackupStatus;
export declare function runTeacherGitBackup(): Promise<TeacherGitBackupResult>;
//# sourceMappingURL=teacherGitBackup.d.ts.map