const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Rotas públicas básicas
router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Categorias em desenvolvimento' });
});

// Comentando temporariamente outras rotas até resolvermos os controllers
// router.get('/hierarchical', categoryController.getHierarchicalCategories);
// router.get('/:id', categoryController.getCategoryById);

// Rotas protegidas (admin) - comentadas temporariamente
// router.use(authMiddleware);
// router.use(adminMiddleware);
// router.post('/', categoryController.createCategory);
// router.put('/:id', categoryController.updateCategory);
// router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
