// server/routes/chargeRoutes.js
const express = require('express');
const router = express.Router();
const chargeController = require('../controllers/chargeController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Rotas públicas
router.get('/:slug', chargeController.getChargeBySlug);
router.post('/:slug/pay', chargeController.processChargePayment);

// Rotas admin
router.post('/create', authMiddleware, adminMiddleware, chargeController.createCharge);
router.get('/admin/all', authMiddleware, adminMiddleware, chargeController.getAllCharges);
router.put('/:chargeId/status', authMiddleware, adminMiddleware, chargeController.updateChargeStatus);
router.get('/:chargeId/stats', authMiddleware, adminMiddleware, chargeController.getChargeStats);

// Webhook
router.post('/webhook/:chargeId', chargeController.processChargeWebhook);

module.exports = router;

