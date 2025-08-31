const mongoose = require('mongoose');
require('dotenv').config({ path: '../../.env' });

const Project = require('../models/Project');
const Category = require('../models/Category');

async function fixProjectCategories() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Conectado ao MongoDB');

    // Buscar categoria padrão
    const defaultCategory = await Category.findOne({ name: 'Desenvolvimento Web' });
    if (!defaultCategory) {
      console.log('❌ Categoria padrão não encontrada');
      return;
    }

    // Buscar projetos com categoria como string
    const projects = await Project.find({
      category: { $type: "string" }
    });

    console.log(`🔧 Encontrados ${projects.length} projetos para corrigir`);

    for (const project of projects) {
      try {
        // Tentar encontrar categoria correspondente
        let targetCategory = defaultCategory;

        // Mapear categorias conhecidas
        const categoryMap = {
          'ERP': 'Sistemas de Gestão',
          'Desenvolvimento Web': 'Desenvolvimento Web',
          'Design': 'Design Gráfico',
          'Mobile': 'Aplicativos Mobile',
          'Marketing': 'Marketing Digital',
          'E-commerce': 'E-commerce'
        };

        const categoryName = categoryMap[project.category] || 'Desenvolvimento Web';
        const foundCategory = await Category.findOne({ name: categoryName });
        
        if (foundCategory) {
          targetCategory = foundCategory;
        }

        // Atualizar projeto
        project.category = targetCategory._id;
        
        // Adicionar campos faltantes se necessário
        if (!project.tags || project.tags.length === 0) {
          project.tags = ['desenvolvimento', 'web', 'profissional'];
        }
        
        if (!project.images || project.images.length === 0) {
          project.images = [{
            url: '/assets/images/prosperiuz_logo.png',
            alt: project.title,
            isPrimary: true,
            order: 0
          }];
        }
        
        if (project.originalPrice === undefined) {
          project.originalPrice = Math.round(project.price * 1.3);
          project.discountPercentage = 23;
        }
        
        if (!project.specifications) {
          project.specifications = {
            fileSize: '2-5 MB',
            format: 'HTML/CSS/JS',
            compatibility: ['Todos os navegadores'],
            requirements: ['Hospedagem web'],
            includes: ['Código fonte', 'Documentação', 'Suporte 30 dias']
          };
        }
        
        if (!project.seoData) {
          project.seoData = {
            metaTitle: project.title,
            metaDescription: project.description.substring(0, 160),
            keywords: project.tags || ['desenvolvimento', 'web']
          };
        }

        await project.save();
        console.log(`✅ Projeto corrigido: ${project.title} -> ${targetCategory.name}`);

      } catch (error) {
        console.error(`❌ Erro ao corrigir projeto ${project.title}:`, error.message);
      }
    }

    console.log('✅ Correção de projetos concluída!');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Desconectado do MongoDB');
    process.exit(0);
  }
}

fixProjectCategories();
