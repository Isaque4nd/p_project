// client/public/assets/js/payment-modal.js
class PaymentModal {
  constructor() {
    this.modal = null;
    this.currentPaymentId = null;
    this.checkInterval = null;
  }

  // Abrir modal de pagamento
  open(project, isAdminGenerated = false, customAmount = null) {
    this.close(); // Fechar qualquer modal existente
    
    this.modal = document.createElement('div');
    this.modal.id = 'payment-modal';
    this.modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.9);
      z-index: 2000;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      box-sizing: border-box;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: linear-gradient(135deg, #121212 0%, #1a1a1a 100%);
      border-radius: 15px;
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      border: 1px solid #00ffff;
      box-shadow: 0 0 30px rgba(0, 255, 255, 0.3);
      position: relative;
    `;
    
    modalContent.innerHTML = `
      <div class="payment-modal-header" style="
        padding: 20px;
        border-bottom: 1px solid rgba(0, 255, 255, 0.3);
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <h2 style="color: #00ffff; margin: 0;">Pagamento PIX</h2>
        <button class="close-modal-btn" style="
          background: none;
          border: none;
          color: #ff006f;
          font-size: 24px;
          cursor: pointer;
          padding: 5px;
          border-radius: 50%;
          width: 35px;
          height: 35px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">&times;</button>
      </div>
      
      <div class="payment-modal-body" style="padding: 20px;">
        <div id="loading-section" style="text-align: center; padding: 40px;">
          <div style="
            border: 4px solid rgba(0, 255, 255, 0.3);
            border-radius: 50%;
            border-top: 4px solid #00ffff;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          "></div>
          <p style="color: #00ffff;">Gerando pagamento...</p>
        </div>
        
        <div id="payment-content" style="display: none;">
          <div class="project-info" style="
            background: rgba(0, 255, 255, 0.1);
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            border: 1px solid rgba(0, 255, 255, 0.3);
          ">
            <h3 id="project-title" style="color: #00ffff; margin-top: 0;"></h3>
            <div id="project-price" style="
              font-size: 2em;
              color: #ff006f;
              font-weight: bold;
              text-align: center;
              margin: 15px 0;
            "></div>
          </div>
          
          <div id="status-indicator" style="
            text-align: center;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            font-weight: bold;
            background: rgba(255, 165, 0, 0.2);
            color: #ffa500;
            border: 1px solid #ffa500;
          ">
            <span id="status-text">Aguardando pagamento...</span>
          </div>
          
          <div id="qr-section">
            <div class="qr-code-container" style="
              text-align: center;
              margin: 20px 0;
              padding: 20px;
              background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
              border-radius: 15px;
              border: 2px solid rgba(0, 255, 255, 0.3);
            ">
              <h3 style="color: #00ffff; margin-bottom: 15px;">QR Code PIX</h3>
              <div style="
                background: white;
                padding: 15px;
                border-radius: 10px;
                display: inline-block;
                box-shadow: 0 4px 15px rgba(0, 255, 255, 0.2);
              ">
                <img id="qr-code-img" style="
                  width: 250px;
                  height: 250px;
                  display: block;
                " alt="QR Code PIX">
              </div>
              <p style="color: #ccc; margin-top: 10px; font-size: 14px;">
                Escaneie com o app do seu banco
              </p>
            </div>
            
            <div class="pix-code" style="
              background: rgba(0, 255, 255, 0.1);
              padding: 15px;
              border-radius: 10px;
              margin: 20px 0;
              border: 1px solid rgba(0, 255, 255, 0.3);
              word-break: break-all;
              font-family: monospace;
            ">
              <strong style="color: #00ffff;">Código PIX (Copia e Cola):</strong><br>
              <span id="pix-code-text" style="color: #ccc;"></span>
              <button id="copy-button" style="
                background: linear-gradient(45deg, #00ffff, #ff006f);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 5px;
                cursor: pointer;
                margin-left: 10px;
                transition: transform 0.2s;
              ">Copiar</button>
            </div>
            
            <div class="instructions" style="
              background: rgba(255, 255, 255, 0.05);
              padding: 20px;
              border-radius: 10px;
              border-left: 4px solid #00ffff;
              color: #ccc;
            ">
              <h3 style="color: #00ffff; margin-top: 0;">Como pagar:</h3>
              <ol style="line-height: 1.6;">
                <li>Abra o app do seu banco</li>
                <li>Escolha a opção PIX</li>
                <li>Escaneie o QR Code ou cole o código acima</li>
                <li>Confirme o pagamento</li>
                <li>Aguarde a confirmação (pode levar alguns minutos)</li>
              </ol>
            </div>
          </div>
          
          <div id="completed-section" style="display: none;">
            <div style="
              background: rgba(0, 255, 0, 0.1);
              padding: 20px;
              border-radius: 10px;
              border: 1px solid #00ff00;
              text-align: center;
            ">
              <h3 style="color: #00ff00; margin-top: 0;">🎉 Pagamento Confirmado!</h3>
              <p style="color: #ccc;">Seu pagamento foi processado com sucesso. O projeto foi liberado automaticamente em sua conta.</p>
            </div>
          </div>
        </div>
        
        <div id="error-section" style="display: none;">
          <div style="
            background: rgba(255, 0, 0, 0.2);
            color: #ff4444;
            padding: 15px;
            border-radius: 10px;
            border: 1px solid #ff4444;
            text-align: center;
          ">
            <span id="error-message"></span>
          </div>
        </div>
      </div>
    `;
    
    this.modal.appendChild(modalContent);
    document.body.appendChild(this.modal);
    
    // Adicionar eventos
    this.setupEvents(project, isAdminGenerated, customAmount);
    
    // Gerar pagamento
    this.generatePayment(project, isAdminGenerated, customAmount);
  }
  
  // Configurar eventos do modal
  setupEvents(project, isAdminGenerated, customAmount) {
    // Botão fechar
    this.modal.querySelector('.close-modal-btn').addEventListener('click', () => {
      this.close();
    });
    
    // Fechar ao clicar fora do modal
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });
    
    // Botão copiar
    this.modal.querySelector('#copy-button').addEventListener('click', () => {
      this.copyPixCode();
    });
    
    // Tecla ESC para fechar
    document.addEventListener('keydown', this.handleEscKey.bind(this));
  }
  
  // Gerar pagamento
  async generatePayment(project, isAdminGenerated, customAmount) {
    try {
      const token = localStorage.getItem('token');
      const endpoint = isAdminGenerated ? '/api/payments/create-charge' : '/api/payments/create-pix';
      
      const payload = isAdminGenerated ? 
        { amount: customAmount || project.price } : 
        { projectId: project._id };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!data.success) {
        // Se já existe um pagamento, perguntar se quer reabrir
        if (data.message.includes('pagamento pendente') && data.paymentId) {
          const reopen = confirm('Já existe um pagamento pendente. Deseja visualizá-lo?');
          if (reopen) {
            this.reopenPayment(data.paymentId);
            return;
          }
        }
        throw new Error(data.message);
      }
      
      // Verificar se payment existe na resposta
      if (!data.payment) {
        throw new Error('Resposta inválida do servidor - pagamento não encontrado');
      }
      
      this.currentPaymentId = data.payment._id;
      this.showPaymentInfo(project, data.payment, data.pix, customAmount);
      
      if (!isAdminGenerated) {
        this.startStatusCheck();
      }
      
    } catch (error) {
      console.error('Erro ao gerar pagamento:', error);
      this.showError(error.message || 'Erro ao gerar pagamento');
    }
  }
  
  // Mostrar informações do pagamento
  showPaymentInfo(project, payment, pixData, customAmount) {
    const loadingSection = this.modal.querySelector('#loading-section');
    const paymentContent = this.modal.querySelector('#payment-content');
    
    loadingSection.style.display = 'none';
    paymentContent.style.display = 'block';
    
    // Preencher informações
    this.modal.querySelector('#project-title').textContent = project.title || 'Cobrança';
    this.modal.querySelector('#project-price').textContent = `R$ ${(customAmount || payment.amount).toFixed(2)}`;
    
    // Gerar código PIX e QR Code
    this.generatePixCode(payment, pixData);
  }
  
  // Gerar código PIX e QR Code
  generatePixCode(payment, pixData) {
    // Usar dados do PIX retornados pela API
    const pixCode = (pixData && pixData.pixCode) || payment.pixCode || `Código PIX não disponível`;
    const qrCodeUrl = (pixData && pixData.qrCodeUrl) || payment.qrCodeUrl;
    
    this.modal.querySelector('#pix-code-text').textContent = pixCode;
    
    // Exibir QR Code usando a URL da API com loading state e fallback
    if (qrCodeUrl) {
      const qrImg = this.modal.querySelector('#qr-code-img');
      const qrContainer = qrImg.parentElement;
      
      // Mostrar loading enquanto carrega
      qrContainer.innerHTML = `
        <div class="qr-loading" style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 280px;
          color: #00ffff;
        ">
          <div class="loading-spinner" style="
            border: 4px solid rgba(0, 255, 255, 0.3);
            border-radius: 50%;
            border-top: 4px solid #00ffff;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin-bottom: 15px;
          "></div>
          <p>Carregando QR Code...</p>
        </div>
      `;
      
      // Criar nova imagem para testar carregamento
      const testImg = new Image();
      
      testImg.onload = () => {
        // QR Code carregou com sucesso
        qrContainer.innerHTML = `
          <img id="qr-code-img" style="
            width: 250px;
            height: 250px;
            display: block;
            border-radius: 5px;
            transition: opacity 0.3s ease;
          " alt="QR Code PIX" src="${qrCodeUrl}">
        `;
      };
      
      testImg.onerror = () => {
        // Erro ao carregar QR Code - mostrar fallback
        qrContainer.innerHTML = `
          <div class="qr-fallback" style="
            color: #ffa500;
            padding: 30px;
            text-align: center;
            background: rgba(255, 165, 0, 0.1);
            border: 2px dashed #ffa500;
            border-radius: 10px;
            min-height: 250px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          ">
            <i class="fas fa-exclamation-triangle" style="font-size: 3em; margin-bottom: 15px;"></i>
            <h4 style="margin: 10px 0; color: #ffa500;">QR Code Temporariamente Indisponível</h4>
            <p style="margin: 10px 0; color: #ccc; font-size: 14px;">
              Não foi possível carregar o QR Code.<br>
              Use o código PIX abaixo para realizar o pagamento.
            </p>
            <button onclick="window.paymentModal.retryQRCode('${qrCodeUrl}')" style="
              background: linear-gradient(45deg, #ffa500, #ff8c00);
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 5px;
              cursor: pointer;
              margin-top: 10px;
              transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
              <i class="fas fa-redo"></i> Tentar Novamente
            </button>
          </div>
        `;
      };
      
      // Iniciar carregamento da imagem
      testImg.src = qrCodeUrl;
      
    } else {
      // Não há URL do QR Code
      const qrImg = this.modal.querySelector('#qr-code-img');
      qrImg.parentElement.innerHTML = `
        <div class="qr-unavailable" style="
          color: #ff6b6b;
          padding: 30px;
          text-align: center;
          background: rgba(255, 107, 107, 0.1);
          border: 2px dashed #ff6b6b;
          border-radius: 10px;
          min-height: 250px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        ">
          <i class="fas fa-times-circle" style="font-size: 3em; margin-bottom: 15px;"></i>
          <h4 style="margin: 10px 0; color: #ff6b6b;">QR Code Não Disponível</h4>
          <p style="margin: 10px 0; color: #ccc; font-size: 14px;">
            O QR Code não pôde ser gerado.<br>
            Use o código PIX abaixo para realizar o pagamento.
          </p>
        </div>
      `;
    }
  }

  // Função para tentar recarregar o QR Code
  retryQRCode(qrCodeUrl) {
    const qrContainer = this.modal.querySelector('.qr-fallback').parentElement;
    
    // Mostrar loading novamente
    qrContainer.innerHTML = `
      <div class="qr-loading" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 280px;
        color: #00ffff;
      ">
        <div class="loading-spinner" style="
          border: 4px solid rgba(0, 255, 255, 0.3);
          border-radius: 50%;
          border-top: 4px solid #00ffff;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin-bottom: 15px;
        "></div>
        <p>Tentando carregar QR Code novamente...</p>
      </div>
    `;
    
    // Tentar carregar novamente
    const testImg = new Image();
    
    testImg.onload = () => {
      qrContainer.innerHTML = `
        <img id="qr-code-img" style="
          width: 250px;
          height: 250px;
          display: block;
          border-radius: 5px;
          transition: opacity 0.3s ease;
        " alt="QR Code PIX" src="${qrCodeUrl}">
      `;
    };
    
    testImg.onerror = () => {
      // Falhou novamente
      qrContainer.innerHTML = `
        <div class="qr-failed" style="
          color: #ff6b6b;
          padding: 30px;
          text-align: center;
          background: rgba(255, 107, 107, 0.1);
          border: 2px dashed #ff6b6b;
          border-radius: 10px;
          min-height: 250px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        ">
          <i class="fas fa-times-circle" style="font-size: 3em; margin-bottom: 15px;"></i>
          <h4 style="margin: 10px 0; color: #ff6b6b;">Falha ao Carregar QR Code</h4>
          <p style="margin: 10px 0; color: #ccc; font-size: 14px;">
            Não foi possível carregar o QR Code após múltiplas tentativas.<br>
            Use o código PIX abaixo para realizar o pagamento.
          </p>
          <p style="margin: 10px 0; color: #888; font-size: 12px;">
            Se o problema persistir, entre em contato com o suporte.
          </p>
        </div>
      `;
    };
    
    testImg.src = qrCodeUrl + '?retry=' + Date.now(); // Adicionar timestamp para evitar cache
  }
  
  // Copiar código PIX
  copyPixCode() {
    const pixCode = this.modal.querySelector('#pix-code-text').textContent;
    const button = this.modal.querySelector('#copy-button');
    
    navigator.clipboard.writeText(pixCode).then(() => {
      const originalText = button.textContent;
      button.textContent = 'Copiado!';
      button.style.background = '#00ff00';
      
      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = 'linear-gradient(45deg, #00ffff, #ff006f)';
      }, 2000);
    }).catch(err => {
      console.error('Erro ao copiar:', err);
      alert('Erro ao copiar. Selecione e copie manualmente.');
    });
  }
  
  // Verificar status do pagamento
  startStatusCheck() {
    this.checkInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/payments/${this.currentPaymentId}/status`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        
        if (data.success && data.payment.status === 'completed') {
          this.showCompleted();
          clearInterval(this.checkInterval);
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      }
    }, 5000);
  }
  
