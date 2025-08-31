// server/controllers/projectController.js
const Project = require('../models/Project');
const User = require('../models/User');
const Category = require('../models/Category');
const Review = require('../models/Review');
const Favorite = require('../models/Favorite');

// Obter todos os projetos
exports.getAllProjects = async (req, res) => {
  try {
    let filter = {};
    
    // Se não for admin, filtrar projetos
    if (req.user && req.user.role !== 'admin') {
      const now = new Date();
      filter = {
        $and: [
          { isActive: true },
          {
            $or: [
              { 
                $and: [
                  { targetUser: null }, // Projetos para todos
                  { availableUntil: { $gt: now } } // Ainda dentro do prazo de 72 horas
                ]
              },
              { targetUser: req.user.id } // Projetos específicos para este usuário
            ]
          }
        ]
      };
    } else {
      // Admin vê todos os projetos
      filter = { isActive: true };
    }
    
    const projects = await Project.find(filter)
      .populate('targetUser', 'name email')
      .sort({ createdAt: -1 });
    
    // Adicionar campo virtual isAvailable
    const projectsWithAvailability = projects.map(project => ({
      ...project.toObject(),
      isAvailable: project.isAvailable
    }));
    
    res.json({
      success: true,
      projects: projectsWithAvailability
    });
  } catch (err) {
    console.error('Erro ao buscar projetos:', err);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
};

// Obter todos os projetos (Admin)
exports.getAllProjectsAdmin = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('targetUser', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      projects
    });
  } catch (err) {
    console.error('Erro ao buscar projetos:', err);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
};

// Obter projeto por ID
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }
    
    res.json({
      success: true,
      project
    });
  } catch (err) {
    console.error('Erro ao buscar projeto:', err);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
};

// Obter projetos comprados pelo usuário
exports.getUserPurchasedProjects = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('purchasedProjects');
    
    res.json({
      success: true,
      projects: user.purchasedProjects
    });
  } catch (err) {
    console.error('Erro ao buscar projetos comprados:', err);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
};

// Criar novo projeto (Admin)
exports.createProject = async (req, res) => {
  try {
    const { title, description, price, driveLink, category, features, targetUser, deliveryType, slug } = req.body;
    
    // Validação básica
    if (!title || !description || !price || !driveLink) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos obrigatórios devem ser preenchidos'
      });
    }
    
    if (price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'O preço deve ser maior que zero'
      });
    }

    const projectData = {
      title,
      description,
      price,
      driveLink,
      category,
      features
    };

    // Adicionar targetUser se especificado
    if (targetUser && targetUser !== '') {
      projectData.targetUser = targetUser;
    }

    // Adicionar deliveryType se especificado
    if (deliveryType) {
      projectData.deliveryType = deliveryType;
    }

    // Adicionar slug se especificado
    if (slug && slug.trim() !== '') {
      // Verificar se o slug já existe
      const existingProject = await Project.findOne({ slug: slug.trim() });
      if (existingProject) {
        return res.status(400).json({
          success: false,
          message: 'Este slug já está em uso. Escolha outro.'
        });
      }
      projectData.slug = slug.trim();
    }

    const project = new Project(projectData);
    
    // Se não foi fornecido um slug, gerar um automaticamente
    if (!projectData.slug) {
      project.generateSlug();
    }
    
    await project.save();

    // Se for liberação manual para usuário específico, entregar automaticamente
    if (deliveryType === 'manual' && targetUser) {
      const user = await User.findById(targetUser);
      if (user && !user.purchasedProjects.includes(project._id)) {
        user.purchasedProjects.push(project._id);
        await user.save();
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Projeto criado com sucesso',
      project
    });
  } catch (err) {
    console.error('Erro ao criar projeto:', err);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
};

// Atualizar projeto (Admin)
exports.updateProject = async (req, res) => {
  try {
    const { title, description, price, driveLink, category, features, targetUser, deliveryType } = req.body;
    
    // Validação básica
    if (price && price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'O preço deve ser maior que zero'
      });
    }

    const updateData = {
      title, description, price, driveLink, category, features
    };

    // Se targetUser for uma string vazia, defina como null
    if (targetUser === '') {
      updateData.targetUser = null;
    } else if (targetUser) {
      updateData.targetUser = targetUser;
    }

    if (deliveryType) {
      updateData.deliveryType = deliveryType;
    }
    
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Projeto atualizado com sucesso',
      project
    });
  } catch (err) {
    console.error('Erro ao atualizar projeto:', err);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
};

// Deletar projeto (Admin)
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Projeto deletado com sucesso'
    });
  } catch (err) {
    console.error('Erro ao deletar projeto:', err);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
};

// Entregar projeto manualmente para usuário (Admin)
exports.deliverProjectToUser = async (req, res) => {
  try {
    const { userId, projectId } = req.body;
    
    if (!userId || !projectId) {
      return res.status(400).json({
        success: false,
        message: 'ID do usuário e do projeto são obrigatórios'
      });
    }
    
    const user = await User.findById(userId);
    const project = await Project.findById(projectId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }
    
    // Verificar se o usuário já possui o projeto
    if (user.purchasedProjects.includes(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Usuário já possui este projeto'
      });
    }
    
    // Adicionar projeto aos projetos comprados do usuário
    user.purchasedProjects.push(projectId);
    await user.save();
    
    res.json({
      success: true,
      message: 'Projeto entregue com sucesso ao usuário'
    });
  } catch (err) {
    console.error('Erro ao entregar projeto:', err);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
};

