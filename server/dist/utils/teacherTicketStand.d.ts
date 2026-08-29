export type TicketStandSet = {
    id?: string;
    name?: string;
    lessons?: unknown[];
    [key: string]: unknown;
};
export type TicketStandPayload = {
    sets: TicketStandSet[];
    savedAt?: string;
    teacherId?: string;
};
export declare function ticketsLatestPath(): string;
export declare function readTicketsLatest(): TicketStandPayload | null;
export declare function ticketsLatestSavedAtMs(): number;
export declare function preferTicketsLatestFile(): boolean;
export declare function applyPulledTicketsFromFile(): TicketStandPayload | null;
export declare function checkpointSqliteFile(dbPath: string): void;
export declare function checkpointStandDatabases(): void;
//# sourceMappingURL=teacherTicketStand.d.ts.map