# �� INSTRUÇÕES COMPLETAS - Deploy Prosperiuz na VPS Ubuntu 24.04 Hostinger

## 📋 O que você vai precisar antes de começar

✅ **VPS Ubuntu 24.04** na Hostinger  
✅ **Dados de acesso SSH** (IP, usuário, senha)  
✅ **Tokens Sacapay** (público e privado)  
✅ **String MongoDB** (pode usar MongoDB Atlas ou local)  

---

## 🔧 PASSO A PASSO COMPLETO

### ⚡ Passo 1: Conectar na VPS

1. **Abra o terminal** (no Windows use PowerShell ou CMD)
2. **Conecte via SSH:**
```bash
ssh root@SEU-I**Reiniciar a aplicação:**
```bash
pm2 restart prosperiuz
```

**🔧 Configurar Frontend para Mercado Pago:**

Edite o arquivo JavaScript do frontend:
```bash
nano client/public/assets/js/payment.js
```

**Adicione este código para integração com Mercado Pago:**
```javascript
// Configuração do Mercado Pago
const mp = new MercadoPago('SEU_PUBLIC_KEY_AQUI', {
    locale: 'pt-BR'
});

// Função para criar pagamento
async function createPayment(projectId) {
    try {
        const response = await fetch('/api/payments/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                projectId: projectId,
                userId: getCurrentUserId()
            })
        });

        const data = await response.json();
        
        if (data.success) {
            // Redirecionar para pagamento
            window.open(data.paymentUrl, '_blank');
        } else {
            alert('Erro ao criar pagamento: ' + data.error);
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao processar pagamento');
    }
}

// Função para verificar status do pagamento
async function checkPaymentStatus(orderId) {
    try {
        const response = await fetch(`/api/payments/${orderId}/status`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        return data.status;
    } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
        return 'error';
    }
}
```

**No arquivo HTML principal, adicione o SDK do Mercado Pago:**
```bash
nano client/public/index.html
```

**Adicione antes do `</head>`:**
```html
<script src="https://sdk.mercadopago.com/js/v2"></script>
```

**⚠️ IMPORTANTE:** Substitua `SEU_PUBLIC_KEY_AQUI` pela sua Public Key do Mercado Pago no arquivo payment.js

---

### 👤 Passo 12: Criar Usuário Administrador
```
3. **Digite a senha** quando solicitado
4. **Você deve ver algo como:** `root@ubuntu:~#`

---

### 🔄 Passo 2: Atualizar o Sistema

```bash
# Atualizar todos os pacotes
apt update && apt upgrade -y

# Instalar ferramentas essenciais
apt install curl wget git unzip nano htop -y
```

**⏱️ Isso vai demorar uns 2-3 minutos...**

---

### 📦 Passo 3: Instalar Node.js 18

```bash
# Baixar e instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Verificar se instalou corretamente
node --version
npm --version
```

**✅ Deve aparecer algo como:** `v18.x.x` e `9.x.x`

---

### 🗄️ Passo 4: Instalar MongoDB

```bash
# Importar chave do MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -

# Adicionar repositório
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Instalar MongoDB
apt-get update
apt-get install -y mongodb-org

# Iniciar MongoDB
systemctl start mongod
systemctl enable mongod

# Verificar se está rodando
systemctl status mongod
```

**✅ Deve aparecer:** `Active: active (running)`

---

### 🌐 Passo 5: Instalar Nginx

```bash
# Instalar Nginx
apt install nginx -y

# Iniciar e habilitar
systemctl start nginx
systemctl enable nginx

# Verificar status
systemctl status nginx
```

**✅ Deve aparecer:** `Active: active (running)`

---

### 🔒 Passo 6: Configurar Firewall

```bash
# Configurar portas necessárias
ufw allow OpenSSH
ufw allow \"Nginx Full\"
ufw allow 8080
ufw --force enable

# Verificar
ufw status
```

**✅ Deve mostrar as portas liberadas**

---

### 📁 Passo 7: Fazer Upload do Projeto

