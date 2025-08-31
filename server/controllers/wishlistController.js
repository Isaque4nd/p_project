const Wishlist = require('../models/Wishlist');
const Project = require('../models/Project');
const Combo = require('../models/Combo');

// Obter wishlist do usuário
exports.getUserWishlist = async (req, res) => {
    try {
        let wishlist = await Wishlist.findOne({ user: req.user.id })
            .populate({
                path: 'items.product',
                select: 'name price images description isActive'
            })
            .populate({
                path: 'items.combo',
                select: 'name finalPrice originalPrice images description isActive'
            });
        
        // Criar wishlist vazia se não existir
        if (!wishlist) {
            wishlist = new Wishlist({
                user: req.user.id,
                items: []
            });
            await wishlist.save();
        }
        
        // Filtrar itens inativos ou removidos
        const activeItems = wishlist.items.filter(item => {
            if (item.type === 'product') {
                return item.product && item.product.isActive;
            } else {
                return item.combo && item.combo.isActive;
            }
        });
        
        // Se alguns itens foram removidos, atualizar a wishlist
        if (activeItems.length !== wishlist.items.length) {
            wishlist.items = activeItems;
            await wishlist.save();
        }
        
        res.json({
            success: true,
            wishlist: {
                ...wishlist.toObject(),
                items: activeItems
            }
        });
        
    } catch (error) {
        console.error('Erro ao obter wishlist:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Adicionar item à wishlist
exports.addToWishlist = async (req, res) => {
    try {
        const { productId, comboId, type, notifyOnDiscount, notifyOnStock } = req.body;
        
        // Validar tipo e IDs
        if (!type || !['product', 'combo'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de item inválido'
            });
        }
        
        if (type === 'product' && !productId) {
            return res.status(400).json({
                success: false,
                message: 'ID do produto é obrigatório'
            });
        }
        
        if (type === 'combo' && !comboId) {
            return res.status(400).json({
                success: false,
                message: 'ID do combo é obrigatório'
            });
        }
        
        // Verificar se o item existe e está ativo
        if (type === 'product') {
            const product = await Project.findById(productId);
            if (!product || !product.isActive) {
                return res.status(404).json({
                    success: false,
                    message: 'Produto não encontrado ou inativo'
                });
            }
        } else {
            const combo = await Combo.findById(comboId);
            if (!combo || !combo.isActive) {
                return res.status(404).json({
                    success: false,
                    message: 'Combo não encontrado ou inativo'
                });
            }
        }
        
        // Buscar ou criar wishlist
        let wishlist = await Wishlist.findOne({ user: req.user.id });
        if (!wishlist) {
            wishlist = new Wishlist({
                user: req.user.id,
                items: []
            });
        }
        
        // Adicionar item
        const itemData = {
            type,
            notifyOnDiscount,
            notifyOnStock
        };
        
        if (type === 'product') {
            itemData.product = productId;
        } else {
            itemData.combo = comboId;
        }
        
        const result = wishlist.addItem(itemData);
        
        if (!result.added) {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }
        
        await wishlist.save();
        
        // Retornar wishlist atualizada
        const updatedWishlist = await Wishlist.findById(wishlist._id)
            .populate('items.product', 'name price images')
            .populate('items.combo', 'name finalPrice images');
        
        res.json({
            success: true,
            message: result.message,
            wishlist: updatedWishlist
        });
        
    } catch (error) {
        console.error('Erro ao adicionar à wishlist:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Remover item da wishlist
exports.removeFromWishlist = async (req, res) => {
    try {
        const { itemId } = req.params;
        
        const wishlist = await Wishlist.findOne({ user: req.user.id });
        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: 'Lista de desejos não encontrada'
            });
        }
        
        const result = wishlist.removeItem(itemId);
        
        if (!result.removed) {
            return res.status(404).json({
                success: false,
                message: result.message
            });
        }
        
        await wishlist.save();
        
        res.json({
            success: true,
            message: result.message
        });
        
    } catch (error) {
        console.error('Erro ao remover da wishlist:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Verificar se item está na wishlist
exports.checkWishlistItem = async (req, res) => {
    try {
        const { productId, comboId, type } = req.query;
        
        if (!type || !['product', 'combo'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de item inválido'
            });
        }
        
        const wishlist = await Wishlist.findOne({ user: req.user.id });
        
        if (!wishlist) {
            return res.json({
                success: true,
                inWishlist: false
            });
        }
        
        const itemData = { type };
        if (type === 'product') {
            itemData.product = productId;
        } else {
            itemData.combo = comboId;
        }
        
        const inWishlist = wishlist.hasItem(itemData);
        
        res.json({
            success: true,
            inWishlist
        });
        
    } catch (error) {
        console.error('Erro ao verificar item na wishlist:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Atualizar configurações de notificação de um item
exports.updateItemNotifications = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { notifyOnDiscount, notifyOnStock } = req.body;
        
        const wishlist = await Wishlist.findOne({ user: req.user.id });
        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: 'Lista de desejos não encontrada'
            });
        }
        
        const result = wishlist.updateItemNotifications(itemId, {
            notifyOnDiscount,
            notifyOnStock
        });
        
        if (!result.updated) {
            return res.status(404).json({
                success: false,
                message: result.message
            });
        }
        
        await wishlist.save();
        
        res.json({
            success: true,
            message: result.message
        });
        
    } catch (error) {
        console.error('Erro ao atualizar notificações:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Mover item da wishlist para o carrinho
exports.moveToCart = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity = 1 } = req.body;
        
        const wishlist = await Wishlist.findOne({ user: req.user.id });
        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: 'Lista de desejos não encontrada'
            });
        }
        
        const result = await wishlist.moveToCart(itemId, quantity);
        
        if (!result.moved) {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }
        
        res.json({
            success: true,
            message: result.message
        });
        
    } catch (error) {
        console.error('Erro ao mover para carrinho:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Atualizar configurações gerais da wishlist
exports.updateWishlistSettings = async (req, res) => {
    try {
        const { emailNotifications, whatsappNotifications } = req.body;
        
        let wishlist = await Wishlist.findOne({ user: req.user.id });
        if (!wishlist) {
            wishlist = new Wishlist({
                user: req.user.id,
                items: []
            });
        }
        
        if (emailNotifications !== undefined) {
            wishlist.emailNotifications = emailNotifications;
        }
        
        if (whatsappNotifications !== undefined) {
            wishlist.whatsappNotifications = whatsappNotifications;
        }
        
        await wishlist.save();
        
        res.json({
            success: true,
            message: 'Configurações atualizadas com sucesso',
            settings: {
                emailNotifications: wishlist.emailNotifications,
                whatsappNotifications: wishlist.whatsappNotifications
            }
        });
        
    } catch (error) {
        console.error('Erro ao atualizar configurações:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Limpar toda a wishlist
exports.clearWishlist = async (req, res) => {
    try {
        const wishlist = await Wishlist.findOne({ user: req.user.id });
        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: 'Lista de desejos não encontrada'
            });
        }
        
        wishlist.items = [];
        await wishlist.save();
        
        res.json({
            success: true,
            message: 'Lista de desejos limpa com sucesso'
        });
        
    } catch (error) {
        console.error('Erro ao limpar wishlist:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Admin: Obter estatísticas da wishlist
exports.getWishlistStats = async (req, res) => {
    try {
        const [
            totalWishlists,
            totalItems,
            mostWishedProducts,
            mostWishedCombos,
            usersWithNotifications
        ] = await Promise.all([
            Wishlist.countDocuments({ 'items.0': { $exists: true } }),
            Wishlist.aggregate([
                { $project: { itemCount: { $size: '$items' } } },
                { $group: { _id: null, total: { $sum: '$itemCount' } } }
            ]),
            Wishlist.aggregate([
                { $unwind: '$items' },
                { $match: { 'items.type': 'product' } },
                { $group: { _id: '$items.product', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
                { $lookup: {
                    from: 'projects',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                } },
                { $unwind: '$product' },
                { $project: {
                    productName: '$product.name',
                    wishlistCount: '$count'
                } }
            ]),
            Wishlist.aggregate([
                { $unwind: '$items' },
                { $match: { 'items.type': 'combo' } },
                { $group: { _id: '$items.combo', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
                { $lookup: {
                    from: 'combos',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'combo'
                } },
                { $unwind: '$combo' },
                { $project: {
                    comboName: '$combo.name',
                    wishlistCount: '$count'
                } }
            ]),
            Wishlist.countDocuments({
                $or: [
                    { emailNotifications: true },
                    { whatsappNotifications: true }
                ]
            })
        ]);
        
        const itemStats = totalItems[0] || { total: 0 };
        
        res.json({
            success: true,
            stats: {
                totalWishlists,
                totalItems: itemStats.total,
                averageItemsPerWishlist: totalWishlists > 0 ? Math.round((itemStats.total / totalWishlists) * 100) / 100 : 0,
                usersWithNotifications,
                mostWishedProducts,
                mostWishedCombos
            }
        });
        
    } catch (error) {
        console.error('Erro ao obter estatísticas da wishlist:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};
