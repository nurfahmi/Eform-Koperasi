const User = require('../models/user.model');

const ReferralService = {
  async resolve(referralCode) {
    if (!referralCode) return { subagent_id: null, masteragent_id: null };

    const user = await User.findByReferralCode(referralCode);
    if (!user) return { subagent_id: null, masteragent_id: null };

    if (user.role === 'masteragent') {
      return { subagent_id: null, masteragent_id: user.id };
    }

    if (user.role === 'subagent') {
      return { subagent_id: user.id, masteragent_id: user.parent_id };
    }

    return { subagent_id: null, masteragent_id: null };
  },

  async getAgentName(referralCode) {
    if (!referralCode) return null;
    const user = await User.findByReferralCode(referralCode);
    return user ? user.name : null;
  }
};

module.exports = ReferralService;
