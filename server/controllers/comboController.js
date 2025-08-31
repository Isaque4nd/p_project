// server/controllers/comboController.js
const Combo = require('../models/Combo');
const Project = require('../models/Project');

const comboController = {
  // Listar todos os combos
  async getAllCombos(req, res) {
    try {
      const { category, active, page = 1, limit = 12 } = req.query;
      const filter = {};

      if (category) filter.category = category;
      if (active !== undefined) filter.isActive = active === 'true';

      const combos = await Combo.find(filter)
        .populate('products.product', 'title price images')
        .populate('category', 'name slug color')
        .sort('-createdAt')
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Combo.countDocuments(filter);

      res.json({
        success: true,
        data: combos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Erro ao buscar combos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  },

  // Buscar combo por ID
  async getComboById(req, res) {
    try {
      const combo = await Combo.findById(req.params.id)
        .populate('products.product', 'title price images description')
        .populate('category', 'name slug color');

      if (!combo) {
        return res.status(404).json({
          success: false,
          message: 'Combo não encontrado'
        });
      }

      res.json({
        success: true,
        data: combo
      });
    } catch (error) {
      console.error('Erro ao buscar combo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  },

  // Criar novo combo (admin)
  async createCombo(req, res) {
    try {
      const {
        name,
        description,
        products,
        comboPrice,
        image,
        category,
        tags,
        validUntil,
        maxQuantity
      } = req.body;

      // Verificar se os produtos existem e calcular preço original
      let originalPrice = 0;
      for (const item of products) {
        const product = await Project.findById(item.product);
        if (!product) {
          return res.status(400).json({
            success: false,
            message: `Produto com ID ${item.product} não encontrado`
          });
        }
        originalPrice += product.price * (item.quantity || 1);
      }

      const combo = new Combo({
        name,
        description,
        products,
        originalPrice,
        comboPrice,
        image,
        category,
        tags,
        validUntil,
        maxQuantity
      });

      await combo.save();

      res.status(201).json({
        success: true,
        message: 'Combo criado com sucesso',
        data: combo
      });
    } catch (error) {
      console.error('Erro ao criar combo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  },

  // Atualizar combo (admin)
  async updateCombo(req, res) {
    try {
      const comboId = req.params.id;
      const updateData = req.body;

      // Se produtos foram alterados, recalcular preço original
      if (updateData.products) {
        let originalPrice = 0;
        for (const item of updateData.products) {
          const product = await Project.findById(item.product);
          if (!product) {
            return res.status(400).json({
              success: false,
              message: `Produto com ID ${item.product} não encontrado`
            });
          }
          originalPrice += product.price * (item.quantity || 1);
        }
        updateData.originalPrice = originalPrice;
      }

      const combo = await Combo.findByIdAndUpdate(
        comboId,
        updateData,
        { new: true, runValidators: true }
      )
      .populate('products.product', 'title price images')
      .populate('category', 'name slug color');

      if (!combo) {
        return res.status(404).json({
          success: false,
          message: 'Combo não encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Combo atualizado com sucesso',
        data: combo
      });
    } catch (error) {
      console.error('Erro ao atualizar combo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  },

  // Deletar combo (admin)
  async deleteCombo(req, res) {
    try {
      const combo = await Combo.findByIdAndDelete(req.params.id);

      if (!combo) {
        return res.status(404).json({
          success: false,
          message: 'Combo não encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Combo excluído com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar combo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  },

  // Combos em destaque
  async getFeaturedCombos(req, res) {
    try {
      const combos = await Combo.find({
        isActive: true,
        isVisible: true,
        $or: [
          { validUntil: { $gte: new Date() } },
          { validUntil: null }
        ]
      })
      .populate('products.product', 'title price images')
      .populate('category', 'name slug color')
      .sort('-discount -createdAt')
      .limit(6);

      res.json({
        success: true,
        data: combos
      });
    } catch (error) {
      console.error('Erro ao buscar combos em destaque:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }
};

module.exports = comboController;
