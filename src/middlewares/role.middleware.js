function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/auth/login');
    }
    if (!allowedRoles.includes(req.session.user.role)) {
      return res.status(403).render('errors/403', {
        layout: 'layouts/main',
        title: 'Forbidden',
        user: req.session.user
      });
    }
    next();
  };
}

module.exports = roleMiddleware;
