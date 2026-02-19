const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboard.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', DashboardController.analytics);
router.get('/analytics', DashboardController.analytics);

module.exports = router;
