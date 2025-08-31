const CartItem = require('../models/CartItem');
const Project = require('../models/Project');

// Adicionar item ao carrinho
exports.addToCart = async (req, res) => {
  try {
    const { projectId, quantity = 1 } = req.body;
    const userId = req.user.id;

    // Verificar se o projeto existe e está ativo
    const project = await Project.findOne({
      _id: projectId,
      isActive: true
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado ou inativo'
      });
    }

    // Verificar estoque para produtos físicos
    if (!project.isDigital && project.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Estoque insuficiente'
      });
    }

    // Verificar se o item já está no carrinho
    let cartItem = await CartItem.findOne({
      user: userId,
      project: projectId,
      isActive: true
    });

    if (cartItem) {
      // Atualizar quantidade
      cartItem.quantity += quantity;
      
      // Verificar estoque novamente após atualização
      if (!project.isDigital && project.stock < cartItem.quantity) {
        return res.status(400).json({
          success: false,
          message: 'Estoque insuficiente para a quantidade solicitada'
        });
      }
      
      // Aplicar desconto por quantidade
      await cartItem.applyQuantityDiscount();
    } else {
      // Criar novo item no carrinho
      cartItem = new CartItem({
        user: userId,
        project: projectId,
        quantity,
        priceAtTime: project.finalPrice
      });

      await cartItem.save();
      await cartItem.applyQuantityDiscount();
    }

    await cartItem.populate('project', 'title slug price images');

    res.status(201).json({
      success: true,
      message: 'Item adicionado ao carrinho com sucesso',
      data: cartItem
    });

  } catch (error) {
    console.error('Erro ao adicionar ao carrinho:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter carrinho do usuário
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cartItems = await CartItem.getUserCart(userId);
    const cartSummary = await CartItem.applyProgressiveDiscount(userId);

    res.json({
      success: true,
      data: {
        items: cartItems,
        summary: cartSummary
      }
    });

  } catch (error) {
    console.error('Erro ao buscar carrinho:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Atualizar quantidade de item no carrinho
exports.updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantidade deve ser maior que zero'
      });
    }

    const cartItem = await CartItem.findOne({
      _id: itemId,
      user: userId,
      isActive: true
    }).populate('project');

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Item não encontrado no carrinho'
      });
    }

    // Verificar estoque para produtos físicos
    if (!cartItem.project.isDigital && cartItem.project.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Estoque insuficiente'
      });
    }

    cartItem.quantity = quantity;
    await cartItem.applyQuantityDiscount();

    await cartItem.populate('project', 'title slug price images');

    res.json({
      success: true,
      message: 'Quantidade atualizada com sucesso',
      data: cartItem
    });

  } catch (error) {
    console.error('Erro ao atualizar item do carrinho:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Remover item do carrinho
exports.removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;

    const cartItem = await CartItem.findOne({
      _id: itemId,
      user: userId
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Item não encontrado no carrinho'
      });
    }

    await CartItem.findByIdAndDelete(itemId);

    res.json({
      success: true,
      message: 'Item removido do carrinho com sucesso'
    });

  } catch (error) {
    console.error('Erro ao remover item do carrinho:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Limpar carrinho
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    await CartItem.clearUserCart(userId);

    res.json({
      success: true,
      message: 'Carrinho limpo com sucesso'
    });

  } catch (error) {
    console.error('Erro ao limpar carrinho:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Aplicar cupom de desconto
exports.applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const userId = req.user.id;

    // Aqui você implementaria a lógica de cupons
    // Por enquanto, vamos simular alguns cupons fixos
    const coupons = {
      'DESCONTO10': { discount: 10, type: 'percentage' },
      'DESCONTO20': { discount: 20, type: 'percentage' },
      'PRIMEIRACOMPRA': { discount: 15, type: 'percentage' },
      'DESCONTO50': { discount: 50, type: 'fixed' }
    };

    const coupon = coupons[couponCode.toUpperCase()];

    if (!coupon) {
      return res.status(400).json({
        success: false,
        message: 'Cupom inválido'
      });
    }

    // Obter resumo do carrinho
    const cartSummary = await CartItem.applyProgressiveDiscount(userId);

    let couponDiscount = 0;
    if (coupon.type === 'percentage') {
      couponDiscount = (cartSummary.subtotal * coupon.discount) / 100;
    } else {
      couponDiscount = coupon.discount;
    }

    const finalTotal = Math.max(0, cartSummary.finalTotal - couponDiscount);

    res.json({
      success: true,
      message: 'Cupom aplicado com sucesso',
      data: {
        ...cartSummary,
        coupon: {
          code: couponCode,
          discount: coupon.discount,
          type: coupon.type,
          discountAmount: couponDiscount
        },
        finalTotalWithCoupon: finalTotal
      }
    });

  } catch (error) {
    console.error('Erro ao aplicar cupom:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter resumo do carrinho
exports.getCartSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const summary = await CartItem.applyProgressiveDiscount(userId);

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Erro ao obter resumo do carrinho:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Sincronizar carrinho (para casos de login/logout)
exports.syncCart = async (req, res) => {
  try {
    const { sessionCartItems = [] } = req.body;
    const userId = req.user.id;

    // Processar itens do carrinho da sessão
    for (const sessionItem of sessionCartItems) {
      const { projectId, quantity } = sessionItem;

      // Verificar se o projeto existe
      const project = await Project.findById(projectId);
      if (!project || !project.isActive) continue;

      // Verificar se já existe no carrinho do usuário
      let cartItem = await CartItem.findOne({
        user: userId,
        project: projectId,
        isActive: true
      });

      if (cartItem) {
        // Atualizar quantidade (somar com a existente)
        cartItem.quantity += quantity;
        await cartItem.applyQuantityDiscount();
      } else {
        // Criar novo item
        cartItem = new CartItem({
          user: userId,
          project: projectId,
          quantity,
          priceAtTime: project.finalPrice
        });
        await cartItem.save();
        await cartItem.applyQuantityDiscount();
      }
    }

    // Retornar carrinho atualizado
    const cartItems = await CartItem.getUserCart(userId);
    const cartSummary = await CartItem.applyProgressiveDiscount(userId);

    res.json({
      success: true,
      message: 'Carrinho sincronizado com sucesso',
      data: {
        items: cartItems,
        summary: cartSummary
      }
    });

  } catch (error) {
    console.error('Erro ao sincronizar carrinho:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Mover para lista de desejos (remover do carrinho e adicionar aos favoritos)
exports.moveToWishlist = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;

    const cartItem = await CartItem.findOne({
      _id: itemId,
      user: userId,
      isActive: true
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Item não encontrado no carrinho'
      });
    }

    // Adicionar aos favoritos
    const Favorite = require('../models/Favorite');
    await Favorite.toggleFavorite(userId, cartItem.project, 'Carrinho');

    // Remover do carrinho
    await CartItem.findByIdAndDelete(itemId);

    res.json({
      success: true,
      message: 'Item movido para lista de desejos com sucesso'
    });

  } catch (error) {
    console.error('Erro ao mover para lista de desejos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};
