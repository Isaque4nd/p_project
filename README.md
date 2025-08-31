# Prosperiuz - Plataforma E-commerce

Sistema completo de e-commerce com integração de pagamentos e painel administrativo.

## 🚀 Recursos Principais

- **Autenticação completa** (login, registro, perfil)
- **Carrinho de compras** funcional
- **Sistema de favoritos**
- **Painel administrativo**
- **Integração Sacapay** para pagamentos
- **Interface responsiva** moderna
- **Dashboard do usuário** completo

## 📋 Pré-requisitos

- Node.js (versão 16 ou superior)
- MongoDB (local ou MongoDB Atlas)
- Conta Sacapay (para pagamentos)

## ⚙️ Instalação

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Configurar variáveis de ambiente:**
   - Edite o arquivo `.env` com suas configurações
   - Configure MongoDB URI
   - Configure tokens Sacapay
   - Configure JWT_SECRET

3. **Iniciar o servidor:**
   ```bash
   npm start
   ```

4. **Acessar a aplicação:**
   - Frontend: http://localhost:8080
   - API: http://localhost:8080/api

## 🌐 Estrutura

```
prosperiuz_project/
├── client/public/          # Frontend
├── server/                 # Backend API
│   ├── controllers/        # Controladores
├── package.json           # Dependências
└── .env                   # Configurações
```

## 📱 Funcionalidades

### Frontend
- **Login/Registro** com validação
- **Dashboard** do usuário
- **Carrinho** e favoritos
- **Perfil** editável
- **Interface** moderna e responsiva

### Backend
- **API REST** completa
- **Autenticação JWT**
- **Integração MongoDB**
- **Integração Sacapay**
- **Middleware** de segurança

## 🔧 Configuração

### MongoDB
Configure a string de conexão no arquivo `.env`:

```env
MONGODB_URI=sua_string_de_conexao
```

### Sacapay
Configure os tokens no arquivo `.env`:

```env
SACAPAY_PUBLIC_TOKEN=seu_token_publico
SACAPAY_PRIVATE_TOKEN=seu_token_privado
```

## 🚀 Deploy

Para deploy em produção:
1. Configure as variáveis de ambiente no servidor
2. Execute `npm install --production`
3. Configure proxy reverso (nginx/apache)
4. Configure SSL
5. Execute `npm start`

## � Suporte

Para suporte técnico, entre em contato através do WhatsApp configurado na aplicação.

---

**Prosperiuz** - Desenvolvido por Igor Reis
- Validar credenciais do Sacapay
- Testar conexão com MongoDB
