const express = require('express');
const router = express.Router();
const {
    getUserWishlist,
    addToWishlist,
    removeFromWishlist,
    checkWishlistItem,
    updateItemNotifications,
    moveToCart,
    updateWishlistSettings,
    clearWishlist,
    getWishlistStats
} = require('../controllers/wishlistController');
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

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Rotas do usuário
router.get('/', getUserWishlist);
router.post('/add', addToWishlist);
router.delete('/item/:itemId', removeFromWishlist);
router.get('/check', checkWishlistItem);
router.patch('/item/:itemId/notifications', updateItemNotifications);
router.post('/item/:itemId/move-to-cart', moveToCart);
router.patch('/settings', updateWishlistSettings);
router.delete('/clear', clearWishlist);

// Rotas administrativas
router.get('/admin/stats', isAdmin, getWishlistStats);

module.exports = router;
