const Order = require('../models/Order');
const User = require('../models/User');
const Project = require('../models/Project');
const Cart = require('../models/Cart');
const Combo = require('../models/Combo');

// Dashboard Analytics - Métricas principais
exports.getDashboardStats = async (req, res) => {
    try {
        const { period = '30' } = req.query; // últimos X dias
        const daysAgo = parseInt(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);
        
        // Executar todas as consultas em paralelo para performance
        const [
            totalOrders,
            totalRevenue,
            totalUsers,
            totalProducts,
            pendingOrders,
            recentOrders,
            topProducts,
            salesByStatus,
            salesByDay,
            conversionRate,
            abandonedCarts,
            averageOrderValue
        ] = await Promise.all([
            // Total de pedidos no período
            Order.countDocuments({
                placedAt: { $gte: startDate }
            }),
            
            // Receita total no período
            Order.aggregate([
                { $match: { 
                    placedAt: { $gte: startDate },
                    status: { $nin: ['cancelled', 'refunded'] }
                }},
                { $group: { _id: null, total: { $sum: '$total' } }}
            ]),
            
            // Total de usuários
            User.countDocuments(),
            
            // Total de produtos
            Project.countDocuments({ isActive: true }),
            
            // Pedidos pendentes
            Order.countDocuments({ 
                status: { $in: ['pending', 'confirmed', 'processing'] }
            }),
            
            // Pedidos recentes (últimos 10)
            Order.find()
                .populate('user', 'name email')
                .sort({ createdAt: -1 })
                .limit(10)
                .select('orderNumber user total status createdAt'),
            
            // Produtos mais vendidos
            Order.aggregate([
                { $match: { 
                    placedAt: { $gte: startDate },
                    status: { $nin: ['cancelled', 'refunded'] }
                }},
                { $unwind: '$items' },
                { $match: { 'items.type': 'product' }},
                { $group: {
                    _id: '$items.product',
                    totalSold: { $sum: '$items.quantity' },
                    revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] }}
                }},
                { $sort: { totalSold: -1 }},
                { $limit: 10 },
                { $lookup: {
                    from: 'projects',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }},
                { $unwind: '$product' },
                { $project: {
                    productName: '$product.name',
                    totalSold: 1,
                    revenue: 1
                }}
            ]),
            
            // Vendas por status
            Order.aggregate([
                { $match: { placedAt: { $gte: startDate }}},
                { $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    revenue: { $sum: '$total' }
                }}
            ]),
            
            // Vendas por dia (últimos 30 dias)
            Order.aggregate([
                { $match: { 
                    placedAt: { $gte: startDate },
                    status: { $nin: ['cancelled', 'refunded'] }
                }},
                { $group: {
                    _id: {
                        day: { $dayOfMonth: '$placedAt' },
                        month: { $month: '$placedAt' },
                        year: { $year: '$placedAt' }
                    },
                    orders: { $sum: 1 },
                    revenue: { $sum: '$total' }
                }},
                { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }}
            ]),
            
            // Taxa de conversão (pedidos / usuários únicos)
            Promise.all([
                Order.distinct('user', { placedAt: { $gte: startDate }}),
                User.countDocuments({ createdAt: { $gte: startDate }})
            ]),
            
            // Carrinhos abandonados
            Cart.countDocuments({
                updatedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // mais de 24h
                'items.0': { $exists: true } // tem pelo menos 1 item
            }),
            
            // Valor médio do pedido
            Order.aggregate([
                { $match: { 
                    placedAt: { $gte: startDate },
                    status: { $nin: ['cancelled', 'refunded'] }
                }},
                { $group: { _id: null, avgValue: { $avg: '$total' }}}
            ])
        ]);
        
        // Processar resultados
        const revenue = totalRevenue[0]?.total || 0;
        const [uniqueCustomers, newUsers] = conversionRate;
        const avgOrder = averageOrderValue[0]?.avgValue || 0;
        
        // Calcular crescimento comparado ao período anterior
        const previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - daysAgo);
        
        const [previousRevenue, previousOrders] = await Promise.all([
            Order.aggregate([
                { $match: { 
                    placedAt: { $gte: previousStartDate, $lt: startDate },
                    status: { $nin: ['cancelled', 'refunded'] }
                }},
                { $group: { _id: null, total: { $sum: '$total' }}}
            ]),
            Order.countDocuments({
                placedAt: { $gte: previousStartDate, $lt: startDate }
            })
        ]);
        
        const prevRevenue = previousRevenue[0]?.total || 0;
        const revenueGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue * 100) : 0;
        const ordersGrowth = previousOrders > 0 ? ((totalOrders - previousOrders) / previousOrders * 100) : 0;
        
        res.json({
            success: true,
            period: `${daysAgo} dias`,
            stats: {
                // Métricas principais
                totalOrders,
                totalRevenue: revenue,
                totalUsers,
                totalProducts,
                pendingOrders,
                abandonedCarts,
                averageOrderValue: avgOrder,
                
                // Taxa de conversão
                conversionRate: newUsers > 0 ? (uniqueCustomers.length / newUsers * 100) : 0,
                
                // Crescimento
                revenueGrowth: Math.round(revenueGrowth * 100) / 100,
                ordersGrowth: Math.round(ordersGrowth * 100) / 100,
                
                // Dados para gráficos
                recentOrders,
                topProducts,
                salesByStatus,
                salesByDay: salesByDay.map(day => ({
                    date: `${day._id.day}/${day._id.month}`,
                    orders: day.orders,
                    revenue: day.revenue
                }))
            }
        });
        
    } catch (error) {
        console.error('Erro ao obter estatísticas do dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};

// Relatório de vendas detalhado
exports.getSalesReport = async (req, res) => {
    try {
        const { 
            startDate, 
            endDate, 
            groupBy = 'day', // day, week, month
            status 
        } = req.query;
        
        const matchStage = {};
        
        if (startDate || endDate) {
            matchStage.placedAt = {};
            if (startDate) matchStage.placedAt.$gte = new Date(startDate);
            if (endDate) matchStage.placedAt.$lte = new Date(endDate);
        }
        
        if (status) {
            matchStage.status = status;
        }
        
        // Definir agrupamento baseado no período
        let groupId;
        switch (groupBy) {
            case 'week':
                groupId = {
                    week: { $week: '$placedAt' },
                    year: { $year: '$placedAt' }
                };
                break;
            case 'month':
                groupId = {
                    month: { $month: '$placedAt' },
                    year: { $year: '$placedAt' }
                };
                break;
            default: // day
                groupId = {
                    day: { $dayOfMonth: '$placedAt' },
                    month: { $month: '$placedAt' },
                    year: { $year: '$placedAt' }
                };
        }
        
        const salesData = await Order.aggregate([
            { $match: matchStage },
            { $group: {
                _id: groupId,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: '$total' },
                averageOrderValue: { $avg: '$total' },
                uniqueCustomers: { $addToSet: '$user' }
            }},
            { $addFields: {
                uniqueCustomersCount: { $size: '$uniqueCustomers' }
            }},
            { $project: {
                uniqueCustomers: 0
            }},
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 }}
        ]);
        
        res.json({
            success: true,
            reportType: `Vendas por ${groupBy}`,
            period: {
                start: startDate || 'início',
                end: endDate || 'fim'
            },
            data: salesData
        });
        
    } catch (error) {
        console.error('Erro ao gerar relatório de vendas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Análise de produtos
exports.getProductAnalytics = async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const daysAgo = parseInt(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);
        
        const [productStats, comboStats] = await Promise.all([
            // Análise de produtos
            Order.aggregate([
                { $match: { 
                    placedAt: { $gte: startDate },
                    status: { $nin: ['cancelled', 'refunded'] }
                }},
                { $unwind: '$items' },
                { $match: { 'items.type': 'product' }},
                { $group: {
                    _id: '$items.product',
                    totalSold: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] }},
                    orderCount: { $sum: 1 },
                    averagePrice: { $avg: '$items.price' }
                }},
                { $lookup: {
                    from: 'projects',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }},
                { $unwind: '$product' },
                { $project: {
                    productId: '$_id',
                    productName: '$product.name',
                    totalSold: 1,
                    totalRevenue: 1,
                    orderCount: 1,
                    averagePrice: 1,
                    conversionRate: {
                        $multiply: [
                            { $divide: ['$totalSold', '$orderCount'] },
                            100
                        ]
                    }
                }},
                { $sort: { totalRevenue: -1 }}
            ]),
            
            // Análise de combos
            Order.aggregate([
                { $match: { 
                    placedAt: { $gte: startDate },
                    status: { $nin: ['cancelled', 'refunded'] }
                }},
                { $unwind: '$items' },
                { $match: { 'items.type': 'combo' }},
                { $group: {
                    _id: '$items.combo',
                    totalSold: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] }},
                    orderCount: { $sum: 1 }
                }},
                { $lookup: {
                    from: 'combos',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'combo'
                }},
                { $unwind: '$combo' },
                { $project: {
                    comboId: '$_id',
                    comboName: '$combo.name',
                    totalSold: 1,
                    totalRevenue: 1,
                    orderCount: 1
                }},
                { $sort: { totalRevenue: -1 }}
            ])
        ]);
        
        res.json({
            success: true,
            period: `${daysAgo} dias`,
            analytics: {
                products: productStats,
                combos: comboStats,
                summary: {
                    totalProductsSold: productStats.reduce((sum, p) => sum + p.totalSold, 0),
                    totalCombosSold: comboStats.reduce((sum, c) => sum + c.totalSold, 0),
                    productRevenue: productStats.reduce((sum, p) => sum + p.totalRevenue, 0),
                    comboRevenue: comboStats.reduce((sum, c) => sum + c.totalRevenue, 0)
                }
            }
        });
        
    } catch (error) {
        console.error('Erro ao obter análise de produtos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Análise de clientes
exports.getCustomerAnalytics = async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const daysAgo = parseInt(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);
        
        const [topCustomers, customerSegmentation, newVsReturning] = await Promise.all([
            // Top clientes por valor
            Order.aggregate([
                { $match: { 
                    placedAt: { $gte: startDate },
                    status: { $nin: ['cancelled', 'refunded'] }
                }},
                { $group: {
                    _id: '$user',
                    totalSpent: { $sum: '$total' },
                    orderCount: { $sum: 1 },
                    averageOrder: { $avg: '$total' },
                    lastOrder: { $max: '$placedAt' }
                }},
                { $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }},
                { $unwind: '$user' },
                { $project: {
                    userId: '$_id',
                    userName: '$user.name',
                    userEmail: '$user.email',
                    userWhatsapp: '$user.whatsapp',
                    totalSpent: 1,
                    orderCount: 1,
                    averageOrder: 1,
                    lastOrder: 1
                }},
                { $sort: { totalSpent: -1 }},
                { $limit: 20 }
            ]),
            
            // Segmentação de clientes
            Order.aggregate([
                { $match: { 
                    placedAt: { $gte: startDate },
                    status: { $nin: ['cancelled', 'refunded'] }
                }},
                { $group: {
                    _id: '$user',
                    totalSpent: { $sum: '$total' },
                    orderCount: { $sum: 1 }
                }},
                { $bucket: {
                    groupBy: '$totalSpent',
                    boundaries: [0, 100, 500, 1000, 5000],
                    default: 'VIP',
                    output: {
                        customers: { $sum: 1 },
                        totalRevenue: { $sum: '$totalSpent' }
                    }
                }}
            ]),
            
            // Clientes novos vs recorrentes
            Promise.all([
                User.aggregate([
                    { $match: { createdAt: { $gte: startDate }}},
                    { $lookup: {
                        from: 'orders',
                        localField: '_id',
                        foreignField: 'user',
                        as: 'orders'
                    }},
                    { $project: {
                        hasOrders: { $gt: [{ $size: '$orders' }, 0] }
                    }},
                    { $group: {
                        _id: '$hasOrders',
                        count: { $sum: 1 }
                    }}
                ]),
                Order.aggregate([
                    { $match: { placedAt: { $gte: startDate }}},
                    { $lookup: {
                        from: 'users',
                        localField: 'user',
                        foreignField: '_id',
                        as: 'user'
                    }},
                    { $unwind: '$user' },
                    { $project: {
                        isNewCustomer: { $gte: ['$user.createdAt', startDate] }
                    }},
                    { $group: {
                        _id: '$isNewCustomer',
                        count: { $sum: 1 }
                    }}
                ])
            ])
        ]);
        
        res.json({
            success: true,
            period: `${daysAgo} dias`,
            analytics: {
                topCustomers,
                customerSegmentation,
                newVsReturning: {
                    newUsers: newVsReturning[0],
                    ordersByCustomerType: newVsReturning[1]
                }
            }
        });
        
    } catch (error) {
        console.error('Erro ao obter análise de clientes:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};
