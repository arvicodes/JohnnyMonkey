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

export class MonitoringService {
  private static instance: MonitoringService;
  private requestLogs: MonitoringData[] = [];
  private errorLogs: any[] = [];
  private startTime: Date = new Date();

  private constructor() {}

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  // Request Monitoring Middleware
  static requestMonitor() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      const originalSend = res.send;

      res.send = function(data) {
        const responseTime = Date.now() - start;
        const monitoringData: MonitoringData = {
          timestamp: new Date().toISOString(),
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          responseTime,
          userAgent: req.get('User-Agent') || 'Unknown',
          ip: req.ip || req.connection.remoteAddress || 'Unknown'
        };

        MonitoringService.getInstance().logRequest(monitoringData);
        return originalSend.call(this, data);
      };

      next();
    };
  }

  // Error Monitoring Middleware
  static errorMonitor() {
    return (error: any, req: Request, res: Response, next: NextFunction) => {
      const errorData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        error: error.message,
        stack: error.stack,
        userAgent: req.get('User-Agent') || 'Unknown',
        ip: req.ip || req.connection.remoteAddress || 'Unknown'
      };

      MonitoringService.getInstance().logError(errorData);
      console.error('🚨 Server Error:', errorData);
      
      res.status(500).json({ 
        error: 'Internal Server Error',
        timestamp: errorData.timestamp,
        requestId: Math.random().toString(36).substr(2, 9)
      });
    };
  }

  private logRequest(data: MonitoringData) {
    this.requestLogs.push(data);
    
    // Keep only last 1000 requests
    if (this.requestLogs.length > 1000) {
      this.requestLogs = this.requestLogs.slice(-1000);
    }

    // Log slow requests (>1s)
    if (data.responseTime > 1000) {
      console.warn(`🐌 Slow request: ${data.method} ${data.url} took ${data.responseTime}ms`);
    }
  }

  // Public method for logging errors from outside the class
  logError(error: any) {
    this.errorLogs.push(error);
    
    // Keep only last 100 errors
    if (this.errorLogs.length > 100) {
      this.errorLogs = this.errorLogs.slice(-100);
    }
  }

  // Get monitoring statistics
  getStats() {
    const now = new Date();
    const uptime = now.getTime() - this.startTime.getTime();
    
    const totalRequests = this.requestLogs.length;
    const totalErrors = this.errorLogs.length;
    const avgResponseTime = totalRequests > 0 
      ? this.requestLogs.reduce((sum, req) => sum + req.responseTime, 0) / totalRequests 
      : 0;

    const recentRequests = this.requestLogs.slice(-10);
    const recentErrors = this.errorLogs.slice(-5);

    return {
      uptime: {
        total: uptime,
        formatted: this.formatUptime(uptime)
      },
      requests: {
        total: totalRequests,
        averageResponseTime: Math.round(avgResponseTime),
        recent: recentRequests
      },
      errors: {
        total: totalErrors,
        recent: recentErrors
      },
      performance: {
        slowRequests: this.requestLogs.filter(req => req.responseTime > 1000).length,
        errorRate: totalRequests > 0 ? (totalErrors / totalRequests * 100).toFixed(2) : 0
      }
    };
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // Health check with detailed status
  getHealthStatus() {
    const stats = this.getStats();
    const errorRate = typeof stats.performance.errorRate === 'string' 
      ? parseFloat(stats.performance.errorRate) 
      : stats.performance.errorRate;
    const isHealthy = stats.errors.total < 10 && errorRate < 5;
    
    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      details: stats
    };
  }
}

export default MonitoringService;
