const express = require('express');
const router = express.Router();
const SubmissionController = require('../controllers/submission.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

// Public routes
router.get('/submit', SubmissionController.submitPage);
router.post('/submit', upload.fields(SubmissionController.FILE_FIELDS), SubmissionController.submitForm);

// Protected routes
router.get('/submit-new', authMiddleware, SubmissionController.privateSubmitPage);
router.post('/submit-new', authMiddleware, upload.fields(SubmissionController.FILE_FIELDS), SubmissionController.submitForm);
router.get('/cases', authMiddleware, SubmissionController.listCases);
router.get('/cases/:id', authMiddleware, SubmissionController.viewCase);
router.post('/cases/:id/take', authMiddleware, SubmissionController.takeCase);
router.post('/cases/:id/release', authMiddleware, SubmissionController.releaseCase);
router.get('/taken-cases', authMiddleware, SubmissionController.listTakenCases);
router.get('/drafts', authMiddleware, SubmissionController.listDrafts);
router.get('/drafts/:id/edit', authMiddleware, SubmissionController.editDraft);
router.post('/drafts/:id/delete', authMiddleware, SubmissionController.deleteDraft);
router.get('/files/:fileId/download', authMiddleware, SubmissionController.downloadFile);
router.get('/cases/:id/pdf/:template', authMiddleware, SubmissionController.generatePdf);

module.exports = router;

