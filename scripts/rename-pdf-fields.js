/**
 * One-time script to rename PDF form fields from generic names (Text160, etc.)
 * to meaningful, maintainable names.
 * 
 * Run: node scripts/rename-pdf-fields.js
 */
const { PDFDocument, PDFName, PDFHexString } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

// Map: old field name → new meaningful name
const RENAME_MAP = {
  // --- Page 1: Header (recurs across pages) ---
  'Nama':       'pemohon_nama',
  'No KP':      'pemohon_ic',

  // --- Butir-Butir Pembiayaan ---
  'Text163':    'pembiayaan_jumlah',
  'Text164':    'pembiayaan_tempoh',

  // --- Keterangan Peribadi Pemohon ---
  'Text160':    'peribadi_nama',
  'Text161':    'peribadi_nama_2',
  'Text162':    'peribadi_nama_3',
  'Text165':    'peribadi_ic',
  'Text167':    'peribadi_poskod',
  'Text179':    'peribadi_alamat_1',
  'Text180':    'peribadi_alamat_2',
  'Text181':    'peribadi_alamat_3',
  'Text182':    'peribadi_alamat_4',
  'Text184':    'peribadi_tarikh_lahir',
  'Text185':    'peribadi_bangsa',
  'Text183':    'peribadi_tel_rumah',
  'Text186':    'peribadi_tel_bimbit',
  'Text187':    'peribadi_tel_pejabat',
  'Text188':    'peribadi_jawatan',
  'Text189':    'peribadi_gaji',
  'Text190':    'peribadi_kod_jabatan',
  'Text191':    'peribadi_no_pekerja',

  // --- Majikan ---
  'Text197':    'majikan_nama',
  'Text198':    'majikan_alamat_1',
  'Text199':    'majikan_alamat_2',

  // --- Saudara Terdekat ---
  'Text192':    'saudara_nama',
  'Text193':    'saudara_alamat_1',
  'Text194':    'saudara_alamat_2',
  'Text195':    'saudara_hubungan',
  'Text196':    'saudara_tel',

  // --- Butir Penjamin ---
  'Text200':    'penjamin_nama',
  'Text211':    'penjamin_tel_pejabat',
  'Text219':    'penjamin_gaji',

  // --- Pasangan / Suami Isteri ---
  'Text220':    'pasangan_nama',
  'Text221':    'pasangan_ic',
  'Text222':    'pasangan_ic_lama',
  'Text223':    'pasangan_alamat_majikan',
  'Text224':    'pasangan_tel_pejabat',
  'Text225':    'pasangan_jawatan',
  'Text226':    'pasangan_gaji',
  'Text227':    'pasangan_lama_bekerja',

  // --- Other pages (Saksi, Marketing, etc.) ---
  'Text2':      'saksi_nama',
  'Text4':      'saksi_ic',
  'MARKETING':  'marketing_nama',
  'Alamat':     'surat_alamat',
  'Serbaguna PekerjaPekerja Malaysia Berhad berjumlah RM': 'surat_jumlah_rm',
};

async function main() {
  const templateDir = path.join(__dirname, '../templates');
  const inputFile = path.join(templateDir, 'kospem-mbsb.pdf');
  const outputFile = path.join(templateDir, 'kospem-mbsb.pdf'); // overwrite

  console.log('Loading PDF...');
  const pdfBytes = fs.readFileSync(inputFile);
  const doc = await PDFDocument.load(pdfBytes);
  const form = doc.getForm();
  const fields = form.getFields();

  console.log(`Total fields: ${fields.length}`);
  let renamed = 0;

  for (const field of fields) {
    const oldName = field.getName();
    const newName = RENAME_MAP[oldName];
    if (newName) {
      field.acroField.dict.set(PDFName.of('T'), PDFHexString.fromText(newName));
      console.log(`  ✓ ${oldName} → ${newName}`);
      renamed++;
    }
  }

  console.log(`\nRenamed ${renamed} fields.`);

  // Verify by listing all fields
  console.log('\n--- Final field list ---');
  const doc2 = await PDFDocument.load(await doc.save());
  const form2 = doc2.getForm();
  form2.getFields().forEach((f, i) => {
    console.log(`  ${i}. ${f.getName()}`);
  });

  // Save
  const saved = await doc.save();
  fs.writeFileSync(outputFile, Buffer.from(saved));
  console.log(`\nSaved to: ${outputFile}`);
}

main().catch(e => console.error('Error:', e));
