const express = require('express');
const router = express.Router();
const {
    createOrder,
    getUserOrders,
    getOrder,
    getAllOrders,
    updateOrderStatus,
    addTracking,
    cancelOrder
} = require('../controllers/orderController');
const auth = require('../middleware/auth');

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

// Rotas públicas (autenticadas)
router.use(auth.authMiddleware);

// Criar pedido a partir do carrinho
router.post('/', createOrder);

// Obter pedidos do usuário
router.get('/my-orders', getUserOrders);

// Obter detalhes de um pedido específico
router.get('/:id', getOrder);

// Cancelar pedido
router.patch('/:id/cancel', cancelOrder);

// Rotas administrativas
router.get('/admin/all', isAdmin, getAllOrders);
router.patch('/:id/status', isAdmin, updateOrderStatus);
router.patch('/:id/tracking', isAdmin, addTracking);

module.exports = router;
