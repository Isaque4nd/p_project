// server/controllers/chargeController.js
const Charge = require('../models/Charge');
const Payment = require('../models/Payment');
const User = require('../models/User');
const sacapayService = require('../services/sacapayService');

// Função para log detalhado
function logChargeAction(action, details) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] CHARGE_${action.toUpperCase()}:`, JSON.stringify(details, null, 2));
}

// Validar ObjectId
function isValidObjectId(id) {
  return id && id.match(/^[0-9a-fA-F]{24}$/);
}

// Gerar slug único
async function generateUniqueSlug(baseSlug) {
  let slug = baseSlug;
  let counter = 1;
  
  while (await Charge.findOne({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

// Criar nova cobrança (Admin)
exports.createCharge = async (req, res) => {
  try {
    const { title, description, amount, slug, expiresIn } = req.body;
    const adminId = req.user.id;

    logChargeAction('create_start', { title, amount, slug, adminId });

    // Validar entrada
    if (!title || !description || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Título, descrição e valor são obrigatórios'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valor deve ser maior que zero'
      });
    }

    // Gerar slug se não fornecido
    let finalSlug = slug;
    if (!finalSlug) {
      finalSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
    }

    // Garantir que o slug seja único
    finalSlug = await generateUniqueSlug(finalSlug);

    // Calcular data de expiração
    let expiresAt = null;
    if (expiresIn && expiresIn > 0) {
      expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000); // horas para ms
    }

    // Criar cobrança
    const charge = new Charge({
      title,
      description,
      amount,
      slug: finalSlug,
      expiresAt,
      createdBy: adminId
    });

    await charge.save();

    // Tentar integração com Sacapay
    try {
      const sacapayResponse = await sacapayService.createOrder({
        amount: amount,
        productName: title,
        client: {
          name: 'Cliente',
          email: 'cliente@exemplo.com',
          taxNumber: '',
          phone: ''
        },
        postBackUrl: `${process.env.BASE_URL || 'http://localhost:8080'}/api/charges/webhook/${charge._id}`
      });

      if (sacapayResponse.success) {
        charge.sacapayOrderId = sacapayResponse.orderId;
        charge.pixCode = sacapayResponse.pix;
        charge.qrCodeUrl = sacapayResponse.qrcode;
        if (sacapayResponse.expire) {
          charge.expiresAt = new Date(sacapayResponse.expire);
        }
        await charge.save();

        logChargeAction('create_success_sacapay', {
          chargeId: charge._id,
          slug: finalSlug,
          sacapayOrderId: sacapayResponse.orderId,
          adminId
        });
      } else {
        logChargeAction('create_fallback', {
          chargeId: charge._id,
          slug: finalSlug,
          sacapayError: sacapayResponse.error,
          adminId
        });
      }
    } catch (sacapayError) {
      logChargeAction('create_sacapay_error', {
        error: sacapayError.message,
        chargeId: charge._id,
        slug: finalSlug,
        adminId
      });
    }
    const chargeUrl = `${process.env.BASE_URL || 'http://localhost:8080'}/cobranca/${finalSlug}`;

    res.status(201).json({
      success: true,
      charge: await charge.populate('createdBy', 'name email'),
      chargeUrl,
      message: 'Cobrança criada com sucesso'
    });

  } catch (error) {
    logChargeAction('create_error', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id
    });
    console.error('Erro ao criar cobrança:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Listar todas as cobranças (Admin)
exports.getAllCharges = async (req, res) => {
  try {
    const charges = await Charge.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      charges
    });

  } catch (error) {
    console.error('Erro ao listar cobranças:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter cobrança por slug (Público)
exports.getChargeBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const charge = await Charge.findOne({ slug })
      .populate('createdBy', 'name');

    if (!charge) {
      return res.status(404).json({
        success: false,
        message: 'Cobrança não encontrada'
      });
    }

    // Verificar se a cobrança está ativa
    if (!charge.isActive()) {
      return res.status(410).json({
        success: false,
        message: 'Cobrança expirada ou inativa'
      });
    }

    res.json({
      success: true,
      charge
    });

  } catch (error) {
    console.error('Erro ao buscar cobrança:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Processar pagamento de cobrança
exports.processChargePayment = async (req, res) => {
  try {
    const { slug } = req.params;
    const { customerName, customerEmail, customerPhone } = req.body;

    logChargeAction('payment_start', { slug, customerEmail });

    // Validar entrada
    if (!customerName || !customerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Nome e email são obrigatórios'
      });
    }

    // Buscar cobrança
    const charge = await Charge.findOne({ slug });

    if (!charge) {
      return res.status(404).json({
        success: false,
        message: 'Cobrança não encontrada'
      });
    }

    if (!charge.isActive()) {
      return res.status(410).json({
        success: false,
        message: 'Cobrança expirada ou inativa'
      });
    }

    // Criar pagamento
    const payment = new Payment({
      chargeId: charge._id,
      amount: charge.amount,
      status: 'pending',
      paymentMethod: 'pix',
      customerName,
      customerEmail,
      customerPhone: customerPhone || '',
      sacapayId: `charge_${charge._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    await payment.save();

    // Usar dados da cobrança se disponível, senão gerar PIX manual
    let pixResponse = {
      success: true,
      pixCode: charge.pixCode,
      qrCodeUrl: charge.qrCodeUrl,
      expiresAt: charge.expiresAt
    };

    if (!charge.pixCode) {
      // Gerar PIX manual como fallback
      const pixCode = `00020101021226580014BR.GOV.BCB.PIX0136${payment.sacapayId}52040000530398654041${charge.amount.toFixed(2)}5802BR5925BOAVENTURADEV6009SAO PAULO62070503***6304`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`;
      
      pixResponse = {
        success: true,
        pixCode: pixCode,
        qrCodeUrl: qrCodeUrl,
        expiresAt: charge.expiresAt || new Date(Date.now() + 30 * 60 * 1000)
      };

      // Salvar no pagamento
      payment.pixCode = pixCode;
      payment.qrCodeUrl = qrCodeUrl;
      await payment.save();
    }

    // Adicionar pagamento à cobrança
    charge.payments.push(payment._id);
    await charge.save();

    logChargeAction('payment_created', {
      chargeId: charge._id,
      paymentId: payment._id,
      customerEmail,
      slug
    });

    res.json({
      success: true,
      payment,
      pix: pixResponse,
      message: 'Pagamento criado com sucesso'
    });

  } catch (error) {
    logChargeAction('payment_error', {
      error: error.message,
      slug: req.params?.slug
    });
    console.error('Erro ao processar pagamento da cobrança:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Atualizar status da cobrança (Admin)
exports.updateChargeStatus = async (req, res) => {
  try {
    const { chargeId } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(chargeId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de cobrança inválido'
      });
    }

    const charge = await Charge.findById(chargeId);

    if (!charge) {
      return res.status(404).json({
        success: false,
        message: 'Cobrança não encontrada'
      });
    }

    charge.status = status;
    await charge.save();

    logChargeAction('status_updated', {
      chargeId: charge._id,
      newStatus: status,
      adminId: req.user.id
    });

    res.json({
      success: true,
      message: 'Status da cobrança atualizado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar status da cobrança:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter estatísticas da cobrança (Admin)
exports.getChargeStats = async (req, res) => {
  try {
    const { chargeId } = req.params;

    if (!isValidObjectId(chargeId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de cobrança inválido'
      });
    }

    const charge = await Charge.findById(chargeId);

    if (!charge) {
      return res.status(404).json({
        success: false,
        message: 'Cobrança não encontrada'
      });
    }

    // Atualizar estatísticas
    await charge.updatePaymentStats();

    // Buscar pagamentos recentes
    const recentPayments = await Payment.find({ chargeId: charge._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('amount status customerName customerEmail createdAt');

    res.json({
      success: true,
      stats: {
        totalPaid: charge.totalPaid,
        paymentCount: charge.paymentCount,
        averagePayment: charge.paymentCount > 0 ? charge.totalPaid / charge.paymentCount : 0,
        recentPayments
      }
    });

  } catch (error) {
    console.error('Erro ao obter estatísticas da cobrança:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Webhook para cobranças
exports.processChargeWebhook = async (req, res) => {
  try {
    const { chargeId } = req.params;
    const webhookData = req.body;

    logChargeAction('webhook_received', { chargeId, webhookData });

    // Processar webhook conforme necessário
    // Implementar lógica específica do Sacapay

    res.json({
      success: true,
      message: 'Webhook processado com sucesso'
    });

  } catch (error) {
    logChargeAction('webhook_error', {
      error: error.message,
      chargeId: req.params?.chargeId
    });
    console.error('Erro ao processar webhook da cobrança:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

