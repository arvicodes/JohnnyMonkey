const { createProxyMiddleware } = require('http-proxy-middleware');

const proxyOpts = {
  target: 'http://127.0.0.1:3003',
  changeOrigin: true,
  /** Große Story-Websites (Bilder) — Standard-Timeout sonst 504 */
  proxyTimeout: 300000,
  timeout: 300000,
};

module.exports = function setupProxy(app) {
  app.use('/api', createProxyMiddleware(proxyOpts));
  app.use('/material', createProxyMiddleware(proxyOpts));
};
