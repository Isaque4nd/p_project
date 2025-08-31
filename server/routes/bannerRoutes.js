const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
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

// Rotas públicas
router.get('/position/:position', bannerController.getBannersByPosition);
router.get('/page/:page', bannerController.getBannersForPage);
router.post('/:bannerId/impression', bannerController.recordImpression);
router.post('/:bannerId/click', bannerController.recordClick);

// Rotas administrativas
router.use(authMiddleware, isAdmin);

// CRUD de banners
router.post('/', bannerController.createBanner);
router.get('/', bannerController.getAllBanners);
router.get('/:bannerId', bannerController.getBannerById);
router.put('/:bannerId', bannerController.updateBanner);
router.delete('/:bannerId', bannerController.deleteBanner);

// Estatísticas
router.get('/admin/stats', bannerController.getBannerStats);

module.exports = router;
