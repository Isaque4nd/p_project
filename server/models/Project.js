// server/models/Project.js
const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  driveLink: {
    type: String,
    required: true,
    trim: true
  },
  customCheckoutUrl: {
    type: String,
    trim: true,
    default: null,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow null/empty
        return /^https?:\/\/.+/.test(v); // Validate URL format
      },
      message: 'URL de checkout deve ser um link válido (http/https)'
    }
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  images: [{
    url: { type: String, required: true },
    alt: { type: String, default: '' },
    isPrimary: { type: Boolean, default: false },
    order: { type: Number, default: 0 }
  }],
  originalPrice: {
    type: Number,
    min: 0,
    default: null
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  stock: {
    type: Number,
    min: 0,
    default: 999999 // Produto digital, estoque "infinito"
  },
  isDigital: {
    type: Boolean,
    default: true
  },
  productType: {
    type: String,
    enum: ['individual', 'combo', 'bundle'],
    default: 'individual'
  },
  comboItems: [{
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    }
  }],
  downloadLimit: {
    type: Number,
    min: 1,
    default: 3
  },
  specifications: {
    fileSize: { type: String, default: '' },
    format: { type: String, default: '' },
    compatibility: [String],
    requirements: [String],
    includes: [String]
  },
  seoData: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },
  isPromoted: {
    type: Boolean,
    default: false
  },
  promotionEndDate: {
    type: Date,
    default: null
  },
  viewCount: {
    type: Number,
    default: 0
  },
  purchaseCount: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  features: [{
    type: String,
    trim: true
  }],
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null significa disponível para todos
  },
  deliveryType: {
    type: String,
    enum: ['payment', 'manual'],
    default: 'payment'
  },
  recurringPeriod: {
    type: Number,
    enum: [1, 3, 6, 12],
    default: null // null = produto único, não recorrente
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  expiryNotificationDays: {
    type: Number,
    default: 7 // Notificar 7 dias antes do vencimento
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  availableUntil: {
    type: Date,
    default: function() {
      // Disponível por 72 horas (3 dias) por padrão
      return new Date(Date.now() + 72 * 60 * 60 * 1000);
    }
  },
  slug: {
    type: String,
    unique: true,
    sparse: true, // Permite null/undefined
    trim: true
  }
});

// Método virtual para verificar se o projeto ainda está disponível
projectSchema.virtual('isAvailable').get(function() {
  if (!this.isActive) return false;
  if (this.targetUser) return true; // Projetos específicos não expiram
  return new Date() < this.availableUntil;
});

// Virtual para verificar se está em promoção
projectSchema.virtual('isOnPromotion').get(function() {
  if (!this.isPromoted) return false;
  if (this.promotionEndDate && new Date() > this.promotionEndDate) return false;
  return this.discountPercentage > 0;
});

// Virtual para calcular preço final
projectSchema.virtual('finalPrice').get(function() {
  if (this.discountPercentage > 0) {
    return this.price * (1 - this.discountPercentage / 100);
  }
  return this.price;
});

// Virtual para economia em valor
projectSchema.virtual('savedAmount').get(function() {
  if (this.originalPrice && this.originalPrice > this.price) {
    return this.originalPrice - this.price;
  }
  if (this.discountPercentage > 0) {
    return this.price * (this.discountPercentage / 100);
  }
  return 0;
});

// Virtual para imagem principal
projectSchema.virtual('primaryImage').get(function() {
  if (!this.images || !Array.isArray(this.images)) return null;
  const primary = this.images.find(img => img && img.isPrimary);
  return primary || (this.images.length > 0 ? this.images[0] : null);
});

// Virtual para status de estoque
projectSchema.virtual('stockStatus').get(function() {
  if (this.isDigital) return 'available';
  if (this.stock <= 0) return 'out_of_stock';
  if (this.stock <= 5) return 'low_stock';
  return 'in_stock';
});

// Método para gerar slug único
projectSchema.methods.generateSlug = function() {
  const baseSlug = this.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
  
  this.slug = `${baseSlug}-${Date.now()}`;
  return this.slug;
};

// Método para incrementar visualizações
projectSchema.methods.incrementViews = function() {
  this.viewCount += 1;
  return this.save();
};

