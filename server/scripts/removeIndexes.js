// server/scripts/removeIndexes.js
require('dotenv').config();
const mongoose = require('mongoose');

async function removeIndexes() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('🔗 Conectado ao MongoDB');

    // Acessar a collection users diretamente
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Listar índices existentes
    const indexes = await usersCollection.indexes();
    console.log('📋 Índices existentes:', indexes.map(i => i.name));
    
    // Remover índice do CPF se existir
    try {
      await usersCollection.dropIndex('cpf_1');
      console.log('✅ Índice CPF removido com sucesso');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️ Índice CPF não existe');
      } else {
        console.error('❌ Erro ao remover índice CPF:', error.message);
      }
    }
    
    // Limpar todos os documentos para resetar
    await usersCollection.deleteMany({});
    await db.collection('projects').deleteMany({});
    console.log('🗑️ Collections limpas');
    
    console.log('✅ Limpeza concluída!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

removeIndexes();
