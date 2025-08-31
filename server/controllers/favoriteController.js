const Favorite = require('../models/Favorite');
const Project = require('../models/Project');

// Adicionar/remover favorito
exports.toggleFavorite = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { collection = 'Geral' } = req.body;
    const userId = req.user.id;

    // Verificar se o projeto existe
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    const result = await Favorite.toggleFavorite(userId, projectId, collection);

    res.json({
      success: true,
      message: result.action === 'added' ? 'Adicionado aos favoritos' : 'Removido dos favoritos',
      data: {
        action: result.action,
        favorite: result.favorite
      }
    });

  } catch (error) {
    console.error('Erro ao alternar favorito:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter favoritos do usuário
exports.getUserFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      collection,
      priority,
      tags,
      sortBy = 'addedAt',
      sortOrder = -1,
      limit,
      page = 1,
      pageSize = 20
    } = req.query;

    let options = {
      collection,
      priority: priority ? parseInt(priority) : null,
      tags: tags ? tags.split(',') : null,
      sortBy,
      sortOrder: parseInt(sortOrder)
    };

    if (limit) {
      options.limit = parseInt(limit);
    }

    let favorites;
    let total = 0;

    if (page && pageSize && !limit) {
      // Paginação
      const skip = (parseInt(page) - 1) * parseInt(pageSize);
      
      // Construir query para contar total
      let countQuery = { user: userId, isActive: true };
      if (collection) countQuery.collection = collection;
      if (priority) countQuery.priority = parseInt(priority);
      if (tags) countQuery.tags = { $in: tags.split(',') };

      total = await Favorite.countDocuments(countQuery);
      
      options.limit = parseInt(pageSize);
      favorites = await Favorite.getUserFavorites(userId, options).skip(skip);
    } else {
      favorites = await Favorite.getUserFavorites(userId, options);
    }

    res.json({
      success: true,
      data: {
        favorites,
        pagination: page && pageSize && !limit ? {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(pageSize)),
          total,
          pageSize: parseInt(pageSize)
        } : null
      }
    });

  } catch (error) {
    console.error('Erro ao buscar favoritos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter coleções do usuário
exports.getUserCollections = async (req, res) => {
  try {
    const userId = req.user.id;

    const collections = await Favorite.getUserCollections(userId);

    res.json({
      success: true,
      data: collections
    });

  } catch (error) {
    console.error('Erro ao buscar coleções:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter estatísticas de favoritos
exports.getFavoriteStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await Favorite.getFavoriteStats(userId);

    const result = {
      total: stats[0]?.totalFavorites[0]?.count || 0,
      byCollection: stats[0]?.byCollection || [],
      byPriority: stats[0]?.byPriority || [],
      recent: stats[0]?.recentFavorites[0]?.count || 0
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

// Verificar se um projeto é favorito
exports.checkIsFavorite = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const favorite = await Favorite.isProjectFavorited(userId, projectId);

    res.json({
      success: true,
      data: {
        isFavorite: !!favorite,
        favorite: favorite
      }
    });

  } catch (error) {
    console.error('Erro ao verificar favorito:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Atualizar favorito
exports.updateFavorite = async (req, res) => {
  try {
    const { favoriteId } = req.params;
    const { notes, tags, priority, collection } = req.body;
    const userId = req.user.id;

    const favorite = await Favorite.findOne({
      _id: favoriteId,
      user: userId,
      isActive: true
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorito não encontrado'
      });
    }

    // Atualizar campos
    if (notes !== undefined) favorite.notes = notes;
    if (tags !== undefined) favorite.tags = tags;
    if (priority !== undefined) favorite.priority = priority;
    if (collection !== undefined) favorite.collection = collection;

    await favorite.save();
    await favorite.populate('project', 'title slug price images');

    res.json({
      success: true,
      message: 'Favorito atualizado com sucesso',
      data: favorite
    });

  } catch (error) {
    console.error('Erro ao atualizar favorito:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Mover favorito para coleção
exports.moveToCollection = async (req, res) => {
  try {
    const { favoriteId } = req.params;
    const { collection } = req.body;
    const userId = req.user.id;

    const favorite = await Favorite.findOne({
      _id: favoriteId,
      user: userId,
      isActive: true
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorito não encontrado'
      });
    }

    await favorite.moveToCollection(collection);
    await favorite.populate('project', 'title slug price images');

    res.json({
      success: true,
      message: 'Favorito movido para nova coleção',
      data: favorite
    });

  } catch (error) {
    console.error('Erro ao mover favorito:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Adicionar tags ao favorito
exports.addTags = async (req, res) => {
  try {
    const { favoriteId } = req.params;
    const { tags } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tags devem ser fornecidas como array não vazio'
      });
    }

    const favorite = await Favorite.findOne({
      _id: favoriteId,
      user: userId,
      isActive: true
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorito não encontrado'
      });
    }

    await favorite.addTags(tags);
    await favorite.populate('project', 'title slug price images');

    res.json({
      success: true,
      message: 'Tags adicionadas com sucesso',
      data: favorite
    });

  } catch (error) {
    console.error('Erro ao adicionar tags:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Remover tags do favorito
exports.removeTags = async (req, res) => {
  try {
    const { favoriteId } = req.params;
    const { tags } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tags devem ser fornecidas como array não vazio'
      });
    }

    const favorite = await Favorite.findOne({
      _id: favoriteId,
      user: userId,
      isActive: true
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorito não encontrado'
      });
    }

    await favorite.removeTags(tags);
    await favorite.populate('project', 'title slug price images');

    res.json({
      success: true,
      message: 'Tags removidas com sucesso',
      data: favorite
    });

  } catch (error) {
    console.error('Erro ao remover tags:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Projetos mais favoritados (endpoint administrativo)
exports.getMostFavorited = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const mostFavorited = await Favorite.getMostFavoritedProjects(parseInt(limit));

    res.json({
      success: true,
      data: mostFavorited
    });

  } catch (error) {
    console.error('Erro ao obter mais favoritados:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};
