// client/public/assets/js/auth.js
// === Utilitário central de autenticação reutilizável ===
(function(){
  if(window.AuthUtil) return; // evitar redefinição
  function getToken(){
    const t = localStorage.getItem('token');
    if(!t || t === 'null' || t === 'undefined') return null; return t;
  }
  function applyAuthHeader(){
    if(typeof axios === 'undefined') return; const tk = getToken();
    if(tk){ axios.defaults.headers.common['Authorization'] = 'Bearer '+tk; }
    else { delete axios.defaults.headers.common['Authorization']; }
  }
  async function fetchMe(){
    applyAuthHeader();
    try { const r = await fetch('/api/auth/me',{headers:{'Authorization':'Bearer '+getToken()}}); if(!r.ok) return null; const d=await r.json(); return d.success?d.user:null; } catch(e){ return null; }
  }
  function ensureAuth(redirect=true){ const t=getToken(); if(!t && redirect){ window.location.replace('/login.html'); return false;} applyAuthHeader(); return !!t; }
  function logout(){ localStorage.removeItem('token'); window.location.replace('/login.html'); }
  window.AuthUtil={getToken,applyAuthHeader,fetchMe,ensureAuth,logout};
})();

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const showRegisterBtn = document.getElementById('show-register');
  const showLoginBtn = document.getElementById('show-login');
  const loginSection = document.getElementById('login-section');
  const registerSection = document.getElementById('register-section');

  // Verificar se já está logado
  const token = localStorage.getItem('token');
  if (token) {
    // Verificar se o token é válido
    checkTokenAndRedirect();
  }

  // Função para verificar token e redirecionar
  async function checkTokenAndRedirect() {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Redirecionar baseado no role
          if (data.user.role === 'admin') {
            window.location.href = '/admin.html';
          } else {
            window.location.href = '/dashboard.html';
          }
        }
      } else {
        // Token inválido, remover
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      localStorage.removeItem('token');
    }
  }

  // Função para mostrar mensagens
  function showMessage(message, type = 'info') {
    // Remover mensagem anterior se existir
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
      existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    messageDiv.style.cssText = `
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
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => messageDiv.style.opacity = '1', 100);
    
    setTimeout(() => {
      messageDiv.style.opacity = '0';
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.parentNode.removeChild(messageDiv);
        }
      }, 300);
    }, 4000);
  }

  // Alternar entre login e registro
  if (showRegisterBtn && showLoginBtn) {
    showRegisterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      loginSection.style.display = 'none';
      registerSection.style.display = 'block';
    });

    showLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      registerSection.style.display = 'none';
      loginSection.style.display = 'block';
    });
  }

  // Função para desabilitar/habilitar formulário
  function toggleFormLoading(form, loading) {
    const inputs = form.querySelectorAll('input, button');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    inputs.forEach(input => {
      input.disabled = loading;
    });
    
    if (submitBtn) {
      if (loading) {
        submitBtn.dataset.originalText = submitBtn.textContent;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
      } else {
        submitBtn.textContent = submitBtn.dataset.originalText || submitBtn.textContent;
      }
    }
  }

  // Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(loginForm);
      const email = formData.get('email');
      const password = formData.get('password');
      
      if (!email || !password) {
        showMessage('Preencha todos os campos', 'error');
        return;
      }
      
      toggleFormLoading(loginForm, true);
      
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
          localStorage.setItem('token', data.token);
          showMessage('Login realizado com sucesso!', 'success');
          
          setTimeout(() => {
            // Redirecionar baseado no role
            if (data.user.role === 'admin') {
              window.location.href = '/admin.html';
            } else {
              window.location.href = '/dashboard.html';
            }
          }, 1000);
        } else {
          showMessage(data.message || 'Erro no login', 'error');
        }
      } catch (error) {
        console.error('Erro no login:', error);
        showMessage('Erro de conexão. Tente novamente.', 'error');
      } finally {
        toggleFormLoading(loginForm, false);
      }
    });
  }

  // Registro
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(registerForm);
      const name = formData.get('name');
      const email = formData.get('email');
      const password = formData.get('password');
      const confirmPassword = formData.get('confirmPassword');
      
      // Validações
      if (!name || !email || !password || !confirmPassword) {
        showMessage('Preencha todos os campos', 'error');
        return;
      }
      
      if (password !== confirmPassword) {
        showMessage('As senhas não coincidem', 'error');
        return;
      }
      
      if (password.length < 6) {
        showMessage('A senha deve ter pelo menos 6 caracteres', 'error');
        return;
      }
      
      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showMessage('Digite um email válido', 'error');
        return;
      }
      
      toggleFormLoading(registerForm, true);
      
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
          localStorage.setItem('token', data.token);
          showMessage('Conta criada com sucesso!', 'success');
          
          setTimeout(() => {
            window.location.href = '/dashboard.html';
          }, 1000);
        } else {
          showMessage(data.message || 'Erro no registro', 'error');
        }
      } catch (error) {
        console.error('Erro no registro:', error);
        showMessage('Erro de conexão. Tente novamente.', 'error');
      } finally {
        toggleFormLoading(registerForm, false);
      }
    });
  }

  // Validação em tempo real
  const emailInputs = document.querySelectorAll('input[type="email"]');
  emailInputs.forEach(input => {
    input.addEventListener('blur', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (input.value && !emailRegex.test(input.value)) {
        input.style.borderColor = '#dc3545';
      } else {
        input.style.borderColor = '';
      }
    });
  });

  const passwordInputs = document.querySelectorAll('input[type="password"]');
  passwordInputs.forEach(input => {
    input.addEventListener('input', () => {
      if (input.name === 'password' && input.value.length > 0 && input.value.length < 6) {
        input.style.borderColor = '#dc3545';
      } else {
        input.style.borderColor = '';
      }
      
      // Verificar confirmação de senha
      if (input.name === 'confirmPassword') {
        const passwordField = document.querySelector('input[name="password"]');
        if (passwordField && input.value !== passwordField.value) {
          input.style.borderColor = '#dc3545';
        } else {
          input.style.borderColor = '';
        }
      }
    });
  });
});
