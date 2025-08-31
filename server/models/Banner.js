const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: 300,
    default: ''
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  imageUrl: {
    type: String,
    required: true,
    trim: true
  },
  mobileImageUrl: {
    type: String,
    trim: true,
    default: ''
  },
  linkUrl: {
    type: String,
    trim: true,
    default: ''
  },
  linkText: {
    type: String,
    trim: true,
    maxlength: 50,
    default: 'Saiba mais'
  },
  targetProject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  targetCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  position: {
    type: String,
    enum: ['hero', 'secondary', 'sidebar', 'footer', 'popup'],
    default: 'hero'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  showOnPages: [{
    type: String,
    enum: ['home', 'products', 'categories', 'project-detail', 'all'],
    default: 'home'
  }],
  clickCount: {
    type: Number,
    default: 0
  },
  impressionCount: {
    type: Number,
    default: 0
  },
  backgroundColor: {
    type: String,
    default: 'transparent'
  },
  textColor: {
    type: String,
    default: '#000000'
  },
  buttonColor: {
    type: String,
    default: '#007bff'
  },
  buttonTextColor: {
    type: String,
    default: '#ffffff'
  },
  animation: {
    type: String,
    enum: ['none', 'fade', 'slide', 'zoom'],
    default: 'none'
  },
  showTimer: {
    type: Boolean,
    default: false
  },
  isScheduled: {
    type: Boolean,
    default: false
  },
  deviceTargeting: {
    desktop: { type: Boolean, default: true },
    mobile: { type: Boolean, default: true },
    tablet: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

// Índices
bannerSchema.index({ position: 1, isActive: 1, sortOrder: 1 });
bannerSchema.index({ startDate: 1, endDate: 1 });
bannerSchema.index({ showOnPages: 1 });
bannerSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

// Virtual para verificar se o banner está ativo no momento
bannerSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  const isDateActive = this.startDate <= now && 
    (this.endDate === null || this.endDate >= now);
  return this.isActive && isDateActive;
});

// Virtual para calcular CTR (Click Through Rate)
bannerSchema.virtual('ctr').get(function() {
  if (this.impressionCount === 0) return 0;
  return ((this.clickCount / this.impressionCount) * 100).toFixed(2);
});

// Método para registrar uma impressão
bannerSchema.methods.recordImpression = function() {
  this.impressionCount += 1;
  return this.save();
};

// Método para registrar um clique
bannerSchema.methods.recordClick = function() {
  this.clickCount += 1;
  return this.save();
};

// Método estático para obter banners ativos por posição
bannerSchema.statics.getActiveBannersByPosition = function(position, page = 'all') {
  const now = new Date();
  const query = {
    position: position,
    isActive: true,
    startDate: { $lte: now },
    $or: [
      { endDate: null },
      { endDate: { $gte: now } }
    ]
  };

  if (page !== 'all') {
    query.showOnPages = { $in: [page, 'all'] };
  }

  return this.find(query)
    .populate('targetProject', 'name slug price')
    .populate('targetCategory', 'name slug')
    .sort({ sortOrder: 1, createdAt: -1 });
};

// Método estático para obter banners para página específica
bannerSchema.statics.getBannersForPage = function(page, deviceType = 'desktop') {
  const now = new Date();
  const deviceField = `deviceTargeting.${deviceType}`;
  
  return this.find({
    isActive: true,
    startDate: { $lte: now },
    $or: [
      { endDate: null },
      { endDate: { $gte: now } }
    ],
    showOnPages: { $in: [page, 'all'] },
    [deviceField]: true
  })
  .populate('targetProject', 'name slug price images')
  .populate('targetCategory', 'name slug')
  .sort({ position: 1, sortOrder: 1 });
};

// Middleware para validar datas
bannerSchema.pre('save', function(next) {
  if (this.endDate && this.startDate && this.endDate < this.startDate) {
    return next(new Error('Data de fim deve ser posterior à data de início'));
  }
  next();
});

// Configurar para incluir virtuals na serialização JSON
bannerSchema.set('toJSON', { virtuals: true });
bannerSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Banner', bannerSchema);
