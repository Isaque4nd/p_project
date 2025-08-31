// server/seeds/seedData.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Project = require('../models/Project');

async function seedDatabase() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('📁 Conectado ao MongoDB para seed');

    // Limpar dados existentes (cuidado em produção!)
    await User.deleteMany({});
    await Project.deleteMany({});
    console.log('🧹 Dados anteriores removidos');

    // Criar usuário administrador
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = new User({
      name: 'Administrador',
      email: 'admin@boaventuradev.com',
      password: adminPassword,
      role: 'admin'
    });
    await admin.save();
    console.log('👑 Usuário admin criado: admin@boaventuradev.com / admin123');

    // Criar usuário normal de teste
    const userPassword = await bcrypt.hash('user123', 10);
    const user = new User({
      name: 'Cliente Teste',
      email: 'cliente@teste.com',
      password: userPassword,
      role: 'user'
    });
    await user.save();
    console.log('👤 Usuário teste criado: cliente@teste.com / user123');

    // Criar projetos de exemplo
    const projects = [
      // O banco será inicializado vazio para testes reais
      // Os projetos serão adicionados através do painel administrativo
    ];

    for (const projectData of projects) {
      const project = new Project(projectData);
      await project.save();
    }

    console.log(`🎯 ${projects.length} projetos criados com sucesso`);

    console.log('\n✅ Seed concluído com sucesso!');
    console.log('\n📊 Resumo:');
    console.log('👑 Admin: admin@boaventuradev.com / admin123');
    console.log('👤 Cliente: cliente@teste.com / user123');
    console.log(`📦 ${projects.length} projetos de exemplo`);
    console.log('\n🌐 Acesse: http://localhost:8080');

  } catch (error) {
    console.error('❌ Erro no seed:', error);
  } finally {
    mongoose.disconnect();
    console.log('📤 Desconectado do MongoDB');
    process.exit(0);
  }
}

// Executar seed
seedDatabase();
