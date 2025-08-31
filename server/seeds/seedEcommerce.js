const mongoose = require('mongoose');
require('dotenv').config({ path: '../../.env' });

// Importar modelos
const Category = require('../models/Category');
const Project = require('../models/Project');
const Banner = require('../models/Banner');
const Review = require('../models/Review');
const User = require('../models/User');

// Conectar ao MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Conectado ao MongoDB');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  }
}

// Seed de categorias
async function seedCategories() {
  console.log('🌱 Criando categorias...');
  
  const categories = [
    {
      name: 'Desenvolvimento Web',
      slug: 'desenvolvimento-web',
      description: 'Sites, aplicações web e sistemas online',
      icon: 'fas fa-code',
      color: '#007bff',
      isMainCategory: true,
      showInMenu: true,
      sortOrder: 1,
      metadata: {
        keywords: ['web', 'site', 'desenvolvimento', 'html', 'css', 'javascript'],
        metaTitle: 'Projetos de Desenvolvimento Web',
        metaDescription: 'Encontre os melhores projetos de desenvolvimento web'
      }
    },
    {
      name: 'Aplicativos Mobile',
      slug: 'aplicativos-mobile',
      description: 'Apps para Android e iOS',
      icon: 'fas fa-mobile-alt',
      color: '#28a745',
      isMainCategory: true,
      showInMenu: true,
      sortOrder: 2,
      metadata: {
        keywords: ['mobile', 'app', 'android', 'ios', 'aplicativo'],
        metaTitle: 'Aplicativos Mobile',
        metaDescription: 'Projetos de aplicativos móveis para Android e iOS'
      }
    },
    {
      name: 'Design Gráfico',
      slug: 'design-grafico',
      description: 'Logos, banners e materiais visuais',
      icon: 'fas fa-paint-brush',
      color: '#dc3545',
      isMainCategory: true,
      showInMenu: true,
      sortOrder: 3,
      metadata: {
        keywords: ['design', 'logo', 'banner', 'gráfico', 'visual'],
        metaTitle: 'Projetos de Design Gráfico',
        metaDescription: 'Materiais de design gráfico profissionais'
      }
    },
    {
      name: 'Marketing Digital',
      slug: 'marketing-digital',
      description: 'Estratégias e ferramentas de marketing',
      icon: 'fas fa-chart-line',
      color: '#ffc107',
      isMainCategory: true,
      showInMenu: true,
      sortOrder: 4,
      metadata: {
        keywords: ['marketing', 'digital', 'estratégia', 'vendas'],
        metaTitle: 'Marketing Digital',
        metaDescription: 'Projetos e estratégias de marketing digital'
      }
    },
    {
      name: 'E-commerce',
      slug: 'e-commerce',
      description: 'Lojas virtuais e soluções de vendas online',
      icon: 'fas fa-shopping-cart',
      color: '#6f42c1',
      isMainCategory: true,
      showInMenu: true,
      sortOrder: 5,
      metadata: {
        keywords: ['ecommerce', 'loja', 'virtual', 'vendas', 'online'],
        metaTitle: 'Projetos E-commerce',
        metaDescription: 'Soluções completas para lojas virtuais'
      }
    }
  ];

  for (const categoryData of categories) {
    try {
      const existingCategory = await Category.findOne({ name: categoryData.name });
      if (!existingCategory) {
        const category = new Category(categoryData);
        await category.save();
        console.log(`✅ Categoria criada: ${category.name}`);
      } else {
        console.log(`⏭️  Categoria já existe: ${categoryData.name}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao criar categoria ${categoryData.name}:`, error.message);
    }
  }
}

// Seed de subcategorias
async function seedSubcategories() {
  console.log('🌱 Criando subcategorias...');
  
  const webCategory = await Category.findOne({ name: 'Desenvolvimento Web' });
  const mobileCategory = await Category.findOne({ name: 'Aplicativos Mobile' });
  const designCategory = await Category.findOne({ name: 'Design Gráfico' });
  
  if (!webCategory || !mobileCategory || !designCategory) {
    console.log('❌ Categorias principais não encontradas');
    return;
  }

  const subcategories = [
    // Subcategorias de Desenvolvimento Web
    {
      name: 'Landing Pages',
      slug: 'landing-pages',
      description: 'Páginas de conversão e captura',
      parentCategory: webCategory._id,
      color: '#17a2b8',
      showInMenu: true,
      sortOrder: 1
    },
    {
      name: 'Sistemas de Gestão',
      slug: 'sistemas-de-gestao',
      description: 'CRM, ERP e sistemas administrativos',
      parentCategory: webCategory._id,
      color: '#17a2b8',
      showInMenu: true,
      sortOrder: 2
    },
    // Subcategorias de Mobile
    {
      name: 'Apps Android',
      slug: 'apps-android',
      description: 'Aplicativos nativos para Android',
      parentCategory: mobileCategory._id,
      color: '#20c997',
      showInMenu: true,
      sortOrder: 1
    },
    {
      name: 'Apps iOS',
      slug: 'apps-ios',
      description: 'Aplicativos nativos para iOS',
      parentCategory: mobileCategory._id,
      color: '#20c997',
      showInMenu: true,
      sortOrder: 2
    },
    // Subcategorias de Design
    {
      name: 'Identidade Visual',
      slug: 'identidade-visual',
      description: 'Logos, cartões e papelaria',
      parentCategory: designCategory._id,
      color: '#e83e8c',
      showInMenu: true,
      sortOrder: 1
    },
    {
      name: 'Material Publicitário',
      slug: 'material-publicitario',
      description: 'Banners, flyers e peças promocionais',
      parentCategory: designCategory._id,
      color: '#e83e8c',
      showInMenu: true,
      sortOrder: 2
    }
  ];

  for (const subcategoryData of subcategories) {
    try {
      const existingSubcategory = await Category.findOne({ 
        name: subcategoryData.name,
        parentCategory: subcategoryData.parentCategory
      });
      
      if (!existingSubcategory) {
        const subcategory = new Category(subcategoryData);
        await subcategory.save();
        console.log(`✅ Subcategoria criada: ${subcategory.name}`);
      } else {
        console.log(`⏭️  Subcategoria já existe: ${subcategoryData.name}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao criar subcategoria ${subcategoryData.name}:`, error.message);
    }
  }
}

// Seed de banners
async function seedBanners() {
  console.log('🌱 Criando banners...');
  
  const webCategory = await Category.findOne({ name: 'Desenvolvimento Web' });
  
  const banners = [
    {
      title: 'Mega Promoção de Desenvolvimento Web',
      subtitle: 'Até 30% de desconto em todos os projetos',
      description: 'Aproveite nossa promoção especial e turbine seu negócio com projetos web profissionais',
      imageUrl: '/assets/images/banner-web-promo.jpg',
      linkText: 'Ver Ofertas',
      targetCategory: webCategory?._id,
      position: 'hero',
      isActive: true,
      sortOrder: 1,
      showOnPages: ['home', 'products'],
      backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      textColor: '#ffffff',
      buttonColor: '#ff6b6b',
      buttonTextColor: '#ffffff',
      animation: 'fade',
      deviceTargeting: {
        desktop: true,
        mobile: true,
        tablet: true
      }
    },
    {
      title: 'Novo! Sistema de E-commerce',
      subtitle: 'Solução completa para sua loja virtual',
      description: 'Tudo que você precisa para vender online de forma profissional',
      imageUrl: '/assets/images/banner-ecommerce.jpg',
      linkText: 'Conhecer',
      position: 'secondary',
      isActive: true,
      sortOrder: 2,
      showOnPages: ['home'],
      backgroundColor: '#28a745',
      textColor: '#ffffff',
      buttonColor: '#ffffff',
      buttonTextColor: '#28a745',
      animation: 'slide',
      deviceTargeting: {
        desktop: true,
        mobile: true,
        tablet: true
      }
    },
    {
      title: 'Consultoria Gratuita',
      subtitle: 'Fale com nossos especialistas',
      description: 'Tire suas dúvidas e descubra qual projeto é ideal para seu negócio',
      imageUrl: '/assets/images/banner-consultoria.jpg',
      linkUrl: '/contato',
      linkText: 'Agendar',
      position: 'sidebar',
      isActive: true,
      sortOrder: 1,
      showOnPages: ['all'],
      backgroundColor: '#ffc107',
      textColor: '#212529',
      buttonColor: '#212529',
      buttonTextColor: '#ffffff',
      deviceTargeting: {
        desktop: true,
        mobile: false,
        tablet: true
      }
    }
  ];

  for (const bannerData of banners) {
    try {
      const existingBanner = await Banner.findOne({ title: bannerData.title });
      if (!existingBanner) {
        const banner = new Banner(bannerData);
        await banner.save();
        console.log(`✅ Banner criado: ${banner.title}`);
      } else {
        console.log(`⏭️  Banner já existe: ${bannerData.title}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao criar banner ${bannerData.title}:`, error.message);
    }
  }
}

// Atualizar projetos existentes com novas funcionalidades
async function updateExistingProjects() {
  console.log('🔄 Atualizando projetos existentes...');
  
  try {
    const webCategory = await Category.findOne({ name: 'Desenvolvimento Web' });
    const projects = await Project.find({});
    
    for (const project of projects) {
      let updated = false;
      
      // Atualizar categoria se for string
      if (typeof project.category === 'string' && webCategory) {
        project.category = webCategory._id;
        updated = true;
      }
      
      // Adicionar campos faltantes
      if (!project.tags) {
        project.tags = ['desenvolvimento', 'web', 'profissional'];
        updated = true;
      }
      
      if (!project.images || project.images.length === 0) {
        project.images = [{
          url: '/assets/images/prosperiuz_logo.png',
          alt: project.title,
          isPrimary: true,
          order: 0
        }];
        updated = true;
      }
      
      if (project.originalPrice === undefined) {
        project.originalPrice = project.price * 1.3; // 30% a mais como preço original
        project.discountPercentage = 23; // 23% de desconto
        updated = true;
      }
      
      if (project.specifications === undefined) {
        project.specifications = {
          fileSize: '2-5 MB',
          format: 'HTML/CSS/JS',
          compatibility: ['Todos os navegadores'],
          requirements: ['Hospedagem web'],
          includes: ['Código fonte', 'Documentação', 'Suporte 30 dias']
        };
        updated = true;
      }
      
      if (project.seoData === undefined) {
        project.seoData = {
          metaTitle: project.title,
          metaDescription: project.description.substring(0, 160),
          keywords: project.tags || ['desenvolvimento', 'web']
        };
        updated = true;
      }
      
      if (updated) {
        await project.save();
        console.log(`✅ Projeto atualizado: ${project.title}`);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar projetos:', error.message);
  }
}

// Função principal
async function seedEcommerceData() {
  try {
    await connectDB();
    
    console.log('🚀 Iniciando seed do e-commerce...\n');
    
    await seedCategories();
    console.log('');
    
    await seedSubcategories();
    console.log('');
    
    await seedBanners();
    console.log('');
    
    await updateExistingProjects();
    console.log('');
    
    console.log('✅ Seed do e-commerce concluído com sucesso!');
    console.log('\n📊 Dados criados:');
    console.log(`- ${await Category.countDocuments()} categorias`);
    console.log(`- ${await Banner.countDocuments()} banners`);
    console.log(`- ${await Project.countDocuments()} projetos`);
    
  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Desconectado do MongoDB');
    process.exit(0);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  seedEcommerceData();
}

module.exports = { seedEcommerceData };
