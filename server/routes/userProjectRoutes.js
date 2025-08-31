// server/routes/userProjectRoutes.js
const express = require('express');
const router = express.Router();
const userProjectController = require('../controllers/userProjectController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Rota para usuário logado obter seu histórico de compras
router.get('/history', authMiddleware, userProjectController.getUserPurchaseHistory);

// Todas as rotas abaixo requerem autenticação de admin
router.use(authMiddleware, adminMiddleware);

// Listar todos os usuários com seus projetos
router.get('/all', userProjectController.getAllUsersProjects);

// Obter projetos de um usuário específico
router.get('/:userId', userProjectController.getUserProjects);

// Adicionar projeto a um usuário
router.post('/add', userProjectController.addUserProject);

// Remover projeto de um usuário
router.delete('/:userId/:projectId', userProjectController.removeUserProject);

module.exports = router;
