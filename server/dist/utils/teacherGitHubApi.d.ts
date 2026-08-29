export type SchoolStandChange = {
    path: string;
    kind: 'added' | 'changed';
};
export type GithubStandResult = {
    ok: boolean;
    committed: boolean;
    pushed: boolean;
    message: string;
    changes?: SchoolStandChange[];
};
export declare function readGithubToken(): string;
export declare function hasGithubToken(): boolean;
export declare function previewSchoolStandChanges(): Promise<SchoolStandChange[]>;
export declare function pushSchoolStandToGithub(): Promise<GithubStandResult>;
export declare function previewSchoolStandPull(): Promise<SchoolStandChange[]>;
export declare function pullSchoolStandFromGithub(): Promise<GithubStandResult>;
//# sourceMappingURL=teacherGitHubApi.d.ts.map