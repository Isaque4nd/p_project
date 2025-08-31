// server/controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Função para gerar token JWT
const generateToken = (userId, sessionId = null) => {
  const payload = { userId };
  if (sessionId) {
    payload.sessionId = sessionId;
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
};

// Registro de usuário
exports.register = async (req, res) => {
  try {
    const { name, email, password, whatsapp } = req.body;
    
    // Validações básicas
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nome, email e senha são obrigatórios' 
      });
    }
    
    if (!whatsapp) {
      return res.status(400).json({ 
        success: false, 
        message: 'WhatsApp é obrigatório' 
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'A senha deve ter pelo menos 6 caracteres' 
      });
    }
    
    // Verificar se o usuário já existe
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Usuário já existe' 
      });
    }
    
    // Criar novo usuário
    user = new User({ name, email, password, whatsapp });
    
    // Hash da senha
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    
    await user.save();
    
    // Criar e retornar token JWT
    const token = generateToken(user.id);
    
    res.status(201).json({ 
      success: true,
      message: 'Usuário criado com sucesso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        whatsapp: user.whatsapp,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Erro no registro:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erro no servidor' 
    });
  }
};

// Login de usuário
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validação básica
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email e senha são obrigatórios' 
      });
    }
    
    // Verificar se o usuário existe
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Credenciais inválidas' 
      });
    }

    // Verificar se o usuário está ativo
    if (user.active === false) {
      return res.status(400).json({ 
        success: false, 
        message: 'Conta desativada. Entre em contato com o administrador.' 
      });
    }
    
    // Verificar senha
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: 'Credenciais inválidas' 
      });
    }

    // Gerar ID de sessão e obter informações do dispositivo
    const sessionId = uuidv4();
    const userAgent = req.headers['user-agent'] || 'Dispositivo desconhecido';
    
    // Atualizar informações de sessão (exceto para admins que podem ter múltiplas sessões)
    const updateData = {
      lastSession: new Date(),
      sessionDevice: userAgent
    };
    
    if (user.role !== 'admin') {
      updateData.currentSessionId = sessionId;
    }
    
    await User.findByIdAndUpdate(user._id, updateData);
    
    // Criar e retornar token JWT
    const token = generateToken(user.id, user.role !== 'admin' ? sessionId : null);
    
    res.json({ 
      success: true,
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erro no servidor' 
    });
  }
};

// Obter perfil do usuário
exports.getProfile = async (req, res) => {
  try {
    res.json({ 
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        createdAt: req.user.createdAt
      }
    });
  } catch (err) {
    console.error('Erro ao obter perfil:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erro no servidor' 
    });
  }
};

// Atualizar perfil do usuário
exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.id;
    
    // Validação básica
    if (!name || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nome e email são obrigatórios' 
      });
    }
    
    // Verificar se o email já está em uso por outro usuário
    const existingUser = await User.findOne({ 
      email, 
      _id: { $ne: userId } 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Este email já está em uso' 
      });
    }
    
    // Atualizar usuário
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, email },
      { new: true, select: '-password' }
    );
    
    res.json({ 
      success: true,
      message: 'Perfil atualizado com sucesso',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt
      }
    });
  } catch (err) {
    console.error('Erro ao atualizar perfil:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erro no servidor' 
    });
  }
};

// Listar todos os usuários (Admin)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('purchasedProjects', 'title')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      users
    });
  } catch (err) {
    console.error('Erro ao buscar usuários:', err);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
};

// Obter perfil do usuário
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        whatsapp: user.whatsapp,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
};

// Atualizar perfil do usuário
exports.updateProfile = async (req, res) => {
  try {
    const { name, whatsapp, password } = req.body;
    const userId = req.user.id;
    
    // Validação básica
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Nome é obrigatório'
      });
    }
    
    const updateData = { name, whatsapp };
    
    // Se nova senha foi fornecida
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'A senha deve ter pelo menos 6 caracteres'
        });
      }
      
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }
    
    // Atualizar usuário
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, select: '-password' }
    );
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        whatsapp: updatedUser.whatsapp,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt
      }
    });
  } catch (err) {
    console.error('Erro ao atualizar perfil:', err);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
};