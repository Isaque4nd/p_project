const Review = require('../models/Review');
const Project = require('../models/Project');
const Combo = require('../models/Combo');
const Order = require('../models/Order');
const User = require('../models/User');
const mongoose = require('mongoose');

// Criar nova avaliação
exports.createReview = async (req, res) => {
  try {
    const { itemId, itemType, rating, comment, orderId } = req.body;
    const userId = req.user.id;

    // Validações
    if (!['project', 'combo'].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de item inválido'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Avaliação deve estar entre 1 e 5 estrelas'
      });
    }

    // Verificar se o item existe
    let item;
    if (itemType === 'project') {
      item = await Project.findById(itemId);
    } else {
      item = await Combo.findById(itemId);
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item não encontrado'
      });
    }

    // Verificar se o usuário já avaliou este item
    const existingReview = await Review.findOne({
      user: userId,
      itemId,
      itemType
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Você já avaliou este item'
      });
    }

    // Verificar compra verificada se orderId fornecido
    let isVerifiedPurchase = false;
    if (orderId) {
      const order = await Order.findOne({
        _id: orderId,
        user: userId,
        status: 'completed',
        $or: [
          { 'items.project': itemId },
          { 'items.combo': itemId }
        ]
      });
      isVerifiedPurchase = !!order;
    }

    // Criar avaliação
    const review = new Review({
      user: userId,
      itemId,
      itemType,
      rating,
      comment: comment || '',
      isVerifiedPurchase,
      order: orderId || null,
      status: 'pending'
    });

    await review.save();

    // Popular dados para resposta
    await review.populate([
      { path: 'user', select: 'name avatar' },
      { path: 'order', select: 'orderNumber' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Avaliação criada com sucesso',
      review
    });

  } catch (error) {
    console.error('Erro ao criar avaliação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter avaliações de um projeto
exports.getProjectReviews = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 10, sort = 'recent' } = req.query;

    let sortObj = {};
    switch (sort) {
      case 'recent':
        sortObj = { createdAt: -1 };
        break;
      case 'oldest':
        sortObj = { createdAt: 1 };
        break;
      case 'rating_high':
        sortObj = { rating: -1 };
        break;
      case 'rating_low':
        sortObj = { rating: 1 };
        break;
      case 'helpful':
        sortObj = { helpfulCount: -1 };
        break;
      default:
        sortObj = { createdAt: -1 };
    }

    const reviews = await Review.find({
      itemId: projectId,
      itemType: 'project',
      status: 'approved'
    })
    .populate('user', 'name avatar')
    .populate('response.respondedBy', 'name')
    .sort(sortObj)
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Review.countDocuments({
      itemId: projectId,
      itemType: 'project',
      status: 'approved'
    });

    res.json({
      success: true,
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erro ao buscar avaliações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter avaliações de um combo
exports.getComboReviews = async (req, res) => {
  try {
    const { comboId } = req.params;
    const { page = 1, limit = 10, sort = 'recent' } = req.query;

    let sortObj = {};
    switch (sort) {
      case 'recent':
        sortObj = { createdAt: -1 };
        break;
      case 'oldest':
        sortObj = { createdAt: 1 };
        break;
      case 'rating_high':
        sortObj = { rating: -1 };
        break;
      case 'rating_low':
        sortObj = { rating: 1 };
        break;
      case 'helpful':
        sortObj = { helpfulCount: -1 };
        break;
      default:
        sortObj = { createdAt: -1 };
    }

    const reviews = await Review.find({
      itemId: comboId,
      itemType: 'combo',
      status: 'approved'
    })
    .populate('user', 'name avatar')
    .populate('response.respondedBy', 'name')
    .sort(sortObj)
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Review.countDocuments({
      itemId: comboId,
      itemType: 'combo',
      status: 'approved'
    });

    res.json({
      success: true,
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erro ao buscar avaliações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter avaliações aprovadas
exports.getApprovedReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, itemType } = req.query;
    
    const filter = { status: 'approved' };
    if (itemType && ['project', 'combo'].includes(itemType)) {
      filter.itemType = itemType;
    }

    const reviews = await Review.find(filter)
      .populate('user', 'name avatar')
      .populate('response.respondedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Review.countDocuments(filter);

    res.json({
      success: true,
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erro ao buscar avaliações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter avaliação por ID
exports.getReviewById = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId)
      .populate('user', 'name avatar')
      .populate('response.respondedBy', 'name')
      .populate('order', 'orderNumber');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Avaliação não encontrada'
      });
    }

    res.json({
      success: true,
      review
    });

  } catch (error) {
    console.error('Erro ao buscar avaliação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Marcar avaliação como útil
exports.markAsHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Avaliação não encontrada'
      });
    }

    // Verificar se o usuário já marcou como útil
    const alreadyMarked = review.helpfulBy.some(id => id.toString() === userId);
    
    if (alreadyMarked) {
      // Remover marca útil
      review.helpfulBy = review.helpfulBy.filter(id => id.toString() !== userId);
      review.helpfulCount = Math.max(0, review.helpfulCount - 1);
    } else {
      // Adicionar marca útil
      review.helpfulBy.push(userId);
      review.helpfulCount += 1;
    }

    await review.save();

    res.json({
      success: true,
      message: alreadyMarked ? 'Marca de útil removida' : 'Avaliação marcada como útil',
      helpfulCount: review.helpfulCount,
      isMarkedHelpful: !alreadyMarked
    });

  } catch (error) {
    console.error('Erro ao marcar avaliação como útil:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Adicionar resposta à avaliação
exports.addResponse = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { comment } = req.body;
    const userId = req.user.id;

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comentário da resposta é obrigatório'
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Avaliação não encontrada'
      });
    }

    // Verificar se o usuário pode responder (apenas o criador do item ou admin)
    const user = await User.findById(userId);
    const canRespond = user.role === 'admin' || review.user.toString() === userId;

    if (!canRespond) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para responder a esta avaliação'
      });
    }

    // Adicionar resposta (substituir se já existir)
    review.response = {
      content: comment.trim(),
      respondedBy: userId,
      respondedAt: new Date()
    };

    await review.save();

    // Popular dados da resposta
    await review.populate('response.respondedBy', 'name avatar');

    res.json({
      success: true,
      message: 'Resposta adicionada com sucesso',
      response: review.response
    });

  } catch (error) {
    console.error('Erro ao adicionar resposta:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter avaliações do usuário
exports.getUserReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const filter = { user: userId };
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const reviews = await Review.find(filter)
      .populate('order', 'orderNumber')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Review.countDocuments(filter);

    res.json({
      success: true,
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erro ao buscar avaliações do usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Atualizar avaliação
exports.updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    const review = await Review.findOne({
      _id: reviewId,
      user: userId
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Avaliação não encontrada ou você não tem permissão para editá-la'
      });
    }

    // Verificar se a avaliação não foi moderada recentemente
    const timeSinceCreation = Date.now() - review.createdAt.getTime();
    const maxEditTime = 24 * 60 * 60 * 1000; // 24 horas

    if (timeSinceCreation > maxEditTime && review.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Não é possível editar avaliações após 24 horas da aprovação'
      });
    }

    // Atualizar campos
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Avaliação deve estar entre 1 e 5 estrelas'
        });
      }
      review.rating = rating;
    }
    
    if (comment !== undefined) {
      review.comment = comment;
    }
    
    // Resetar status para pending se foi modificada
    if (review.status === 'approved') {
      review.status = 'pending';
    }

    review.updatedAt = new Date();
    await review.save();

    res.json({
      success: true,
      message: 'Avaliação atualizada com sucesso',
      review
    });

  } catch (error) {
    console.error('Erro ao atualizar avaliação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Deletar avaliação
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const review = await Review.findOne({
      _id: reviewId,
      user: userId
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Avaliação não encontrada ou você não tem permissão para deletá-la'
      });
    }

    await Review.findByIdAndDelete(reviewId);

    res.json({
      success: true,
      message: 'Avaliação deletada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar avaliação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Moderar avaliação (Admin)
exports.moderateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { status, moderatorNote } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status inválido. Use "approved" ou "rejected"'
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Avaliação não encontrada'
      });
    }

    review.status = status;
    review.moderatedAt = new Date();
    review.moderatedBy = req.user.id;
    
    if (moderatorNote) {
      review.moderatorNote = moderatorNote;
    }

    await review.save();

    res.json({
      success: true,
      message: `Avaliação ${status === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso`,
      review
    });

  } catch (error) {
    console.error('Erro ao moderar avaliação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Listar avaliações pendentes (Admin)
exports.getPendingReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const reviews = await Review.find({ status: 'pending' })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Review.countDocuments({ status: 'pending' });

    res.json({
      success: true,
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erro ao buscar avaliações pendentes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Listar todas as avaliações (Admin)
exports.getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, itemType } = req.query;

    const filter = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }
    if (itemType && ['project', 'combo'].includes(itemType)) {
      filter.itemType = itemType;
    }

    const reviews = await Review.find(filter)
      .populate('user', 'name email')
      .populate('moderatedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Review.countDocuments(filter);

    res.json({
      success: true,
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erro ao buscar todas as avaliações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter estatísticas das avaliações (Admin)
exports.getReviewStats = async (req, res) => {
  try {
    const stats = await Review.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    const totalReviews = await Review.countDocuments();
    
    const ratingDistribution = await Review.aggregate([
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const itemTypeStats = await Review.aggregate([
      {
        $group: {
          _id: '$itemType',
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    const recentReviews = await Review.find({ status: 'approved' })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        total: totalReviews,
        byStatus: stats,
        byItemType: itemTypeStats,
        ratingDistribution,
        recentReviews
      }
    });

  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Responder como administrador
exports.addAdminResponse = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { comment } = req.body;
    const userId = req.user.id;

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comentário da resposta é obrigatório'
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Avaliação não encontrada'
      });
    }

    // Adicionar resposta administrativa (substituir se já existir)
    review.response = {
      content: comment.trim(),
      respondedBy: userId,
      respondedAt: new Date()
    };

    await review.save();

    // Popular dados da resposta
    await review.populate('response.respondedBy', 'name avatar');

    res.json({
      success: true,
      message: 'Resposta administrativa adicionada com sucesso',
      response: review.response
    });

  } catch (error) {
    console.error('Erro ao adicionar resposta administrativa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Remover resposta
exports.removeResponse = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Avaliação não encontrada'
      });
    }

    if (!review.response || !review.response.content) {
      return res.status(404).json({
        success: false,
        message: 'Resposta não encontrada'
      });
    }

    // Verificar permissão (apenas o autor da resposta ou admin)
    const user = await User.findById(userId);
    const canRemove = user.role === 'admin' || review.response.respondedBy.toString() === userId;

    if (!canRemove) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para remover esta resposta'
      });
    }

    review.response = undefined;
    await review.save();

    res.json({
      success: true,
      message: 'Resposta removida com sucesso'
    });

  } catch (error) {
    console.error('Erro ao remover resposta:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Reportar avaliação
exports.reportReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reason, description } = req.body;
    const userId = req.user.id;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Motivo do report é obrigatório'
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Avaliação não encontrada'
      });
    }

    // Verificar se o usuário já reportou esta avaliação
    const alreadyReported = review.reports.some(report => 
      report.reportedBy.toString() === userId
    );

    if (alreadyReported) {
      return res.status(400).json({
        success: false,
        message: 'Você já reportou esta avaliação'
      });
    }

    const report = {
      reportedBy: userId,
      reason,
      description: description || '',
      reportedAt: new Date()
    };

    review.reports.push(report);
    review.reportCount = review.reports.length;

    // Se tiver muitos reports, marcar como pendente
    if (review.reportCount >= 3 && review.status === 'approved') {
      review.status = 'pending';
    }

    await review.save();

    res.json({
      success: true,
      message: 'Avaliação reportada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao reportar avaliação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};