**Opção A - Via FileZilla/WinSCP (Mais Fácil):**
1. Abra FileZilla ou WinSCP
2. Conecte com: Host=`SEU-IP`, User=`root`, Password=`SUA-SENHA`
3. Arraste o arquivo `prosperiuz_project_entrega_final.zip` para `/home/`

**Opção B - Via comando (se preferir):**
```bash
# Do seu computador Windows, abra outro PowerShell e rode:
scp prosperiuz_project_entrega_final.zip root@SEU-IP:/home/
```

---

### 📦 Passo 8: Extrair e Configurar Projeto

```bash
# Ir para o diretório
cd /home/

# Extrair arquivo
unzip prosperiuz_project_entrega_final.zip
cd prosperiuz_project/prosperiuz_project/

# Instalar dependências (vai demorar uns 2-3 minutos)
npm install --production

# Listar arquivos para confirmar
ls -la
```

**✅ Deve ver:** `client/`, `server/`, `package.json`, etc.

---

### ⚙️ Passo 9: Configurar Variáveis de Ambiente

```bash
# Criar arquivo .env
nano .env
```

**Cole este conteúdo (substitua os valores):**
```env
# MongoDB (deixe assim se instalou local)
MONGODB_URI=mongodb://localhost:27017/prosperiuz

# MERCADO PAGO - SUBSTITUA PELOS SEUS TOKENS REAIS
MERCADOPAGO_ACCESS_TOKEN=SEU_ACCESS_TOKEN_AQUI
MERCADOPAGO_PUBLIC_KEY=SEU_PUBLIC_KEY_AQUI
MERCADOPAGO_WEBHOOK_SECRET=SEU_WEBHOOK_SECRET_AQUI

# JWT - MUDE ESTA CHAVE
JWT_SECRET=suachavesupersegura12345678901234567890

# Servidor
PORT=8080
NODE_ENV=production

# URL - SUBSTITUA PELO SEU IP OU DOMÍNIO
BASE_URL=http://SEU-IP-AQUI:8080
```

**⚠️ IMPORTANTE - Como obter os tokens do Mercado Pago:**

1. **Acesse:** https://www.mercadopago.com.br/developers
2. **Faça login** com sua conta Mercado Pago
3. **Vá em:** "Suas aplicações" → "Criar aplicação"
4. **Preencha:**
   - Nome: "Prosperiuz E-commerce"
   - Categoria: E-commerce
   - Modelo de negócio: Marketplace
5. **Copie as credenciais:**
   - **Access Token** (começa com APP_USR-)
   - **Public Key** (começa com APP_USR-)
6. **Configure webhook:**
   - URL: `http://SEU-IP/api/payments/webhook`
   - Eventos: `payment`

**Para salvar no nano:**
- Pressione `Ctrl + X`
- Digite `Y`
- Pressione `Enter`

---

### 🔧 Passo 10: Configurar Nginx

```bash
# Criar configuração do site
nano /etc/nginx/sites-available/prosperiuz
```

**Cole este conteúdo (substitua SEU-IP-AQUI):**
```nginx
server {
    listen 80;
    server_name SEU-IP-AQUI;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Salvar e configurar:**
```bash
# Habilitar site
ln -s /etc/nginx/sites-available/prosperiuz /etc/nginx/sites-enabled/

# Remover site padrão
rm /etc/nginx/sites-enabled/default

# Testar configuração
nginx -t

# Reiniciar Nginx
systemctl reload nginx
```

**✅ Deve aparecer:** `syntax is ok` e `test is successful`

---

### 🚀 Passo 11: Instalar e Configurar PM2

```bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicação
pm2 start server/server.js --name \"prosperiuz\"

# Configurar para iniciar automaticamente
pm2 startup
pm2 save

# Verificar se está rodando
pm2 status
```

**✅ Deve aparecer:** `prosperiuz` com status `online`

---

### � Passo 11.5: Configurar Mercado Pago no Código

**Agora vamos adaptar o código para usar Mercado Pago:**

```bash
# Instalar SDK do Mercado Pago
npm install mercadopago

