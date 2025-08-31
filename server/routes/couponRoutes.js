const express = require('express');
const router = express.Router();
const {
    createCoupon,
    getAllCoupons,
    getCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
    getActiveCoupons,
    getCouponStats
} = require('../controllers/couponController');
const { authMiddleware } = require('../middleware/auth');

// Middleware para verificar se é admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Apenas administradores podem acessar esta funcionalidade.'
    });
  }
  next();
};

// Rotas públicas (requerem autenticação)
router.use(authMiddleware);

// Listar cupons ativos publicamente
router.get('/active', getActiveCoupons);

// Validar cupom
router.post('/validate/:code', validateCoupon);

// Rotas administrativas
router.get('/stats', isAdmin, getCouponStats);
router.get('/', isAdmin, getAllCoupons);
router.post('/', isAdmin, createCoupon);
router.get('/:id', isAdmin, getCoupon);
router.put('/:id', isAdmin, updateCoupon);
router.delete('/:id', isAdmin, deleteCoupon);

module.exports = router;
