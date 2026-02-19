/**
 * Seed script: delete all submissions, then create one complete submission.
 * Run: node scripts/seed-submission.js
 */
require('dotenv').config();
const prisma = require('../src/config/db');
const encryption = require('../src/services/encryption.service');

const applicant_data = {
  name: 'MUHAMMAD AHMAD BIN MOHD RAZALI',
  ic: '780413-07-6789',
  phone: '0123456789',
  email: 'ahmad.razali@gmail.com',
  address: 'NO 8 LORONG DAMAI 3, TAMAN HARMONI, 11700 GELUGOR, PULAU PINANG',
  tanggungan: '4',
  pendidikan: 'Diploma',
  jenis_kediaman: 'Sendiri',
  tempoh_menetap: '10 tahun',
  nama_ibu: 'FATIMAH BINTI IBRAHIM',
  ic_ibu: '550812-02-5678',
  alamat_ibu: 'NO 12 JALAN MAWAR, TAMAN SERI INDAH, 14000 BUKIT MERTAJAM, PULAU PINANG'
};

const spouse_data = {
  name: 'SITI NURHALIZA BINTI ABDULLAH',
  ic: '820725-04-5124',
  jawatan: 'KERANI',
  alamat_majikan: 'SYARIKAT ABC SDN BHD, LOT 5 JALAN INDUSTRI, 13600 PERAI, PULAU PINANG',
  tel_pejabat: '04-3901234',
  phone: '0134567890',
  gaji: '2800'
};

const job_data = {
  employer: 'JABATAN PENDIDIKAN NEGERI PULAU PINANG',
  alamat_majikan: 'ARAS 5, BLOK B, KOMTAR, 10000 GEORGE TOWN, PULAU PINANG',
  position: 'PEMBANTU TADBIR (PERKERANIAN/OPERASI) N19',
  tarikh_mula: '2005-03-15',
  tel_pejabat: '04-2612345',
  salary: '3850',
  payslip_link: 'https://payslip.anm.gov.my',
  payslip_password: 'ahmad7804',
  hrmis_password: 'Hrmis@2024'
};

const reference_data = {
  name: 'MOHD FAIZAL BIN HASSAN',
  ic: '800520-07-5511',
  address: 'NO 22 JALAN KENANGA, TAMAN DESA DAMAI, 14000 BUKIT MERTAJAM, PULAU PINANG',
  phone: '0145678901',
  relationship: 'Abang'
};

async function main() {
  console.log('🗑️  Deleting all submission files...');
  await prisma.submissionFile.deleteMany();
  console.log('🗑️  Deleting all submission details...');
  await prisma.submissionDetail.deleteMany();
  console.log('🗑️  Deleting all submissions...');
  await prisma.submission.deleteMany();
  console.log('✅ All submissions deleted.\n');

  // Find the first user to attach the submission to
  const user = await prisma.user.findFirst({ orderBy: { created_at: 'asc' } });
  if (!user) {
    console.error('❌ No users found. Create a user first.');
    process.exit(1);
  }
  console.log(`👤 Using user: ${user.name} (${user.role})\n`);

  const agentField = user.role === 'masteragent' ? 'masteragent_id' : 'subagent_id';

  const submission = await prisma.submission.create({
    data: {
      [agentField]: user.id,
      referral_code: user.referral_code || null,
      status: 'pending'
    }
  });

  await prisma.submissionDetail.create({
    data: {
      submission_id: submission.id,
      applicant_data: encryption.encrypt(JSON.stringify(applicant_data)),
      spouse_data: encryption.encrypt(JSON.stringify(spouse_data)),
      job_data: encryption.encrypt(JSON.stringify(job_data)),
      reference_data: encryption.encrypt(JSON.stringify(reference_data))
    }
  });

  console.log('✅ Seeded 1 complete submission:');
  console.log(`   ID: ${submission.id}`);
  console.log(`   Pemohon: ${applicant_data.name}`);
  console.log(`   IC: ${applicant_data.ic}`);
  console.log(`   Pasangan: ${spouse_data.name}`);
  console.log(`   Majikan: ${job_data.employer}`);
  console.log(`   Saudara: ${reference_data.name}`);
  console.log('\n🎉 Done!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
