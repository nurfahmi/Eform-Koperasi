const PdfService = require('../services/pdf.service');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/temp');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + '.pdf')
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed'), false);
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

const TemplateController = {
  uploadMiddleware: upload.single('pdf_file'),

  // GET / — list products
  async listTemplates(req, res) {
    res.render('dashboard/templates', {
      layout: 'layouts/main',
      title: 'Loan Products',
      user: req.session.user,
      templates: PdfService.getLoanProducts(),
      page: 'templates'
    });
  },

  // POST /upload — upload PDF, go straight to visual mapper
  async uploadTemplate(req, res) {
    let tempPath = null;
    try {
      if (!req.file) {
        req.flash('error', 'Sila pilih fail PDF.');
        return res.redirect('/dashboard/settings/templates');
      }
      tempPath = req.file.path;
      const originalName = req.file.originalname;

      // Derive product name & key from filename
      let productName = path.parse(originalName).name.replace(/[_-]+/g, ' ').toUpperCase().trim();
      let productKey = productName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (!productKey) productKey = 'product-' + Date.now();

      const finalFilename = productKey + '.pdf';
      const finalPath = path.join(PdfService.TEMPLATES_DIR, finalFilename);
      fs.copyFileSync(tempPath, finalPath);
      fs.unlinkSync(tempPath);
      tempPath = null;

      // Register product (with empty fieldMap)
      try {
        PdfService.addProduct(productKey, productName, finalFilename);
      } catch {
        const newKey = productKey + '-' + Date.now();
        PdfService.addProduct(newKey, productName, finalFilename);
        productKey = newKey;
      }

      req.flash('success', `"${productName}" uploaded. Map the fields below.`);
      res.redirect(`/dashboard/settings/templates/${productKey}/map`);
    } catch (err) {
      console.error('Upload error:', err);
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      req.flash('error', 'Upload failed: ' + err.message);
      res.redirect('/dashboard/settings/templates');
    }
  },

  // GET /:key/map — visual field mapper
  async mapFields(req, res) {
    try {
      const template = PdfService.getProduct(req.params.key);
      if (!template) {
        req.flash('error', 'Template not found.');
        return res.redirect('/dashboard/settings/templates');
      }

      const fields = await PdfService.getFields(template.file);
      const fieldMap = template.fieldMap || {};

      res.render('dashboard/template-map', {
        layout: 'layouts/main',
        title: `Map Fields — ${template.label}`,
        user: req.session.user,
        template,
        fields,
        fieldMap,
        standardFields: PdfService.STANDARD_FIELDS,
        page: 'templates'
      });
    } catch (err) {
      console.error('Map fields error:', err);
      req.flash('error', 'Failed to load: ' + err.message);
      res.redirect('/dashboard/settings/templates');
    }
  },

  // POST /:key/map — save field mappings to JSON
  async saveMap(req, res) {
    try {
      const template = PdfService.getProduct(req.params.key);
      if (!template) {
        req.flash('error', 'Template not found.');
        return res.redirect('/dashboard/settings/templates');
      }

      // Build fieldMap: { "PdfFieldName": "standard_key" }
      const mappingData = req.body.mapping || {};
      const fieldMap = {};
      let count = 0;

      for (const [pdfField, standardKey] of Object.entries(mappingData)) {
        if (!standardKey || !standardKey.trim()) continue;
        if (!PdfService.STANDARD_FIELDS[standardKey.trim()]) continue;
        fieldMap[pdfField] = standardKey.trim();
        count++;
      }

      PdfService.saveFieldMap(req.params.key, fieldMap);
      req.flash('success', `${count} field(s) mapped successfully.`);
      res.redirect(`/dashboard/settings/templates/${req.params.key}/map`);
    } catch (err) {
      console.error('Save map error:', err);
      req.flash('error', 'Save failed: ' + err.message);
      res.redirect(`/dashboard/settings/templates/${req.params.key}/map`);
    }
  },

  // GET /:key/pdf — serve raw PDF file (for preview)
  async servePdf(req, res) {
    try {
      const template = PdfService.getProduct(req.params.key);
      if (!template) return res.status(404).send('Not found');

      const filePath = path.join(PdfService.TEMPLATES_DIR, template.file);
      if (!fs.existsSync(filePath)) return res.status(404).send('File not found');

      res.setHeader('Content-Type', 'application/pdf');
      res.sendFile(filePath);
    } catch (err) {
      res.status(500).send('Error');
    }
  },

  // POST /:key/delete
  async deleteTemplate(req, res) {
    try {
      PdfService.removeProduct(req.params.key);
      req.flash('success', 'Template deleted.');
    } catch (err) {
      req.flash('error', 'Failed to delete.');
    }
    res.redirect('/dashboard/settings/templates');
  },

  // POST /:key/ai-suggest — AI vision mapping (section-by-section)
  async aiSuggest(req, res) {
    try {
      const AiService = require('../services/ai.service');
      const { sections, imageBase64, fieldsOnPage } = req.body;

      let mergedMapping = {};

      if (sections && sections.length) {
        // Section-by-section mode: process all sections in parallel
        console.log(`[AI] Processing ${sections.length} section(s) in parallel`);
        const results = await Promise.all(
          sections.map((sec, i) => {
            console.log(`[AI] Section ${i + 1}: ${sec.fieldsOnPage.length} fields`);
            return AiService.suggestPageMappings(
              sec.imageBase64,
              sec.fieldsOnPage,
              PdfService.STANDARD_FIELDS
            ).catch(err => {
              console.warn(`[AI] Section ${i + 1} failed:`, err.message);
              return { fieldMapping: {} };
            });
          })
        );

        // Merge all section results
        results.forEach(r => {
          Object.assign(mergedMapping, r.fieldMapping || {});
        });
      } else if (imageBase64 && fieldsOnPage) {
        // Legacy single-image mode
        const result = await AiService.suggestPageMappings(
          imageBase64, fieldsOnPage, PdfService.STANDARD_FIELDS
        );
        mergedMapping = result.fieldMapping || {};
      } else {
        return res.status(400).json({ error: 'Missing sections or image' });
      }

      console.log(`[AI] Total mapped: ${Object.keys(mergedMapping).length} fields`);
      res.json({ fieldMapping: mergedMapping });
    } catch (err) {
      console.error('AI suggest error:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = TemplateController;
