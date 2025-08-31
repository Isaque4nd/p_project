const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getSalesReport,
    getProductAnalytics,
    getCustomerAnalytics
} = require('../controllers/analyticsController');
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

// Todas as rotas de analytics são apenas para administradores
router.use(authMiddleware);
router.use(isAdmin);

// Dashboard principal com estatísticas gerais
router.get('/dashboard', getDashboardStats);

// Relatório de vendas
router.get('/sales', getSalesReport);

// Análise de produtos e combos
router.get('/products', getProductAnalytics);

// Análise de clientes
router.get('/customers', getCustomerAnalytics);

module.exports = router;