// Método para incrementar compras
projectSchema.methods.incrementPurchases = function() {
  this.purchaseCount += 1;
  return this.save();
};

// Método para atualizar rating médio
projectSchema.methods.updateAverageRating = async function() {
  const Review = mongoose.model('Review');
  const stats = await Review.calculateProjectAverageRating(this._id);
  
  if (stats.length > 0) {
    this.averageRating = Math.round(stats[0].averageRating * 10) / 10;
    this.reviewCount = stats[0].totalReviews;
  } else {
    this.averageRating = 0;
    this.reviewCount = 0;
  }
  
  return this.save();
};

// Método para definir imagem principal
projectSchema.methods.setPrimaryImage = function(imageIndex) {
  this.images.forEach((img, index) => {
    img.isPrimary = index === imageIndex;
  });
  return this.save();
};

// Método estático para busca avançada
projectSchema.statics.advancedSearch = function(options = {}) {
  const {
    query = '',
    category = null,
    minPrice = 0,
    maxPrice = null,
    tags = [],
    rating = 0,
    sortBy = 'createdAt',
    sortOrder = -1,
    limit = 20,
    skip = 0,
    isPromoted = null,
    inStock = true
  } = options;

  let searchQuery = {
    isActive: true
  };

  // Busca por texto
  if (query) {
    searchQuery.$or = [
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } }
    ];
  }

  // Filtro por categoria
  if (category) {
    searchQuery.category = category;
  }

  // Filtro por preço
  if (maxPrice) {
    searchQuery.price = { $gte: minPrice, $lte: maxPrice };
  } else {
    searchQuery.price = { $gte: minPrice };
  }

  // Filtro por tags
  if (tags.length > 0) {
    searchQuery.tags = { $in: tags };
  }

  // Filtro por rating
  if (rating > 0) {
    searchQuery.averageRating = { $gte: rating };
  }

  // Filtro por promoção
  if (isPromoted !== null) {
    searchQuery.isPromoted = isPromoted;
  }

  // Filtro por estoque
  if (inStock) {
    searchQuery.$or = [
      { isDigital: true },
      { stock: { $gt: 0 } }
    ];
  }

  return this.find(searchQuery)
    .populate('category', 'name slug')
    .populate('subcategory', 'name slug')
    .sort({ [sortBy]: sortOrder })
    .limit(limit)
    .skip(skip);
};

// Método estático para produtos relacionados
projectSchema.statics.getRelatedProjects = function(projectId, categoryId, limit = 4) {
  return this.find({
    _id: { $ne: projectId },
    category: categoryId,
    isActive: true
  })
  .populate('category', 'name slug')
  .sort({ averageRating: -1, purchaseCount: -1 })
  .limit(limit);
};

// Método estático para produtos em destaque
projectSchema.statics.getFeaturedProjects = function(limit = 8) {
  return this.find({
    isActive: true,
    isPromoted: true
  })
  .populate('category', 'name slug')
  .sort({ averageRating: -1, viewCount: -1 })
  .limit(limit);
};

// Método estático para mais vendidos
projectSchema.statics.getBestSellers = function(limit = 10) {
  return this.find({
    isActive: true
  })
  .populate('category', 'name slug')
  .sort({ purchaseCount: -1, averageRating: -1 })
  .limit(limit);
};

// Índices para performance
projectSchema.index({ isActive: 1, createdAt: -1 });
projectSchema.index({ category: 1, isActive: 1 });
projectSchema.index({ subcategory: 1, isActive: 1 });
projectSchema.index({ availableUntil: 1 });
projectSchema.index({ slug: 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ price: 1 });
projectSchema.index({ averageRating: -1 });
projectSchema.index({ purchaseCount: -1 });
projectSchema.index({ viewCount: -1 });
projectSchema.index({ isPromoted: 1, promotionEndDate: 1 });
projectSchema.index({ 
  title: 'text', 
  description: 'text', 
  tags: 'text' 
}, {
  weights: {
    title: 10,
    tags: 5,
    description: 1
  }
});

// Middleware para atualizar lastUpdated
projectSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastUpdated = new Date();
  }
  next();
});

// Configurar para incluir virtuals na serialização JSON (desabilitado temporariamente)
// projectSchema.set('toJSON', { virtuals: true });
// projectSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Project', projectSchema);