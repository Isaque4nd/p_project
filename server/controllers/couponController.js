const Coupon = require('../models/Coupon');
const User = require('../models/User');

// Criar novo cupom (Admin)
exports.createCoupon = async (req, res) => {
    try {
        const {
            code,
            name,
            description,
            type,
            value,
            minimumOrderValue,
            maximumDiscount,
            startDate,
            endDate,
            usageLimit,
            usageLimitPerUser,
            applicableProducts,
            applicableCategories,
            applicableCombos,
            firstTimeOnly
        } = req.body;
        
        const coupon = new Coupon({
            code: code?.toUpperCase(),
            name,
            description,
            type,
            value,
            minimumOrderValue,
            maximumDiscount,
            startDate,
            endDate,
            usageLimit,
            usageLimitPerUser,
            applicableProducts,
            applicableCategories,
            applicableCombos,
            firstTimeOnly,
            createdBy: req.user.id
        });
        
        await coupon.save();
        
        res.status(201).json({
            success: true,
            message: 'Cupom criado com sucesso',
            coupon
        });
        
    } catch (error) {
        console.error('Erro ao criar cupom:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Código do cupom já existe'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};

// Listar todos os cupons (Admin)
exports.getAllCoupons = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            status = 'all', // all, active, inactive, expired
            search 
        } = req.query;
        
        const query = {};
        
        // Filtros
        if (status === 'active') {
            query.isActive = true;
            query.endDate = { $gte: new Date() };
        } else if (status === 'inactive') {
            query.isActive = false;
        } else if (status === 'expired') {
            query.endDate = { $lt: new Date() };
        }
        
        if (search) {
            query.$or = [
                { code: new RegExp(search, 'i') },
                { name: new RegExp(search, 'i') }
            ];
        }
        
        const coupons = await Coupon.find(query)
            .populate('createdBy', 'name email')
            .populate('applicableProducts', 'name price')
            .populate('applicableCategories', 'name')
            .populate('applicableCombos', 'name')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
            
        const total = await Coupon.countDocuments(query);
        
        res.json({
            success: true,
            coupons,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Erro ao listar cupons:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Obter detalhes de um cupom específico (Admin)
exports.getCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        
        const coupon = await Coupon.findById(id)
            .populate('createdBy', 'name email')
            .populate('applicableProducts', 'name price')
            .populate('applicableCategories', 'name')
            .populate('applicableCombos', 'name')
            .populate('usedBy.user', 'name email');
            
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Cupom não encontrado'
            });
        }
        
        res.json({
            success: true,
            coupon
        });
        
    } catch (error) {
        console.error('Erro ao buscar cupom:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Atualizar cupom (Admin)
exports.updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Não permitir alterar código se já foi usado
        const coupon = await Coupon.findById(id);
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Cupom não encontrado'
            });
        }
        
        if (coupon.usedCount > 0 && updates.code && updates.code !== coupon.code) {
            return res.status(400).json({
                success: false,
                message: 'Não é possível alterar o código de um cupom já utilizado'
            });
        }
        
        const updatedCoupon = await Coupon.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        )
        .populate('createdBy', 'name email')
        .populate('applicableProducts', 'name price')
        .populate('applicableCategories', 'name')
        .populate('applicableCombos', 'name');
        
        res.json({
            success: true,
            message: 'Cupom atualizado com sucesso',
            coupon: updatedCoupon
        });
        
    } catch (error) {
        console.error('Erro ao atualizar cupom:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Excluir cupom (Admin)
exports.deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        
        const coupon = await Coupon.findById(id);
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Cupom não encontrado'
            });
        }
        
        // Verificar se o cupom já foi usado
        if (coupon.usedCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Não é possível excluir um cupom que já foi utilizado. Desative-o em vez disso.'
            });
        }
        
        await Coupon.findByIdAndDelete(id);
        
        res.json({
            success: true,
            message: 'Cupom excluído com sucesso'
        });
        
    } catch (error) {
        console.error('Erro ao excluir cupom:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Validar cupom (Público)
exports.validateCoupon = async (req, res) => {
    try {
        const { code } = req.params;
        const { orderValue = 0, items = [] } = req.body;
        
        const coupon = await Coupon.findOne({ 
            code: code.toUpperCase() 
        })
        .populate('applicableProducts')
        .populate('applicableCategories')
        .populate('applicableCombos');
        
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Cupom não encontrado'
            });
        }
        
        // Verificar se o usuário pode usar o cupom
        const validation = coupon.canBeUsedBy(req.user.id, orderValue);
        
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.reason
            });
        }
        
        // Verificar primeira compra se necessário
        if (coupon.firstTimeOnly) {
            const userOrderCount = await require('../models/Order').countDocuments({
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
        const discount = coupon.calculateDiscount(orderValue, items);
        
        res.json({
            success: true,
            message: 'Cupom válido',
            coupon: {
                code: coupon.code,
                name: coupon.name,
                description: coupon.description,
                type: coupon.type,
                value: coupon.value,
                discount,
                minimumOrderValue: coupon.minimumOrderValue,
                maximumDiscount: coupon.maximumDiscount,
                daysRemaining: coupon.daysRemaining
            }
        });
        
    } catch (error) {
        console.error('Erro ao validar cupom:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Listar cupons públicos ativos
exports.getActiveCoupons = async (req, res) => {
    try {
        const now = new Date();
        
        const coupons = await Coupon.find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
            $or: [
                { usageLimit: null },
                { $expr: { $lt: ['$usedCount', '$usageLimit'] }}
            ]
        })
        .select('code name description type value minimumOrderValue maximumDiscount endDate')
        .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            coupons: coupons.map(coupon => ({
                code: coupon.code,
                name: coupon.name,
                description: coupon.description,
                type: coupon.type,
                value: coupon.value,
                minimumOrderValue: coupon.minimumOrderValue,
                maximumDiscount: coupon.maximumDiscount,
                daysRemaining: coupon.daysRemaining
            }))
        });
        
    } catch (error) {
        console.error('Erro ao listar cupons ativos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Estatísticas de cupons (Admin)
exports.getCouponStats = async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const daysAgo = parseInt(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);
        
        const [
            totalCoupons,
            activeCoupons,
            expiredCoupons,
            usageStats,
            topCoupons
        ] = await Promise.all([
            Coupon.countDocuments(),
            Coupon.countDocuments({
                isActive: true,
                endDate: { $gte: new Date() }
            }),
            Coupon.countDocuments({
                endDate: { $lt: new Date() }
            }),
            Coupon.aggregate([
                {
                    $group: {
                        _id: null,
                        totalUsages: { $sum: '$usedCount' },
                        totalCoupons: { $sum: 1 },
                        averageUsage: { $avg: '$usedCount' }
                    }
                }
            ]),
            Coupon.find()
                .sort({ usedCount: -1 })
                .limit(10)
                .select('code name usedCount type value')
        ]);
        
        const stats = usageStats[0] || { totalUsages: 0, totalCoupons: 0, averageUsage: 0 };
        
        res.json({
            success: true,
            period: `${daysAgo} dias`,
            stats: {
                totalCoupons,
                activeCoupons,
                expiredCoupons,
                inactiveCoupons: totalCoupons - activeCoupons - expiredCoupons,
                totalUsages: stats.totalUsages,
                averageUsage: Math.round(stats.averageUsage * 100) / 100,
                topCoupons
            }
        });
        
    } catch (error) {
        console.error('Erro ao obter estatísticas de cupons:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};