  // Mostrar pagamento completado
  showCompleted() {
    const statusIndicator = this.modal.querySelector('#status-indicator');
    const qrSection = this.modal.querySelector('#qr-section');
    const completedSection = this.modal.querySelector('#completed-section');
    
    statusIndicator.style.cssText = `
      text-align: center;
      padding: 15px;
      border-radius: 10px;
      margin: 20px 0;
      font-weight: bold;
      background: rgba(0, 255, 0, 0.2);
      color: #00ff00;
      border: 1px solid #00ff00;
    `;
    statusIndicator.querySelector('#status-text').textContent = '✅ Pagamento Confirmado!';
    
    qrSection.style.display = 'none';
    completedSection.style.display = 'block';
  }
  
  // Mostrar erro
  showError(message) {
    const loadingSection = this.modal.querySelector('#loading-section');
    const paymentContent = this.modal.querySelector('#payment-content');
    const errorSection = this.modal.querySelector('#error-section');
    
    loadingSection.style.display = 'none';
    paymentContent.style.display = 'none';
    errorSection.style.display = 'block';
    
    this.modal.querySelector('#error-message').textContent = message;
  }
  
  // Fechar modal
  close() {
    if (this.modal && this.modal.parentNode) {
      this.modal.parentNode.removeChild(this.modal);
      this.modal = null;
    }
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    document.removeEventListener('keydown', this.handleEscKey.bind(this));
  }
  
