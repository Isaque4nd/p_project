// client/public/assets/js/dashboard.js
document.addEventListener('DOMContentLoaded', () => {
  const projectsGrid = document.getElementById('projects-grid');
  const purchasedProjectsGrid = document.getElementById('purchased-projects-grid');
  const paymentsList = document.getElementById('payments-list');
  const logoutBtn = document.getElementById('logout-btn');
  const userNameEl = document.getElementById('user-name');
  const loadingEl = document.getElementById('loading');

  // Verificar autenticação
  const token = localStorage.getItem('token');
  if (!token || token === 'null' || token === 'undefined') {
    localStorage.removeItem('token');
    window.location.href = '/';
    return;
  }

  // Configurar axios defaults
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  axios.defaults.baseURL = window.location.origin;

  // Função para mostrar loading
  function showLoading(show = true) {
    if (loadingEl) {
      loadingEl.style.display = show ? 'flex' : 'none';
    }
  }

  // Função para mostrar mensagens
  function showMessage(message, type = 'info') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Estilos da notificação
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.3s ease;
      background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8'};
    `;
    
    document.body.appendChild(notification);
    
    // Mostrar notificação
    setTimeout(() => notification.style.opacity = '1', 100);
    
    // Remover após 4 segundos
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 4000);
  }

  // Carregar perfil do usuário
  async function loadUserProfile() {
    try {
      const response = await axios.get('/api/auth/me');
      
      if (response.data.success) {
        const user = response.data.user;
        if (userNameEl) {
          userNameEl.textContent = `Olá, ${user.name}`;
        }
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/';
      }
    }
  }

  // Carregar projetos disponíveis
  async function loadProjects() {
    try {
      showLoading(true);
      const response = await axios.get('/api/projects');
      
      if (response.data.success) {
        renderProjects(response.data.projects);
      } else {
        showMessage('Erro ao carregar projetos', 'error');
      }
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      showMessage('Erro ao carregar projetos', 'error');
      
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/';
      }
    } finally {
      showLoading(false);
    }
  }

  // Renderizar projetos disponíveis
  function renderProjects(projects) {
    if (!projectsGrid) return;
    
    projectsGrid.innerHTML = '';
    
    if (projects.length === 0) {
      projectsGrid.innerHTML = `
        <div class="no-projects">
          <i class="fas fa-folder-open"></i>
          <p>Nenhum projeto disponível no momento</p>
        </div>
      `;
      return;
    }
    
    projects.forEach(project => {
      const projectCard = document.createElement('div');
      projectCard.className = 'project-card';
      projectCard.innerHTML = `
        <div class="project-header">
          <h3>${project.title}</h3>
          <span class="project-category">${project.category || 'Desenvolvimento Web'}</span>
        </div>
        <p class="project-description">${project.description}</p>
        ${project.features && project.features.length > 0 ? `
          <ul class="project-features">
            ${project.features.map(feature => `<li><i class="fas fa-check"></i> ${feature}</li>`).join('')}
          </ul>
        ` : ''}
        <div class="project-footer">
          <p class="price">R$ ${project.price.toFixed(2)}</p>
          <button class="btn btn-primary buy-btn" data-id="${project._id}" data-title="${project.title}">
            <i class="fas fa-shopping-cart"></i> Comprar Agora
          </button>
        </div>
      `;
      projectsGrid.appendChild(projectCard);
    });
    
    // Adicionar eventos aos botões de compra
    document.querySelectorAll('.buy-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const projectId = btn.getAttribute('data-id');
        const projectTitle = btn.getAttribute('data-title');
        
        await initiatePayment(projectId, btn);
      });
    });
  }

  // Iniciar processo de pagamento
  async function initiatePayment(projectId, btnElement) {
    try {
      // Buscar dados do projeto
      const projectResponse = await axios.get(`/api/projects/${projectId}`);
      
      if (projectResponse.data.success) {
        const project = projectResponse.data.project;
        
        // Abrir modal de pagamento
        if (window.paymentModal) {
          window.paymentModal.open(project, false);
        } else if (window.openPaymentModal) {
          window.openPaymentModal(project, false);
        } else {
          // Fallback para método antigo
          await initiatePaymentFallback(projectId, btnElement);
        }
      } else {
        showMessage('Projeto não encontrado', 'error');
      }
    } catch (error) {
      console.error('Erro ao iniciar pagamento:', error);
      showMessage(
        error.response?.data?.message || 'Erro ao processar pagamento', 
        'error'
      );
    }
  }

  // Método de fallback para pagamento (antigo)
  async function initiatePaymentFallback(projectId, btnElement) {
    const originalText = btnElement.innerHTML;
    
    try {
      // Mostrar loading no botão
      btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
      btnElement.disabled = true;
      
      const response = await axios.post('/api/payments/create', { projectId });
      
      if (response.data.success) {
        showMessage('Pagamento criado! Redirecionando...', 'success');
        
        // Aguardar um pouco antes de redirecionar
        setTimeout(() => {
          window.open(response.data.payment.paymentUrl, '_blank');
        }, 1000);
        
        // Recarregar dados após um tempo
        setTimeout(() => {
          loadPayments();
          loadPurchasedProjects();
        }, 2000);
      } else {
        showMessage(response.data.message || 'Erro ao criar pagamento', 'error');
      }
    } catch (error) {
      console.error('Erro ao iniciar pagamento:', error);
      showMessage(
        error.response?.data?.message || 'Erro ao processar pagamento', 
        'error'
      );
    } finally {
      // Restaurar botão
      btnElement.innerHTML = originalText;
      btnElement.disabled = false;
    }
  }

  // Carregar projetos comprados
  async function loadPurchasedProjects() {
    try {
      const response = await axios.get('/api/projects/purchased/my');
      
      if (response.data.success) {
        renderPurchasedProjects(response.data.projects);
      }
    } catch (error) {
      console.error('Erro ao carregar projetos comprados:', error);
    }
  }

  // Renderizar projetos comprados
  function renderPurchasedProjects(projects) {
    if (!purchasedProjectsGrid) return;
    
    purchasedProjectsGrid.innerHTML = '';
    
    if (projects.length === 0) {
      purchasedProjectsGrid.innerHTML = `
        <div class="no-projects">
          <i class="fas fa-box-open"></i>
          <p>Você ainda não possui nenhum projeto</p>
        </div>
      `;
      return;
    }
    
    projects.forEach(project => {
      const projectCard = document.createElement('div');
      projectCard.className = 'purchased-project-card';
      projectCard.innerHTML = `
        <div class="project-header">
          <h3>${project.title}</h3>
          <span class="status-badge purchased">Adquirido</span>
        </div>
        <p class="project-description">${project.description}</p>
        <div class="project-footer">
          <button class="btn btn-success access-btn" data-link="${project.driveLink}">
            <i class="fas fa-external-link-alt"></i> Acessar Projeto
          </button>
        </div>
      `;
      purchasedProjectsGrid.appendChild(projectCard);
    });

    // Adicionar eventos aos botões de acesso
    document.querySelectorAll('.access-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const link = btn.getAttribute('data-link');
        if (link && link !== '#') {
          window.open(link, '_blank');
        } else {
          showMessage('Link do projeto ainda não disponível', 'warning');
        }
      });
    });
  }

  // Carregar histórico de pagamentos
  async function loadPayments() {
    try {
      const response = await axios.get('/api/payments/my');
      
      if (response.data.success) {
        renderPayments(response.data.payments);
      }
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
    }
  }

  // Renderizar histórico de pagamentos
  function renderPayments(payments) {
    if (!paymentsList) return;
    
    paymentsList.innerHTML = '';
    
    if (payments.length === 0) {
      paymentsList.innerHTML = `
        <div class="no-payments">
          <i class="fas fa-receipt"></i>
          <p>Nenhum pagamento realizado</p>
        </div>
      `;
      return;
    }
    
    payments.forEach(payment => {
      const paymentItem = document.createElement('div');
      paymentItem.className = 'payment-item';
      
      const statusClass = {
        'pending': 'warning',
        'approved': 'success',
        'completed': 'success',
        'failed': 'error',
        'cancelled': 'secondary'
      };
      
      const statusText = {
        'pending': 'Pendente',
        'approved': 'Aprovado',
        'completed': 'Concluído',
        'failed': 'Falhou',
        'cancelled': 'Cancelado'
      };

      // Verificar se pode reabrir (pendente e não expirado)
      const canReopen = payment.status === 'pending' && 
                       payment.paymentMethod === 'pix' &&
                       payment.expiresAt && 
                       new Date(payment.expiresAt) > new Date();

      // Verificar se está expirado
      const isExpired = payment.expiresAt && new Date(payment.expiresAt) <= new Date();
      
      paymentItem.innerHTML = `
        <div class="payment-info">
          <h4>${payment.project?.title || payment.description || 'Produto'}</h4>
          <p class="payment-date">
            <i class="fas fa-calendar"></i> 
            ${new Date(payment.createdAt).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          ${payment.expiresAt ? `
            <p class="payment-expire ${isExpired ? 'expired' : ''}">
              <i class="fas fa-clock"></i> 
              ${isExpired ? 'Expirado em:' : 'Expira em:'} 
              ${new Date(payment.expiresAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          ` : ''}
          ${payment.paymentMethod ? `
            <p class="payment-method">
              <i class="fas fa-credit-card"></i> 
              ${payment.paymentMethod.toUpperCase()}
            </p>
          ` : ''}
        </div>
        <div class="payment-amount">
          <span class="amount-label">Valor:</span>
          <span class="amount-value">R$ ${payment.amount.toFixed(2)}</span>
        </div>
        <div class="payment-status">
          <span class="status-badge ${statusClass[payment.status]} ${isExpired && payment.status === 'pending' ? 'expired' : ''}">
            <i class="fas fa-${getStatusIcon(payment.status, isExpired)}"></i>
            ${isExpired && payment.status === 'pending' ? 'Expirado' : statusText[payment.status]}
          </span>
          ${canReopen ? `
            <button class="reopen-payment-btn" onclick="reopenPayment('${payment._id}')" 
                    title="Reabrir pagamento e visualizar QR Code"
                    style="
              background: linear-gradient(45deg, #00ffff, #ff006f);
              color: white;
              border: none;
              padding: 8px 15px;
              border-radius: 8px;
              cursor: pointer;
              margin-left: 10px;
              font-size: 13px;
              font-weight: 500;
              transition: all 0.3s ease;
              box-shadow: 0 2px 8px rgba(0, 255, 255, 0.3);
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0, 255, 255, 0.4)'" 
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0, 255, 255, 0.3)'">
              <i class="fas fa-qrcode"></i> Ver QR Code
            </button>
          ` : ''}
          ${isExpired && payment.status === 'pending' ? `
            <button class="new-payment-btn" onclick="createNewPayment('${payment.project._id}')" 
                    title="Criar novo pagamento"
                    style="
              background: linear-gradient(45deg, #28a745, #20c997);
              color: white;
              border: none;
              padding: 8px 15px;
              border-radius: 8px;
              cursor: pointer;
              margin-left: 10px;
              font-size: 13px;
              font-weight: 500;
              transition: all 0.3s ease;
              box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(40, 167, 69, 0.4)'" 
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(40, 167, 69, 0.3)'">
              <i class="fas fa-plus"></i> Novo Pagamento
            </button>
          ` : ''}
        </div>
      `;
      
      paymentsList.appendChild(paymentItem);
    });
  }

  // Função para obter ícone do status
  function getStatusIcon(status, isExpired) {
    if (isExpired && status === 'pending') return 'times-circle';
    
    const icons = {
      'pending': 'clock',
      'approved': 'check-circle',
      'completed': 'check-circle',
      'failed': 'times-circle',
      'cancelled': 'ban'
    };
    
    return icons[status] || 'question-circle';
  }

  // Função para criar novo pagamento (global)
  window.createNewPayment = async function(projectId) {
    try {
      const projectResponse = await axios.get(`/api/projects/${projectId}`);
      
      if (projectResponse.data.success) {
        const project = projectResponse.data.project;
        
        if (window.paymentModal) {
          window.paymentModal.open(project, false);
        } else {
          showMessage('Modal de pagamento não disponível', 'error');
        }
      } else {
        showMessage('Projeto não encontrado', 'error');
      }
    } catch (error) {
      console.error('Erro ao criar novo pagamento:', error);
      showMessage('Erro ao criar novo pagamento', 'error');
    }
  };

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Deseja sair da sua conta?')) {
        localStorage.removeItem('token');
        showMessage('Logout realizado com sucesso', 'success');
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      }
    });
  }

  // Inicializar dashboard
  async function initDashboard() {
    await loadUserProfile();
    await loadProjects();
    await loadPurchasedProjects();
    await loadPayments();
  }

  // Executar inicialização
  initDashboard();

  // Atualizar dados periodicamente
  setInterval(() => {
    loadPayments();
    loadPurchasedProjects();
  }, 30000); // A cada 30 segundos
});