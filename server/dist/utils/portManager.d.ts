import { Server } from 'http';
export declare class PortManager {
    private static readonly DEFAULT_PORT;
    private static readonly MAX_PORT_ATTEMPTS;
    /**
     * Findet einen freien Port, beginnend mit dem Standard-Port
     */
    static findFreePort(startPort?: number): Promise<number>;
    /**
     * Überprüft, ob ein Port verfügbar ist
     */
    private static isPortAvailable;
    /**
     * Startet den Server mit automatischer Port-Findung
     */
    static startServer(app: any, preferredPort?: number): Promise<{
        server: Server;
        port: number;
    }>;
    /**
     * Beendet alle laufenden Server-Prozesse auf einem bestimmten Port
     */
    static killProcessOnPort(port: number): Promise<void>;
    /**
     * Überprüft und bereinigt Ports vor dem Start
     */
    static cleanupPorts(): Promise<void>;
}
//# sourceMappingURL=portManager.d.ts.map