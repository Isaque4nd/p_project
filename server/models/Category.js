const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: '#007bff',
    match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  isMainCategory: {
    type: Boolean,
    default: false
  },
  showInMenu: {
    type: Boolean,
    default: true
  },
  metadata: {
    keywords: [String],
    metaDescription: String,
    metaTitle: String
  }
}, {
  timestamps: true
});

// Índices
categorySchema.index({ slug: 1 });
categorySchema.index({ parentCategory: 1 });
categorySchema.index({ isActive: 1, showInMenu: 1 });
categorySchema.index({ isMainCategory: 1, sortOrder: 1 });

// Virtual para subcategorias
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentCategory'
});

// Virtual para contagem de projetos
categorySchema.virtual('projectCount', {
  ref: 'Project',
  localField: '_id',
  foreignField: 'category',
  count: true
});

// Método para gerar slug automaticamente
categorySchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Método para validar hierarquia (prevenir loops)
categorySchema.pre('save', async function(next) {
  if (this.parentCategory) {
    let parent = await this.constructor.findById(this.parentCategory);
    let depth = 0;
    
    while (parent && depth < 10) {
      if (parent._id.equals(this._id)) {
        return next(new Error('Categoria não pode ser pai de si mesma'));
      }
      parent = await this.constructor.findById(parent.parentCategory);
      depth++;
    }
    
    if (depth >= 10) {
      return next(new Error('Hierarquia muito profunda'));
    }
  }
  next();
});

// Método estático para obter categorias principais
categorySchema.statics.getMainCategories = function() {
  return this.find({
    isActive: true,
    showInMenu: true,
    parentCategory: null
  }).sort({ sortOrder: 1, name: 1 });
};

// Método estático para obter árvore de categorias
categorySchema.statics.getCategoryTree = function() {
  return this.find({ isActive: true })
    .populate('subcategories')
    .sort({ sortOrder: 1, name: 1 });
};

// Método para obter caminho completo da categoria
categorySchema.methods.getFullPath = async function() {
  let path = [this.name];
  let current = this;
  
  while (current.parentCategory) {
    current = await this.constructor.findById(current.parentCategory);
    if (current) {
      path.unshift(current.name);
    }
  }
  
  return path.join(' > ');
};

// Configurar para incluir virtuals na serialização JSON
categorySchema.set('toJSON', { virtuals: true });
categorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Category', categorySchema);
