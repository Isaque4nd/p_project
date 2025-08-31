// server/routes/configRoutes.js
const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Rotas públicas (apenas configurações não sensíveis)
router.get('/public', configController.getAllConfigs);
router.get('/public/:key', configController.getConfig);

// Rotas admin
router.get('/admin/all', authMiddleware, adminMiddleware, configController.getAllConfigs);
router.get('/admin/:key', authMiddleware, adminMiddleware, configController.getConfig);
router.post('/admin', authMiddleware, adminMiddleware, configController.setConfig);
router.put('/admin/:key', authMiddleware, adminMiddleware, configController.setConfig);
router.delete('/admin/:key', authMiddleware, adminMiddleware, configController.deleteConfig);

module.exports = router;
