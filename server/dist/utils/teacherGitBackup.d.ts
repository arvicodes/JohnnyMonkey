export type StandChangeKind = 'added' | 'changed' | 'removed';
export type StandChange = {
    path: string;
    kind: StandChangeKind;
    label: string;
};
export type TeacherGitBackupStatus = {
    available: boolean;
    reason: 'ok' | 'no-git' | 'not-main' | 'busy' | 'error';
    hint: string;
    where?: 'laptop' | 'school';
};
export type TeacherGitBackupPreview = TeacherGitBackupStatus & {
    explanation: string;
    changes: StandChange[];
    summary: string;
};
export type TeacherGitBackupResult = {
    ok: boolean;
    committed: boolean;
    pushed: boolean;
    message: string;
    changes?: StandChange[];
    explanation?: string;
    where?: 'laptop' | 'school';
};
export declare function findGitRoot(): string | null;
export declare function describeStandPath(repoPath: string): string;
export declare function getTeacherGitBackupStatus(): TeacherGitBackupStatus;
export declare function previewTeacherGitBackup(): Promise<TeacherGitBackupPreview>;
export declare function runTeacherGitBackup(): Promise<TeacherGitBackupResult>;
//# sourceMappingURL=teacherGitBackup.d.ts.map