declare const router: import("express-serve-static-core").Router;
/** Dashboard-Tab „Reihen“: ausgewählte Arbeits-Reihen (früher nur localStorage). */
export declare const WORKING_REIHEN_DB_PATH = "__dashboard_working_reihen__";
/** Mac-/Schul-Absolutpfade → portabler Relativpfad unter git-intern/. */
export declare function toPortableReihePath(raw: string): string;
export default router;
//# sourceMappingURL=teacherDashboardPrefs.d.ts.map