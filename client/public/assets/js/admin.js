// client/public/assets/js/admin.js
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  
  // Verificar autenticação e permissão de admin
  if (!token || token === 'null' || token === 'undefined') {
    localStorage.removeItem('token');
    window.location.href = '/';
    return;
  }

  // Configurar axios
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  axios.defaults.baseURL = window.location.origin;

  // Elementos DOM
  const projectsList = document.getElementById('projects-list');
  const paymentsList = document.getElementById('payments-list');
  const usersList = document.getElementById('users-list');
  const addProjectBtn = document.getElementById('add-project-btn');
  const projectModal = document.getElementById('project-modal');
  const projectForm = document.getElementById('project-form');
  const closeModalBtn = document.getElementById('close-modal');
  const cancelBtn = document.getElementById('cancel-btn');
  const loadingEl = document.getElementById('loading');
  const modalTitle = document.getElementById('modal-title');
  
  let editingProjectId = null;
  let currentProjects = [];
  let currentUsersList = []; // Renomeado para consistência

  // Função para mostrar loading
  function showLoading(show = true) {
    if (loadingEl) {
      loadingEl.style.display = show ? 'flex' : 'none';
    }
  }

  // Função para mostrar mensagens
  function showMessage(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
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
    setTimeout(() => notification.style.opacity = '1', 100);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 4000);
  }

  // Verificar se é admin
  async function checkAdminAccess() {
    try {
      const response = await axios.get('/api/auth/me');
      
      if (response.data.success) {
        const user = response.data.user;
        if (user.role !== 'admin') {
          showMessage('Acesso negado. Apenas administradores.', 'error');
          setTimeout(() => window.location.href = '/dashboard.html', 2000);
          return false;
        }
        return true;
      }
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      localStorage.removeItem('token');
      window.location.href = '/';
      return false;
    }
  }

  // Carregar todos os projetos
  async function loadProjects() {
    try {
      showLoading(true);
      const response = await axios.get('/api/projects/admin/all');
      
      if (response.data.success) {
        currentProjects = response.data.projects;
        renderProjects(response.data.projects);
      }
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      showMessage('Erro ao carregar projetos', 'error');
    } finally {
      showLoading(false);
    }
  }

  // Renderizar projetos
  function renderProjects(projects) {
    if (!projectsList) return;
    
    projectsList.innerHTML = '';
    
    if (projects.length === 0) {
      projectsList.innerHTML = `
        <div class="no-projects">
          <i class="fas fa-folder-open"></i>
          <p>Nenhum projeto cadastrado</p>
        </div>
      `;
      return;
    }
    
    projects.forEach(project => {
      const targetUserInfo = project.targetUser ? 
        `<p>Usuário: ${project.targetUser.name} (${project.targetUser.email})</p>` : 
        `<p>Usuário: Todos os usuários</p>`;
      
      const deliveryTypeInfo = project.deliveryType === 'manual' ? 
        `<span class="status-badge success">Liberado</span>` : 
        `<span class="status-badge warning">Requer Pagamento</span>`;
      
      const projectCard = document.createElement('div');
      projectCard.className = 'project-item';
      projectCard.innerHTML = `
        <div class="project-details">
          <h3>${project.title}</h3>
          <p>Categoria: ${project.category || 'N/A'}</p>
          <p>Preço: R$ ${project.price.toFixed(2)}</p>
          ${targetUserInfo}
          <p>Tipo: ${deliveryTypeInfo}</p>
          <p>Criado em: ${new Date(project.createdAt).toLocaleDateString('pt-BR')}</p>
        </div>
        <div class="project-actions">
          <button class="btn btn-primary btn-sm edit-project" data-id="${project._id}">
            <i class="fas fa-edit"></i> Editar
          </button>
          <button class="btn btn-outline btn-sm delete-project" data-id="${project._id}" data-title="${project.title}">
            <i class="fas fa-trash"></i> Excluir
          </button>
          ${project.targetUser && project.deliveryType === 'payment' ? `
            <button class="btn btn-success btn-sm create-payment-link" data-project="${project._id}" data-user="${project.targetUser._id}">
              <i class="fas fa-qrcode"></i> Gerar PIX
            </button>
          ` : ''}
        </div>
      `;
      projectsList.appendChild(projectCard);
    });
    
    // Adicionar eventos aos botões
    document.querySelectorAll('.edit-project').forEach(btn => {
      btn.addEventListener('click', () => editProject(btn.dataset.id));
    });
    
    document.querySelectorAll('.delete-project').forEach(btn => {
      btn.addEventListener('click', () => deleteProject(btn.dataset.id, btn.dataset.title));
    });

    document.querySelectorAll('.create-payment-link').forEach(btn => {
      btn.addEventListener('click', () => createPaymentLink(btn.dataset.project, btn.dataset.user));
    });
  }

  // Criar link de pagamento PIX
  async function createPaymentLink(projectId, userId) {
    try {
      showLoading(true);
      
      const response = await axios.post('/api/payments/create-pix-link', {
        projectId,
        userId
      });
      
      if (response.data.success) {
        const paymentUrl = `${window.location.origin}/payment.html?payment=${response.data.paymentId}`;
        
        // Mostrar modal com link
        showPaymentLinkModal(paymentUrl, response.data.payment);
        
        showMessage('Link de pagamento PIX criado!', 'success');
      }
    } catch (error) {
      console.error('Erro ao criar link PIX:', error);
      showMessage('Erro ao criar link de pagamento', 'error');
    } finally {
      showLoading(false);
    }
  }

  // Mostrar modal com link de pagamento
  function showPaymentLinkModal(paymentUrl, payment) {
    const modalHtml = `
      <div class="modal" id="payment-link-modal" style="display: flex;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Link de Pagamento PIX Criado</h3>
            <button class="close-btn" onclick="document.getElementById('payment-link-modal').remove()">&times;</button>
          </div>
          <div class="payment-link-info">
            <h4>Projeto: ${payment.project.title}</h4>
            <p>Valor: R$ ${payment.amount.toFixed(2)}</p>
            <p>Cliente: ${payment.user.name}</p>
            
            <div class="form-group">
              <label>Link de Pagamento:</label>
              <div class="link-copy-container">
                <input type="text" id="payment-url" value="${paymentUrl}" readonly>
                <button class="btn btn-primary" onclick="copyPaymentLink()">
                  <i class="fas fa-copy"></i> Copiar
                </button>
              </div>
            </div>
            
            <div class="qr-code-container">
              <p>QR Code será gerado na página de pagamento</p>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-primary" onclick="window.open('${paymentUrl}', '_blank')">
              <i class="fas fa-external-link-alt"></i> Abrir Página
            </button>
            <button class="btn btn-outline" onclick="document.getElementById('payment-link-modal').remove()">
              Fechar
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  // Função global para copiar link (acessível do HTML inline)
  window.copyPaymentLink = function() {
    const linkInput = document.getElementById('payment-url');
    linkInput.select();
    document.execCommand('copy');
    showMessage('Link copiado!', 'success');
  };

  // Carregar pagamentos
  async function loadPayments() {
    try {
      const response = await axios.get('/api/payments/all');
      
      if (response.data.success) {
        renderPayments(response.data.payments);
      }
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
      showMessage('Erro ao carregar pagamentos', 'error');
    }
  }

  // Renderizar pagamentos
  function renderPayments(payments) {
    if (!paymentsList) return;
    
    paymentsList.innerHTML = '';
    
    if (payments.length === 0) {
      paymentsList.innerHTML = `
        <div class="no-payments">
          <i class="fas fa-receipt"></i>
          <p>Nenhum pagamento encontrado</p>
        </div>
      `;
      return;
    }
    
    payments.forEach(payment => {
      const statusClass = {
        'pending': 'warning',
        'completed': 'success',
        'failed': 'error',
        'cancelled': 'secondary'
      };
      
      const statusText = {
        'pending': 'Pendente',
        'completed': 'Concluído',
        'failed': 'Falhou',
        'cancelled': 'Cancelado'
      };
      
      const paymentCard = document.createElement('div');
      paymentCard.className = 'payment-item';
      paymentCard.innerHTML = `
        <div class="payment-details">
          <h3>${payment.user?.name || 'Usuário não encontrado'}</h3>
          <p>Email: ${payment.user?.email || 'Email não disponível'}</p>
          <p>Projeto: ${payment.project?.title || 'Projeto não encontrado'}</p>
          <p>Data: ${new Date(payment.createdAt).toLocaleDateString('pt-BR')}</p>
        </div>
        <div class="payment-info">
          <p class="price">R$ ${payment.amount.toFixed(2)}</p>
          <span class="status-badge ${statusClass[payment.status]}">
            ${statusText[payment.status]}
          </span>
          ${payment.status === 'pending' ? `
            <button class="btn btn-success btn-sm mark-paid" data-id="${payment._id}">
              <i class="fas fa-check"></i> Marcar como Pago
            </button>
          ` : ''}
        </div>
      `;
      paymentsList.appendChild(paymentCard);
    });
    
    // Adicionar eventos aos botões
    document.querySelectorAll('.mark-paid').forEach(btn => {
      btn.addEventListener('click', () => markPaymentAsPaid(btn.dataset.id));
    });
  }

  // Carregar todos os pagamentos
  async function loadPayments() {
    try {
      const response = await axios.get('/api/payments/all');
      
      if (response.data.success) {
        renderPayments(response.data.payments);
      }
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
      showMessage('Erro ao carregar pagamentos', 'error');
    }
  }

  // Renderizar pagamentos
  function renderPayments(payments) {
    if (!paymentsList) return;
    
    paymentsList.innerHTML = '';
    
    if (payments.length === 0) {
      paymentsList.innerHTML = `
        <tr>
          <td colspan="6" class="text-center">Nenhum pagamento encontrado</td>
        </tr>
      `;
      return;
    }
    
    payments.forEach(payment => {
      const row = document.createElement('tr');
      
      const statusClass = {
        'pending': 'warning',
        'completed': 'success',
        'failed': 'error',
        'cancelled': 'secondary'
      };
      
      const statusText = {
        'pending': 'Pendente',
        'completed': 'Concluído',
        'failed': 'Falhou',
        'cancelled': 'Cancelado'
      };
      
      row.innerHTML = `
        <td>${payment.user?.name || payment.customerName || 'N/A'}</td>
        <td>${payment.user?.email || payment.customerEmail || 'N/A'}</td>
        <td>${payment.project?.title || payment.description || 'Cobrança'}</td>
        <td>R$ ${payment.amount.toFixed(2)}</td>
        <td>
          <span class="status-badge ${statusClass[payment.status]}">
            ${statusText[payment.status]}
          </span>
        </td>
        <td>${new Date(payment.createdAt).toLocaleDateString('pt-BR')}</td>
      `;
      paymentsList.appendChild(row);
    });
  }

  // Mostrar modal de projeto
  function showProjectModal(project = null) {
    if (!projectModal || !projectForm) return;
    
    editingProjectId = project ? project._id : null;
    
    // Limpar formulário
    projectForm.reset();
    
    // Carregar usuários no select
    loadUsersIntoSelect();
    
    // Preencher dados se editando
    if (project) {
      document.getElementById('project-title').value = project.title;
      document.getElementById('project-description').value = project.description;
      document.getElementById('project-price').value = project.price;
      document.getElementById('project-category').value = project.category || '';
      document.getElementById('project-drive-link').value = project.driveLink;
      document.getElementById('project-features').value = project.features ? project.features.join('\n') : '';
      
      // Se o projeto tem usuário específico
      if (project.targetUser) {
        setTimeout(() => {
          document.getElementById('project-target-user').value = project.targetUser._id || project.targetUser;
        }, 500);
      }
      
      // Definir tipo de entrega
      if (project.deliveryType) {
        const deliveryRadio = document.querySelector(`input[name="deliveryType"][value="${project.deliveryType}"]`);
        if (deliveryRadio) {
          deliveryRadio.checked = true;
        }
      }
    }
    
    // Atualizar título do modal
    if (modalTitle) {
      modalTitle.textContent = project ? 'Editar Projeto' : 'Novo Projeto';
    }
    
    projectModal.style.display = 'flex';
  }

  // Carregar usuários no select do modal
  async function loadUsersIntoSelect() {
    const userSelect = document.getElementById('project-target-user');
    if (!userSelect) return;
    
    try {
      const response = await axios.get('/api/auth/users');
      
      if (response.data.success) {
        // Limpar opções existentes (manter apenas a primeira)
        userSelect.innerHTML = '<option value="">Disponível para todos os usuários</option>';
        
        // Adicionar usuários (exceto admins)
        response.data.users
          .filter(user => user.role !== 'admin')
          .forEach(user => {
            const option = document.createElement('option');
            option.value = user._id;
            option.textContent = `${user.name} (${user.email})`;
            userSelect.appendChild(option);
          });
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  }

  // Esconder modal
  function hideProjectModal() {
    if (projectModal) {
      projectModal.style.display = 'none';
    }
    editingProjectId = null;
  }

  // Editar projeto
  async function editProject(projectId) {
    try {
      const response = await axios.get(`/api/projects/${projectId}`);
      
      if (response.data.success) {
        showProjectModal(response.data.project);
      }
    } catch (error) {
      console.error('Erro ao carregar projeto:', error);
      showMessage('Erro ao carregar projeto', 'error');
    }
  }

  // Deletar projeto
  async function deleteProject(projectId, projectTitle) {
    if (!confirm(`Deseja realmente deletar o projeto "${projectTitle}"?`)) {
      return;
    }
    
    try {
      const response = await axios.delete(`/api/projects/${projectId}`);
      
      if (response.data.success) {
        showMessage('Projeto deletado com sucesso', 'success');
        loadProjects();
      }
    } catch (error) {
      console.error('Erro ao deletar projeto:', error);
      showMessage('Erro ao deletar projeto', 'error');
    }
  }

  // Salvar projeto
  async function saveProject(formData) {
    try {
      const projectData = {
        title: formData.get('title'),
        description: formData.get('description'),
        price: parseFloat(formData.get('price')),
        category: formData.get('category'),
        driveLink: formData.get('driveLink'),
        targetUserId: formData.get('targetUserId') || null
      };

      let response;
      
      if (editingProjectId) {
        response = await axios.put(`/api/projects/${editingProjectId}`, projectData);
      } else {
        response = await axios.post('/api/projects', projectData);
      }
      
      if (response.data.success) {
        showMessage(
          editingProjectId ? 'Projeto atualizado com sucesso' : 'Projeto criado com sucesso', 
          'success'
        );
        hideProjectModal();
        loadProjects();
      }
    } catch (error) {
      console.error('Erro ao salvar projeto:', error);
      showMessage(
        error.response?.data?.message || 'Erro ao salvar projeto', 
        'error'
      );
    }
  }

  // Event listeners
  if (addProjectBtn) {
    addProjectBtn.addEventListener('click', () => showProjectModal());
  }

  // Botão para gerar cobrança
  const createChargeBtn = document.getElementById('create-charge-btn');
  if (createChargeBtn) {
    createChargeBtn.addEventListener('click', () => showCreateChargeModal());
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', hideProjectModal);
  }

  if (projectModal) {
    projectModal.addEventListener('click', (e) => {
      if (e.target === projectModal) {
        hideProjectModal();
      }
    });
  }

  if (projectForm) {
    projectForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(projectForm);
      await saveProject(formData);
    });
  }

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Deseja sair da sua conta?')) {
        localStorage.removeItem('token');
        window.location.href = '/';
      }
    });
  }

  // Navegação entre abas
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      // Atualizar botões
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Atualizar conteúdo
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === targetTab) {
          content.classList.add('active');
        }
      });
      
      // Carregar dados da aba ativa
      if (targetTab === 'projects') {
        loadProjects();
      } else if (targetTab === 'payments') {
        loadPayments();
      }
    });
  });

  // Carregar usuários
  async function loadUsers() {
    try {
      const response = await axios.get('/api/auth/users');
      
      if (response.data.success) {
        currentUsersList = response.data.users;
        renderUsers(response.data.users);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      showMessage('Erro ao carregar usuários', 'error');
    }
  }

  // Renderizar usuários
  function renderUsers(users) {
    if (!usersList) return;
    
    usersList.innerHTML = '';
    
    if (users.length === 0) {
      usersList.innerHTML = `
        <div class="no-users">
          <i class="fas fa-users"></i>
          <p>Nenhum usuário encontrado</p>
        </div>
      `;
      return;
    }
    
    users.forEach(user => {
      const userCard = document.createElement('div');
      userCard.className = 'user-item';
      userCard.innerHTML = `
        <div class="user-details">
          <h3>${user.name}</h3>
          <p>Email: ${user.email}</p>
          <p>Tipo: ${user.role === 'admin' ? 'Administrador' : 'Cliente'}</p>
          <p>Projetos: ${user.purchasedProjects.length}</p>
          <p>Cadastrado em: ${new Date(user.createdAt).toLocaleDateString('pt-BR')}</p>
        </div>
        <div class="user-actions">
          <button class="btn btn-primary btn-sm deliver-project" data-id="${user._id}">
            <i class="fas fa-gift"></i> Entregar Projeto
          </button>
          <button class="btn btn-success btn-sm create-manual-payment" data-id="${user._id}">
            <i class="fas fa-money-bill"></i> Pagamento Manual
          </button>
        </div>
      `;
      usersList.appendChild(userCard);
    });
    
    // Adicionar eventos aos botões
    document.querySelectorAll('.deliver-project').forEach(btn => {
      btn.addEventListener('click', () => showDeliverProjectModal(btn.dataset.id));
    });
    
    document.querySelectorAll('.create-manual-payment').forEach(btn => {
      btn.addEventListener('click', () => showManualPaymentModal(btn.dataset.id));
    });
  }

  // Marcar pagamento como pago
  async function markPaymentAsPaid(paymentId) {
    if (!confirm('Marcar este pagamento como pago?')) return;
    
    try {
      const response = await axios.post(`/api/payments/manual/${paymentId}`);
      
      if (response.data.success) {
        showMessage('Pagamento marcado como pago', 'success');
        loadPayments();
      }
    } catch (error) {
      console.error('Erro ao marcar pagamento:', error);
      showMessage('Erro ao marcar pagamento como pago', 'error');
    }
  }

  // Mostrar modal para entregar projeto
  function showDeliverProjectModal(userId) {
    const user = currentUsersList.find(u => u._id === userId);
    if (!user) return;
    
    const projectOptions = currentProjects.map(project => 
      `<option value="${project._id}">${project.title} - R$ ${project.price.toFixed(2)}</option>`
    ).join('');
    
    const modalHtml = `
      <div class="modal" id="deliver-modal" style="display: flex;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Entregar Projeto para ${user.name}</h3>
            <button class="close-btn" onclick="document.getElementById('deliver-modal').remove()">&times;</button>
          </div>
          <form id="deliver-form">
            <div class="form-group">
              <label>Projeto:</label>
              <select name="projectId" required>
                <option value="">Selecione um projeto</option>
                ${projectOptions}
              </select>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-outline" onclick="document.getElementById('deliver-modal').remove()">Cancelar</button>
              <button type="submit" class="btn btn-primary">Entregar Projeto</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    document.getElementById('deliver-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      
      try {
        const response = await axios.post('/api/projects/deliver', {
          userId: userId,
          projectId: formData.get('projectId')
        });
        
        if (response.data.success) {
          showMessage('Projeto entregue com sucesso', 'success');
          document.getElementById('deliver-modal').remove();
          loadUsers();
        }
      } catch (error) {
        console.error('Erro ao entregar projeto:', error);
        showMessage('Erro ao entregar projeto', 'error');
      }
    });
  }

  // Mostrar modal para pagamento manual
  function showManualPaymentModal(userId) {
    const user = currentUsersList.find(u => u._id === userId);
    if (!user) return;
    
    const projectOptions = currentProjects.map(project => 
      `<option value="${project._id}">${project.title} - R$ ${project.price.toFixed(2)}</option>`
    ).join('');
    
    const modalHtml = `
      <div class="modal" id="payment-modal" style="display: flex;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Criar Pagamento Manual para ${user.name}</h3>
            <button class="close-btn" onclick="document.getElementById('payment-modal').remove()">&times;</button>
          </div>
          <form id="payment-form">
            <div class="form-group">
              <label>Projeto:</label>
              <select name="projectId" required>
                <option value="">Selecione um projeto</option>
                ${projectOptions}
              </select>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-outline" onclick="document.getElementById('payment-modal').remove()">Cancelar</button>
              <button type="submit" class="btn btn-primary">Criar Pagamento</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    document.getElementById('payment-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      
      try {
        const response = await axios.post('/api/payments/manual', {
          userId: userId,
          projectId: formData.get('projectId')
        });
        
        if (response.data.success) {
          showMessage('Pagamento manual criado e projeto entregue', 'success');
          document.getElementById('payment-modal').remove();
          loadPayments();
          loadUsers();
        }
      } catch (error) {
        console.error('Erro ao criar pagamento manual:', error);
        showMessage('Erro ao criar pagamento manual', 'error');
      }
    });
  }

  // Mostrar modal para criar cobrança simples
  function showCreateChargeModal() {
    const modalHtml = `
      <div class="modal" id="charge-modal" style="display: flex;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Gerar Cobrança PIX</h3>
            <button class="close-btn" onclick="document.getElementById('charge-modal').remove()">&times;</button>
          </div>
          <form id="charge-form">
            <div class="form-group">
              <label>Valor da Cobrança (R$):</label>
              <input type="number" name="amount" min="0.01" step="0.01" required placeholder="0.00">
            </div>
            <div class="form-group">
              <label>Descrição (opcional):</label>
              <input type="text" name="description" placeholder="Ex: Serviço personalizado">
            </div>
            <div class="form-group">
              <label>Slug da Página (opcional):</label>
              <input type="text" name="slug" placeholder="Ex: meu-servico-personalizado">
              <small>Se não informado, será gerado automaticamente</small>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-outline" onclick="document.getElementById('charge-modal').remove()">Cancelar</button>
              <button type="submit" class="btn btn-primary">Gerar Cobrança</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    document.getElementById('charge-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      
      try {
        showLoading(true);
        
        const response = await axios.post('/api/payments/create-charge', {
          amount: parseFloat(formData.get('amount')),
          description: formData.get('description') || 'Cobrança',
          slug: formData.get('slug') || null
        });
        
        if (response.data.success) {
          // Usar o modal de pagamento para mostrar a cobrança
          const chargeData = {
            title: formData.get('description') || 'Cobrança',
            price: parseFloat(formData.get('amount'))
          };
          
          document.getElementById('charge-modal').remove();
          
          // Abrir modal de pagamento
          if (window.paymentModal) {
            window.paymentModal.open(chargeData, true, parseFloat(formData.get('amount')));
          } else {
            showMessage('Cobrança criada! ID: ' + response.data.paymentId, 'success');
          }
          
          loadPayments();
        }
      } catch (error) {
        console.error('Erro ao criar cobrança:', error);
        showMessage('Erro ao criar cobrança', 'error');
      } finally {
        showLoading(false);
      }
    });
  }

  // Navegação por hash
  function setupHashNavigation() {
    // Mostrar seção baseada no hash da URL
    function showSection(hash) {
      // Remover # do hash
      const sectionId = hash.replace('#', '') || 'projects';
      
      // Ocultar todas as seções
      document.querySelectorAll('.admin-section').forEach(section => {
        section.style.display = 'none';
      });
      
      // Mostrar seção ativa
      const activeSection = document.getElementById(sectionId);
      if (activeSection) {
        activeSection.style.display = 'block';
        
        // Atualizar navegação
        document.querySelectorAll('nav a').forEach(link => {
          link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`nav a[href="#${sectionId}"]`);
        if (activeLink) {
          activeLink.classList.add('active');
        }
        
        // Carregar dados específicos da seção
        if (sectionId === 'projects') {
          loadProjects();
        } else if (sectionId === 'payments') {
          loadPayments();
        } else if (sectionId === 'users') {
          loadUsers();
        } else if (sectionId === 'config') {
          // Carregar configurações será feito pelo script inline
        }
      }
    }
    
    // Listener para mudanças de hash
    window.addEventListener('hashchange', () => {
      showSection(window.location.hash);
    });
    
    // Mostrar seção inicial
    showSection(window.location.hash || '#projects');
  }

  // =============================================
  // GERENCIAMENTO DE USUÁRIOS
  // =============================================
  
  let editingUserId = null;
  
  // Elementos DOM para usuários
  const addUserBtn = document.getElementById('add-user-btn');
  const userModal = document.getElementById('user-modal');
  const userForm = document.getElementById('user-form');
  const closeUserModalBtn = document.getElementById('close-user-modal');
  const cancelUserBtn = document.getElementById('cancel-user-btn');
  const userModalTitle = document.getElementById('user-modal-title');
  const userSearch = document.getElementById('user-search');
  const roleFilter = document.getElementById('role-filter');
  const deleteUserModal = document.getElementById('delete-user-modal');
  const closeDeleteModalBtn = document.getElementById('close-delete-modal');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  const deleteUserName = document.getElementById('delete-user-name');
  
  // Event listeners para usuários
  if (addUserBtn) {
    addUserBtn.addEventListener('click', () => openUserModal());
  }
  
  if (closeUserModalBtn) {
    closeUserModalBtn.addEventListener('click', closeUserModal);
  }
  
  if (cancelUserBtn) {
    cancelUserBtn.addEventListener('click', closeUserModal);
  }
  
  if (closeDeleteModalBtn) {
    closeDeleteModalBtn.addEventListener('click', closeDeleteUserModal);
  }
  
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', closeDeleteUserModal);
  }
  
  if (userForm) {
    userForm.addEventListener('submit', handleUserSubmit);
  }
  
  if (userSearch) {
    userSearch.addEventListener('input', filterUsers);
  }
  
  if (roleFilter) {
    roleFilter.addEventListener('change', filterUsers);
  }
  
  // Carregar usuários
  async function loadUsers() {
    try {
      showLoading();
      const response = await axios.get('/api/admin/users');
      currentUsersList = response.data;
      renderUsers(currentUsersList);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      showMessage('Erro ao carregar usuários', 'error');
    } finally {
      showLoading(false);
    }
  }
  
  // Renderizar usuários na tabela
  function renderUsers(users) {
    if (!usersList) return;
    
    if (users.length === 0) {
      usersList.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: var(--accent);">
            Nenhum usuário encontrado
          </td>
        </tr>
      `;
      return;
    }
    
    usersList.innerHTML = users.map(user => `
      <tr>
        <td>${user.name || 'N/A'}</td>
        <td>${user.email}</td>
        <td>
          <span class="user-role ${user.role || 'user'}">${user.role === 'admin' ? 'Administrador' : 'Usuário'}</span>
        </td>
        <td>
          <span class="user-status ${user.active !== false ? 'active' : 'inactive'}">
            ${user.active !== false ? 'Ativo' : 'Inativo'}
          </span>
        </td>
        <td>${formatDate(user.createdAt)}</td>
        <td>
          <div class="session-info">
            ${user.lastSession ? `
              <span class="${isRecentSession(user.lastSession) ? 'session-active' : ''}">
                ${formatDate(user.lastSession)}
              </span>
            ` : 'Nunca'}
          </div>
        </td>
        <td>
          <div class="user-actions">
            <button class="btn-icon edit" onclick="editUser('${user._id}')" title="Editar">
              ✏️
            </button>
            <button class="btn-icon toggle" onclick="toggleUserStatus('${user._id}')" title="${user.active !== false ? 'Desativar' : 'Ativar'}">
              ${user.active !== false ? '🔒' : '🔓'}
            </button>
            <button class="btn-icon delete" onclick="confirmDeleteUser('${user._id}', '${user.name || user.email}')" title="Excluir">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }
  
  // Filtrar usuários
  function filterUsers() {
    const searchTerm = userSearch?.value.toLowerCase() || '';
    const roleFilter = document.getElementById('role-filter')?.value || '';
    
    const filtered = currentUsersList.filter(user => {
      const matchesSearch = !searchTerm || 
        user.name?.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm);
        
      const matchesRole = !roleFilter || user.role === roleFilter;
      
      return matchesSearch && matchesRole;
    });
    
    renderUsers(filtered);
  }
  
  // Abrir modal de usuário
  function openUserModal(userId = null) {
    editingUserId = userId;
    
    if (userId) {
      // Modo edição
      const user = currentUsersList.find(u => u._id === userId);
      if (user) {
        userModalTitle.textContent = 'Editar Usuário';
        document.getElementById('user-name').value = user.name || '';
        document.getElementById('user-email').value = user.email;
        document.getElementById('user-password').value = '';
        document.getElementById('user-role').value = user.role || 'user';
        document.getElementById('user-active').checked = user.active !== false;
        
        // Mostrar hint para senha
        const passwordHint = document.querySelector('.password-hint');
        if (passwordHint) {
          passwordHint.style.display = 'block';
        }
      }
    } else {
      // Modo criação
      userModalTitle.textContent = 'Adicionar Usuário';
      userForm.reset();
      document.getElementById('user-active').checked = true;
      
      // Ocultar hint para senha
      const passwordHint = document.querySelector('.password-hint');
      if (passwordHint) {
        passwordHint.style.display = 'none';
      }
    }
    
    userModal.style.display = 'flex';
  }
  
  // Fechar modal de usuário
  function closeUserModal() {
    userModal.style.display = 'none';
    editingUserId = null;
    userForm.reset();
  }
  
  // Manipular envio do formulário de usuário
  async function handleUserSubmit(e) {
    e.preventDefault();
    
    try {
      showLoading();
      
      const formData = new FormData(userForm);
      const userData = {
        name: formData.get('name'),
        email: formData.get('email'),
        role: formData.get('role'),
        active: formData.get('active') === 'on'
      };
      
      // Só incluir senha se foi preenchida
      const password = formData.get('password');
      if (password) {
        userData.password = password;
      }
      
      if (editingUserId) {
        // Atualizar usuário existente
        await axios.put(`/api/admin/users/${editingUserId}`, userData);
        showMessage('Usuário atualizado com sucesso!', 'success');
      } else {
        // Criar novo usuário
        if (!password) {
          showMessage('Senha é obrigatória para novos usuários', 'error');
          return;
        }
        await axios.post('/api/admin/users', userData);
        showMessage('Usuário criado com sucesso!', 'success');
      }
      
      closeUserModal();
      loadUsers();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      const message = error.response?.data?.message || 'Erro ao salvar usuário';
      showMessage(message, 'error');
    } finally {
      showLoading(false);
    }
  }
  
  // Alternar status do usuário
  async function toggleUserStatus(userId) {
    try {
      showLoading();
      await axios.patch(`/api/admin/users/${userId}/toggle-status`);
      showMessage('Status do usuário alterado com sucesso!', 'success');
      loadUsers();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      showMessage('Erro ao alterar status do usuário', 'error');
    } finally {
      showLoading(false);
    }
  }
  
  // Confirmar exclusão de usuário
  function confirmDeleteUser(userId, userName) {
    deleteUserName.textContent = userName;
    confirmDeleteBtn.onclick = () => deleteUser(userId);
    deleteUserModal.style.display = 'flex';
  }
  
  // Fechar modal de exclusão
  function closeDeleteUserModal() {
    deleteUserModal.style.display = 'none';
  }
  
  // Excluir usuário
  async function deleteUser(userId) {
    try {
      showLoading();
      await axios.delete(`/api/admin/users/${userId}`);
      showMessage('Usuário excluído com sucesso!', 'success');
      closeDeleteUserModal();
      loadUsers();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      showMessage('Erro ao excluir usuário', 'error');
    } finally {
      showLoading(false);
    }
  }
  
  // Função para editar usuário (chamada pelos botões)
  window.editUser = function(userId) {
    openUserModal(userId);
  };
  
  // Função para alternar status (chamada pelos botões)
  window.toggleUserStatus = toggleUserStatus;
  
  // Função para confirmar exclusão (chamada pelos botões)
  window.confirmDeleteUser = confirmDeleteUser;
  
  // Utilitários
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('pt-BR');
  }
  
  function isRecentSession(dateString) {
    if (!dateString) return false;
    const sessionDate = new Date(dateString);
    const now = new Date();
    const diffMinutes = (now - sessionDate) / (1000 * 60);
    return diffMinutes < 30; // Considerado ativo se logou nos últimos 30 minutos
  }

  // Inicialização
  async function initAdmin() {
    const hasAccess = await checkAdminAccess();
    if (hasAccess) {
      setupHashNavigation();
      loadProjects();
      loadPayments();
      loadUsers();
    }
  }

  initAdmin();
});
