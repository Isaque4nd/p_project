const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
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

// Obter favoritos do usuário
router.get('/', favoriteController.getUserFavorites);

// Obter coleções do usuário
router.get('/collections', favoriteController.getUserCollections);

// Obter estatísticas de favoritos
router.get('/stats', favoriteController.getFavoriteStats);

// Verificar se um projeto é favorito
router.get('/check/:projectId', favoriteController.checkIsFavorite);

// Adicionar/remover favorito
router.post('/toggle/:projectId', favoriteController.toggleFavorite);

// Atualizar favorito
router.put('/:favoriteId', favoriteController.updateFavorite);

// Mover favorito para coleção
router.patch('/:favoriteId/move', favoriteController.moveToCollection);

// Adicionar tags ao favorito
router.post('/:favoriteId/tags', favoriteController.addTags);

// Remover tags do favorito
router.delete('/:favoriteId/tags', favoriteController.removeTags);

// Rotas administrativas
router.use(isAdmin);

// Projetos mais favoritados
router.get('/admin/most-favorited', favoriteController.getMostFavorited);

module.exports = router;