// Busca avançada de projetos
exports.advancedSearch = async (req, res) => {
  try {
    const {
      query = '',
      category,
      minPrice,
      maxPrice,
      tags,
      rating,
      sortBy = 'createdAt',
      sortOrder = -1,
      page = 1,
      limit = 20,
      isPromoted,
      inStock = true
    } = req.query;

    const options = {
      query,
      category,
      minPrice: minPrice ? parseFloat(minPrice) : 0,
      maxPrice: maxPrice ? parseFloat(maxPrice) : null,
      tags: tags ? tags.split(',') : [],
      rating: rating ? parseFloat(rating) : 0,
      sortBy,
      sortOrder: parseInt(sortOrder),
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      isPromoted: isPromoted !== undefined ? isPromoted === 'true' : null,
      inStock: inStock === 'true'
    };

    const projects = await Project.advancedSearch(options);
    
    // Contar total para paginação
    let countQuery = { isActive: true };
    if (query) {
      countQuery.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ];
    }
    if (category) countQuery.category = category;
    if (options.maxPrice) {
      countQuery.price = { $gte: options.minPrice, $lte: options.maxPrice };
    } else {
      countQuery.price = { $gte: options.minPrice };
    }
    if (tags) countQuery.tags = { $in: options.tags };
    if (rating > 0) countQuery.averageRating = { $gte: rating };
    if (isPromoted !== null) countQuery.isPromoted = options.isPromoted;

    const total = await Project.countDocuments(countQuery);

    res.json({
      success: true,
      data: {
        projects,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total
        }
      }
    });

  } catch (error) {
    console.error('Erro na busca avançada:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter projetos em destaque
exports.getFeaturedProjects = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const projects = await Project.getFeaturedProjects(parseInt(limit));

    res.json({
      success: true,
      data: projects
    });

  } catch (error) {
    console.error('Erro ao buscar projetos em destaque:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter mais vendidos
exports.getBestSellers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const projects = await Project.getBestSellers(parseInt(limit));

    res.json({
      success: true,
      data: projects
    });

  } catch (error) {
    console.error('Erro ao buscar mais vendidos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter projetos relacionados
exports.getRelatedProjects = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 4 } = req.query;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    const relatedProjects = await Project.getRelatedProjects(
      projectId, 
      project.category, 
      parseInt(limit)
    );

    res.json({
      success: true,
      data: relatedProjects
    });

  } catch (error) {
    console.error('Erro ao buscar projetos relacionados:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Incrementar visualizações
exports.incrementViews = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    await project.incrementViews();

    res.json({
      success: true,
      message: 'Visualização registrada',
      viewCount: project.viewCount
    });

  } catch (error) {
    console.error('Erro ao incrementar visualizações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter estatísticas de projetos
exports.getProjectStats = async (req, res) => {
  try {
    const stats = await Project.aggregate([
      {
        $facet: {
          totalProjects: [
            { $match: { isActive: true } },
            { $count: "count" }
          ],
          promotedProjects: [
            { $match: { isActive: true, isPromoted: true } },
            { $count: "count" }
          ],
          totalViews: [
            { $match: { isActive: true } },
            { $group: { _id: null, total: { $sum: "$viewCount" } } }
          ],
          totalPurchases: [
            { $match: { isActive: true } },
            { $group: { _id: null, total: { $sum: "$purchaseCount" } } }
          ],
          averageRating: [
            { $match: { isActive: true, reviewCount: { $gt: 0 } } },
            { $group: { _id: null, avg: { $avg: "$averageRating" } } }
          ],
          priceRange: [
            { $match: { isActive: true } },
            {
              $group: {
                _id: null,
                minPrice: { $min: "$price" },
                maxPrice: { $max: "$price" },
                avgPrice: { $avg: "$price" }
              }
            }
          ],
          topCategories: [
            { $match: { isActive: true } },
            {
              $lookup: {
                from: 'categories',
                localField: 'category',
                foreignField: '_id',
                as: 'categoryInfo'
              }
            },
            { $unwind: '$categoryInfo' },
            {
              $group: {
                _id: '$category',
                categoryName: { $first: '$categoryInfo.name' },
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
          ]
        }
      }
    ]);

    const result = {
      total: stats[0].totalProjects[0]?.count || 0,
      promoted: stats[0].promotedProjects[0]?.count || 0,
      totalViews: stats[0].totalViews[0]?.total || 0,
      totalPurchases: stats[0].totalPurchases[0]?.total || 0,
      averageRating: stats[0].averageRating[0]?.avg || 0,
      priceRange: stats[0].priceRange[0] || { minPrice: 0, maxPrice: 0, avgPrice: 0 },
      topCategories: stats[0].topCategories
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
