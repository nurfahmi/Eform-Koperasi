function authMiddleware(req, res, next) {
  if (req.session && req.session.user) {
    res.locals.user = req.session.user;
    return next();
  }
  return res.redirect('/auth/login');
}

module.exports = authMiddleware;
