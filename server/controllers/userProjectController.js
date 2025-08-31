// server/controllers/userProjectController.js
const User = require('../models/User');
const Project = require('../models/Project');
const Payment = require('../models/Payment');

// Obter projetos de um usuário específico (Admin)
exports.getUserProjects = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .populate('purchasedProjects')
      .populate({
        path: 'purchaseHistory.project',
        select: 'title price category'
      })
      .populate({
        path: 'purchaseHistory.paymentId',
        select: 'status paymentMethod createdAt'
      });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        projects: user.purchasedProjects,
        purchaseHistory: user.purchaseHistory
      }
    });
  } catch (err) {
    console.error('Erro ao buscar projetos do usuário:', err);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
};

// Remover projeto de um usuário (Admin)
exports.removeUserProject = async (req, res) => {
  try {
    const { userId, projectId } = req.params;
    
    const user = await User.findById(userId);
    const project = await Project.findById(projectId);
    
    if (!user || !project) {
      return res.status(404).json({
        success: false,
        message: 'Usuário ou projeto não encontrado'
      });
    }

    // Remover projeto da lista de projetos comprados
    user.purchasedProjects = user.purchasedProjects.filter(
      p => p.toString() !== projectId
    );
    
    await user.save();

    res.json({
      success: true,
      message: 'Projeto removido do usuário com sucesso'
    });
  } catch (err) {
    console.error('Erro ao remover projeto do usuário:', err);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
};

// Adicionar projeto a um usuário (Admin)
exports.addUserProject = async (req, res) => {
  try {
    const { userId, projectId } = req.body;
    
    const user = await User.findById(userId);
    const project = await Project.findById(projectId);
    
    if (!user || !project) {
      return res.status(404).json({
        success: false,
        message: 'Usuário ou projeto não encontrado'
      });
    }

    // Verificar se já possui o projeto
    if (user.purchasedProjects.includes(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Usuário já possui este projeto'
      });
    }

    // Adicionar projeto
    user.purchasedProjects.push(projectId);

    // Criar registro de pagamento manual
    const payment = new Payment({
      user: userId,
      project: projectId,
      amount: project.price,
      status: 'approved',
      paymentMethod: 'manual',
      paidAt: new Date(),
      sacapayId: `admin_grant_${userId}_${projectId}_${Date.now()}`
    });

    await payment.save();

    // Adicionar ao histórico de compras
    user.purchaseHistory.push({
      project: projectId,
      purchasedAt: new Date(),
      amount: project.price,
      paymentMethod: 'manual',
      paymentId: payment._id
    });

    await user.save();

    res.json({
      success: true,
      message: 'Projeto adicionado ao usuário com sucesso'
    });
  } catch (err) {
    console.error('Erro ao adicionar projeto ao usuário:', err);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
};

// Listar todos os usuários com seus projetos (Admin)
exports.getAllUsersProjects = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } })
      .populate('purchasedProjects')
      .select('name email purchasedProjects createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      users
    });
  } catch (err) {
    console.error('Erro ao buscar usuários e projetos:', err);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
};

// Obter histórico de compras do usuário logado
exports.getUserPurchaseHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'purchaseHistory.project',
        select: 'title price category description'
      })
      .populate({
        path: 'purchaseHistory.paymentId',
        select: 'status paymentMethod createdAt sacapayId'
      });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      purchaseHistory: user.purchaseHistory.sort((a, b) => new Date(b.purchasedAt) - new Date(a.purchasedAt))
    });
  } catch (err) {
    console.error('Erro ao buscar histórico de compras:', err);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
};

module.exports = {
  getUserProjects: exports.getUserProjects,
  removeUserProject: exports.removeUserProject,
  addUserProject: exports.addUserProject,
  getAllUsersProjects: exports.getAllUsersProjects,
  getUserPurchaseHistory: exports.getUserPurchaseHistory
};

