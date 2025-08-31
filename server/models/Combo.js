// server/models/Combo.js
const mongoose = require('mongoose');

const comboSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    }
  }],
  originalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  comboPrice: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  image: {
    type: String,
    default: ''
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  tags: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  validUntil: {
    type: Date
  },
  maxQuantity: {
    type: Number,
    default: null
  },
  soldCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Middleware para calcular desconto automaticamente
comboSchema.pre('save', function(next) {
  if (this.originalPrice > 0 && this.comboPrice > 0) {
    this.discount = Math.round(((this.originalPrice - this.comboPrice) / this.originalPrice) * 100);
  }
  
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  next();
});

// Virtual para calcular economia
comboSchema.virtual('savings').get(function() {
  return this.originalPrice - this.comboPrice;
});

// Incluir virtuals no JSON
comboSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Combo', comboSchema);
