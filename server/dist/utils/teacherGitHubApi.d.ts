export type GithubStandResult = {
    ok: boolean;
    committed: boolean;
    pushed: boolean;
    message: string;
};
export declare function readGithubToken(): string;
export declare function hasGithubToken(): boolean;
export declare function pushSchoolStandToGithub(): Promise<GithubStandResult>;
//# sourceMappingURL=teacherGitHubApi.d.ts.map