const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    // Referências
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: function() { return this.type === 'product'; }
    },
    combo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Combo',
        required: function() { return this.type === 'combo'; }
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    type: {
        type: String,
        enum: ['product', 'combo'],
        required: true
    },
    
    // Avaliação
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    comment: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    
    // Aspectos específicos (opcional)
    qualityRating: {
        type: Number,
        min: 1,
        max: 5
    },
    valueRating: {
        type: Number,
        min: 1,
        max: 5
    },
    deliveryRating: {
        type: Number,
        min: 1,
        max: 5
    },
    
    // Mídia (fotos/vídeos)
    images: [{
        url: String,
        caption: String
    }],
    
    // Informações úteis
    verified: {
        type: Boolean,
        default: false
    },
    helpful: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        isHelpful: Boolean,
        date: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Status da avaliação
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'hidden'],
        default: 'approved'
    },
    isVisible: {
        type: Boolean,
        default: true
    },
    
    // Resposta do vendedor/admin
    response: {
        content: String,
        respondedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        respondedAt: Date
    },
    
    // Moderação
    reported: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: String,
        date: {
            type: Date,
            default: Date.now
        }
    }],
    moderatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    moderatedAt: Date,
    moderationNote: String,
    
    // Informações da compra
    purchaseVerified: {
        type: Boolean,
        default: false
    },
    daysSincePurchase: Number,
    
    // Compatibilidade com sistema antigo
    customerName: {
        type: String,
        trim: true
    },
    isAdminReview: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Índices
reviewSchema.index({ product: 1, rating: -1 });
reviewSchema.index({ combo: 1, rating: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });
reviewSchema.index({ status: 1, isVisible: 1 });
reviewSchema.index({ verified: 1 });

// Índice composto para prevenir reviews duplicadas
reviewSchema.index({ user: 1, product: 1, order: 1 }, { 
    unique: true, 
    sparse: true,
    partialFilterExpression: { type: 'product', order: { $exists: true } } 
});
reviewSchema.index({ user: 1, combo: 1, order: 1 }, { 
    unique: true, 
    sparse: true,
    partialFilterExpression: { type: 'combo', order: { $exists: true } } 
});

// Virtuals
reviewSchema.virtual('helpfulCount').get(function() {
    return this.helpful.filter(h => h.isHelpful === true).length;
});

reviewSchema.virtual('notHelpfulCount').get(function() {
    return this.helpful.filter(h => h.isHelpful === false).length;
});

reviewSchema.virtual('createdAtFormatted').get(function() {
    return this.createdAt.toLocaleDateString('pt-BR');
});

reviewSchema.virtual('hasResponse').get(function() {
    return !!(this.response && this.response.content);
});

reviewSchema.virtual('isPending').get(function() {
    return this.status === 'pending';
});

reviewSchema.virtual('isApproved').get(function() {
    return this.status === 'approved';
});

reviewSchema.virtual('isActive').get(function() {
    return this.isVisible && this.status === 'approved';
});

// Middleware para calcular dias desde a compra
reviewSchema.pre('save', async function(next) {
    if (this.isNew && this.order) {
        try {
            const Order = require('./Order');
            const order = await Order.findById(this.order);
            
            if (order) {
                const daysDiff = Math.floor((Date.now() - order.placedAt) / (1000 * 60 * 60 * 24));
                this.daysSincePurchase = daysDiff;
                this.purchaseVerified = true;
                this.verified = true;
            }
        } catch (error) {
            console.error('Erro ao calcular dias desde compra:', error);
        }
    }
    
    // Preencher customerName se não fornecido
    if (!this.customerName && !this.isAdminReview) {
        try {
            const User = require('./User');
            const user = await User.findById(this.user);
            if (user) {
                this.customerName = user.name;
            }
        } catch (error) {
            console.error('Erro ao buscar nome do usuário:', error);
        }
    }
    
    next();
});

// Método para marcar como útil/não útil
reviewSchema.methods.markHelpful = function(userId, isHelpful) {
    // Remover voto anterior do usuário
    this.helpful = this.helpful.filter(h => h.user.toString() !== userId.toString());
    
    // Adicionar novo voto
    this.helpful.push({
        user: userId,
        isHelpful,
        date: new Date()
    });
    
    return this.save();
};

// Método para adicionar resposta
reviewSchema.methods.addResponse = function(content, respondedBy) {
    this.response = {
        content,
        respondedBy,
        respondedAt: new Date()
    };
    
    return this.save();
};

// Método para reportar review
reviewSchema.methods.report = function(userId, reason) {
    // Verificar se já foi reportado pelo usuário
    const alreadyReported = this.reported.some(r => r.user.toString() === userId.toString());
    
    if (alreadyReported) {
        return { success: false, message: 'Você já reportou esta avaliação' };
    }
    
    this.reported.push({
        user: userId,
        reason,
        date: new Date()
    });
    
    return { success: true, message: 'Avaliação reportada com sucesso' };
};

// Método para aprovar uma avaliação
reviewSchema.methods.approve = function(moderatorId, note = '') {
    this.status = 'approved';
    this.moderatedBy = moderatorId;
    this.moderatedAt = new Date();
    this.moderationNote = note;
    return this.save();
};

// Método para rejeitar uma avaliação
reviewSchema.methods.reject = function(moderatorId, note = '') {
    this.status = 'rejected';
    this.moderatedBy = moderatorId;
    this.moderatedAt = new Date();
    this.moderationNote = note;
    return this.save();
};

// Static method para calcular estatísticas de um produto
reviewSchema.statics.getProductStats = async function(productId, type = 'product') {
    const matchField = type === 'product' ? 'product' : 'combo';
    
    const stats = await this.aggregate([
        { 
            $match: { 
                [matchField]: new mongoose.Types.ObjectId(productId),
                status: 'approved',
                isVisible: true
            }
        },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 },
                ratingDistribution: {
                    $push: '$rating'
                },
                averageQuality: { $avg: '$qualityRating' },
                averageValue: { $avg: '$valueRating' },
                averageDelivery: { $avg: '$deliveryRating' }
            }
        },
        {
            $addFields: {
                ratingBreakdown: {
                    5: {
                        $size: {
                            $filter: {
                                input: '$ratingDistribution',
                                cond: { $eq: ['$$this', 5] }
                            }
                        }
                    },
                    4: {
                        $size: {
                            $filter: {
                                input: '$ratingDistribution',
                                cond: { $eq: ['$$this', 4] }
                            }
                        }
                    },
                    3: {
                        $size: {
                            $filter: {
                                input: '$ratingDistribution',
                                cond: { $eq: ['$$this', 3] }
                            }
                        }
                    },
                    2: {
                        $size: {
                            $filter: {
                                input: '$ratingDistribution',
                                cond: { $eq: ['$$this', 2] }
                            }
                        }
                    },
                    1: {
                        $size: {
                            $filter: {
                                input: '$ratingDistribution',
                                cond: { $eq: ['$$this', 1] }
                            }
                        }
                    }
                }
            }
        },
        {
            $project: {
                ratingDistribution: 0
            }
        }
    ]);
    
    return stats[0] || {
        averageRating: 0,
        totalReviews: 0,
        ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        averageQuality: 0,
        averageValue: 0,
        averageDelivery: 0
    };
};

// Método estático para compatibilidade
reviewSchema.statics.calculateProjectAverageRating = function(projectId) {
    return this.aggregate([
        {
            $match: {
                product: new mongoose.Types.ObjectId(projectId),
                status: 'approved',
                isVisible: true
            }
        },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 }
            }
        }
    ]);
};

module.exports = mongoose.model('Review', reviewSchema);
