// server/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  whatsapp: {
    type: String,
    required: false,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  active: {
    type: Boolean,
    default: true
  },
  currentSessionId: {
    type: String,
    default: null
  },
  lastSession: {
    type: Date,
    default: null
  },
  sessionDevice: {
    type: String,
    default: null
  },
  purchasedProjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  purchaseHistory: [{
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    purchasedAt: {
      type: Date,
      default: Date.now
    },
    amount: {
      type: Number,
      required: true
    },
    paymentMethod: {
      type: String,
      enum: ['pix', 'manual', 'charge'],
      default: 'pix'
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índice para performance
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);