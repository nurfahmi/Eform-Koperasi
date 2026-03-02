const prisma = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
  async create({ username, password, role, parent_id, created_by }) {
    const referral_code = (role === 'masteragent' || role === 'subagent')
      ? `REF-${Date.now().toString(36).toUpperCase()}`
      : null;

    const hashed = await bcrypt.hash(password, 10);

    return prisma.user.create({
      data: { username, password: hashed, role, referral_code, parent_id: parent_id || null, created_by: created_by || null }
    });
  },

  async findById(id) {
    return prisma.user.findUnique({ where: { id } });
  },

  async findByUsername(username) {
    return prisma.user.findUnique({ where: { username } });
  },

  async findByReferralCode(code) {
    return prisma.user.findFirst({ where: { referral_code: code } });
  },

  async findByRole(role) {
    return prisma.user.findMany({ where: { role } });
  },

  async findByParent(parentId) {
    return prisma.user.findMany({ where: { parent_id: parentId } });
  },

  async findAll() {
    return prisma.user.findMany({ orderBy: { created_at: 'desc' } });
  },

  async findVisible(user) {
    if (user.role === 'superadmin') {
      return prisma.user.findMany({ include: { parent: { select: { username: true } } }, orderBy: { created_at: 'desc' } });
    }
    if (user.role === 'admin') {
      return prisma.user.findMany({
        where: { OR: [{ created_by: user.id }, { parent_id: user.id }, { id: user.id }] },
        include: { parent: { select: { username: true } } },
        orderBy: { created_at: 'desc' }
      });
    }
    if (user.role === 'masteragent') {
      return prisma.user.findMany({
        where: { OR: [{ parent_id: user.id }, { id: user.id }] },
        include: { parent: { select: { username: true } } },
        orderBy: { created_at: 'desc' }
      });
    }
    return [await prisma.user.findUnique({ where: { id: user.id }, include: { parent: { select: { username: true } } } })];
  },

  async findAgents() {
    return prisma.user.findMany({
      where: { role: { in: ['masteragent', 'subagent'] } },
      orderBy: [{ role: 'asc' }, { username: 'asc' }]
    });
  },

  async update(id, data) {
    return prisma.user.update({ where: { id }, data });
  },

  async updatePassword(id, password) {
    const hashed = await bcrypt.hash(password, 10);
    return prisma.user.update({ where: { id }, data: { password: hashed } });
  },

  async verifyPassword(plaintext, hash) {
    return bcrypt.compare(plaintext, hash);
  },

  async delete(id) {
    return prisma.user.delete({ where: { id } });
  }
};

module.exports = User;
