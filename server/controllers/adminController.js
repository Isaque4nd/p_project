// server/controllers/adminController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Listar todos os usuários (apenas para admins)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password')
      .sort({ createdAt: -1 })
      .select('name email role active createdAt lastSession');
    
    res.json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Criar novo usuário (apenas para admins)
const createUser = async (req, res) => {
  try {
    const { name, email, password, role = 'user', active = true } = req.body;

    // Validações básicas
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    // Verificar se o email já existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email já está em uso' });
    }

    // Validar role
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Role inválido' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      active
    });

    await user.save();

    // Retornar usuário sem senha
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt
    };

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Atualizar usuário (apenas para admins)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, active } = req.body;

    // Buscar usuário
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Verificar se o email já está em uso por outro usuário
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email já está em uso por outro usuário' });
      }
    }

    // Validar role se fornecido
    if (role && !['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Role inválido' });
    }

    // Atualizar campos
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (active !== undefined) user.active = active;

    // Atualizar senha se fornecida
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    // Retornar usuário sem senha
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      lastSession: user.lastSession
    };

    res.json(userResponse);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Alternar status ativo/inativo do usuário
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Não permitir desativar o próprio usuário admin
    if (user._id.toString() === req.user.id && user.role === 'admin') {
      return res.status(400).json({ message: 'Você não pode desativar sua própria conta' });
    }

    user.active = !user.active;
    await user.save();

    res.json({ 
      message: `Usuário ${user.active ? 'ativado' : 'desativado'} com sucesso`,
      active: user.active 
    });
  } catch (error) {
    console.error('Erro ao alterar status do usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Excluir usuário (apenas para admins)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Não permitir excluir o próprio usuário
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Você não pode excluir sua própria conta' });
    }

    // Não permitir excluir outros admins (segurança adicional)
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Não é possível excluir contas de administrador' });
    }

    await User.findByIdAndDelete(id);

    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Obter estatísticas dos usuários
const getUserStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $ne: ['$active', false] }, 1, 0] } },
          inactive: { $sum: { $cond: [{ $eq: ['$active', false] }, 1, 0] } },
          admins: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
          users: { $sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] } }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      active: 0,
      inactive: 0,
      admins: 0,
      users: 0
    };

    res.json(result);
  } catch (error) {
    console.error('Erro ao obter estatísticas dos usuários:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  getUserStats
};
