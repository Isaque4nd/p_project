// server/controllers/paymentController.js
const Payment = require('../models/Payment');
const Project = require('../models/Project');
const User = require('../models/User');
const sacapayService = require('../services/sacapayService');
const paymentService = require('../services/paymentService');

// Função para log detalhado
function logPaymentAction(action, details) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] PAYMENT_${action.toUpperCase()}:`, JSON.stringify(details, null, 2));
}

// Validar ObjectId
function isValidObjectId(id) {
  return id && id.match(/^[0-9a-fA-F]{24}$/);
}

// Criar um novo pagamento
exports.createPayment = async (req, res) => {
  try {
    const { projectId } = req.body;
    const userId = req.user.id;

    logPaymentAction('create_start', { userId, projectId });

    // Validar entrada
    if (!projectId) {
      logPaymentAction('create_error', { error: 'ProjectId não fornecido', userId });
      return res.status(400).json({
        success: false,
        message: 'ID do projeto é obrigatório'
      });
    }

    if (!isValidObjectId(projectId)) {
      logPaymentAction('create_error', { error: 'ProjectId inválido', projectId, userId });
      return res.status(400).json({
        success: false,
        message: 'ID do projeto inválido'
      });
    }

    // Validar projeto
    const project = await Project.findById(projectId);
    if (!project) {
      logPaymentAction('create_error', { error: 'Projeto não encontrado', projectId, userId });
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    // Verificar se já existe um pagamento pendente ou aprovado para este projeto
    const existingPayment = await Payment.findOne({
      user: userId,
      project: projectId,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingPayment) {
      logPaymentAction('create_error', { 
        error: 'Pagamento já existe', 
        existingPaymentId: existingPayment._id,
        status: existingPayment.status,
        userId, 
        projectId 
      });
      return res.status(400).json({
        success: false,
        message: 'Já existe um pagamento para este projeto'
      });
    }

    // Criar novo pagamento
    const payment = new Payment({
      user: userId,
      project: projectId,
      amount: project.price,
      status: 'pending',
      paymentMethod: 'pix',
      sacapayId: `manual_${userId}_${projectId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    await payment.save();

    logPaymentAction('create_success', { 
      paymentId: payment._id,
      amount: payment.amount,
      userId, 
      projectId 
    });

    res.json({
      success: true,
      payment,
      message: 'Pagamento criado com sucesso'
    });

  } catch (error) {
    logPaymentAction('create_error', { 
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      projectId: req.body?.projectId
    });
    console.error('Erro ao criar pagamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Listar pagamentos do usuário
exports.getUserPayments = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const payments = await Payment.find({ user: userId })
      .populate('project', 'title description price driveLink')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      payments
    });

  } catch (error) {
    console.error('Erro ao buscar pagamentos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Processar webhook do SacaPay
exports.processWebhook = async (req, res) => {
  try {
    const { transaction_id, status, amount } = req.body;

    // Buscar pagamento pelo sacapayId
    const payment = await Payment.findOne({ sacapayId: transaction_id });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pagamento não encontrado'
      });
    }

    // Atualizar status do pagamento
    payment.status = status === 'approved' ? 'approved' : 'failed';
    payment.paidAt = status === 'approved' ? new Date() : null;
    
    await payment.save();

    // Se aprovado, não precisamos mais enviar email
    if (status === 'approved') {
      console.log(`Pagamento aprovado para usuário ${payment.user}, projeto ${payment.project}`);
    }

    res.json({
      success: true,
      message: 'Webhook processado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Criar link PIX
exports.createPixLink = async (req, res) => {
  try {
    const { projectId } = req.body;
    const userId = req.user.id;

    logPaymentAction('create_pix_start', { userId, projectId });

    // Validar entrada
    if (!projectId) {
      logPaymentAction('create_pix_error', { error: 'ProjectId não fornecido', userId });
      return res.status(400).json({
        success: false,
        message: 'ID do projeto é obrigatório'
      });
    }

    if (!isValidObjectId(projectId)) {
      logPaymentAction('create_pix_error', { error: 'ProjectId inválido', projectId, userId });
      return res.status(400).json({
        success: false,
        message: 'ID do projeto inválido'
      });
    }

    // Validar projeto
    const project = await Project.findById(projectId);
    if (!project) {
      logPaymentAction('create_pix_error', { error: 'Projeto não encontrado', projectId, userId });
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    // Verificar se já existe um pagamento pendente e não expirado
    const existingPayment = await Payment.findOne({
      user: userId,
      project: projectId,
      status: 'pending',
      $or: [
        { expiresAt: { $exists: false } }, // Pagamentos sem expiração
        { expiresAt: { $gt: new Date() } } // Pagamentos não expirados
      ]
    });

    if (existingPayment) {
      // Se o pagamento existe mas expirou, atualizar status
      if (existingPayment.expiresAt && existingPayment.expiresAt <= new Date()) {
        existingPayment.status = 'cancelled';
        await existingPayment.save();
        logPaymentAction('payment_expired', { 
          paymentId: existingPayment._id,
          userId, 
          projectId 
        });
      } else {
        logPaymentAction('create_pix_error', { 
          error: 'Pagamento pendente já existe', 
          existingPaymentId: existingPayment._id,
          userId, 
          projectId 
        });
        return res.status(400).json({
          success: false,
          message: 'Já existe um pagamento pendente para este projeto',
          paymentId: existingPayment._id
        });
      }
    }

    // Criar novo pagamento
    const payment = new Payment({
      user: userId,
      project: projectId,
      amount: project.price,
      status: 'pending',
      paymentMethod: 'pix',
      sacapayId: `pix_${userId}_${projectId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    await payment.save();

    // Gerar código PIX usando o PaymentService
    try {
      const user = await User.findById(userId);
      
      const pixData = await paymentService.createPixPayment({
        amount: project.price,
        description: `Pagamento - ${project.title}`,
        externalId: payment._id.toString(),
        webhookUrl: `${process.env.BASE_URL}/api/payments/webhook`,
        customer: {
          name: user.name,
          email: user.email,
          document: user.document || ''
        }
      });

      if (pixData.success) {
        // Atualizar pagamento com dados do PIX
        payment.sacapayId = pixData.paymentId;
        payment.pixCode = pixData.pixCode;
        payment.qrCodeUrl = pixData.qrCode;
        payment.expiresAt = new Date(pixData.expiresAt);
        payment.provider = pixData.provider;
        await payment.save();

        logPaymentAction('create_pix_success', { 
          paymentId: payment._id,
          provider: pixData.provider,
          amount: payment.amount,
          expiresAt: payment.expiresAt,
          userId, 
          projectId 
        });

        res.json({
          success: true,
          payment,
          pix: {
            success: true,
            pixCode: pixData.pixCode,
            qrCodeUrl: pixData.qrCode,
            expiresAt: payment.expiresAt,
            provider: pixData.provider
          },
          message: 'Link PIX criado com sucesso'
        });
      } else {
        throw new Error('Falha ao criar pagamento PIX');
      }

    } catch (pixError) {
      logPaymentAction('create_pix_error', { 
        error: 'Erro ao gerar código PIX',
        pixError: pixError.message,
        paymentId: payment._id,
        userId, 
        projectId 
      });
      
      // Em caso de erro, gerar um PIX básico como fallback
      const pixCode = `00020101021226580014BR.GOV.BCB.PIX0136${payment.sacapayId}52040000530398654041${project.price.toFixed(2)}5802BR5925PROSPERIUZ6009SAO PAULO62070503***6304`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`;
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos
      
      payment.pixCode = pixCode;
      payment.qrCodeUrl = qrCodeUrl;
      payment.expiresAt = expiresAt;
      payment.provider = 'fallback';
      await payment.save();
      
      res.json({
        success: true,
        payment,
        pix: {
          success: true,
          pixCode: pixCode,
          qrCodeUrl: qrCodeUrl,
          expiresAt: expiresAt,
          provider: 'fallback',
          warning: 'Usando sistema de fallback'
        },
        message: 'Pagamento criado com sistema de fallback'
      });
    }

  } catch (error) {
    logPaymentAction('create_pix_error', { 
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      projectId: req.body?.projectId
    });
    console.error('Erro ao criar link PIX:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter detalhes de um pagamento específico (para reabrir)
exports.getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    // Validar se paymentId é um ObjectId válido
    if (!paymentId || !paymentId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pagamento inválido'
      });
    }

    const payment = await Payment.findOne({
      _id: paymentId,
      user: userId
    }).populate('project', 'title description price');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pagamento não encontrado'
      });
    }

    // Verificar se o pagamento ainda está válido (não expirado e pendente)
    const isValid = payment.status === 'pending' && 
                   payment.expiresAt && 
                   new Date() < payment.expiresAt;

    res.json({
      success: true,
      payment,
      isValid,
      message: isValid ? 'Pagamento válido' : 'Pagamento expirado ou já processado'
    });

  } catch (error) {
    console.error('Erro ao buscar detalhes do pagamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter pagamentos pendentes (admin)
exports.getPendingPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ status: 'pending' })
      .populate('user', 'name email')
      .populate('project', 'title price')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      payments
    });

  } catch (error) {
    console.error('Erro ao buscar pagamentos pendentes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Aprovar pagamento manualmente (admin)
exports.approvePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pagamento não encontrado'
      });
    }

    payment.status = 'approved';
    payment.paidAt = new Date();
    await payment.save();

    // Não enviar email conforme solicitado
    console.log(`Pagamento ${paymentId} aprovado manualmente`);

    res.json({
      success: true,
      message: 'Pagamento aprovado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao aprovar pagamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Rejeitar pagamento (admin)
exports.rejectPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pagamento não encontrado'
      });
    }

    payment.status = 'failed';
    await payment.save();

    res.json({
      success: true,
      message: 'Pagamento rejeitado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao rejeitar pagamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter todos os pagamentos (admin)
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('user', 'name email')
      .populate('project', 'title price')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      payments
    });

  } catch (error) {
    console.error('Erro ao buscar todos os pagamentos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Criar link PIX para admin (específico para projeto e usuário)
exports.createPixLinkAdmin = async (req, res) => {
  try {
    const { projectId, userId } = req.body;

    logPaymentAction('create_pix_admin_start', { userId, projectId, adminId: req.user.id });

    // Validar entrada
    if (!projectId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'ID do projeto e do usuário são obrigatórios'
      });
    }

    if (!isValidObjectId(projectId) || !isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: 'IDs inválidos'
      });
    }

    // Validar projeto e usuário
    const project = await Project.findById(projectId);
    const user = await User.findById(userId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verificar se já existe um pagamento pendente
    const existingPayment = await Payment.findOne({
      user: userId,
      project: projectId,
      status: 'pending',
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Já existe um pagamento pendente para este projeto e usuário',
        paymentId: existingPayment._id
      });
    }

    // Criar novo pagamento
    const payment = new Payment({
      user: userId,
      project: projectId,
      amount: project.price,
      status: 'pending',
      paymentMethod: 'pix',
      sacapayId: `admin_pix_${userId}_${projectId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    await payment.save();

    // Tentar integração com Sacapay
    try {
      const sacapayResponse = await sacapayService.createOrder({
        amount: project.price,
        productName: project.title,
        client: {
          name: user.name,
          email: user.email,
          taxNumber: '',
          phone: ''
        },
        postBackUrl: `${process.env.BASE_URL || 'http://localhost:8080'}/api/payments/webhook`
      });

      if (sacapayResponse.success) {
        // Atualizar pagamento com dados do Sacapay
        payment.sacapayId = sacapayResponse.orderId;
        payment.pixCode = sacapayResponse.pix;
        payment.qrCodeUrl = sacapayResponse.qrcode;
        payment.expiresAt = new Date(sacapayResponse.expire);
        await payment.save();

        logPaymentAction('create_pix_admin_success_sacapay', {
          paymentId: payment._id,
          sacapayOrderId: sacapayResponse.orderId,
          userId,
          projectId
        });

        res.json({
          success: true,
          payment: await payment.populate(['user', 'project']),
          sacapay: sacapayResponse,
          message: 'Link PIX criado com sucesso via Sacapay'
        });
      } else {
        // Fallback para código PIX manual
        const pixCode = `00020101021226580014BR.GOV.BCB.PIX0136${payment.sacapayId}52040000530398654041${project.price.toFixed(2)}5802BR5925BOAVENTURADEV6009SAO PAULO62070503***6304`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`;
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        payment.pixCode = pixCode;
        payment.qrCodeUrl = qrCodeUrl;
        payment.expiresAt = expiresAt;
        await payment.save();

        logPaymentAction('create_pix_admin_fallback', {
          paymentId: payment._id,
          sacapayError: sacapayResponse.error,
          userId,
          projectId
        });

        res.json({
          success: true,
          payment: await payment.populate(['user', 'project']),
          message: 'Link PIX criado com código manual (Sacapay indisponível)'
        });
      }
    } catch (sacapayError) {
      logPaymentAction('create_pix_admin_error_sacapay', {
        error: sacapayError.message,
        paymentId: payment._id,
        userId,
        projectId
      });

      // Fallback para código PIX manual
      const pixCode = `00020101021226580014BR.GOV.BCB.PIX0136${payment.sacapayId}52040000530398654041${project.price.toFixed(2)}5802BR5925BOAVENTURADEV6009SAO PAULO62070503***6304`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`;
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      payment.pixCode = pixCode;
      payment.qrCodeUrl = qrCodeUrl;
      payment.expiresAt = expiresAt;
      await payment.save();

      res.json({
        success: true,
        payment: await payment.populate(['user', 'project']),
        message: 'Link PIX criado com código manual'
      });
    }

  } catch (error) {
    logPaymentAction('create_pix_admin_error', {
      error: error.message,
      stack: error.stack,
      userId: req.body?.userId,
      projectId: req.body?.projectId,
      adminId: req.user?.id
    });
    console.error('Erro ao criar link PIX admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Criar pagamento manual (admin)
exports.createManualPayment = async (req, res) => {
  try {
    const { userId, projectId } = req.body;

    logPaymentAction('create_manual_start', { userId, projectId, adminId: req.user.id });

    // Validar entrada
    if (!projectId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'ID do projeto e do usuário são obrigatórios'
      });
    }

    if (!isValidObjectId(projectId) || !isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: 'IDs inválidos'
      });
    }

    // Validar projeto e usuário
    const project = await Project.findById(projectId);
    const user = await User.findById(userId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verificar se o usuário já possui o projeto
    if (user.purchasedProjects.includes(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Usuário já possui este projeto'
      });
    }

    // Criar pagamento manual aprovado
    const payment = new Payment({
      user: userId,
      project: projectId,
      amount: project.price,
      status: 'approved',
      paymentMethod: 'manual',
      paidAt: new Date(),
      sacapayId: `manual_${userId}_${projectId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    await payment.save();

    // Entregar projeto automaticamente
    user.purchasedProjects.push(projectId);
    await user.save();

    logPaymentAction('create_manual_success', {
      paymentId: payment._id,
      userId,
      projectId,
      adminId: req.user.id
    });

    res.json({
      success: true,
      payment: await payment.populate(['user', 'project']),
      message: 'Pagamento manual criado e projeto entregue com sucesso'
    });

  } catch (error) {
    logPaymentAction('create_manual_error', {
      error: error.message,
      stack: error.stack,
      userId: req.body?.userId,
      projectId: req.body?.projectId,
      adminId: req.user?.id
    });
    console.error('Erro ao criar pagamento manual:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Criar cobrança simples (admin)
exports.createCharge = async (req, res) => {
  try {
    const { amount, description } = req.body;

    logPaymentAction('create_charge_start', { amount, description, adminId: req.user.id });

    // Validar entrada
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valor da cobrança deve ser maior que zero'
      });
    }

    // Criar um "projeto" temporário para a cobrança
    const chargeProject = new Project({
      title: description || 'Cobrança',
      description: description || 'Cobrança avulsa',
      price: amount,
      driveLink: '#',
      category: 'Cobrança',
      deliveryType: 'manual'
    });

    await chargeProject.save();

    // Criar pagamento pendente sem usuário específico
    const payment = new Payment({
      project: chargeProject._id,
      amount: amount,
      status: 'pending',
      paymentMethod: 'pix',
      sacapayId: `charge_${chargeProject._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    await payment.save();

    // Tentar integração com Sacapay
    try {
      const sacapayResponse = await sacapayService.createOrder({
        amount: amount,
        productName: description || 'Cobrança BoaventuraDEV',
        client: {
          name: 'Cliente',
          email: 'cliente@exemplo.com',
          taxNumber: '',
          phone: ''
        },
        postBackUrl: `${process.env.BASE_URL || 'http://localhost:8080'}/api/payments/webhook`
      });

      if (sacapayResponse.success) {
        payment.sacapayId = sacapayResponse.orderId;
        payment.pixCode = sacapayResponse.pix;
        payment.qrCodeUrl = sacapayResponse.qrcode;
        payment.expiresAt = new Date(sacapayResponse.expire);
        await payment.save();

        logPaymentAction('create_charge_success_sacapay', {
          paymentId: payment._id,
          sacapayOrderId: sacapayResponse.orderId,
          amount,
          adminId: req.user.id
        });

        res.json({
          success: true,
          paymentId: payment._id,
          sacapay: sacapayResponse,
          message: 'Cobrança criada com sucesso via Sacapay'
        });
      } else {
        // Fallback para código PIX manual
        const pixCode = `00020101021226580014BR.GOV.BCB.PIX0136${payment.sacapayId}52040000530398654041${amount.toFixed(2)}5802BR5925BOAVENTURADEV6009SAO PAULO62070503***6304`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`;
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        payment.pixCode = pixCode;
        payment.qrCodeUrl = qrCodeUrl;
        payment.expiresAt = expiresAt;
        await payment.save();

        logPaymentAction('create_charge_fallback', {
          paymentId: payment._id,
          sacapayError: sacapayResponse.error,
          amount,
          adminId: req.user.id
        });

        res.json({
          success: true,
          paymentId: payment._id,
          message: 'Cobrança criada com código PIX manual'
        });
      }
    } catch (sacapayError) {
      logPaymentAction('create_charge_error_sacapay', {
        error: sacapayError.message,
        paymentId: payment._id,
        amount,
        adminId: req.user.id
      });

      // Fallback para código PIX manual
      const pixCode = `00020101021226580014BR.GOV.BCB.PIX0136${payment.sacapayId}52040000530398654041${amount.toFixed(2)}5802BR5925BOAVENTURADEV6009SAO PAULO62070503***6304`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`;
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      payment.pixCode = pixCode;
      payment.qrCodeUrl = qrCodeUrl;
      payment.expiresAt = expiresAt;
      await payment.save();

      res.json({
        success: true,
        paymentId: payment._id,
        message: 'Cobrança criada com código PIX manual'
      });
    }

  } catch (error) {
    logPaymentAction('create_charge_error', {
      error: error.message,
      stack: error.stack,
      amount: req.body?.amount,
      adminId: req.user?.id
    });
    console.error('Erro ao criar cobrança:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Marcar pagamento como pago manualmente (admin)
exports.markPaymentAsPaid = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!isValidObjectId(paymentId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pagamento inválido'
      });
    }

    const payment = await Payment.findById(paymentId).populate(['user', 'project']);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pagamento não encontrado'
      });
    }

    // Atualizar status do pagamento
    payment.status = 'approved';
    payment.paidAt = new Date();
    await payment.save();

    // Se o pagamento tem usuário, entregar o projeto
    if (payment.user && payment.project) {
      const user = await User.findById(payment.user._id);
      if (user && !user.purchasedProjects.includes(payment.project._id)) {
        user.purchasedProjects.push(payment.project._id);
        await user.save();
      }
    }

    logPaymentAction('mark_paid_success', {
      paymentId: payment._id,
      userId: payment.user?._id,
      projectId: payment.project?._id,
      adminId: req.user.id
    });

    res.json({
      success: true,
      message: 'Pagamento marcado como pago com sucesso'
    });

  } catch (error) {
    logPaymentAction('mark_paid_error', {
      error: error.message,
      paymentId: req.params?.paymentId,
      adminId: req.user?.id
    });
    console.error('Erro ao marcar pagamento como pago:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};


// Criar cobrança PIX (Admin)
exports.createCharge = async (req, res) => {
  try {
    const { amount, description, slug } = req.body;
    const adminId = req.user.id;

    logPaymentAction('create_charge_start', { amount, description, slug, adminId });

    // Validar entrada
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valor deve ser maior que zero'
      });
    }

    // Gerar slug único se não fornecido
    let finalSlug = slug;
    if (!finalSlug) {
      finalSlug = `cobranca-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Verificar se slug já existe
    const existingCharge = await Payment.findOne({ slug: finalSlug });
    if (existingCharge) {
      finalSlug = `${finalSlug}-${Date.now()}`;
    }

    // Criar pagamento
    const payment = new Payment({
      amount,
      status: 'pending',
      paymentMethod: 'pix',
      customerName: 'Cliente',
      customerEmail: 'cliente@exemplo.com',
      customerPhone: '',
      slug: finalSlug,
      adminId,
      sacapayId: `charge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    await payment.save();

    // Tentar criar ordem na Sacapay
    try {
      const sacapayResponse = await sacapayService.createOrder({
        amount,
        productName: description || 'Cobrança BoaventuraDEV',
        sellUrl: `${process.env.BASE_URL || 'http://localhost:8080'}/cobranca/${finalSlug}`,
        postBackUrl: `${process.env.BASE_URL || 'http://localhost:8080'}/api/payments/webhook`,
        client: {
          name: 'Cliente',
          email: 'cliente@exemplo.com',
          taxNumber: '11144477735',
          phone: '11999999999'
        }
      });

      if (sacapayResponse.success) {
        payment.sacapayId = sacapayResponse.orderId;
        payment.pixCode = sacapayResponse.pix;
        payment.qrCodeUrl = sacapayResponse.qrcode;
        payment.expiresAt = new Date(sacapayResponse.expire);
        await payment.save();

        const chargeUrl = `${process.env.BASE_URL || 'http://localhost:8080'}/cobranca/${finalSlug}`;

        res.json({
          success: true,
          paymentId: payment._id,
          chargeUrl,
          slug: finalSlug,
          pixCode: sacapayResponse.pix,
          qrCodeUrl: sacapayResponse.qrcode,
          message: 'Cobrança criada com sucesso'
        });
      } else {
        throw new Error(sacapayResponse.message || 'Erro na Sacapay');
      }
    } catch (sacapayError) {
      // Fallback para código PIX manual
      const pixCode = `00020101021226580014BR.GOV.BCB.PIX0136${payment.sacapayId}52040000530398654041${amount.toFixed(2)}5802BR5925BOAVENTURADEV6009SAO PAULO62070503***6304`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`;
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      payment.pixCode = pixCode;
      payment.qrCodeUrl = qrCodeUrl;
      payment.expiresAt = expiresAt;
      await payment.save();

      const chargeUrl = `${process.env.BASE_URL || 'http://localhost:8080'}/cobranca/${finalSlug}`;

      res.json({
        success: true,
        paymentId: payment._id,
        chargeUrl,
        slug: finalSlug,
        pixCode,
        qrCodeUrl,
        message: 'Cobrança criada (fallback)'
      });
    }
  } catch (error) {
    console.error('Erro ao criar cobrança:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};



// Buscar cobrança por slug
exports.getChargeBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const payment = await Payment.findOne({ slug, status: 'pending' })
      .populate('adminId', 'name email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Cobrança não encontrada ou já paga'
      });
    }

    res.json({
      success: true,
      charge: {
        id: payment._id,
        amount: payment.amount,
        description: payment.description || 'Cobrança',
        pixCode: payment.pixCode,
        qrCodeUrl: payment.qrCodeUrl,
        expiresAt: payment.expiresAt,
        createdBy: payment.adminId?.name || 'Admin'
      }
    });
  } catch (error) {
    console.error('Erro ao buscar cobrança:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

