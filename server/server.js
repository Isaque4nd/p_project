// server/server.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Importar rotas
const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const projectRoutes = require('./routes/projectRoutes');
const userProjectRoutes = require('./routes/userProjectRoutes');
const chargeRoutes = require('./routes/chargeRoutes');
const configRoutes = require('./routes/configRoutes');

// Novas rotas do e-commerce
const reviewRoutes = require('./routes/reviewRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const cartRoutes = require('./routes/cartRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const bannerRoutes = require('./routes/bannerRoutes');

// Importar controladores
const { initializeDefaultConfigs } = require('./controllers/configController');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../client/public')));

// Conexão com MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Conectado ao MongoDB');
  // Inicializar configurações padrão
  initializeDefaultConfigs();
})
.catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/user-projects', userProjectRoutes);
app.use('/api/charges', chargeRoutes);
app.use('/api/config', configRoutes);
app.use('/api/admin', require('./routes/adminRoutes'));

// Novas rotas do e-commerce
app.use('/api/reviews', reviewRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/combos', require('./routes/comboRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/coupons', require('./routes/couponRoutes'));
app.use('/api/wishlist', require('./routes/wishlistRoutes'));
app.use('/api/favorites', favoriteRoutes);
app.use('/api/banners', bannerRoutes);

// Rota especial para páginas de cobrança
app.get('/cobranca/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/public/cobranca.html'));
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('❌ Erro:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Rota para servir o frontend (SPA) - deve vir por último
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
});