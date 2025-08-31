// server/models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Opcional para cobranças simples
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: false // Opcional para cobranças simples
  },
  chargeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Charge',
    required: false // Para pagamentos de cobranças
  },
  customerName: {
    type: String,
    required: false // Para cobranças sem usuário cadastrado
  },
  customerEmail: {
    type: String,
    required: false // Para cobranças sem usuário cadastrado
  },
  customerPhone: {
    type: String,
    required: false // Para cobranças sem usuário cadastrado
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'approved', 'failed', 'cancelled'],
    default: 'pending'
  },
  sacapayId: {
    type: String,
    required: false
  },
  externalId: {
    type: String,
    required: false
  },
  paymentMethod: {
    type: String,
    enum: ['pix', 'manual'],
    default: 'pix'
  },
  provider: {
    type: String,
    enum: ['sacapay', 'mercadopago', 'fallback'],
    default: 'sacapay'
  },
  pixCode: {
    type: String,
    required: false // Código PIX para pagamentos PIX
  },
  qrCodeUrl: {
    type: String,
    required: false // URL do QR Code
  },
  expiresAt: {
    type: Date,
    required: false // Data de expiração do PIX
  },
  description: {
    type: String,
    required: false // Para cobranças simples
  },
  slug: {
    type: String,
    required: false, // Para cobranças com página personalizada
    unique: true,
    sparse: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Para cobranças criadas por admin
  },
  metadata: {
    type: Map,
    of: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para atualizar updatedAt
paymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Índices para performance
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ sacapayId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ externalId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Payment', paymentSchema, 'payments_new');