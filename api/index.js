const app = require('../backend/index');

// Strip the /api prefix added by Vercel rewrites
// so Express routes like /signup, /login, /claim/* still work as-is
module.exports = (req, res) => {
  if (req.url.startsWith('/api')) {
    req.url = req.url.replace(/^\/api/, '') || '/';
  }
  return app(req, res);
};
