const Submission = require('../models/submission.model');
const User = require('../models/user.model');

const DashboardController = {
  async analytics(req, res) {
    try {
      const currentUser = req.session.user;
      const stats = await Submission.getStats(currentUser.id, currentUser.role);
      const users = await User.findVisible(currentUser);

      const totalAgents = users.filter(u => u.role === 'masteragent' || u.role === 'subagent').length;

      // Performance table
      const agents = users.filter(u => u.role === 'masteragent' || u.role === 'subagent');
      const performance = [];
      for (const agent of agents) {
        const agentStats = await Submission.getStats(agent.id, agent.role);
        performance.push({
          name: agent.name,
          role: agent.role,
          total: agentStats.total,
          pending: agentStats.pending,
          approved: agentStats.approved
        });
      }

      // Get full user record for referral code
      const fullUser = await User.findById(currentUser.id);

      res.render('dashboard/analytics', {
        layout: 'layouts/main',
        title: 'Analytics',
        user: currentUser,
        stats,
        totalAgents,
        performance,
        referralCode: fullUser?.referral_code || null,
        page: 'analytics'
      });
    } catch (err) {
      console.error('Analytics error:', err);
      req.flash('error', 'Failed to load analytics.');
      res.redirect('/dashboard');
    }
  }
};

module.exports = DashboardController;
