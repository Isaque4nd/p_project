// server/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    // Obter token do header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        message: 'Acesso negado. Token não fornecido.' 
      });
    }

    // Verificar formato do token (Bearer <token>)
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token inválido.' 
      });
    }

    // Verificar e decodificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuário no banco
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token inválido. Usuário não encontrado.' 
      });
    }

    // Verificar se o usuário está ativo
    if (user.active === false) {
      return res.status(401).json({ 
        success: false, 
        message: 'Conta desativada. Entre em contato com o administrador.' 
      });
    }

    // Controle de sessão única (exceto para admins)
    if (user.role !== 'admin' && decoded.sessionId) {
      if (user.currentSessionId && user.currentSessionId !== decoded.sessionId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Sessão encerrada. Sua conta foi acessada de outro dispositivo.',
          sessionExpired: true
        });
      }
    }

    // Atualizar última atividade
    await User.findByIdAndUpdate(decoded.userId, {
      lastSession: new Date()
    });

    // Adicionar usuário à requisição
    req.user = user;
    req.sessionId = decoded.sessionId;
    next();
    
  } catch (error) {
    console.error('Erro na autenticação:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token inválido.' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expirado.' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor.' 
    });
  }
};

// Middleware para verificar se é admin
const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ 
      success: false, 
      message: 'Acesso negado. Apenas administradores.' 
    });
  }
};

module.exports = { authMiddleware, adminMiddleware };
