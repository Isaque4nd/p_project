const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authMiddleware } = require('../middleware/auth');

// Rotas básicas temporárias
router.use(authMiddleware);

router.post('/add', cartController.addToCart);

// Rota básica para obter carrinho
router.get('/', (req, res) => {
  res.json({ success: true, data: { items: [], totalItems: 0, totalPrice: 0 }, message: 'Carrinho vazio' });
});

// Comentando outras rotas temporariamente
// router.put('/item/:itemId', cartController.updateCartItem);
// router.delete('/item/:itemId', cartController.removeFromCart);
// router.delete('/clear', cartController.clearCart);

module.exports = router;