  // Tratar tecla ESC
  handleEscKey(e) {
    if (e.key === 'Escape') {
      this.close();
    }
  }

  // Reabrir um pagamento existente
  async reopenPayment(paymentId) {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message);
      }
      
      const payment = data.payment;
      const project = payment.project;
      
      // Abrir modal com dados existentes
      this.close();
      this.modal = document.createElement('div');
      this.modal.id = 'payment-modal';
      this.modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.9);
        z-index: 2000;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
        box-sizing: border-box;
      `;
      
      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        background: linear-gradient(135deg, #121212 0%, #1a1a1a 100%);
        border-radius: 15px;
        width: 100%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
        border: 1px solid #00ffff;
        box-shadow: 0 0 30px rgba(0, 255, 255, 0.3);
        position: relative;
      `;
      
      const isExpired = !data.isValid;
      const statusColor = isExpired ? '#ff6b6b' : '#ffa500';
      const statusText = isExpired ? 'Pagamento Expirado' : 'Aguardando Pagamento';
      
      modalContent.innerHTML = `
        <div class="payment-modal-header" style="
          padding: 20px;
          border-bottom: 1px solid rgba(0, 255, 255, 0.3);
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <h2 style="color: #00ffff; margin: 0;">
            <i class="fas fa-qrcode"></i> Pagamento PIX
          </h2>
          <button onclick="window.paymentModal.close()" style="
            background: none;
            border: none;
            color: #ff006f;
            font-size: 24px;
            cursor: pointer;
            padding: 5px;
          ">✕</button>
        </div>
        
        <div id="payment-content" style="padding: 20px;">
          <div class="project-info" style="
            background: rgba(0, 255, 255, 0.1);
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
            border: 1px solid rgba(0, 255, 255, 0.3);
          ">
            <h3 id="project-title" style="color: #00ffff; margin: 0 0 10px 0;">${project.title}</h3>
            <p style="color: #ccc; margin: 0;">
              <strong>Valor:</strong> 
              <span id="project-price" style="color: #00ff9d; font-size: 1.2em;">R$ ${payment.amount.toFixed(2)}</span>
            </p>
          </div>
          
          <div id="status-indicator" style="
            text-align: center;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            font-weight: bold;
            background: rgba(${isExpired ? '255, 107, 107' : '255, 165, 0'}, 0.2);
            color: ${statusColor};
            border: 1px solid ${statusColor};
          ">
            <span id="status-text">${statusText}</span>
            ${isExpired ? '<br><small>Solicite um novo pagamento</small>' : ''}
          </div>
          
          ${!isExpired ? `
          <div id="qr-section">
            <div class="qr-code-container" style="
              text-align: center;
              margin: 20px 0;
              padding: 20px;
              background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
              border-radius: 15px;
              border: 2px solid rgba(0, 255, 255, 0.3);
            ">
              <h3 style="color: #00ffff; margin-bottom: 15px;">QR Code PIX</h3>
              <div style="
                background: white;
                padding: 15px;
                border-radius: 10px;
                display: inline-block;
                box-shadow: 0 4px 15px rgba(0, 255, 255, 0.2);
              ">
                <img id="qr-code-img" style="
                  width: 250px;
                  height: 250px;
                  display: block;
                " alt="QR Code PIX" src="${payment.qrCodeUrl || ''}">
              </div>
              <p style="color: #ccc; margin-top: 10px; font-size: 14px;">
                Escaneie com o app do seu banco
              </p>
            </div>
            
            <div class="pix-code" style="
              background: rgba(0, 255, 255, 0.1);
              padding: 15px;
              border-radius: 10px;
              margin: 20px 0;
              border: 1px solid rgba(0, 255, 255, 0.3);
              word-break: break-all;
              font-family: monospace;
            ">
              <strong style="color: #00ffff;">Código PIX (Copia e Cola):</strong><br>
              <span id="pix-code-text" style="color: #ccc;">${payment.pixCode || 'Código não disponível'}</span>
              <button id="copy-button" onclick="window.paymentModal.copyPixCode()" style="
                background: linear-gradient(45deg, #00ffff, #ff006f);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 5px;
                cursor: pointer;
                margin-left: 10px;
                transition: transform 0.2s;
              ">Copiar</button>
            </div>
          </div>
          ` : ''}
        </div>
      `;
      
      this.modal.appendChild(modalContent);
      document.body.appendChild(this.modal);
      
      this.currentPaymentId = paymentId;
      
      // Iniciar verificação de status se ainda está válido
      if (!isExpired) {
        this.startStatusCheck();
      }
      
    } catch (error) {
      console.error('Erro ao reabrir pagamento:', error);
      alert('Erro ao carregar pagamento: ' + error.message);
    }
  }
}

// Instância global do modal
window.paymentModal = new PaymentModal();

// Função para abrir modal de pagamento (compatibilidade)
window.openPaymentModal = function(project, isAdminGenerated = false, customAmount = null) {
  window.paymentModal.open(project, isAdminGenerated, customAmount);
};

// Função para reabrir um pagamento existente
window.reopenPayment = function(paymentId) {
  window.paymentModal.reopenPayment(paymentId);
};

// Adicionar CSS de animação
const style = document.createElement('style');
style.textContent = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;
document.head.appendChild(style);
