const Category = require('../models/Category');
const Project = require('../models/Project');

// Criar nova categoria
exports.createCategory = async (req, res) => {
  try {
    const {
      name,
      description,
      icon,
      color,
      parentCategory,
      isMainCategory,
      showInMenu,
      metadata
    } = req.body;

    const category = new Category({
      name,
      description,
      icon,
      color,
      parentCategory,
      isMainCategory,
      showInMenu,
      metadata
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Categoria criada com sucesso',
      data: category
    });

  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Nome ou slug da categoria já existe'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Listar todas as categorias
exports.getAllCategories = async (req, res) => {
  try {
    const {
      active = true,
      showInMenu = null,
      parentCategory = null,
      includeProjects = false
    } = req.query;

    let query = {};

    if (active !== 'all') {
      query.isActive = active === 'true';
    }

    if (showInMenu !== null) {
      query.showInMenu = showInMenu === 'true';
    }

    if (parentCategory === 'null') {
      query.parentCategory = null;
    } else if (parentCategory) {
      query.parentCategory = parentCategory;
    }

    let categoriesQuery = Category.find(query)
      .populate('parentCategory', 'name slug')
      .sort({ sortOrder: 1, name: 1 });

    if (includeProjects === 'true') {
      categoriesQuery = categoriesQuery.populate('projectCount');
    }

    const categories = await categoriesQuery;

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter categoria por ID ou slug
exports.getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({
      $or: [{ slug: slug }, { _id: slug }],
      isActive: true
    })
    .populate('subcategories')
    .populate('parentCategory', 'name slug');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoria não encontrada'
      });
    }

    // Obter projetos da categoria
    const projects = await Project.find({
      category: category._id,
      isActive: true
    })
    .populate('category', 'name slug')
    .sort({ createdAt: -1 })
    .limit(20);

    // Obter contagem total de projetos
    const projectCount = await Project.countDocuments({
      category: category._id,
      isActive: true
    });

    res.json({
      success: true,
      data: {
        category,
        projects,
        projectCount
      }
    });

  } catch (error) {
    console.error('Erro ao buscar categoria:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Atualizar categoria
exports.updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const updateData = req.body;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoria não encontrada'
      });
    }

    // Atualizar campos
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        category[key] = updateData[key];
      }
    });

    await category.save();

    await category.populate('parentCategory', 'name slug');

    res.json({
      success: true,
      message: 'Categoria atualizada com sucesso',
      data: category
    });

  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Nome ou slug da categoria já existe'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Deletar categoria
exports.deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoria não encontrada'
      });
    }

    // Verificar se há projetos usando esta categoria
    const projectCount = await Project.countDocuments({
      category: categoryId
    });

    if (projectCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Não é possível excluir categoria com ${projectCount} projeto(s) associado(s)`
      });
    }

    // Verificar se há subcategorias
    const subcategoryCount = await Category.countDocuments({
      parentCategory: categoryId
    });

    if (subcategoryCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Não é possível excluir categoria com ${subcategoryCount} subcategoria(s)`
      });
    }

    await Category.findByIdAndDelete(categoryId);

    res.json({
      success: true,
      message: 'Categoria excluída com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar categoria:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter árvore de categorias
exports.getCategoryTree = async (req, res) => {
  try {
    const categories = await Category.find({
      isActive: true,
      parentCategory: null
    })
    .populate({
      path: 'subcategories',
      match: { isActive: true },
      populate: {
        path: 'subcategories',
        match: { isActive: true }
      }
    })
    .sort({ sortOrder: 1, name: 1 });

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Erro ao buscar árvore de categorias:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter categorias principais
exports.getMainCategories = async (req, res) => {
  try {
    const categories = await Category.getMainCategories();

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Erro ao buscar categorias principais:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Reordenar categorias
exports.reorderCategories = async (req, res) => {
  try {
    const { categories } = req.body; // Array de { id, sortOrder }

    const updatePromises = categories.map(cat => 
      Category.findByIdAndUpdate(cat.id, { sortOrder: cat.sortOrder })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Ordem das categorias atualizada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao reordenar categorias:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter estatísticas de categorias
exports.getCategoryStats = async (req, res) => {
  try {
    const stats = await Category.aggregate([
      {
        $facet: {
          totalCategories: [
            { $match: { isActive: true } },
            { $count: "count" }
          ],
          mainCategories: [
            { $match: { isActive: true, parentCategory: null } },
            { $count: "count" }
          ],
          subcategories: [
            { $match: { isActive: true, parentCategory: { $ne: null } } },
            { $count: "count" }
          ],
          categoriesWithProjects: [
            {
              $lookup: {
                from: 'projects',
                localField: '_id',
                foreignField: 'category',
                as: 'projects'
              }
            },
            {
              $match: {
                isActive: true,
                'projects.0': { $exists: true }
              }
            },
            { $count: "count" }
          ]
        }
      }
    ]);

    // Categorias mais populares
    const popularCategories = await Category.aggregate([
      {
        $lookup: {
          from: 'projects',
          localField: '_id',
          foreignField: 'category',
          as: 'projects'
        }
      },
      {
        $match: { isActive: true }
      },
      {
        $project: {
          name: 1,
          slug: 1,
          projectCount: { $size: '$projects' }
        }
      },
      {
        $sort: { projectCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const result = {
      total: stats[0].totalCategories[0]?.count || 0,
      main: stats[0].mainCategories[0]?.count || 0,
      subcategories: stats[0].subcategories[0]?.count || 0,
      withProjects: stats[0].categoriesWithProjects[0]?.count || 0,
      popular: popularCategories
    };

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};
