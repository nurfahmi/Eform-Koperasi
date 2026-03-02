const User = require('../models/user.model');
const Activity = require('../models/activity.model');

const ROLE_HIERARCHY = {
  superadmin: ['superadmin', 'admin', 'masteragent', 'subagent'],
  admin: ['masteragent', 'subagent'],
  masteragent: ['subagent'],
  subagent: []
};

const UserController = {
  async listUsers(req, res) {
    try {
      const currentUser = req.session.user;
      const users = await User.findVisible(currentUser);
      const creatableRoles = ROLE_HIERARCHY[currentUser.role] || [];
      const masterAgents = await User.findByRole('masteragent');

      res.render('dashboard/users', {
        layout: 'layouts/main',
        title: 'User Management',
        user: currentUser,
        users,
        creatableRoles,
        masterAgents,
        page: 'users',
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (err) {
      console.error('List users error:', err);
      req.flash('error', 'Failed to load users.');
      res.redirect('/dashboard');
    }
  },

  async createUser(req, res) {
    try {
      const currentUser = req.session.user;
      const { username, password, role, parent_id } = req.body;

      const allowed = ROLE_HIERARCHY[currentUser.role] || [];
      if (!allowed.includes(role)) {
        req.flash('error', 'You are not allowed to create this role.');
        return res.redirect('/dashboard/users');
      }

      if (!username || !password) {
        req.flash('error', 'Username and password are required.');
        return res.redirect('/dashboard/users');
      }

      const existing = await User.findByUsername(username.trim().toLowerCase());
      if (existing) {
        req.flash('error', 'A user with this username already exists.');
        return res.redirect('/dashboard/users');
      }

      let assignedParent = parent_id || null;
      if (role === 'subagent' && currentUser.role === 'masteragent') {
        assignedParent = currentUser.id;
      }

      const newUser = await User.create({
        username: username.trim().toLowerCase(),
        password,
        role,
        parent_id: assignedParent,
        created_by: currentUser.id
      });

      await Activity.log({
        user_id: currentUser.id,
        action: 'CREATE_USER',
        target_id: newUser.id,
        description: `Created ${role}: ${username}`
      });

      req.flash('success', 'User created successfully.');
      res.redirect('/dashboard/users');
    } catch (err) {
      console.error('Create user error:', err);
      req.flash('error', 'Failed to create user.');
      res.redirect('/dashboard/users');
    }
  },

  async deleteUser(req, res) {
    try {
      const currentUser = req.session.user;
      const { id } = req.params;

      if (currentUser.role !== 'superadmin' && currentUser.role !== 'admin') {
        req.flash('error', 'Not authorized.');
        return res.redirect('/dashboard/users');
      }

      await User.delete(id);

      await Activity.log({
        user_id: currentUser.id,
        action: 'DELETE_USER',
        target_id: id,
        description: `Deleted user ${id}`
      });

      req.flash('success', 'User deleted.');
      res.redirect('/dashboard/users');
    } catch (err) {
      console.error('Delete user error:', err);
      req.flash('error', 'Failed to delete user.');
      res.redirect('/dashboard/users');
    }
  },

  async editUser(req, res) {
    try {
      const currentUser = req.session.user;
      const { id } = req.params;
      const { username, password, role, parent_id } = req.body;

      if (currentUser.role !== 'superadmin' && currentUser.role !== 'admin') {
        req.flash('error', 'Not authorized.');
        return res.redirect('/dashboard/users');
      }

      if (id === currentUser.id) {
        req.flash('error', 'Cannot edit your own account from here.');
        return res.redirect('/dashboard/users');
      }

      const allowed = ROLE_HIERARCHY[currentUser.role] || [];
      if (!allowed.includes(role)) {
        req.flash('error', 'You are not allowed to assign this role.');
        return res.redirect('/dashboard/users');
      }

      // Check username uniqueness (exclude current user)
      const existing = await User.findByUsername(username.trim().toLowerCase());
      if (existing && existing.id !== id) {
        req.flash('error', 'A user with this username already exists.');
        return res.redirect('/dashboard/users');
      }

      await User.update(id, {
        username: username.trim().toLowerCase(),
        role,
        parent_id: role === 'subagent' ? (parent_id || null) : null
      });

      // Update password only if provided
      if (password && password.trim()) {
        await User.updatePassword(id, password);
      }

      await Activity.log({
        user_id: currentUser.id,
        action: 'EDIT_USER',
        target_id: id,
        description: `Updated user: ${username} (${role})`
      });

      req.flash('success', 'User updated successfully.');
      res.redirect('/dashboard/users');
    } catch (err) {
      console.error('Edit user error:', err);
      req.flash('error', 'Failed to update user.');
      res.redirect('/dashboard/users');
    }
  },

  async impersonate(req, res) {
    try {
      const currentUser = req.session.user;

      if (currentUser.role !== 'superadmin') {
        req.flash('error', 'Only superadmin can impersonate.');
        return res.redirect('/dashboard/users');
      }

      const target = await User.findById(req.params.id);
      if (!target) {
        req.flash('error', 'User not found.');
        return res.redirect('/dashboard/users');
      }

      // Store original superadmin session
      req.session.originalUser = currentUser;
      req.session.user = {
        id: target.id,
        name: target.username,
        username: target.username,
        role: target.role,
        parent_id: target.parent_id
      };

      await Activity.log({
        user_id: currentUser.id,
        action: 'IMPERSONATE',
        target_id: target.id,
        description: `Impersonating ${target.username} (${target.role})`
      });

      req.flash('success', `Now viewing as ${target.username}`);
      res.redirect('/dashboard');
    } catch (err) {
      console.error('Impersonate error:', err);
      req.flash('error', 'Failed to impersonate.');
      res.redirect('/dashboard/users');
    }
  },

  async stopImpersonate(req, res) {
    try {
      if (!req.session.originalUser) {
        return res.redirect('/dashboard');
      }

      const impersonatedName = req.session.user.username;
      req.session.user = req.session.originalUser;
      req.session.originalUser = null;

      req.flash('success', `Stopped impersonating ${impersonatedName}`);
      res.redirect('/dashboard');
    } catch (err) {
      console.error('Stop impersonate error:', err);
      res.redirect('/dashboard');
    }
  }
};

module.exports = UserController;
