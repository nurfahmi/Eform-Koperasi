const prisma = require('../config/db');

const DEFAULTS = {
  site_name: 'Credit Submission System',
  site_short: 'CSS',
  logo_url: '',
  favicon_url: '',
  primary_color: '#0ea5e9',
  accent_color: '#8b5cf6'
};

const Setting = {
  async get(key) {
    const row = await prisma.siteSetting.findUnique({ where: { key } });
    return row ? row.value : (DEFAULTS[key] || null);
  },

  async getAll() {
    const rows = await prisma.siteSetting.findMany();
    const settings = { ...DEFAULTS };
    rows.forEach(r => { settings[r.key] = r.value; });
    return settings;
  },

  async set(key, value) {
    return prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
  },

  async setMany(obj) {
    const ops = Object.entries(obj).map(([key, value]) =>
      prisma.siteSetting.upsert({
        where: { key },
        update: { value: value || '' },
        create: { key, value: value || '' }
      })
    );
    return Promise.all(ops);
  }
};

module.exports = Setting;
