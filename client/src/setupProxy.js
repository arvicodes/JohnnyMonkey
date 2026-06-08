const { createProxyMiddleware } = require('http-proxy-middleware');

const PROXY_TIMEOUT_MS = 600_000;

const proxyOpts = {
  target: 'http://127.0.0.1:3003',
  changeOrigin: true,
  /** Große Story-Websites (Bilder) — Standard-Timeout sonst 504 */
  proxyTimeout: PROXY_TIMEOUT_MS,
  timeout: PROXY_TIMEOUT_MS,
  on: {
    proxyReq: (proxyReq) => {
      proxyReq.setTimeout(PROXY_TIMEOUT_MS);
    },
    proxyRes: (proxyRes) => {
      proxyRes.setTimeout(PROXY_TIMEOUT_MS);
    },
  },
};

module.exports = function setupProxy(app) {
  app.use('/api', createProxyMiddleware(proxyOpts));
  app.use('/material', createProxyMiddleware(proxyOpts));
};
