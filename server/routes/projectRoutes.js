// server/routes/projectRoutes.js
const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Rotas públicas
router.get('/search', projectController.advancedSearch);
router.get('/featured', projectController.getFeaturedProjects);
router.get('/best-sellers', projectController.getBestSellers);
router.get('/', projectController.getAllProjects);
router.get('/:id', projectController.getProjectById);
router.get('/:projectId/related', projectController.getRelatedProjects);
router.post('/:projectId/view', projectController.incrementViews);

// Rotas protegidas (usuário logado)
router.get('/purchased/my', authMiddleware, projectController.getUserPurchasedProjects);

// Rotas admin
router.get('/admin/all', authMiddleware, adminMiddleware, projectController.getAllProjectsAdmin);
router.get('/admin/stats', authMiddleware, adminMiddleware, projectController.getProjectStats);
router.post('/', authMiddleware, adminMiddleware, projectController.createProject);
router.put('/:id', authMiddleware, adminMiddleware, projectController.updateProject);
router.delete('/:id', authMiddleware, adminMiddleware, projectController.deleteProject);
router.post('/deliver', authMiddleware, adminMiddleware, projectController.deliverProjectToUser);

module.exports = router;
