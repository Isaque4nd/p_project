const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    maxlength: 500,
    default: ''
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    enum: [1, 2, 3, 4, 5],
    default: 3
  },
  favoriteCollection: {
    type: String,
    trim: true,
    maxlength: 100,
    default: 'Geral'
  }
}, {
  timestamps: true
});

// Índice composto para prevenir duplicatas
favoriteSchema.index({ user: 1, project: 1 }, { unique: true });

// Índice para consultas por usuário
favoriteSchema.index({ user: 1, isActive: 1 });

// Índice para consultas por coleção
favoriteSchema.index({ favoriteCollection: 1, user: 1 });

// Índice para consultas por prioridade
favoriteSchema.index({ priority: -1, addedAt: -1 });

// Virtual para popular dados do projeto
favoriteSchema.virtual('projectData', {
  ref: 'Project',
  localField: 'project',
  foreignField: '_id',
  justOne: true
});

// Virtual para popular dados do usuário
favoriteSchema.virtual('userData', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true
});

// Garantir que virtuals sejam incluídos na serialização JSON
favoriteSchema.set('toJSON', { virtuals: true });
favoriteSchema.set('toObject', { virtuals: true });

// Middleware para atualizar timestamps
favoriteSchema.pre('save', function(next) {
  if (this.isNew) {
    this.addedAt = new Date();
  }
  next();
});

// Middleware para soft delete
favoriteSchema.pre(/^find/, function(next) {
  this.find({ isActive: { $ne: false } });
  next();
});

// Método para soft delete
favoriteSchema.methods.softDelete = function() {
  this.isActive = false;
  return this.save();
};

// Método para restaurar
favoriteSchema.methods.restore = function() {
  this.isActive = true;
  return this.save();
};

// Método para adicionar tags
favoriteSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
    return this.save();
  }
  return this;
};

// Método para remover tags
favoriteSchema.methods.removeTag = function(tag) {
  this.tags = this.tags.filter(t => t !== tag);
  return this.save();
};

// Método estático para obter favoritos por usuário
favoriteSchema.statics.getByUser = function(userId, options = {}) {
  const {
    limit = 10,
    page = 1,
    favoriteCollection = null,
    priority = null,
    sortBy = 'addedAt',
    sortOrder = -1
  } = options;

  const query = { user: userId, isActive: true };
  
  if (favoriteCollection) {
    query.favoriteCollection = favoriteCollection;
  }
  
  if (priority) {
    query.priority = priority;
  }

  const sort = {};
  sort[sortBy] = sortOrder;

  return this.find(query)
    .populate('project')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// Método estático para obter coleções do usuário com contadores
favoriteSchema.statics.getUserCollections = function(userId) {
  return this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        isActive: true
      }
    },
    {
      $group: {
        _id: '$favoriteCollection',
        count: { $sum: 1 },
        lastAdded: { $max: '$addedAt' }
      }
    },
    {
      $project: {
        favoriteCollection: '$_id',
        count: 1,
        lastAdded: 1,
        _id: 0
      }
    },
    {
      $sort: { lastAdded: -1 }
    }
  ]);
};

// Método estático para obter estatísticas de favoritos
favoriteSchema.statics.getFavoriteStats = function(userId) {
  return this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        isActive: true
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        collections: { $addToSet: '$favoriteCollection' },
        avgPriority: { $avg: '$priority' },
        totalTags: { $push: '$tags' }
      }
    },
    {
      $project: {
        total: 1,
        collectionsCount: { $size: '$collections' },
        avgPriority: { $round: ['$avgPriority', 1] },
        totalTags: {
          $size: {
            $setUnion: {
              $reduce: {
                input: '$totalTags',
                initialValue: [],
                in: { $setUnion: ['$$value', '$$this'] }
              }
            }
          }
        },
        _id: 0
      }
    }
  ]);
};

// Método estático para verificar se um projeto é favorito do usuário
favoriteSchema.statics.isProjectFavorited = function(userId, projectId) {
  return this.findOne({
    user: userId,
    project: projectId,
    isActive: true
  });
};

// Método estático para alternar favorito
favoriteSchema.statics.toggleFavorite = async function(userId, projectId, options = {}) {
  try {
    const existing = await this.findOne({
      user: userId,
      project: projectId
    });

    if (existing) {
      if (existing.isActive) {
        // Remover dos favoritos
        existing.isActive = false;
        await existing.save();
        return { action: 'removed', favorite: existing };
      } else {
        // Restaurar favorito
        existing.isActive = true;
        Object.assign(existing, options);
        await existing.save();
        return { action: 'restored', favorite: existing };
      }
    } else {
      // Criar novo favorito
      const favorite = new this({
        user: userId,
        project: projectId,
        ...options
      });
      await favorite.save();
      return { action: 'added', favorite };
    }
  } catch (error) {
    throw error;
  }
};

// Método estático para obter projetos mais favoritados
favoriteSchema.statics.getMostFavoritedProjects = function(limit = 10) {
  return this.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: '$project',
        favoriteCount: { $sum: 1 },
        avgPriority: { $avg: '$priority' },
        lastFavorited: { $max: '$addedAt' }
      }
    },
    {
      $lookup: {
        from: 'projects',
        localField: '_id',
        foreignField: '_id',
        as: 'projectData'
      }
    },
    {
      $unwind: '$projectData'
    },
    {
      $project: {
        project: '$projectData',
        favoriteCount: 1,
        avgPriority: { $round: ['$avgPriority', 1] },
        lastFavorited: 1
      }
    },
    {
      $sort: { favoriteCount: -1, lastFavorited: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

// Método estático para buscar favoritos
favoriteSchema.statics.searchFavorites = function(userId, searchTerm, options = {}) {
  const { limit = 10 } = options;
  
  return this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        isActive: true,
        $or: [
          { notes: { $regex: searchTerm, $options: 'i' } },
          { tags: { $regex: searchTerm, $options: 'i' } },
          { favoriteCollection: { $regex: searchTerm, $options: 'i' } }
        ]
      }
    },
    {
      $lookup: {
        from: 'projects',
        localField: 'project',
        foreignField: '_id',
        as: 'projectData'
      }
    },
    {
      $unwind: '$projectData'
    },
    {
      $match: {
        $or: [
          { 'projectData.name': { $regex: searchTerm, $options: 'i' } },
          { 'projectData.description': { $regex: searchTerm, $options: 'i' } }
        ]
      }
    },
    {
      $sort: { addedAt: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

module.exports = mongoose.model('Favorite', favoriteSchema);
