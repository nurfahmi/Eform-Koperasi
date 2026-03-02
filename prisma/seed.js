const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
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
  const defaultPassword = await bcrypt.hash('123456', 10);

  const superadmin = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      username: 'superadmin',
      password: defaultPassword,
      role: 'superadmin',
      referral_code: 'SA0001'
    }
  });
  console.log('✓ Superadmin:', superadmin.username);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: defaultPassword,
      role: 'admin',
      created_by: superadmin.id
    }
  });
  console.log('✓ Admin:', admin.username);

  // Master Agent 1
  const ma1 = await prisma.user.upsert({
    where: { username: 'master1' },
    update: {},
    create: {
      username: 'master1',
      password: defaultPassword,
      role: 'masteragent',
      referral_code: 'REF-MA001',
      parent_id: admin.id,
      created_by: admin.id
    }
  });

  // Master Agent 2
  const ma2 = await prisma.user.upsert({
    where: { username: 'master2' },
    update: {},
    create: {
      username: 'master2',
      password: defaultPassword,
      role: 'masteragent',
      referral_code: 'REF-MA002',
      parent_id: admin.id,
      created_by: admin.id
    }
  });
  console.log('✓ Master Agents:', ma1.username, ma2.username);

  // Sub Agents for Master Agent 1
  const ma1Subs = ['sub_m1_ali', 'sub_m1_abu', 'sub_m1_adam', 'sub_m1_amir', 'sub_m1_arif'];
  for (let i = 0; i < ma1Subs.length; i++) {
    await prisma.user.upsert({
      where: { username: ma1Subs[i] },
      update: {},
      create: {
        username: ma1Subs[i],
        password: defaultPassword,
        role: 'subagent',
        referral_code: `REF-M1S${String(i + 1).padStart(2, '0')}`,
        parent_id: ma1.id,
        created_by: ma1.id
      }
    });
  }
  console.log('✓ Sub Agents (master1):', ma1Subs.join(', '));

  // Sub Agents for Master Agent 2
  const ma2Subs = ['sub_m2_farid', 'sub_m2_hafiz', 'sub_m2_iman', 'sub_m2_johan', 'sub_m2_kamal'];
  for (let i = 0; i < ma2Subs.length; i++) {
    await prisma.user.upsert({
      where: { username: ma2Subs[i] },
      update: {},
      create: {
        username: ma2Subs[i],
        password: defaultPassword,
        role: 'subagent',
        referral_code: `REF-M2S${String(i + 1).padStart(2, '0')}`,
        parent_id: ma2.id,
        created_by: ma2.id
      }
    });
  }
  console.log('✓ Sub Agents (master2):', ma2Subs.join(', '));

  // Clear old submissions
  await prisma.submissionDetail.deleteMany();
  await prisma.submissionFile.deleteMany();
  await prisma.submission.deleteMany();

  // Get created subagent IDs
  const allSubs = await prisma.user.findMany({ where: { role: 'subagent' } });
  const getSubId = (username) => allSubs.find(s => s.username === username)?.id;

  const submissions = [
    // --- Master Agent 1 (direct) --- older Feb cases
    { subagent_id: null, masteragent_id: ma1.id, referral_code: 'REF-MA001', product_key: 'v3-giat-maju', status: 'pending', created_at: new Date('2026-02-15T09:00:00'),
      applicant: { name: 'Rizal bin Hamid', ic: '780413076789', phone: '0166778899', email: 'rizal@gmail.com', address: 'No 8, Lorong Damai, Penang' },
      spouse: { name: 'Rohana binti Samad', ic: '800520080123', phone: '0133445566' }, job: { employer: 'Perniagaan Jaya', position: 'Driver', salary: '2500' }, reference: { name: 'Samad bin Daud', phone: '0177889900', relationship: 'Pakcik' } },
    { subagent_id: null, masteragent_id: ma1.id, referral_code: 'REF-MA001', product_key: 'mbsb-form-new', status: 'pending', created_at: new Date('2026-02-18T10:00:00'),
      applicant: { name: 'Faizal bin Noor', ic: '850610015432', phone: '0124567890', email: 'faizal@gmail.com', address: 'No 5, Jalan Melur, Ipoh' },
      spouse: { name: 'Nadia binti Yusof', ic: '870812025678', phone: '0135678901' }, job: { employer: 'Kedai Kopi Haji', position: 'Manager', salary: '3200' }, reference: { name: 'Noor bin Ismail', phone: '0148765432', relationship: 'Bapa' } },
    { subagent_id: null, masteragent_id: ma1.id, referral_code: 'REF-MA001', product_key: 'e-form-kospem-kopsya', status: 'pending', created_at: new Date('2026-02-22T11:00:00'),
      applicant: { name: 'Shafiq bin Ramli', ic: '900115039876', phone: '0159876543', email: 'shafiq@yahoo.com', address: 'Blok C, Flat Sri Kota, KL' },
      spouse: { name: 'Ain binti Zakaria', ic: '920218041234', phone: '0162345678' }, job: { employer: 'Syarikat Teknik', position: 'Technician', salary: '2900' }, reference: { name: 'Ramli bin Talib', phone: '0171234567', relationship: 'Abang' } },

    // --- sub_m1_ali --- Feb + March 1
    { subagent_id: getSubId('sub_m1_ali'), masteragent_id: ma1.id, referral_code: 'REF-M1S01', product_key: 'komuja-coop-new-form', status: 'pending', created_at: new Date('2026-02-25T08:30:00'),
      applicant: { name: 'Amirul bin Kassim', ic: '880305011122', phone: '0111223344', email: 'amirul@gmail.com', address: 'No 22, Taman Sentosa, Melaka' },
      spouse: { name: 'Syafiqah binti Osman', ic: '900415023344', phone: '0122334455' }, job: { employer: 'Restoran Pak Mat', position: 'Cook', salary: '2100' }, reference: { name: 'Kassim bin Ahmad', phone: '0133445566', relationship: 'Bapa' } },
    { subagent_id: getSubId('sub_m1_ali'), masteragent_id: ma1.id, referral_code: 'REF-M1S01', product_key: 'test', status: 'pending', created_at: new Date('2026-02-27T09:15:00'),
      applicant: { name: 'Danial bin Sulaiman', ic: '910708035566', phone: '0144556677', email: 'danial@hotmail.com', address: 'Lot 88, Kampung Baru, Perak' },
      spouse: { name: 'Izzah binti Kamal', ic: '930812047788', phone: '0155667788' }, job: { employer: 'Bengkel Kereta Ali', position: 'Mechanic', salary: '2400' }, reference: { name: 'Sulaiman bin Hussin', phone: '0166778899', relationship: 'Pakcik' } },
    { subagent_id: getSubId('sub_m1_ali'), masteragent_id: ma1.id, referral_code: 'REF-M1S01', product_key: 'v3-giat-maju', status: 'pending', created_at: new Date('2026-03-01T08:00:00'),
      applicant: { name: 'Haziq bin Wahab', ic: '870201059900', phone: '0177889900', email: 'haziq@gmail.com', address: 'No 3, Persiaran Maju, Selangor' },
      spouse: { name: 'Liyana binti Salleh', ic: '890305061122', phone: '0188990011' }, job: { employer: 'Syarikat Pembinaan Utara', position: 'Supervisor', salary: '3800' }, reference: { name: 'Wahab bin Zainal', phone: '0199001122', relationship: 'Bapa' } },

    // --- sub_m1_abu --- March 1
    { subagent_id: getSubId('sub_m1_abu'), masteragent_id: ma1.id, referral_code: 'REF-M1S02', product_key: 'mbsb-form-new', status: 'pending', created_at: new Date('2026-03-01T09:30:00'),
      applicant: { name: 'Mohd Zaki bin Yusof', ic: '910305031234', phone: '0187654321', email: 'zaki@yahoo.com', address: 'Lot 5, Taman Indah, Selangor' },
      spouse: { name: 'Aisyah binti Karim', ic: '920710045678', phone: '0171112233' }, job: { employer: 'Kilang Besi Utama', position: 'Operator', salary: '3500' }, reference: { name: 'Yusof bin Ali', phone: '0163334455', relationship: 'Bapa' } },
    { subagent_id: getSubId('sub_m1_abu'), masteragent_id: ma1.id, referral_code: 'REF-M1S02', product_key: 'application-form-1', status: 'pending', created_at: new Date('2026-03-01T11:45:00'),
      applicant: { name: 'Irfan bin Latif', ic: '860914052345', phone: '0129988776', email: 'irfan@gmail.com', address: 'No 17, Jalan Anggerik, Kedah' },
      spouse: { name: 'Nurul binti Hassan', ic: '880118063456', phone: '0132211009' }, job: { employer: 'Ladang Sawit Timur', position: 'Clerk', salary: '2600' }, reference: { name: 'Latif bin Razak', phone: '0145544332', relationship: 'Abang' } },
    { subagent_id: getSubId('sub_m1_abu'), masteragent_id: ma1.id, referral_code: 'REF-M1S02', product_key: 'e-form-kospem-kopsya', status: 'pending', created_at: new Date('2026-03-01T14:00:00'),
      applicant: { name: 'Syahmi bin Rashid', ic: '950222074567', phone: '0158877665', email: 'syahmi@yahoo.com', address: 'Blok D, Pangsapuri Permai, JB' },
      spouse: { name: 'Fatin binti Aziz', ic: '970326085678', phone: '0161166554' }, job: { employer: 'Kedai Elektronik Jaya', position: 'Salesman', salary: '2300' }, reference: { name: 'Rashid bin Musa', phone: '0174455443', relationship: 'Bapa' } },

    // --- sub_m1_adam --- March 2 (this week Mon)
    { subagent_id: getSubId('sub_m1_adam'), masteragent_id: ma1.id, referral_code: 'REF-M1S03', product_key: 'komuja-coop-new-form', status: 'pending', created_at: new Date('2026-03-02T08:00:00'),
      applicant: { name: 'Azman bin Ismail', ic: '930715096789', phone: '0148899001', email: 'azman@gmail.com', address: 'Kampung Baru, Kelantan' },
      spouse: { name: 'Mariam binti Abdullah', ic: '950820108901', phone: '0125566778' }, job: { employer: 'Kedai Runcit Pak Ali', position: 'Pembantu Kedai', salary: '1800' }, reference: { name: 'Ismail bin Osman', phone: '0199001122', relationship: 'Bapa' } },
    { subagent_id: getSubId('sub_m1_adam'), masteragent_id: ma1.id, referral_code: 'REF-M1S03', product_key: 'test', status: 'pending', created_at: new Date('2026-03-02T10:30:00'),
      applicant: { name: 'Haikal bin Nordin', ic: '880430112345', phone: '0131122334', email: 'haikal@gmail.com', address: 'No 9, Taman Cempaka, Terengganu' },
      spouse: { name: 'Balkis binti Hamzah', ic: '900604123456', phone: '0142233445' }, job: { employer: 'Pusat Tuisyen Gemilang', position: 'Admin', salary: '2000' }, reference: { name: 'Nordin bin Jaafar', phone: '0153344556', relationship: 'Bapa' } },
    { subagent_id: getSubId('sub_m1_adam'), masteragent_id: ma1.id, referral_code: 'REF-M1S03', product_key: 'v3-giat-maju', status: 'pending', created_at: new Date('2026-03-02T14:45:00'),
      applicant: { name: 'Luqman bin Bakar', ic: '911215134567', phone: '0164455667', email: 'luqman@yahoo.com', address: 'Lot 12, Kampung Pasir, Pahang' },
      spouse: { name: 'Hidayah binti Roslan', ic: '930319145678', phone: '0175566778' }, job: { employer: 'Workshop Bakar & Sons', position: 'Welder', salary: '2700' }, reference: { name: 'Bakar bin Samad', phone: '0186677889', relationship: 'Abang' } },

    // --- Master Agent 2 (direct) --- March 2 + March 3
    { subagent_id: null, masteragent_id: ma2.id, referral_code: 'REF-MA002', product_key: 'mbsb-form-new', status: 'pending', created_at: new Date('2026-03-02T09:15:00'),
      applicant: { name: 'Kamarul Ariffin', ic: '850922056789', phone: '0199887766', email: 'kamarul@hotmail.com', address: 'Blok A, Pangsapuri Harmoni, Johor' },
      spouse: { name: 'Nor Azimah binti Razali', ic: '870215068901', phone: '0112223344' }, job: { employer: 'Pembinaan Utama Sdn Bhd', position: 'Foreman', salary: '4200' }, reference: { name: 'Razali bin Taib', phone: '0154445566', relationship: 'Bapa mentua' } },
    { subagent_id: null, masteragent_id: ma2.id, referral_code: 'REF-MA002', product_key: 'application-form-1', status: 'pending', created_at: new Date('2026-03-02T11:30:00'),
      applicant: { name: 'Termizi bin Harun', ic: '830710072345', phone: '0123344556', email: 'termizi@gmail.com', address: 'No 15, Lorong Bakti, Sabah' },
      spouse: { name: 'Zarina binti Wahid', ic: '850914083456', phone: '0134455667' }, job: { employer: 'Syarikat Perikanan Timur', position: 'Captain', salary: '5000' }, reference: { name: 'Harun bin Dollah', phone: '0145566778', relationship: 'Bapa' } },
    { subagent_id: null, masteragent_id: ma2.id, referral_code: 'REF-MA002', product_key: 'komuja-coop-new-form', status: 'pending', created_at: new Date('2026-03-03T08:00:00'),
      applicant: { name: 'Fikri bin Othman', ic: '920305094567', phone: '0156677889', email: 'fikri@yahoo.com', address: 'Taman Mutiara, Sarawak' },
      spouse: { name: 'Amalina binti Jalil', ic: '940509105678', phone: '0167788990' }, job: { employer: 'Kedai Komputer City', position: 'Technician', salary: '2800' }, reference: { name: 'Othman bin Yusuf', phone: '0178899001', relationship: 'Pakcik' } },

    // --- sub_m2_farid --- March 3 (today)
    { subagent_id: getSubId('sub_m2_farid'), masteragent_id: ma2.id, referral_code: 'REF-M2S01', product_key: 'e-form-kospem-kopsya', status: 'pending', created_at: new Date('2026-03-03T08:30:00'),
      applicant: { name: 'Nazri bin Ghazali', ic: '870128116789', phone: '0189900112', email: 'nazri@gmail.com', address: 'No 7, Jalan Kenanga, Perlis' },
      spouse: { name: 'Salma binti Rahim', ic: '890302128901', phone: '0111011223' }, job: { employer: 'Hospital Tuanku Fauziah', position: 'Attendant', salary: '2200' }, reference: { name: 'Ghazali bin Taib', phone: '0122122334', relationship: 'Bapa' } },
    { subagent_id: getSubId('sub_m2_farid'), masteragent_id: ma2.id, referral_code: 'REF-M2S01', product_key: 'v3-giat-maju', status: 'pending', created_at: new Date('2026-03-03T09:00:00'),
      applicant: { name: 'Redzuan bin Mansor', ic: '940615131234', phone: '0133233445', email: 'redzuan@hotmail.com', address: 'Lot 3, Felda Jengka, Pahang' },
      spouse: { name: 'Hanim binti Alias', ic: '960819142345', phone: '0144344556' }, job: { employer: 'Kilang Getah Nasional', position: 'Worker', salary: '2000' }, reference: { name: 'Mansor bin Daud', phone: '0155455667', relationship: 'Bapa' } },
    { subagent_id: getSubId('sub_m2_farid'), masteragent_id: ma2.id, referral_code: 'REF-M2S01', product_key: 'test', status: 'pending', created_at: new Date('2026-03-03T09:30:00'),
      applicant: { name: 'Zulkifli bin Awang', ic: '810930153456', phone: '0166566778', email: 'zulkifli@gmail.com', address: 'No 20, Kampung Melayu, NS' },
      spouse: { name: 'Jamilah binti Kadir', ic: '830204164567', phone: '0177677889' }, job: { employer: 'Syarikat Logistik Selatan', position: 'Driver', salary: '2600' }, reference: { name: 'Awang bin Said', phone: '0188788990', relationship: 'Abang' } },

    // --- sub_m2_hafiz --- March 3 (today)
    { subagent_id: getSubId('sub_m2_hafiz'), masteragent_id: ma2.id, referral_code: 'REF-M2S02', product_key: 'mbsb-form-new', status: 'pending', created_at: new Date('2026-03-03T10:00:00'),
      applicant: { name: 'Hafiz bin Rahman', ic: '900301175678', phone: '0156677889', email: 'hafiz@gmail.com', address: 'No 3, Taman Baru, Melaka' },
      spouse: { name: 'Siti Nur binti Razak', ic: '910411186789', phone: '0143344556' }, job: { employer: 'Syarikat Logistik Utama', position: 'Clerk', salary: '2200' }, reference: { name: 'Rahman bin Idris', phone: '0187788990', relationship: 'Abang' } },
    { subagent_id: getSubId('sub_m2_hafiz'), masteragent_id: ma2.id, referral_code: 'REF-M2S02', product_key: 'application-form-1', status: 'pending', created_at: new Date('2026-03-03T10:30:00'),
      applicant: { name: 'Azhar bin Moktar', ic: '860507198901', phone: '0199899001', email: 'azhar@yahoo.com', address: 'Taman Damai, Kuantan' },
      spouse: { name: 'Noraini binti Saad', ic: '880711201234', phone: '0111900112' }, job: { employer: 'Warung Pak Zul', position: 'Cook', salary: '1900' }, reference: { name: 'Moktar bin Jamal', phone: '0123011223', relationship: 'Bapa' } },
    { subagent_id: getSubId('sub_m2_hafiz'), masteragent_id: ma2.id, referral_code: 'REF-M2S02', product_key: 'v3-giat-maju', status: 'pending', created_at: new Date('2026-03-03T11:00:00'),
      applicant: { name: 'Imran bin Zakaria', ic: '930920212345', phone: '0134122334', email: 'imran@gmail.com', address: 'No 11, Jalan Impian, Langkawi' },
      spouse: { name: 'Farah binti Hamdan', ic: '950124223456', phone: '0145233445' }, job: { employer: 'Resort Pantai Cenang', position: 'Receptionist', salary: '2500' }, reference: { name: 'Zakaria bin Isa', phone: '0156344556', relationship: 'Pakcik' } },

    // --- sub_m2_iman --- March 3 (today)
    { subagent_id: getSubId('sub_m2_iman'), masteragent_id: ma2.id, referral_code: 'REF-M2S03', product_key: 'e-form-kospem-kopsya', status: 'pending', created_at: new Date('2026-03-03T11:30:00'),
      applicant: { name: 'Alif bin Sulong', ic: '880215234567', phone: '0167455667', email: 'alif@gmail.com', address: 'No 28, Taman Sri, Terengganu' },
      spouse: { name: 'Wahidah binti Md Noh', ic: '900419245678', phone: '0178566778' }, job: { employer: 'Jabatan Perikanan', position: 'Admin', salary: '3000' }, reference: { name: 'Sulong bin Awang', phone: '0189677889', relationship: 'Bapa' } },
    { subagent_id: getSubId('sub_m2_iman'), masteragent_id: ma2.id, referral_code: 'REF-M2S03', product_key: 'komuja-coop-new-form', status: 'pending', created_at: new Date('2026-03-03T12:00:00'),
      applicant: { name: 'Qayyum bin Hashim', ic: '910703256789', phone: '0191788990', email: 'qayyum@hotmail.com', address: 'Kampung Jelutong, Penang' },
      spouse: { name: 'Atikah binti Zahari', ic: '930907268901', phone: '0113899001' }, job: { employer: 'Kilang Makanan MMC', position: 'QC Inspector', salary: '2700' }, reference: { name: 'Hashim bin Omar', phone: '0124900112', relationship: 'Bapa' } },
    { subagent_id: getSubId('sub_m2_iman'), masteragent_id: ma2.id, referral_code: 'REF-M2S03', product_key: 'test', status: 'pending', created_at: new Date('2026-03-03T12:30:00'),
      applicant: { name: 'Badrul bin Kamarudin', ic: '860112271234', phone: '0136011223', email: 'badrul@gmail.com', address: 'Lot 44, Felda Sungai Tekam' },
      spouse: { name: 'Maziah binti Rosli', ic: '880316282345', phone: '0147122334' }, job: { employer: 'Ladang Kelapa Sawit BHD', position: 'Mandur', salary: '3100' }, reference: { name: 'Kamarudin bin Talib', phone: '0158233445', relationship: 'Abang' } },
  ];

  for (const s of submissions) {
    const submission = await prisma.submission.create({
      data: {
        subagent_id: s.subagent_id,
        masteragent_id: s.masteragent_id,
        referral_code: s.referral_code,
        product_key: s.product_key || null,
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

  console.log('\n✅ Seed complete! Default password for all users: 123456');
  console.log('Users: superadmin, admin, master1, master2');
  console.log('Master1 subs:', ma1Subs.join(', '));
  console.log('Master2 subs:', ma2Subs.join(', '));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
