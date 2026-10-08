import { AddressInfo } from 'net';
import { Server } from 'http';

export class PortManager {
  private static readonly DEFAULT_PORT = 3001;
  private static readonly MAX_PORT_ATTEMPTS = 10;

  /**
   * Findet einen freien Port, beginnend mit dem Standard-Port
   */
  static async findFreePort(startPort: number = this.DEFAULT_PORT): Promise<number> {
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
  private static async isPortAvailable(port: number): Promise<boolean> {
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

  private static listenOnce(app: any, port: number): Promise<{ server: Server; port: number }> {
    return new Promise((resolve, reject) => {
      const server = app.listen(port, '127.0.0.1', () => {
        const actualPort = (server.address() as AddressInfo)?.port || port;
        server.timeout = 600_000;
        server.keepAliveTimeout = 650_000;
        server.headersTimeout = 660_000;
        server.requestTimeout = 600_000;
        console.log(`🚀 Server started successfully on port ${actualPort}`);
        resolve({ server, port: actualPort });
      });

      server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Port ${port} is already in use. Please try again.`));
        } else {
          console.error('❌ Server error:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Startet den Server mit automatischer Port-Findung
   */
  static async startServer(app: any, preferredPort?: number): Promise<{ server: Server; port: number }> {
    const port = preferredPort || await this.findFreePort();
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.listenOnce(app, port);
      } catch (error: any) {
        const busy = String(error?.message || '').includes('already in use');
        if (!busy || attempt >= maxAttempts) {
          if (busy) console.error(`❌ Port ${port} is already in use`);
          throw error;
        }
        console.warn(`⚠️ Port ${port} noch belegt — warte auf Freigabe (${attempt}/${maxAttempts})…`);
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    throw new Error(`Port ${port} is already in use. Please try again.`);
  }

  /**
   * Beendet alle laufenden Server-Prozesse auf einem bestimmten Port
   */
  static async killProcessOnPort(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      
      // Für macOS/Linux
      const myPid = process.pid;
      const command = `lsof -ti:${port} 2>/dev/null | grep -v '^${myPid}$' | xargs kill -9 2>/dev/null || true`;
      
      exec(command, (error: any, stdout: string, stderr: string) => {
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
  static async cleanupPorts(port: number = this.DEFAULT_PORT): Promise<void> {
    console.log(`🧹 Checking for port conflicts on ${port}...`);

    try {
      await this.killProcessOnPort(port);
      console.log('✅ Port cleanup completed');
    } catch (error) {
      console.log('ℹ️  Port cleanup skipped');
    }
  }
}
