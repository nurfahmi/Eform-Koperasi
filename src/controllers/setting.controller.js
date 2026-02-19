const Setting = require('../models/setting.model');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../public/branding');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const name = file.fieldname + path.extname(file.originalname).toLowerCase();
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|svg|ico|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) return cb(null, true);
    cb(new Error('Only image files allowed'));
  }
});

const SettingController = {
  uploadFields: upload.fields([
    { name: 'logo_file', maxCount: 1 },
    { name: 'favicon_file', maxCount: 1 }
  ]),

  async showSettings(req, res) {
    try {
      const settings = await Setting.getAll();
      res.render('dashboard/settings', {
        layout: 'layouts/main',
        title: 'Site Settings',
        user: req.session.user,
        page: 'settings',
        settings,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (err) {
      console.error('Settings error:', err);
      req.flash('error', 'Failed to load settings.');
      res.redirect('/dashboard');
    }
  },

  async updateSettings(req, res) {
    try {
      const { site_name, site_short, primary_color, accent_color } = req.body;
      const updates = { site_name, site_short, primary_color, accent_color };

      // Handle logo upload
      if (req.files && req.files.logo_file && req.files.logo_file[0]) {
        updates.logo_url = '/public/branding/' + req.files.logo_file[0].filename;
      }

      // Handle favicon upload
      if (req.files && req.files.favicon_file && req.files.favicon_file[0]) {
        updates.favicon_url = '/public/branding/' + req.files.favicon_file[0].filename;
      }

      await Setting.setMany(updates);
      req.flash('success', 'Settings saved.');
      res.redirect('/dashboard/settings');
    } catch (err) {
      console.error('Update settings error:', err);
      req.flash('error', 'Failed to save settings.');
      res.redirect('/dashboard/settings');
    }
  }
};

module.exports = SettingController;
