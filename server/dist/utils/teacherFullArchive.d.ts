export declare function ensureDownloadsDir(): string;
/** Extra-Kopie der aktuellen Notizen und Tickets — Live-Dateien bleiben unberührt. */
export declare function writeExtraNotesTicketsCopy(): string;
export type TeacherFullArchiveResult = {
    zipPath: string;
    fileName: string;
    extraCopyDir: string;
    counts: {
        presentations: number;
        notesFiles: number;
        ticketFiles: number;
        existingDocs: number;
    };
};
export declare function buildTeacherFullArchive(): Promise<TeacherFullArchiveResult>;
export declare function teacherFullArchiveDownloadName(): string;
//# sourceMappingURL=teacherFullArchive.d.ts.map