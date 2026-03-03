const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  const target = process.env.BACKEND_URL || 'http://localhost:3001';
  console.log('[Proxy] /api -> '+target);
  app.use('/api', createProxyMiddleware({
    target,
    changeOrigin: true,
    logLevel: 'silent'
  }));
};
