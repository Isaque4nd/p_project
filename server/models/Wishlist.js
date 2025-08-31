const mongoose = require('mongoose');

const wishlistItemSchema = new mongoose.Schema({
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
    addedAt: {
        type: Date,
        default: Date.now
    },
    // Notificar quando houver desconto
    notifyOnDiscount: {
        type: Boolean,
        default: false
    },
    // Notificar quando voltar ao estoque
    notifyOnStock: {
        type: Boolean,
        default: false
    }
});

const wishlistSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [wishlistItemSchema],
    
    // Configurações de notificação
    emailNotifications: {
        type: Boolean,
        default: true
    },
    whatsappNotifications: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Índices
wishlistSchema.index({ user: 1 });
wishlistSchema.index({ 'items.product': 1 });
wishlistSchema.index({ 'items.combo': 1 });
wishlistSchema.index({ 'items.addedAt': -1 });

// Virtual para contar itens
wishlistSchema.virtual('itemCount').get(function() {
    return this.items.length;
});

// Método para adicionar item
wishlistSchema.methods.addItem = function(itemData) {
    const { product, combo, type, notifyOnDiscount, notifyOnStock } = itemData;
    
    // Verificar se o item já existe
    const existingItem = this.items.find(item => {
        if (type === 'product') {
            return item.type === 'product' && item.product.toString() === product.toString();
        } else {
            return item.type === 'combo' && item.combo.toString() === combo.toString();
        }
    });
    
    if (existingItem) {
        return { added: false, message: 'Item já está na lista de desejos' };
    }
    
    // Adicionar novo item
    const newItem = {
        type,
        addedAt: new Date(),
        notifyOnDiscount: notifyOnDiscount || false,
        notifyOnStock: notifyOnStock || false
    };
    
    if (type === 'product') {
        newItem.product = product;
    } else {
        newItem.combo = combo;
    }
    
    this.items.push(newItem);
    return { added: true, message: 'Item adicionado à lista de desejos' };
};

// Método para remover item
wishlistSchema.methods.removeItem = function(itemId) {
    const itemIndex = this.items.findIndex(item => item._id.toString() === itemId.toString());
    
    if (itemIndex === -1) {
        return { removed: false, message: 'Item não encontrado na lista de desejos' };
    }
    
    this.items.splice(itemIndex, 1);
    return { removed: true, message: 'Item removido da lista de desejos' };
};

// Método para verificar se um item está na wishlist
wishlistSchema.methods.hasItem = function(itemData) {
    const { product, combo, type } = itemData;
    
    return this.items.some(item => {
        if (type === 'product') {
            return item.type === 'product' && item.product.toString() === product.toString();
        } else {
            return item.type === 'combo' && item.combo.toString() === combo.toString();
        }
    });
};

// Método para atualizar configurações de notificação de um item
wishlistSchema.methods.updateItemNotifications = function(itemId, notifications) {
    const item = this.items.id(itemId);
    
    if (!item) {
        return { updated: false, message: 'Item não encontrado' };
    }
    
    if (notifications.notifyOnDiscount !== undefined) {
        item.notifyOnDiscount = notifications.notifyOnDiscount;
    }
    
    if (notifications.notifyOnStock !== undefined) {
        item.notifyOnStock = notifications.notifyOnStock;
    }
    
    return { updated: true, message: 'Configurações de notificação atualizadas' };
};

// Método para mover item para o carrinho
wishlistSchema.methods.moveToCart = async function(itemId, quantity = 1) {
    const item = this.items.id(itemId);
    
    if (!item) {
        return { moved: false, message: 'Item não encontrado na lista de desejos' };
    }
    
    try {
        const Cart = require('./Cart');
        
        // Buscar ou criar carrinho do usuário
        let cart = await Cart.findOne({ user: this.user });
        if (!cart) {
            cart = new Cart({ user: this.user, items: [] });
        }
        
        // Adicionar item ao carrinho
        const cartItem = {
            type: item.type,
            quantity
        };
        
        if (item.type === 'product') {
            cartItem.product = item.product;
        } else {
            cartItem.combo = item.combo;
        }
        
        const result = cart.addItem(cartItem);
        
        if (result.added) {
            await cart.save();
            
            // Remover da wishlist
            this.removeItem(itemId);
            await this.save();
            
            return { moved: true, message: 'Item movido para o carrinho' };
        } else {
            return { moved: false, message: result.message };
        }
        
    } catch (error) {
        return { moved: false, message: 'Erro ao mover item para o carrinho' };
    }
};

// Static method para encontrar usuários interessados em um produto
wishlistSchema.statics.findInterestedUsers = function(productId, type = 'product') {
    const matchCondition = type === 'product' 
        ? { 'items.product': productId, 'items.type': 'product' }
        : { 'items.combo': productId, 'items.type': 'combo' };
    
    return this.find(matchCondition)
        .populate('user', 'name email whatsapp')
        .select('user items emailNotifications whatsappNotifications');
};

module.exports = mongoose.model('Wishlist', wishlistSchema);
