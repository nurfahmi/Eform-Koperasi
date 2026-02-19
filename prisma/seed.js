const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
const ALGORITHM = 'aes-256-cbc';
const KEY = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

async function main() {
  // 1. Superadmin
  const superadmin = await prisma.user.upsert({
    where: { email: 'superadmin@eric.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@eric.com',
      role: 'superadmin',
      referral_code: 'SA0001'
    }
  });
  console.log('✓ Superadmin:', superadmin.email);

  // 2. Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@eric.com' },
    update: {},
    create: {
      name: 'Admin One',
      email: 'admin@eric.com',
      role: 'admin',
      created_by: superadmin.id
    }
  });
  console.log('✓ Admin:', admin.email);

  // 3. Master Agents
  const ma1 = await prisma.user.upsert({
    where: { email: 'master1@eric.com' },
    update: {},
    create: {
      name: 'Ahmad Razak',
      email: 'master1@eric.com',
      role: 'masteragent',
      referral_code: 'REF-MA001',
      parent_id: admin.id,
      created_by: admin.id
    }
  });

  const ma2 = await prisma.user.upsert({
    where: { email: 'master2@eric.com' },
    update: {},
    create: {
      name: 'Siti Aminah',
      email: 'master2@eric.com',
      role: 'masteragent',
      referral_code: 'REF-MA002',
      parent_id: admin.id,
      created_by: admin.id
    }
  });
  console.log('✓ Master Agents:', ma1.email, ma2.email);

  // 4. Sub Agents
  const sa1 = await prisma.user.upsert({
    where: { email: 'sub1@eric.com' },
    update: {},
    create: {
      name: 'Farid Ismail',
      email: 'sub1@eric.com',
      role: 'subagent',
      referral_code: 'REF-SA001',
      parent_id: ma1.id,
      created_by: ma1.id
    }
  });

  const sa2 = await prisma.user.upsert({
    where: { email: 'sub2@eric.com' },
    update: {},
    create: {
      name: 'Nurul Huda',
      email: 'sub2@eric.com',
      role: 'subagent',
      referral_code: 'REF-SA002',
      parent_id: ma1.id,
      created_by: ma1.id
    }
  });

  const sa3 = await prisma.user.upsert({
    where: { email: 'sub3@eric.com' },
    update: {},
    create: {
      name: 'Hafiz Rahman',
      email: 'sub3@eric.com',
      role: 'subagent',
      referral_code: 'REF-SA003',
      parent_id: ma2.id,
      created_by: ma2.id
    }
  });
  console.log('✓ Sub Agents:', sa1.email, sa2.email, sa3.email);

  // 5. Clear old submissions
  await prisma.submissionDetail.deleteMany();
  await prisma.submissionFile.deleteMany();
  await prisma.submission.deleteMany();

  // 6. Sample Submissions with different dates
  const submissions = [
    {
      subagent_id: sa1.id,
      masteragent_id: ma1.id,
      referral_code: 'REF-SA001',
      status: 'pending',
      created_at: new Date('2026-01-10T09:15:00'),
      applicant: { name: 'Ali bin Abu', ic: '880512-01-1234', phone: '0121234567', email: 'ali@gmail.com', address: 'No 12, Jalan Maju, Kuala Lumpur' },
      spouse: { name: 'Fatimah binti Hassan', ic: '890614-02-5678', phone: '0139876543', employer: 'Syarikat ABC' },
      job: { employer: 'Syarikat XYZ Sdn Bhd', position: 'Operator', salary: '2800', duration: '3 tahun' },
      reference: { name: 'Hassan bin Omar', phone: '0145551234', relationship: 'Abang' }
    },
    {
      subagent_id: sa2.id,
      masteragent_id: ma1.id,
      referral_code: 'REF-SA002',
      status: 'reviewed',
      created_at: new Date('2026-01-18T14:30:00'),
      applicant: { name: 'Mohd Zaki bin Yusof', ic: '910305-03-9012', phone: '0187654321', email: 'zaki@yahoo.com', address: 'Lot 5, Taman Indah, Selangor' },
      spouse: { name: 'Aisyah binti Karim', ic: '920710-04-3456', phone: '0171112233', employer: 'Kedai Runcit Sari' },
      job: { employer: 'Kilang Besi Utama', position: 'Supervisor', salary: '3500', duration: '5 tahun' },
      reference: { name: 'Yusof bin Ali', phone: '0163334455', relationship: 'Bapa' }
    },
    {
      subagent_id: sa3.id,
      masteragent_id: ma2.id,
      referral_code: 'REF-SA003',
      status: 'approved',
      created_at: new Date('2026-01-25T11:00:00'),
      applicant: { name: 'Kamarul Ariffin', ic: '850922-05-7890', phone: '0199887766', email: 'kamarul@hotmail.com', address: 'Blok A, Pangsapuri Harmoni, Johor' },
      spouse: { name: 'Nor Azimah binti Razali', ic: '870215-06-2345', phone: '0112223344', employer: 'Hospital Sultanah' },
      job: { employer: 'Pembinaan Utama Sdn Bhd', position: 'Foreman', salary: '4200', duration: '8 tahun' },
      reference: { name: 'Razali bin Taib', phone: '0154445566', relationship: 'Bapa mentua' }
    },
    {
      subagent_id: null,
      masteragent_id: ma1.id,
      referral_code: 'REF-MA001',
      status: 'pending',
      created_at: new Date('2026-02-05T16:45:00'),
      applicant: { name: 'Rizal bin Hamid', ic: '780413-07-6789', phone: '0166778899', email: 'rizal@gmail.com', address: 'No 8, Lorong Damai, Penang' },
      spouse: { name: 'Rohana binti Samad', ic: '800520-08-0123', phone: '0133445566', employer: 'Restoran Selera Kampung' },
      job: { employer: 'Perniagaan Jaya', position: 'Driver', salary: '2500', duration: '2 tahun' },
      reference: { name: 'Samad bin Daud', phone: '0177889900', relationship: 'Pakcik' }
    },
    {
      subagent_id: sa1.id,
      masteragent_id: ma1.id,
      referral_code: 'REF-SA001',
      status: 'rejected',
      created_at: new Date('2026-02-12T20:10:00'),
      applicant: { name: 'Azman bin Ismail', ic: '930715-09-4567', phone: '0148899001', email: 'azman@gmail.com', address: 'Kampung Baru, Kelantan' },
      spouse: { name: 'Mariam binti Abdullah', ic: '950820-10-8901', phone: '0125566778', employer: 'Tiada' },
      job: { employer: 'Kedai Runcit Pak Ali', position: 'Pembantu Kedai', salary: '1800', duration: '6 bulan' },
      reference: { name: 'Ismail bin Osman', phone: '0199001122', relationship: 'Bapa' }
    }
  ];

  for (const s of submissions) {
    const submission = await prisma.submission.create({
      data: {
        subagent_id: s.subagent_id,
        masteragent_id: s.masteragent_id,
        referral_code: s.referral_code,
        status: s.status,
        created_at: s.created_at
      }
    });

    await prisma.submissionDetail.create({
      data: {
        submission_id: submission.id,
        applicant_data: encrypt(JSON.stringify(s.applicant)),
        spouse_data: encrypt(JSON.stringify(s.spouse)),
        job_data: encrypt(JSON.stringify(s.job)),
        reference_data: encrypt(JSON.stringify(s.reference))
      }
    });

    console.log(`✓ Submission: ${s.applicant.name} (${s.status})`);
  }

  console.log('\n✅ Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
