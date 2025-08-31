const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
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
    type: {
        type: String,
        enum: ['product', 'combo'],
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    discount: {
        type: Number,
        default: 0,
        min: 0
    },
    total: {
        type: Number,
        required: true,
        min: 0
    }
});

// Calcular total do item antes de salvar
orderItemSchema.pre('save', function(next) {
    this.total = (this.price - this.discount) * this.quantity;
    next();
});

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [orderItemSchema],
    
    // Totais
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    discountTotal: {
        type: Number,
        default: 0,
        min: 0
    },
    couponDiscount: {
        type: Number,
        default: 0,
        min: 0
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    
    // Status do pedido
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
        default: 'pending'
    },
    
    // Informações de entrega
    shippingAddress: {
        street: String,
        number: String,
        complement: String,
        neighborhood: String,
        city: String,
        state: String,
        zipCode: String,
        country: { type: String, default: 'Brasil' }
    },
    
    // Informações de pagamento
    payment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['pix', 'credit_card', 'debit_card', 'boleto'],
        required: true
    },
    
    // Cupom aplicado
    coupon: {
        code: String,
        discount: Number,
        type: String // 'percentage' ou 'fixed'
    },
    
    // Rastreamento
    tracking: {
        carrier: String,
        trackingNumber: String,
        estimatedDelivery: Date,
        actualDelivery: Date
    },
    
    // Notas e observações
    notes: String,
    adminNotes: String,
    
    // Timestamps
    placedAt: {
        type: Date,
        default: Date.now
    },
    confirmedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    
    // Analytics
    source: {
        type: String,
        enum: ['website', 'whatsapp', 'social_media', 'referral'],
        default: 'website'
    },
    deviceType: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet'],
        default: 'desktop'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Índices para otimização
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ placedAt: -1 });

// Gerar número do pedido automaticamente
orderSchema.pre('save', async function(next) {
    if (!this.orderNumber) {
        const year = new Date().getFullYear();
        const lastOrder = await this.constructor.findOne({
            orderNumber: new RegExp(`^PRS${year}`)
        }).sort({ orderNumber: -1 });
        
        let nextNumber = 1;
        if (lastOrder) {
            const lastNumber = parseInt(lastOrder.orderNumber.substring(7));
            nextNumber = lastNumber + 1;
        }
        
        this.orderNumber = `PRS${year}${nextNumber.toString().padStart(6, '0')}`;
    }
    next();
});

// Calcular totais antes de salvar
orderSchema.pre('save', function(next) {
    // Calcular subtotal
    this.subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Calcular desconto total dos itens
    this.discountTotal = this.items.reduce((sum, item) => sum + (item.discount * item.quantity), 0);
    
    // Calcular total final
    this.total = this.subtotal - this.discountTotal - this.couponDiscount;
    
    next();
});

// Virtual para dias desde o pedido
orderSchema.virtual('daysSincePlaced').get(function() {
    return Math.floor((Date.now() - this.placedAt) / (1000 * 60 * 60 * 24));
});

// Virtual para status formatado
orderSchema.virtual('statusFormatted').get(function() {
    const statusMap = {
        'pending': 'Pendente',
        'confirmed': 'Confirmado',
        'processing': 'Processando',
        'shipped': 'Enviado',
        'delivered': 'Entregue',
        'cancelled': 'Cancelado',
        'refunded': 'Reembolsado'
    };
    return statusMap[this.status] || this.status;
});

// Método para atualizar status
orderSchema.methods.updateStatus = function(newStatus, adminNotes = '') {
    const oldStatus = this.status;
    this.status = newStatus;
    
    // Atualizar timestamps baseado no status
    const now = new Date();
    switch (newStatus) {
        case 'confirmed':
            this.confirmedAt = now;
            break;
        case 'shipped':
            this.shippedAt = now;
            break;
        case 'delivered':
            this.deliveredAt = now;
            break;
        case 'cancelled':
            this.cancelledAt = now;
            break;
    }
    
    if (adminNotes) {
        this.adminNotes = this.adminNotes ? 
            `${this.adminNotes}\n[${now.toISOString()}] Status: ${oldStatus} → ${newStatus} - ${adminNotes}` :
            `[${now.toISOString()}] Status: ${oldStatus} → ${newStatus} - ${adminNotes}`;
    }
    
    return this.save();
};

// Método para adicionar rastreamento
orderSchema.methods.addTracking = function(carrier, trackingNumber, estimatedDelivery) {
    this.tracking = {
        carrier,
        trackingNumber,
        estimatedDelivery
    };
    return this.save();
};

module.exports = mongoose.model('Order', orderSchema);
