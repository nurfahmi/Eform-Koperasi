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
      const { username, password } = req.body;
      if (!username || !password) {
        req.flash('error', 'Username and password are required.');
        return res.redirect('/auth/login');
      }

      const user = await User.findByUsername(username.trim().toLowerCase());
      if (!user) {
        req.flash('error', 'Invalid username or password.');
        return res.redirect('/auth/login');
      }

      const valid = await User.verifyPassword(password, user.password);
      if (!valid) {
        req.flash('error', 'Invalid username or password.');
        return res.redirect('/auth/login');
      }

      req.session.user = {
        id: user.id,
        name: user.username,
        username: user.username,
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
