"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortManager = void 0;
class PortManager {
    /**
     * Findet einen freien Port, beginnend mit dem Standard-Port
     */
    static async findFreePort(startPort = this.DEFAULT_PORT) {
        for (let port = startPort; port < startPort + this.MAX_PORT_ATTEMPTS; port++) {
            if (await this.isPortAvailable(port)) {
                return port;
            }
        }
        // Fallback: Verwende Port 0 (OS wählt automatisch)
        return 0;
    }
    /**
     * Überprüft, ob ein Port verfügbar ist
     */
    static async isPortAvailable(port) {
        return new Promise((resolve) => {
            const net = require('net');
            const server = net.createServer();
            server.listen(port, () => {
                server.once('close', () => {
                    resolve(true);
                });
                server.close();
            });
            server.on('error', () => {
                resolve(false);
            });
        });
    }
    /**
     * Startet den Server mit automatischer Port-Findung
     */
    static async startServer(app, preferredPort) {
        // Force the preferred port if specified
        const port = preferredPort || await this.findFreePort();
        return new Promise((resolve, reject) => {
            const server = app.listen(port, () => {
                var _a;
                const actualPort = ((_a = server.address()) === null || _a === void 0 ? void 0 : _a.port) || port;
                server.timeout = 600000;
                server.keepAliveTimeout = 650000;
                server.headersTimeout = 660000;
                server.requestTimeout = 600000;
                console.log(`🚀 Server started successfully on port ${actualPort}`);
                resolve({ server, port: actualPort });
            });
            server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    console.error(`❌ Port ${port} is already in use`);
                    reject(new Error(`Port ${port} is already in use. Please try again.`));
                }
                else {
                    console.error('❌ Server error:', error);
                    reject(error);
                }
            });
        });
    }
    /**
     * Beendet alle laufenden Server-Prozesse auf einem bestimmten Port
     */
    static async killProcessOnPort(port) {
        return new Promise((resolve, reject) => {
            const { exec } = require('child_process');
            // Für macOS/Linux
            const command = `lsof -ti:${port} | xargs kill -9 2>/dev/null || echo "No process found on port ${port}"`;
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.log(`ℹ️  ${stdout}`);
                }
                resolve();
            });
        });
    }
    /**
     * Überprüft und bereinigt Ports vor dem Start
     */
    static async cleanupPorts() {
        console.log('🧹 Checking for port conflicts...');
        try {
            await this.killProcessOnPort(this.DEFAULT_PORT);
            console.log('✅ Port cleanup completed');
        }
        catch (error) {
            console.log('ℹ️  Port cleanup skipped');
        }
    }
}
exports.PortManager = PortManager;
PortManager.DEFAULT_PORT = 3001;
PortManager.MAX_PORT_ATTEMPTS = 10;
//# sourceMappingURL=portManager.js.map