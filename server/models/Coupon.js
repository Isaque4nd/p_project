const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    
    // Tipo de desconto
    type: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
    },
    value: {
        type: Number,
        required: true,
        min: 0
    },
    
    // Valor mínimo do pedido para aplicar o cupom
    minimumOrderValue: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // Desconto máximo (para cupons de porcentagem)
    maximumDiscount: {
        type: Number,
        min: 0
    },
    
    // Validade
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    
    // Limites de uso
    usageLimit: {
        type: Number,
        min: 1
    }, // null = ilimitado
    usageLimitPerUser: {
        type: Number,
        min: 1,
        default: 1
    },
    usedCount: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // Produtos/categorias específicas (opcional)
    applicableProducts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    }],
    applicableCategories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],
    applicableCombos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Combo'
    }],
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Usuários que já usaram este cupom
    usedBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        usedAt: {
            type: Date,
            default: Date.now
        },
        orderValue: Number,
        discountApplied: Number
    }],
    
    // Configurações especiais
    firstTimeOnly: {
        type: Boolean,
        default: false
    }, // Apenas para primeira compra
    
    // Criado por
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Índices
couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, endDate: 1 });
couponSchema.index({ startDate: 1, endDate: 1 });

// Virtual para verificar se o cupom está válido
couponSchema.virtual('isValid').get(function() {
    const now = new Date();
    return this.isActive && 
           this.startDate <= now && 
           this.endDate >= now &&
           (this.usageLimit === null || this.usedCount < this.usageLimit);
});

// Virtual para dias restantes
couponSchema.virtual('daysRemaining').get(function() {
    const now = new Date();
    const diffTime = this.endDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual para porcentagem de uso
couponSchema.virtual('usagePercentage').get(function() {
    if (!this.usageLimit) return 0;
    return Math.round((this.usedCount / this.usageLimit) * 100);
});

// Método para verificar se um usuário pode usar o cupom
couponSchema.methods.canBeUsedBy = function(userId, orderValue = 0) {
    const now = new Date();
    
    // Verificações básicas
    if (!this.isActive) return { valid: false, reason: 'Cupom inativo' };
    if (this.startDate > now) return { valid: false, reason: 'Cupom ainda não está ativo' };
    if (this.endDate < now) return { valid: false, reason: 'Cupom expirado' };
    if (this.usageLimit && this.usedCount >= this.usageLimit) {
        return { valid: false, reason: 'Limite de uso do cupom atingido' };
    }
    if (orderValue < this.minimumOrderValue) {
        return { valid: false, reason: `Valor mínimo do pedido: R$ ${this.minimumOrderValue.toFixed(2)}` };
    }
    
    // Verificar uso por usuário
    const userUsages = this.usedBy.filter(usage => usage.user.toString() === userId.toString());
    if (userUsages.length >= this.usageLimitPerUser) {
        return { valid: false, reason: 'Você já atingiu o limite de uso deste cupom' };
    }
    
    return { valid: true };
};

// Método para calcular desconto
couponSchema.methods.calculateDiscount = function(orderValue, items = []) {
    if (!this.canBeUsedBy(null, orderValue).valid) return 0;
    
    let applicableValue = orderValue;
    
    // Se há produtos/categorias específicas, calcular apenas sobre eles
    if (this.applicableProducts.length > 0 || 
        this.applicableCategories.length > 0 || 
        this.applicableCombos.length > 0) {
        
        applicableValue = 0;
        
        for (const item of items) {
            let isApplicable = false;
            
            // Verificar produtos específicos
            if (item.type === 'product' && 
                this.applicableProducts.some(p => p.toString() === item.product.toString())) {
                isApplicable = true;
            }
            
            // Verificar combos específicos
            if (item.type === 'combo' && 
                this.applicableCombos.some(c => c.toString() === item.combo.toString())) {
                isApplicable = true;
            }
            
            // TODO: Verificar categorias (precisaria popular o produto)
            
            if (isApplicable) {
                applicableValue += item.price * item.quantity;
            }
        }
    }
    
    let discount = 0;
    
    if (this.type === 'percentage') {
        discount = (applicableValue * this.value) / 100;
        if (this.maximumDiscount) {
            discount = Math.min(discount, this.maximumDiscount);
        }
    } else { // fixed
        discount = Math.min(this.value, applicableValue);
    }
    
    return Math.round(discount * 100) / 100; // Arredondar para 2 casas decimais
};

// Método para registrar uso do cupom
couponSchema.methods.recordUsage = function(userId, orderValue, discountApplied) {
    this.usedBy.push({
        user: userId,
        usedAt: new Date(),
        orderValue,
        discountApplied
    });
    this.usedCount += 1;
    return this.save();
};

// Middleware para gerar código automaticamente se não fornecido
couponSchema.pre('save', function(next) {
    if (!this.code && this.name) {
        // Gerar código baseado no nome
        let code = this.name.toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 10);
        
        // Adicionar número aleatório se muito curto
        if (code.length < 5) {
            code += Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        }
        
        this.code = code;
    }
    next();
});

// Middleware para validações
couponSchema.pre('save', function(next) {
    // Validar datas
    if (this.endDate <= this.startDate) {
        return next(new Error('Data de fim deve ser posterior à data de início'));
    }
    
    // Validar valor máximo para porcentagem
    if (this.type === 'percentage' && this.value > 100) {
        return next(new Error('Porcentagem não pode ser maior que 100%'));
    }
    
    next();
});

module.exports = mongoose.model('Coupon', couponSchema);
