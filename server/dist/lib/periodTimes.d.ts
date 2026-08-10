export type PeriodTime = {
    period: number;
    start: string;
    end: string;
};
export declare const DEFAULT_JOHNNY_PERIOD_TIMES: PeriodTime[];
export declare function parsePeriodTimes(json: string | null | undefined): PeriodTime[];
export declare function periodTimesToJson(periods: PeriodTime[]): string;
/** Europe/Berlin wall-clock parts for scheduling */
export declare function getBerlinNow(): {
    date: string;
    dayOfWeek: number;
    hours: number;
    minutes: number;
    now: Date;
};
export declare function parseTimeToMinutes(time: string): number;
export declare function berlinDateTime(date: string, time: string): Date;
export declare const DAY_LABELS: Record<number, string>;
//# sourceMappingURL=periodTimes.d.ts.map