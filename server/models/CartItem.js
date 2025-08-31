const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
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
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  priceAtTime: {
    type: Number,
    required: true,
    min: 0
  },
  discountApplied: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  notes: {
    type: String,
    maxlength: 500,
    default: ''
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sessionId: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Índices
cartItemSchema.index({ user: 1, isActive: 1 });
cartItemSchema.index({ user: 1, project: 1 }, { unique: true });
cartItemSchema.index({ sessionId: 1 });
cartItemSchema.index({ addedAt: 1 });

// Virtual para calcular o total do item
cartItemSchema.virtual('itemTotal').get(function() {
  const baseTotal = this.priceAtTime * this.quantity;
  return baseTotal - this.discountAmount;
});

// Virtual para calcular o total sem desconto
cartItemSchema.virtual('subtotal').get(function() {
  return this.priceAtTime * this.quantity;
});

// Middleware para atualizar updatedAt
cartItemSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Método para aplicar desconto baseado na quantidade
cartItemSchema.methods.applyQuantityDiscount = function() {
  let discountPercentage = 0;
  
  if (this.quantity >= 10) {
    discountPercentage = 15; // 15% para 10+ itens
  } else if (this.quantity >= 5) {
    discountPercentage = 10; // 10% para 5+ itens
  } else if (this.quantity >= 3) {
    discountPercentage = 5;  // 5% para 3+ itens
  }
  
  this.discountApplied = discountPercentage;
  this.discountAmount = (this.priceAtTime * this.quantity * discountPercentage) / 100;
  
  return this.save();
};

// Método estático para obter carrinho do usuário
cartItemSchema.statics.getUserCart = function(userId) {
  return this.find({
    user: userId,
    isActive: true
  })
  .populate('project', 'name slug price images category')
  .populate('user', 'name email')
  .sort({ addedAt: -1 });
};

// Método estático para calcular total do carrinho
cartItemSchema.statics.calculateCartTotal = async function(userId) {
  const cartItems = await this.find({
    user: userId,
    isActive: true
  });
  
  let subtotal = 0;
  let totalDiscount = 0;
  let itemCount = 0;
  
  cartItems.forEach(item => {
    subtotal += item.priceAtTime * item.quantity;
    totalDiscount += item.discountAmount;
    itemCount += item.quantity;
  });
  
  const total = subtotal - totalDiscount;
  
  return {
    subtotal,
    totalDiscount,
    total,
    itemCount,
    items: cartItems.length
  };
};

// Método estático para limpar carrinho do usuário
cartItemSchema.statics.clearUserCart = function(userId) {
  return this.deleteMany({
    user: userId
  });
};

// Método estático para limpar itens antigos (mais de 30 dias)
cartItemSchema.statics.cleanupOldItems = function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return this.deleteMany({
    addedAt: { $lt: thirtyDaysAgo }
  });
};

// Método estático para aplicar desconto progressivo baseado no total
cartItemSchema.statics.applyProgressiveDiscount = async function(userId) {
  const cartSummary = await this.calculateCartTotal(userId);
  let additionalDiscount = 0;
  
  if (cartSummary.subtotal >= 500) {
    additionalDiscount = 20; // 20% para compras acima de R$ 500
  } else if (cartSummary.subtotal >= 300) {
    additionalDiscount = 15; // 15% para compras acima de R$ 300
  } else if (cartSummary.subtotal >= 200) {
    additionalDiscount = 10; // 10% para compras acima de R$ 200
  } else if (cartSummary.subtotal >= 100) {
    additionalDiscount = 5;  // 5% para compras acima de R$ 100
  }
  
  return {
    ...cartSummary,
    progressiveDiscount: additionalDiscount,
    progressiveDiscountAmount: (cartSummary.subtotal * additionalDiscount) / 100,
    finalTotal: cartSummary.total - ((cartSummary.subtotal * additionalDiscount) / 100)
  };
};

// Configurar para incluir virtuals na serialização JSON
cartItemSchema.set('toJSON', { virtuals: true });
cartItemSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CartItem', cartItemSchema);
