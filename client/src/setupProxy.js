const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');

const PROXY_TIMEOUT_MS = 600_000;

/** Keep-Alive zum API — verhindert Socket-Explosion (TIME_WAIT) bei vielen Bildern. */
const apiAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30_000,
  maxSockets: 32,
  maxFreeSockets: 8,
  timeout: PROXY_TIMEOUT_MS,
});

const proxyOpts = {
  target: 'http://127.0.0.1:3003',
  changeOrigin: true,
  agent: apiAgent,
  /** Große Dateien / viele parallele Bilder — Standard-Timeout sonst 504 */
  proxyTimeout: PROXY_TIMEOUT_MS,
  timeout: PROXY_TIMEOUT_MS,
  xfwd: true,
  on: {
    proxyReq: (proxyReq) => {
      proxyReq.setTimeout(PROXY_TIMEOUT_MS);
    },
    proxyRes: (proxyRes) => {
      proxyRes.setTimeout(PROXY_TIMEOUT_MS);
    },
    error: (err, req, res) => {
      // Nicht den Dev-Server killen — klare Antwort an den Client
      console.warn('[HPM]', err.code || err.message, req?.url || '');
      if (res && !res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: 'API-Proxy kurzzeitig nicht erreichbar. Bitte erneut versuchen.',
            code: err.code || 'PROXY_ERROR',
          })
        );
      }
    },
  },
};

module.exports = function setupProxy(app) {
  app.use('/api', createProxyMiddleware(proxyOpts));
  app.use('/material', createProxyMiddleware(proxyOpts));
  app.use('/uploads', createProxyMiddleware(proxyOpts));
};
