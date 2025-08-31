// server/services/sacapayService.js
const axios = require('axios');

class SacapayService {
  constructor() {
    this.baseURL = 'https://api.sacapay.com.br';
    this.publicToken = '0f745d43-58a5-42c5-8561-7a8d4e75e9cc';
    this.privateToken = 'bf33339a-ef11-4477-b0ce-e6941b040a87';
  }

  // Criar uma nova ordem/cobrança PIX
  async createOrder(orderData) {
    try {
      // Usar dados de exemplo válidos conforme documentação SacaPay
      const payload = {
        offerId: null,
        amount: orderData.amount,
        productName: orderData.productName || 'Produto BoaventuraDEV',
        sellUrl: orderData.sellUrl || 'https://dev.pixpay.store/',
        postBackUrl: orderData.postBackUrl || null,
        paymentType: 'PIX',
        client: {
          name: orderData.client.name || 'Cliente Anônimo',
          email: orderData.client.email || 'anonimo@example.com',
          taxNumber: orderData.client.taxNumber || '11144477735', // CPF válido fictício
          phone: orderData.client.phone || '11999999999' // Telefone válido conforme documentação
        }
      };

      console.log('[SACAPAY] Criando ordem:', JSON.stringify(payload, null, 2));

      const response = await axios.post(`${this.baseURL}/api/Order/External/Create`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-token-private': this.privateToken
        }
      });

      console.log('[SACAPAY] Resposta da criação de ordem:', JSON.stringify(response.data, null, 2));

      if (response.data && response.data.success) {
        return {
          success: true,
          orderId: response.data.object.orderId,
          method: response.data.object.method,
          pix: response.data.object.pix,
          qrcode: response.data.object.qrcode,
          expire: response.data.object.expire,
          value: response.data.object.value,
          status: response.data.object.status
        };
      } else {
        console.error('[SACAPAY] Erro na resposta:', response.data);
        return {
          success: false,
          error: response.data.message || 'Erro desconhecido na API Sacapay'
        };
      }

    } catch (error) {
      console.error('[SACAPAY] Erro ao criar ordem:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Erro na comunicação com Sacapay'
      };
    }
  }

  // Obter status de uma ordem
  async getOrderStatus(orderId) {
    try {
      console.log('[SACAPAY] Consultando status da ordem:', orderId);

      const response = await axios.get(`${this.baseURL}/api/Order/External/GetOrderStatusById/${orderId}`, {
        headers: {
          'x-token-private': this.privateToken
        }
      });

      console.log('[SACAPAY] Status da ordem:', JSON.stringify(response.data, null, 2));

      return {
        success: true,
        status: response.data.status,
        data: response.data
      };

    } catch (error) {
      console.error('[SACAPAY] Erro ao consultar status:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Erro na consulta de status'
      };
    }
  }

  // Obter detalhes completos de uma ordem
  async getOrderById(orderId) {
    try {
      console.log('[SACAPAY] Consultando detalhes da ordem:', orderId);

      const response = await axios.get(`${this.baseURL}/api/Order/External/GetOrderById/${orderId}`, {
        headers: {
          'x-token-private': this.privateToken
        }
      });

      console.log('[SACAPAY] Detalhes da ordem:', JSON.stringify(response.data, null, 2));

      return {
        success: true,
        order: response.data
      };

    } catch (error) {
      console.error('[SACAPAY] Erro ao consultar ordem:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Erro na consulta da ordem'
      };
    }
  }

  // Validar webhook
  validateWebhook(webhookData) {
    // Implementar validação do webhook se necessário
    return true;
  }

  // Método legado para compatibilidade
  async createPayment(paymentData) {
    return await this.createOrder({
      amount: paymentData.amount,
      productName: paymentData.description,
      client: {
        name: paymentData.customerName || 'Cliente Anônimo',
        email: paymentData.customerEmail || 'anonimo@example.com',
        taxNumber: paymentData.customerDocument || '11144477735',
        phone: paymentData.customerPhone || '11999999999'
      },
      postBackUrl: paymentData.callback_url
    });
  }

  // Método legado para compatibilidade
  async getPaymentStatus(paymentId) {
    return await this.getOrderStatus(paymentId);
  }

  // Verificar assinatura do webhook (mantido para compatibilidade)
  verifyWebhookSignature(payload, signature) {
    // Para Sacapay, implementar conforme documentação específica
    return true;
  }
}

module.exports = new SacapayService();

