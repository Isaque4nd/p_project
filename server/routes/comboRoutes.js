// server/routes/comboRoutes.js
const express = require('express');
const router = express.Router();
// const comboController = require('../controllers/comboController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Rotas públicas básicas
router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Combos em desenvolvimento' });
});

router.get('/featured', (req, res) => {
  res.json({ success: true, data: [], message: 'Combos em destaque em desenvolvimento' });
});

// Comentando outras rotas temporariamente
// router.get('/:id', comboController.getComboById);

// Rotas protegidas (admin) - comentadas temporariamente
// router.use(authMiddleware);
// router.use(adminMiddleware);
// router.post('/', comboController.createCombo);
// router.put('/:id', comboController.updateCombo);
// router.delete('/:id', comboController.deleteCombo);

module.exports = router;
