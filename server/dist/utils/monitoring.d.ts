import { Request, Response, NextFunction } from 'express';
export interface MonitoringData {
    timestamp: string;
    method: string;
    url: string;
    statusCode: number;
    responseTime: number;
    userAgent: string;
    ip: string;
    error?: string;
}
export declare class MonitoringService {
    private static instance;
    private requestLogs;
    private errorLogs;
    private startTime;
    private constructor();
    static getInstance(): MonitoringService;
    static requestMonitor(): (req: Request, res: Response, next: NextFunction) => void;
    static errorMonitor(): (error: any, req: Request, res: Response, next: NextFunction) => void;
    private logRequest;
    logError(error: any): void;
    getStats(): {
        uptime: {
            total: number;
            formatted: string;
        };
        requests: {
            total: number;
            averageResponseTime: number;
            recent: MonitoringData[];
        };
        errors: {
            total: number;
            recent: any[];
        };
        performance: {
            slowRequests: number;
            errorRate: string | number;
        };
    };
    private formatUptime;
    getHealthStatus(): {
        status: string;
        timestamp: string;
        details: {
            uptime: {
                total: number;
                formatted: string;
            };
            requests: {
                total: number;
                averageResponseTime: number;
                recent: MonitoringData[];
            };
            errors: {
                total: number;
                recent: any[];
            };
            performance: {
                slowRequests: number;
                errorRate: string | number;
            };
        };
    };
}
export default MonitoringService;
//# sourceMappingURL=monitoring.d.ts.map