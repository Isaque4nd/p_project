// server/controllers/configController.js
const Config = require('../models/Config');

// Obter todas as configurações (exceto as sensíveis para usuários não-admin)
const getAllConfigs = async (req, res) => {
  try {
    const isAdmin = req.user && req.user.role === 'admin';
    const filter = isAdmin ? {} : { sensitive: false };
    
    const configs = await Config.find(filter).select('-__v');
    
    res.status(200).json({
      success: true,
      configs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar configurações',
      error: error.message
    });
  }
};

// Obter configuração específica
const getConfig = async (req, res) => {
  try {
    const { key } = req.params;
    const config = await Config.findOne({ key });
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuração não encontrada'
      });
    }

    // Verificar se o usuário pode acessar configurações sensíveis
    if (config.sensitive && (!req.user || req.user.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    res.status(200).json({
      success: true,
      config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar configuração',
      error: error.message
    });
  }
};

// Criar ou atualizar configuração (apenas admin)
const setConfig = async (req, res) => {
  try {
    const { key, value, description, category, sensitive } = req.body;
    
    const config = await Config.findOneAndUpdate(
      { key },
      { value, description, category, sensitive },
      { 
        new: true, 
        upsert: true,
        runValidators: true
      }
    );
    
    res.status(200).json({
      success: true,
      message: 'Configuração salva com sucesso',
      config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao salvar configuração',
      error: error.message
    });
  }
};

// Deletar configuração (apenas admin)
const deleteConfig = async (req, res) => {
  try {
    const { key } = req.params;
    
    const config = await Config.findOneAndDelete({ key });
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuração não encontrada'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Configuração deletada com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar configuração',
      error: error.message
    });
  }
};

// Inicializar configurações padrão
const initializeDefaultConfigs = async () => {
  try {
    const defaultConfigs = [
      {
        key: 'MONGODB_URI',
        value: process.env.MONGODB_URI || '',
        description: 'URI de conexão do MongoDB',
        category: 'database',
        sensitive: true
      },
      {
        key: 'PAYMENT_PROVIDER',
        value: 'mercadopago',
        description: 'Provedor de pagamento (sacapay, mercadopago)',
        category: 'payment',
        sensitive: false
      },
      {
        key: 'PAYMENT_API_URL',
        value: process.env.SACAPAY_API_BASE || 'https://api.sacapay.com.br',
        description: 'URL da API do provedor de pagamento',
        category: 'payment',
        sensitive: false
      },
      {
        key: 'SACAPAY_PUBLIC_TOKEN',
        value: process.env.SACAPAY_PUBLIC_TOKEN || '',
        description: 'Token público do Sacapay',
        category: 'payment',
        sensitive: false
      },
      {
        key: 'SACAPAY_PRIVATE_TOKEN',
        value: process.env.SACAPAY_PRIVATE_TOKEN || '',
        description: 'Token privado do Sacapay',
        category: 'payment',
        sensitive: true
      },
      {
        key: 'MERCADOPAGO_ACCESS_TOKEN',
        value: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
        description: 'Access Token do Mercado Pago',
        category: 'payment',
        sensitive: true
      },
      {
        key: 'MERCADOPAGO_PUBLIC_KEY',
        value: process.env.MERCADOPAGO_PUBLIC_KEY || '',
        description: 'Public Key do Mercado Pago',
        category: 'payment',
        sensitive: false
      },
      {
        key: 'SITE_NAME',
        value: 'Prosperiuz',
        description: 'Nome do site',
        category: 'branding',
        sensitive: false
      },
      {
        key: 'SITE_LOGO',
        value: '/assets/images/prosperiuz_logo.png',
        description: 'Logo do site',
        category: 'branding',
        sensitive: false
      },
      {
        key: 'PRIMARY_COLOR',
        value: '#ffd700',
        description: 'Cor primária do site',
        category: 'branding',
        sensitive: false
      },
      {
        key: 'SECONDARY_COLOR',
        value: '#ffb347',
        description: 'Cor secundária do site',
        category: 'branding',
        sensitive: false
      },
      {
        key: 'BACKGROUND_COLOR',
        value: '#000000',
        description: 'Cor de fundo da página',
        category: 'branding',
        sensitive: false
      },
      {
        key: 'BACKGROUND_GRADIENT',
        value: '',
        description: 'Gradiente de fundo (opcional)',
        category: 'branding',
        sensitive: false
      }
    ];

    for (const configData of defaultConfigs) {
      const existingConfig = await Config.findOne({ key: configData.key });
      if (!existingConfig) {
        await Config.create(configData);
      }
    }

    console.log('✅ Configurações padrão inicializadas');
  } catch (error) {
    console.error('❌ Erro ao inicializar configurações padrão:', error);
  }
};

module.exports = {
  getAllConfigs,
  getConfig,
  setConfig,
  deleteConfig,
  initializeDefaultConfigs
};
