// server/scripts/createAdmin.js
require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Conectado ao MongoDB');

    // Verificar se já existe um admin
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('❌ Já existe um usuário admin:', existingAdmin.email);
      process.exit(0);
    }

    // Criar usuário admin
    const adminData = {
      name: 'Administrador',
      email: 'admin@prosperiuz.com',
      password: 'admin123',
      role: 'admin'
    };

    const admin = new User(adminData);
    await admin.save();

    console.log('✅ Usuário admin criado com sucesso!');
    console.log('📧 Email:', adminData.email);
    console.log('🔑 Senha:', adminData.password);
    console.log('⚠️  Altere a senha após o primeiro login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error);
    process.exit(1);
  }
}

createAdminUser();
