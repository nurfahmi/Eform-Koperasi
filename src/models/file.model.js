const prisma = require('../config/db');

const File = {
  async create({ submission_id, file_type, file_path }) {
    return prisma.submissionFile.create({
      data: { submission_id, file_type, file_path }
    });
  },

  async findBySubmission(submissionId) {
    return prisma.submissionFile.findMany({
      where: { submission_id: submissionId },
      orderBy: { uploaded_at: 'asc' }
    });
  },

  async findById(id) {
    return prisma.submissionFile.findUnique({ where: { id } });
  }
};

module.exports = File;
