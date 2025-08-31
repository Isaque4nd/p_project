const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Payment = require('../models/Payment');
const Project = require('../models/Project');
const Combo = require('../models/Combo');
const User = require('../models/User');

// Criar um novo pedido a partir do carrinho
exports.createOrder = async (req, res) => {
    try {
        const { 
            paymentMethod, 
            shippingAddress, 
            couponCode,
            notes,
            source = 'website',
            deviceType = 'desktop'
        } = req.body;
        
        // Buscar carrinho do usuário
        const cart = await Cart.findOne({ user: req.user.id })
            .populate('items.product')
            .populate('items.combo');
            
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Carrinho vazio ou não encontrado'
            });
        }
        
        // Verificar disponibilidade dos produtos
        for (const item of cart.items) {
            if (item.type === 'product' && item.product) {
                if (!item.product.isActive) {
                    return res.status(400).json({
                        success: false,
                        message: `Produto ${item.product.name} não está mais disponível`
                    });
                }
            } else if (item.type === 'combo' && item.combo) {
                if (!item.combo.isActive) {
                    return res.status(400).json({
                        success: false,
                        message: `Combo ${item.combo.name} não está mais disponível`
                    });
                }
            }
        }
        
        // Converter itens do carrinho para itens do pedido
        const orderItems = cart.items.map(item => {
            const orderItem = {
                type: item.type,
                quantity: item.quantity
            };
            
            if (item.type === 'product') {
                orderItem.product = item.product._id;
                orderItem.price = item.product.price;
                orderItem.discount = item.product.discount || 0;
            } else if (item.type === 'combo') {
                orderItem.combo = item.combo._id;
                orderItem.price = item.combo.finalPrice;
                orderItem.discount = item.combo.originalPrice - item.combo.finalPrice;
            }
            
            return orderItem;
        });
        
        // Aplicar cupom se fornecido
        let couponDiscount = 0;
        let appliedCoupon = null;
        let couponObj = null;
        
        if (couponCode) {
            const Coupon = require('../models/Coupon');
            
            couponObj = await Coupon.findOne({ 
                code: couponCode.toUpperCase() 
            });
            
            if (couponObj) {
                // Verificar se o usuário pode usar o cupom
                const validation = couponObj.canBeUsedBy(req.user.id, cart.total);
                
                if (!validation.valid) {
                    return res.status(400).json({
                        success: false,
                        message: `Cupom inválido: ${validation.reason}`
                    });
                }
                
                // Verificar primeira compra se necessário
                if (couponObj.firstTimeOnly) {
                    const userOrderCount = await Order.countDocuments({
                        user: req.user.id,
                        status: { $nin: ['cancelled', 'refunded'] }
                    });
                    
                    if (userOrderCount > 0) {
                        return res.status(400).json({
                            success: false,
                            message: 'Este cupom é válido apenas para a primeira compra'
                        });
                    }
                }
                
                // Calcular desconto
                couponDiscount = couponObj.calculateDiscount(cart.total, cart.items);
                
                appliedCoupon = {
                    code: couponObj.code,
                    discount: couponDiscount,
                    type: couponObj.type
                };
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Cupom não encontrado'
                });
            }
        }
        
        // Criar o pedido
        const order = new Order({
            user: req.user.id,
            items: orderItems,
            paymentMethod,
            shippingAddress,
            couponDiscount,
            coupon: appliedCoupon,
            notes,
            source,
            deviceType
        });
        
        await order.save();
        
        // Registrar uso do cupom se aplicado
        if (couponObj && appliedCoupon) {
            await couponObj.recordUsage(req.user.id, order.total + couponDiscount, couponDiscount);
        }
        
        // Limpar carrinho após criar pedido
        await Cart.findOneAndDelete({ user: req.user.id });
        
        // Populated order para response
        const populatedOrder = await Order.findById(order._id)
            .populate('user', 'name email whatsapp')
            .populate('items.product')
            .populate('items.combo');
        
        res.status(201).json({
            success: true,
            message: 'Pedido criado com sucesso',
            order: populatedOrder
        });
        
    } catch (error) {
        console.error('Erro ao criar pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};

// Listar pedidos do usuário
exports.getUserOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        
        const query = { user: req.user.id };
        if (status) {
            query.status = status;
        }
        
        const orders = await Order.find(query)
            .populate('items.product', 'name price images')
            .populate('items.combo', 'name finalPrice')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
            
        const total = await Order.countDocuments(query);
        
        res.json({
            success: true,
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Erro ao buscar pedidos do usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Obter detalhes de um pedido específico
exports.getOrder = async (req, res) => {
    try {
        const { id } = req.params;
        
        const order = await Order.findById(id)
            .populate('user', 'name email whatsapp')
            .populate('items.product')
            .populate('items.combo')
            .populate('payment');
            
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }
        
        // Verificar se o usuário tem permissão para ver este pedido
        if (!req.user.isAdmin && order.user._id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }
        
        res.json({
            success: true,
            order
        });
        
    } catch (error) {
        console.error('Erro ao buscar pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Admin: Listar todos os pedidos
exports.getAllOrders = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            status, 
            paymentStatus,
            search,
            startDate,
            endDate,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;
        
        const query = {};
        
        // Filtros
        if (status) query.status = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;
        
        // Filtro por data
        if (startDate || endDate) {
            query.placedAt = {};
            if (startDate) query.placedAt.$gte = new Date(startDate);
            if (endDate) query.placedAt.$lte = new Date(endDate);
        }
        
        // Busca por número do pedido ou nome do usuário
        if (search) {
            query.$or = [
                { orderNumber: new RegExp(search, 'i') },
                { 'shippingAddress.city': new RegExp(search, 'i') }
            ];
        }
        
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        const orders = await Order.find(query)
            .populate('user', 'name email whatsapp')
            .populate('items.product', 'name price')
            .populate('items.combo', 'name finalPrice')
            .sort(sortOptions)
            .limit(limit * 1)
            .skip((page - 1) * limit);
            
        const total = await Order.countDocuments(query);
        
        res.json({
            success: true,
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Erro ao buscar todos os pedidos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Admin: Atualizar status do pedido
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body;
        
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }
        
        await order.updateStatus(status, adminNotes);
        
        const updatedOrder = await Order.findById(id)
            .populate('user', 'name email whatsapp')
            .populate('items.product')
            .populate('items.combo');
        
        res.json({
            success: true,
            message: 'Status do pedido atualizado com sucesso',
            order: updatedOrder
        });
        
    } catch (error) {
        console.error('Erro ao atualizar status do pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Admin: Adicionar informações de rastreamento
exports.addTracking = async (req, res) => {
    try {
        const { id } = req.params;
        const { carrier, trackingNumber, estimatedDelivery } = req.body;
        
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }
        
        await order.addTracking(carrier, trackingNumber, estimatedDelivery);
        
        // Atualizar status para enviado se ainda não foi
        if (order.status === 'confirmed' || order.status === 'processing') {
            await order.updateStatus('shipped', 'Código de rastreamento adicionado');
        }
        
        const updatedOrder = await Order.findById(id)
            .populate('user', 'name email whatsapp')
            .populate('items.product')
            .populate('items.combo');
        
        res.json({
            success: true,
            message: 'Informações de rastreamento adicionadas com sucesso',
            order: updatedOrder
        });
        
    } catch (error) {
        console.error('Erro ao adicionar rastreamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Cancelar pedido
exports.cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }
        
        // Verificar se o usuário tem permissão
        if (!req.user.isAdmin && order.user.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }
        
        // Verificar se o pedido pode ser cancelado
        if (['delivered', 'cancelled', 'refunded'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: 'Este pedido não pode ser cancelado'
            });
        }
        
        await order.updateStatus('cancelled', reason || 'Cancelado pelo usuário');
        
        const updatedOrder = await Order.findById(id)
            .populate('user', 'name email whatsapp')
            .populate('items.product')
            .populate('items.combo');
        
        res.json({
            success: true,
            message: 'Pedido cancelado com sucesso',
            order: updatedOrder
        });
        
    } catch (error) {
        console.error('Erro ao cancelar pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

module.exports = {
    createOrder: exports.createOrder,
    getUserOrders: exports.getUserOrders,
    getOrder: exports.getOrder,
    getAllOrders: exports.getAllOrders,
    updateOrderStatus: exports.updateOrderStatus,
    addTracking: exports.addTracking,
    cancelOrder: exports.cancelOrder
};
