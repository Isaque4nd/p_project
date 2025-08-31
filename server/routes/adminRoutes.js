// server/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// Middleware para verificar se o usuário é admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

// Aplicar autenticação e verificação de admin para todas as rotas
router.use(authMiddleware);
router.use(requireAdmin);

// Rotas para gerenciamento de usuários
router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.patch('/users/:id/toggle-status', adminController.toggleUserStatus);
router.delete('/users/:id', adminController.deleteUser);
router.get('/users/stats', adminController.getUserStats);

module.exports = router;
