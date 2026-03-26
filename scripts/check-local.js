#!/usr/bin/env node
/**
 * Prüft, ob API (3003) und React-Dev-Server (3000) erreichbar sind.
 * Aufruf im Projektroot: node scripts/check-local.js
 */
const http = require('http');

function httpGet({ port, path = '/' }) {
  return new Promise((resolve) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path, method: 'GET', timeout: 4000 },
      (res) => {
        res.resume();
        resolve({ ok: true, status: res.statusCode });
      }
    );
    req.on('error', () => resolve({ ok: false, status: null }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, status: null });
    });
    req.end();
  });
}

(async () => {
  const api = await httpGet({ port: 3003, path: '/health' });
  const web = await httpGet({ port: 3000, path: '/' });

  console.log('');
  console.log('JohnnyMonkey – lokale Erreichbarkeit (127.0.0.1)');
  console.log('──────────────────────────────────────────────');
  console.log(
    `  API / Webpack-Proxy: 3003  ${api.ok ? `✓ HTTP ${api.status}` : '✗ nicht erreichbar'}`
  );
  console.log(
    `  Website (React):     3000  ${web.ok ? `✓ HTTP ${web.status}` : '✗ nicht erreichbar'}`
  );
  console.log('');

  if (!api.ok || !web.ok) {
    console.log('So startest du alles (im Projektroot JohnnyMonkey):');
    console.log('  npm install');
    console.log('  npm run dev');
    console.log('');
    console.log('Dann im Browser: http://127.0.0.1:3000');
    console.log('(Falls „localhost“ Probleme macht: immer 127.0.0.1 verwenden.)');
    console.log('');
    process.exit(1);
  }
  process.exit(0);
})();
