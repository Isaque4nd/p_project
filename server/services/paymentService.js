// server/services/paymentService.js
const axios = require('axios');
const Config = require('../models/Config');

class PaymentService {
  constructor() {
    this.provider = null;
    this.config = {};
  }

  async initialize() {
    // Carregar configurações do banco
    const configs = await Config.find({ category: 'payment' });
    
    this.config = {};
    configs.forEach(config => {
      this.config[config.key] = config.value;
    });

    // Definir provedor
    this.provider = this.config.PAYMENT_PROVIDER || 'sacapay';
    
    console.log(`💳 Provedor de pagamento inicializado: ${this.provider}`);
  }

  async createPixPayment(data) {
    await this.initialize();
    
    if (this.provider === 'sacapay') {
      return this.createSacapayPayment(data);
    } else if (this.provider === 'mercadopago') {
      return this.createMercadoPagoPayment(data);
    } else {
      throw new Error(`Provedor de pagamento não suportado: ${this.provider}`);
    }
  }

  async createSacapayPayment(data) {
    try {
      const apiUrl = this.config.PAYMENT_API_URL || 'https://api.sacapay.com.br';
      const publicToken = this.config.SACAPAY_PUBLIC_TOKEN;
      const privateToken = this.config.SACAPAY_PRIVATE_TOKEN;

      if (!publicToken || !privateToken) {
        throw new Error('Tokens do Sacapay não configurados');
      }

      const response = await axios.post(`${apiUrl}/v1/pix`, {
        token_public: publicToken,
        token_private: privateToken,
        amount: data.amount,
        description: data.description,
        external_id: data.externalId,
        webhook_url: data.webhookUrl,
        customer: {
          name: data.customer.name,
          email: data.customer.email,
          document: data.customer.document || ''
        }
      });

      if (response.data.success) {
        return {
          success: true,
          provider: 'sacapay',
          paymentId: response.data.data.id,
          pixCode: response.data.data.pix_code,
          pixKey: response.data.data.pix_key,
          qrCode: response.data.data.qr_code,
          expiresAt: response.data.data.expires_at,
          amount: response.data.data.amount
        };
      } else {
        throw new Error(response.data.message || 'Erro no Sacapay');
      }
    } catch (error) {
      console.error('Erro Sacapay:', error);
      throw new Error(`Erro no Sacapay: ${error.response?.data?.message || error.message}`);
    }
  }

  async createMercadoPagoPayment(data) {
    try {
      const accessToken = this.config.MERCADOPAGO_ACCESS_TOKEN;

      if (!accessToken) {
        throw new Error('Access Token do Mercado Pago não configurado');
      }

      // Criar preferência de pagamento PIX no Mercado Pago
      const response = await axios.post('https://api.mercadopago.com/v1/payments', {
        transaction_amount: data.amount,
        description: data.description,
        payment_method_id: 'pix',
        payer: {
          email: data.customer.email,
          first_name: data.customer.name.split(' ')[0],
          last_name: data.customer.name.split(' ').slice(1).join(' ') || data.customer.name.split(' ')[0]
        },
        external_reference: data.externalId,
        notification_url: data.webhookUrl
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.id) {
        const qrCodeBase64 = response.data.point_of_interaction?.transaction_data?.qr_code_base64;
        return {
          success: true,
          provider: 'mercadopago',
          paymentId: response.data.id,
          pixCode: response.data.point_of_interaction?.transaction_data?.qr_code,
          pixKey: response.data.point_of_interaction?.transaction_data?.qr_code,
          qrCodeUrl: qrCodeBase64 ? `data:image/png;base64,${qrCodeBase64}` : null,
          qrCode: qrCodeBase64,
          expiresAt: response.data.date_of_expiration,
          amount: response.data.transaction_amount,
          status: response.data.status
        };
      } else {
        throw new Error('Resposta inválida do Mercado Pago');
      }
    } catch (error) {
      console.error('Erro Mercado Pago:', error);
      throw new Error(`Erro no Mercado Pago: ${error.response?.data?.message || error.message}`);
    }
  }

  async checkPaymentStatus(paymentId) {
    await this.initialize();
    
    if (this.provider === 'sacapay') {
      return this.checkSacapayStatus(paymentId);
    } else if (this.provider === 'mercadopago') {
      return this.checkMercadoPagoStatus(paymentId);
    } else {
      throw new Error(`Provedor de pagamento não suportado: ${this.provider}`);
    }
  }

  async checkSacapayStatus(paymentId) {
    try {
      const apiUrl = this.config.PAYMENT_API_URL || 'https://api.sacapay.com.br';
      const publicToken = this.config.SACAPAY_PUBLIC_TOKEN;
      const privateToken = this.config.SACAPAY_PRIVATE_TOKEN;

      const response = await axios.post(`${apiUrl}/v1/pix/status`, {
        token_public: publicToken,
        token_private: privateToken,
        id: paymentId
      });

      return {
        success: true,
        status: response.data.data.status,
        paid: response.data.data.status === 'paid'
      };
    } catch (error) {
      console.error('Erro ao verificar status Sacapay:', error);
      return { success: false, error: error.message };
    }
  }

  async checkMercadoPagoStatus(paymentId) {
    try {
      const accessToken = this.config.MERCADOPAGO_ACCESS_TOKEN;

      const response = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return {
        success: true,
        status: response.data.status,
        paid: response.data.status === 'approved'
      };
    } catch (error) {
      console.error('Erro ao verificar status Mercado Pago:', error);
      return { success: false, error: error.message };
    }
  }

  async processWebhook(req) {
    await this.initialize();
    
    if (this.provider === 'sacapay') {
      return this.processSacapayWebhook(req);
    } else if (this.provider === 'mercadopago') {
      return this.processMercadoPagoWebhook(req);
    } else {
      throw new Error(`Provedor de pagamento não suportado: ${this.provider}`);
    }
  }

  processSacapayWebhook(req) {
    // Lógica do webhook Sacapay
    const { id, status, external_id } = req.body;
    
    return {
      success: true,
      paymentId: id,
      externalId: external_id,
      status: status,
      paid: status === 'paid',
      provider: 'sacapay'
    };
  }

  processMercadoPagoWebhook(req) {
    // Lógica do webhook Mercado Pago
    const { id, action, data } = req.body;
    
    return {
      success: true,
      paymentId: data?.id || id,
      externalId: null, // Precisará buscar o external_reference
      status: action,
      paid: action === 'payment.updated', // Precisará verificar melhor
      provider: 'mercadopago'
    };
  }
}

module.exports = new PaymentService();
