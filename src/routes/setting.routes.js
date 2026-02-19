const express = require('express');
const router = express.Router();
const SettingController = require('../controllers/setting.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

router.use(authMiddleware);

router.get('/', roleMiddleware('superadmin'), SettingController.showSettings);
router.post('/', roleMiddleware('superadmin'), SettingController.uploadFields, SettingController.updateSettings);

module.exports = router;
