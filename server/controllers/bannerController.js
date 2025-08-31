const Banner = require('../models/Banner');

// Criar novo banner
exports.createBanner = async (req, res) => {
  try {
    const bannerData = req.body;

    const banner = new Banner(bannerData);
    await banner.save();

    if (banner.targetProject) {
      await banner.populate('targetProject', 'name slug price');
    }
    if (banner.targetCategory) {
      await banner.populate('targetCategory', 'name slug');
    }

    res.status(201).json({
      success: true,
      message: 'Banner criado com sucesso',
      data: banner
    });

  } catch (error) {
    console.error('Erro ao criar banner:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Listar todos os banners (admin)
exports.getAllBanners = async (req, res) => {
  try {
    const {
      position,
      isActive,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = -1
    } = req.query;

    let query = {};

    if (position) query.position = position;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (page - 1) * limit;

    const banners = await Banner.find(query)
      .populate('targetProject', 'name slug price')
      .populate('targetCategory', 'name slug')
      .sort({ [sortBy]: parseInt(sortOrder) })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Banner.countDocuments(query);

    res.json({
      success: true,
      data: {
        banners,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Erro ao buscar banners:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter banners por posição (público)
exports.getBannersByPosition = async (req, res) => {
  try {
    const { position } = req.params;
    const { page = 'all', deviceType = 'desktop' } = req.query;

    const banners = await Banner.getActiveBannersByPosition(position, page);

    // Filtrar por tipo de dispositivo
    const filteredBanners = banners.filter(banner => {
      return banner.deviceTargeting[deviceType] === true;
    });

    res.json({
      success: true,
      data: filteredBanners
    });

  } catch (error) {
    console.error('Erro ao buscar banners por posição:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter banners para página específica (público)
exports.getBannersForPage = async (req, res) => {
  try {
    const { page } = req.params;
    const { deviceType = 'desktop' } = req.query;

    const banners = await Banner.getBannersForPage(page, deviceType);

    res.json({
      success: true,
      data: banners
    });

  } catch (error) {
    console.error('Erro ao buscar banners da página:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter banner por ID
exports.getBannerById = async (req, res) => {
  try {
    const { bannerId } = req.params;

    const banner = await Banner.findById(bannerId)
      .populate('targetProject', 'name slug price')
      .populate('targetCategory', 'name slug');

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner não encontrado'
      });
    }

    res.json({
      success: true,
      data: banner
    });

  } catch (error) {
    console.error('Erro ao buscar banner:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Atualizar banner
exports.updateBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;
    const updateData = req.body;

    const banner = await Banner.findById(bannerId);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner não encontrado'
      });
    }

    // Atualizar campos
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        banner[key] = updateData[key];
      }
    });

    await banner.save();

    await banner.populate([
      { path: 'targetProject', select: 'name slug price' },
      { path: 'targetCategory', select: 'name slug' }
    ]);

    res.json({
      success: true,
      message: 'Banner atualizado com sucesso',
      data: banner
    });

  } catch (error) {
    console.error('Erro ao atualizar banner:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Deletar banner
exports.deleteBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;

    const banner = await Banner.findById(bannerId);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner não encontrado'
      });
    }

    await Banner.findByIdAndDelete(bannerId);

    res.json({
      success: true,
      message: 'Banner excluído com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar banner:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Registrar impressão de banner
exports.recordImpression = async (req, res) => {
  try {
    const { bannerId } = req.params;

    const banner = await Banner.findById(bannerId);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner não encontrado'
      });
    }

    await banner.recordImpression();

    res.json({
      success: true,
      message: 'Impressão registrada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao registrar impressão:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Registrar clique de banner
exports.recordClick = async (req, res) => {
  try {
    const { bannerId } = req.params;

    const banner = await Banner.findById(bannerId);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner não encontrado'
      });
    }

    await banner.recordClick();

    // Retornar URL de destino se existir
    let redirectUrl = banner.linkUrl;
    
    if (banner.targetProject) {
      await banner.populate('targetProject', 'slug');
      redirectUrl = `/project/${banner.targetProject.slug}`;
    } else if (banner.targetCategory) {
      await banner.populate('targetCategory', 'slug');
      redirectUrl = `/category/${banner.targetCategory.slug}`;
    }

    res.json({
      success: true,
      message: 'Clique registrado com sucesso',
      data: {
        redirectUrl,
        clickCount: banner.clickCount
      }
    });

  } catch (error) {
    console.error('Erro ao registrar clique:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter estatísticas de banners
exports.getBannerStats = async (req, res) => {
  try {
    const stats = await Banner.aggregate([
      {
        $facet: {
          totalBanners: [
            { $count: "count" }
          ],
          activeBanners: [
            { $match: { isActive: true } },
            { $count: "count" }
          ],
          bannersByPosition: [
            {
              $group: {
                _id: '$position',
                count: { $sum: 1 },
                activeCount: {
                  $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
                }
              }
            },
            { $sort: { count: -1 } }
          ],
          topPerformingBanners: [
            {
              $match: {
                isActive: true,
                impressionCount: { $gt: 0 }
              }
            },
            {
              $project: {
                title: 1,
                position: 1,
                clickCount: 1,
                impressionCount: 1,
                ctr: {
                  $multiply: [
                    { $divide: ['$clickCount', '$impressionCount'] },
                    100
                  ]
                }
              }
            },
            { $sort: { ctr: -1 } },
            { $limit: 10 }
          ],
          totalImpressions: [
            {
              $group: {
                _id: null,
                total: { $sum: '$impressionCount' }
              }
            }
          ],
          totalClicks: [
            {
              $group: {
                _id: null,
                total: { $sum: '$clickCount' }
              }
            }
          ]
        }
      }
    ]);

    const result = {
      total: stats[0].totalBanners[0]?.count || 0,
      active: stats[0].activeBanners[0]?.count || 0,
      byPosition: stats[0].bannersByPosition,
      topPerforming: stats[0].topPerformingBanners,
      totalImpressions: stats[0].totalImpressions[0]?.total || 0,
      totalClicks: stats[0].totalClicks[0]?.total || 0,
      overallCTR: stats[0].totalImpressions[0]?.total > 0 
        ? ((stats[0].totalClicks[0]?.total || 0) / stats[0].totalImpressions[0].total * 100).toFixed(2)
        : 0
    };

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};
