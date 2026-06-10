const { requireAdmin } = require('../../middleware/auth');

function requireAdminAuth(req, res, next) {
  if (!req.session?.userId || !req.user) {
    return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  }
  return requireAdmin(req, res, next);
}

module.exports = { requireAdminAuth };
