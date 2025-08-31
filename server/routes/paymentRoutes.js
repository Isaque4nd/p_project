// server/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Rotas protegidas (usuário logado)
router.post('/create', authMiddleware, paymentController.createPayment);
router.get('/my', authMiddleware, paymentController.getUserPayments);
router.post('/create-pix', authMiddleware, paymentController.createPixLink);

// Rotas admin (específicas primeiro)
router.get('/all', authMiddleware, adminMiddleware, paymentController.getAllPayments);
router.get('/pending', authMiddleware, adminMiddleware, paymentController.getPendingPayments);
router.post('/approve/:paymentId', authMiddleware, adminMiddleware, paymentController.approvePayment);
router.post('/reject/:paymentId', authMiddleware, adminMiddleware, paymentController.rejectPayment);
router.post('/create-pix-link', authMiddleware, adminMiddleware, paymentController.createPixLinkAdmin);
router.post('/manual', authMiddleware, adminMiddleware, paymentController.createManualPayment);
router.post('/create-charge', authMiddleware, adminMiddleware, paymentController.createCharge);
router.post('/manual/:paymentId', authMiddleware, adminMiddleware, paymentController.markPaymentAsPaid);

// Rota pública para buscar cobrança por slug
router.get('/charge/:slug', paymentController.getChargeBySlug);

// Rota com parâmetro (deve vir por último)
router.get('/:paymentId', authMiddleware, paymentController.getPaymentDetails);

// Webhook do Sacapay (rota pública)
router.post('/webhook', paymentController.processWebhook);

module.exports = router;
