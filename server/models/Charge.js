// server/models/Charge.js
const mongoose = require('mongoose');

const chargeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9-]+$/
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired'],
    default: 'active'
  },
  sacapayOrderId: {
    type: String,
    sparse: true
  },
  pixCode: {
    type: String
  },
  qrCodeUrl: {
    type: String
  },
  expiresAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  payments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  }],
  totalPaid: {
    type: Number,
    default: 0
  },
  paymentCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Índices
chargeSchema.index({ slug: 1 });
chargeSchema.index({ status: 1 });
chargeSchema.index({ createdBy: 1 });
chargeSchema.index({ createdAt: -1 });

// Middleware para gerar slug automaticamente se não fornecido
chargeSchema.pre('save', function(next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
    
    // Adicionar timestamp se slug estiver vazio
    if (!this.slug) {
      this.slug = `cobranca-${Date.now()}`;
    }
  }
  next();
});

// Método para verificar se a cobrança está ativa
chargeSchema.methods.isActive = function() {
  if (this.status !== 'active') return false;
  if (this.expiresAt && this.expiresAt <= new Date()) return false;
  return true;
};

// Método para atualizar estatísticas de pagamento
chargeSchema.methods.updatePaymentStats = async function() {
  const Payment = mongoose.model('Payment');
  
  const stats = await Payment.aggregate([
    {
      $match: {
        chargeId: this._id,
        status: 'approved'
      }
    },
    {
      $group: {
        _id: null,
        totalPaid: { $sum: '$amount' },
        paymentCount: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    this.totalPaid = stats[0].totalPaid;
    this.paymentCount = stats[0].paymentCount;
  } else {
    this.totalPaid = 0;
    this.paymentCount = 0;
  }

  await this.save();
};

module.exports = mongoose.model('Charge', chargeSchema);

