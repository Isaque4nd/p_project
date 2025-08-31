// client/public/assets/js/session-manager.js
// Configuração global do axios para controle de sessão

(function() {
  'use strict';

// Configurar interceptador de resposta para detectar sessões expiradas
if (typeof axios !== 'undefined') {
  axios.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      // Verificar se é erro de sessão expirada
      if (error.response && error.response.status === 401) {
        const data = error.response.data;
        
        if (data.sessionExpired) {
          // Sessão expirada por login em outro dispositivo
          handleSessionExpired(data.message);
        } else if (data.message && (
          data.message.includes('Token inválido') || 
          data.message.includes('Token expirado') ||
          data.message.includes('Conta desativada')
        )) {
          // Token inválido ou conta desativada
          handleLogout(data.message);
        }
      }
      
      return Promise.reject(error);
    }
  );
}

// Função para lidar com sessão expirada
function handleSessionExpired(message) {
  // Mostrar modal de aviso
  showSessionExpiredModal(message);
  
  // Limpar dados de autenticação
  localStorage.removeItem('token');
  
  // Redirecionar após 3 segundos
  setTimeout(() => {
    window.location.href = '/';
  }, 3000);
}

// Função para lidar com logout forçado
function handleLogout(message) {
  // Mostrar mensagem de aviso
  showMessage(message || 'Sessão encerrada', 'warning');
  
  // Limpar dados de autenticação
  localStorage.removeItem('token');
  
  // Redirecionar imediatamente
  setTimeout(() => {
    window.location.href = '/';
  }, 1500);
}

// Mostrar modal de sessão expirada
function showSessionExpiredModal(message) {
  // Remover modal existente se houver
  const existingModal = document.getElementById('session-expired-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Criar modal
  const modal = document.createElement('div');
  modal.id = 'session-expired-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: Arial, sans-serif;
  `;
  
  modal.innerHTML = `
    <div style="
      background: #1a1a1a;
      color: #ffd700;
      padding: 30px;
      border-radius: 15px;
      text-align: center;
      max-width: 400px;
      border: 2px solid #ffd700;
      box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
    ">
      <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
      <h3 style="margin: 0 0 15px 0; color: #ffd700;">Sessão Encerrada</h3>
      <p style="margin: 0 0 20px 0; color: #ccc; line-height: 1.5;">${message}</p>
      <p style="margin: 0; color: #999; font-size: 14px;">Redirecionando em 3 segundos...</p>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Função para mostrar mensagens (caso não exista)
function showMessage(message, type = 'info') {
  // Verificar se a função showMessage já existe globalmente
  if (typeof window.showMessage === 'function') {
    window.showMessage(message, type);
    return;
  }
  
  // Criar notificação simples
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    z-index: 10000;
    max-width: 300px;
    animation: slideIn 0.3s ease;
  `;
  
  // Cores baseadas no tipo
  const colors = {
    success: '#22c55e',
    error: '#ef4444', 
    warning: '#f59e0b',
    info: '#3b82f6'
  };
  
  notification.style.background = colors[type] || colors.info;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Remover após 4 segundos
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 4000);
}

// Adicionar estilo para animação
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);

})(); // Fechar IIFE
