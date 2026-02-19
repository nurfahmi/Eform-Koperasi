const User = require('../models/user.model');

const AuthController = {
  loginPage(req, res) {
    if (req.session && req.session.user) {
      return res.redirect('/dashboard');
    }
    res.render('auth/login', {
      layout: 'layouts/main',
      title: 'Login',
      error: req.flash ? req.flash('error') : null,
      user: null
    });
  },

  async login(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        req.flash('error', 'Email is required.');
        return res.redirect('/auth/login');
      }

      const user = await User.findByEmail(email.trim().toLowerCase());
      if (!user) {
        req.flash('error', 'No account found with this email.');
        return res.redirect('/auth/login');
      }

      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        parent_id: user.parent_id
      };

      return res.redirect('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      req.flash('error', 'Something went wrong.');
      return res.redirect('/auth/login');
    }
  },

  logout(req, res) {
    req.session.destroy(() => {
      res.redirect('/auth/login');
    });
  }
};

module.exports = AuthController;
