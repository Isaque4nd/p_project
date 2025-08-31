const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
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

// Rotas públicas (apenas leitura)
router.get('/project/:projectId', reviewController.getProjectReviews);
router.get('/combo/:comboId', reviewController.getComboReviews);
router.get('/approved', reviewController.getApprovedReviews);
router.get('/:reviewId', reviewController.getReviewById);

// Rotas protegidas (usuário logado)
router.use(authMiddleware);

// Criar nova avaliação
router.post('/', reviewController.createReview);

// Marcar avaliação como útil
router.post('/:reviewId/helpful', reviewController.markAsHelpful);

// Responder a uma avaliação
router.post('/:reviewId/response', reviewController.addResponse);

// Listar avaliações do usuário
router.get('/user/my-reviews', reviewController.getUserReviews);

// Atualizar própria avaliação
router.put('/:reviewId', reviewController.updateReview);

// Deletar própria avaliação
router.delete('/:reviewId', reviewController.deleteReview);

// Rotas administrativas
router.use(isAdmin);

// Moderar avaliação
router.patch('/:reviewId/moderate', reviewController.moderateReview);

// Listar avaliações pendentes
router.get('/admin/pending', reviewController.getPendingReviews);

// Listar todas as avaliações (admin)
router.get('/admin/all', reviewController.getAllReviews);

// Obter estatísticas
router.get('/admin/stats', reviewController.getReviewStats);

// Responder como administrador
router.post('/:reviewId/admin-response', reviewController.addAdminResponse);

// Remover resposta
router.delete('/:reviewId/response/:responseId', reviewController.removeResponse);

// Reportar avaliação
router.post('/:reviewId/report', reviewController.reportReview);

module.exports = router;