# Editar o arquivo de serviço de pagamentos
nano server/services/paymentService.js
```

**Substitua TODO o conteúdo do arquivo por:**
```javascript
const mercadopago = require('mercadopago');

// Configurar Mercado Pago
mercadopago.configure({
    access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
});

class PaymentService {
    constructor() {
        this.client = mercadopago;
    }

    async createPayment(paymentData) {
        try {
            const preference = {
                items: [{
                    title: paymentData.title,
                    description: paymentData.description,
                    unit_price: parseFloat(paymentData.amount),
                    quantity: 1,
                    currency_id: 'BRL'
                }],
                payer: {
                    email: paymentData.payer.email,
                    name: paymentData.payer.name
                },
                external_reference: paymentData.orderId,
                notification_url: `${process.env.BASE_URL}/api/payments/webhook`,
                back_urls: {
                    success: `${process.env.BASE_URL}/dashboard.html?payment=success`,
                    failure: `${process.env.BASE_URL}/dashboard.html?payment=failure`,
                    pending: `${process.env.BASE_URL}/dashboard.html?payment=pending`
                },
                auto_return: 'approved'
            };

            const response = await this.client.preferences.create(preference);
            
            return {
                success: true,
                paymentId: response.body.id,
                paymentUrl: response.body.init_point,
                data: response.body
            };
        } catch (error) {
            console.error('Erro ao criar pagamento:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getPaymentStatus(paymentId) {
        try {
            const payment = await this.client.payment.findById(paymentId);
            return {
                success: true,
                status: payment.body.status,
                data: payment.body
            };
        } catch (error) {
            console.error('Erro ao consultar pagamento:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    validateWebhook(body, signature) {
        // Para produção, implemente validação de assinatura
        return true;
    }
}

module.exports = new PaymentService();
```

**Agora editar o controller de pagamentos:**
```bash
nano server/controllers/paymentController.js
```

**Adicione este método no controller (substitua o método createPayment existente):**
```javascript
// Adicione no início do arquivo
const mercadopago = require('mercadopago');

// Método para criar pagamento com Mercado Pago
exports.createPayment = async (req, res) => {
    try {
        const { projectId, userId } = req.body;
        
        // Buscar projeto
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Projeto não encontrado' });
        }

        // Buscar usuário
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Criar pedido no banco
        const order = new Order({
            user: userId,
            project: projectId,
            amount: project.price,
            status: 'pending'
        });
        await order.save();

        // Criar preferência no Mercado Pago
        const paymentData = {
            title: project.name,
            description: project.description,
            amount: project.price,
            orderId: order._id,
            payer: {
                email: user.email,
                name: user.name
            }
        };

        const paymentResult = await paymentService.createPayment(paymentData);

        if (paymentResult.success) {
            // Salvar ID do pagamento
            order.paymentId = paymentResult.paymentId;
            await order.save();

            res.json({
                success: true,
                paymentUrl: paymentResult.paymentUrl,
                orderId: order._id
            });
        } else {
            res.status(400).json({ error: paymentResult.error });
        }
    } catch (error) {
        console.error('Erro ao criar pagamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Webhook do Mercado Pago
exports.webhookMercadoPago = async (req, res) => {
    try {
        console.log('Webhook recebido:', req.body);
        
        const { type, data } = req.body;
        
        if (type === 'payment') {
            const paymentId = data.id;
            
            // Buscar informações do pagamento
            const paymentInfo = await mercadopago.payment.findById(paymentId);
            
            if (paymentInfo.body.status === 'approved') {
                // Buscar pedido pelo external_reference
                const order = await Order.findById(paymentInfo.body.external_reference);
                
                if (order) {
                    // Atualizar status do pedido
                    order.status = 'completed';
                    order.paymentData = paymentInfo.body;
                    await order.save();
                    
                    // Adicionar projeto ao usuário
                    const user = await User.findById(order.user);
                    if (!user.purchasedProjects.includes(order.project)) {
                        user.purchasedProjects.push(order.project);
                        await user.save();
                    }
                    
                    console.log('Pagamento confirmado para pedido:', order._id);
                }
            }
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(500).send('Erro');
    }
};
```

**Atualizar as rotas:**
```bash
nano server/routes/paymentRoutes.js
```

**Adicione a rota do webhook:**
```javascript
// Adicione esta linha no arquivo
router.post('/webhook', paymentController.webhookMercadoPago);
```

**Reiniciar a aplicação:**
```bash
pm2 restart prosperiuz
```

---

### �👤 Passo 12: Criar Usuário Administrador

```bash
# Conectar no MongoDB
mongosh

# Usar o banco de dados
use prosperiuz

# Sair do MongoDB por enquanto
exit
```

**Agora vá no navegador:**
1. Acesse `http://SEU-IP`
2. Clique em \"Registrar\"
3. Crie sua conta normalmente
4. Volte para o SSH e execute:

```bash
# Conectar no MongoDB novamente
mongosh

# Usar banco
use prosperiuz

# Fazer seu usuário admin (substitua o email)
db.users.updateOne(
  { email: \"seu-email@gmail.com\" }, 
  { $set: { role: \"admin\" } }
)

# Sair
exit
```

---

### 💳 Passo 13: Configurar Webhook no Mercado Pago

**Agora configure o webhook no painel do Mercado Pago:**

1. **Acesse:** https://www.mercadopago.com.br/developers/panel
2. **Vá na sua aplicação** criada anteriormente
3. **Clique em "Webhooks"**
4. **Adicione novo webhook:**
   - **URL:** `http://SEU-IP/api/payments/webhook`
   - **Eventos:** Marque apenas `payment`
   - **Versão:** v1

**⚠️ IMPORTANTE:**
- Substitua `SEU-IP` pelo IP da sua VPS
- Certifique-se que a porta 80 está liberada
- O webhook é essencial para confirmar pagamentos automaticamente

**Testar webhook (opcional):**
```bash
# Ver logs em tempo real
pm2 logs prosperiuz --lines 100

# Em outro terminal, teste o webhook
curl -X POST http://SEU-IP/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"payment","data":{"id":"123456789"}}'
```

---

## ✅ TESTE FINAL

1. **Abra seu navegador**
2. **Acesse:** `http://SEU-IP`
3. **Teste:**
   - ✅ Página carrega
   - ✅ Login funciona
   - ✅ Dashboard aparece
   - ✅ Pode acessar admin (se configurou)

---

## 🔍 COMANDOS ÚTEIS PARA MONITORAR

```bash
# Ver logs da aplicação
pm2 logs prosperiuz

# Reiniciar aplicação
pm2 restart prosperiuz

# Ver status dos serviços
systemctl status mongod
systemctl status nginx

# Ver processos rodando
htop

# Ver se as portas estão abertas
netstat -tlnp | grep :8080
netstat -tlnp | grep :80
```

---

## ⚠️ SE ALGO DER ERRADO

### Aplicação não inicia:
```bash
pm2 logs prosperiuz
# Veja o erro e ajuste o .env
```

### MongoDB não conecta:
```bash
systemctl restart mongod
systemctl status mongod
```

### Nginx não funciona:
```bash
nginx -t
systemctl restart nginx
```

### Site não abre:
- Verifique se o IP está correto
- Verifique se o firewall liberou as portas
- Veja os logs: `pm2 logs prosperiuz`

---

## 🎉 PARABÉNS!

Se chegou até aqui, seu projeto está rodando em produção! 

**Para acessar:**
- **Site:** `http://SEU-IP`
- **Admin:** Faça login com a conta que criou

**Lembre-se de:**
- ✅ Guardar os dados de acesso
- ✅ Fazer backup regular do banco
- ✅ Monitorar os logs regularmente

---

## 📞 Precisa de Ajuda?

Se encontrar algum problema:
1. Primeiro veja os logs: `pm2 logs prosperiuz`
2. Verifique se todos os serviços estão rodando
3. Consulte a seção de troubleshooting acima

**Projeto desenvolvido por Igor Reis**
