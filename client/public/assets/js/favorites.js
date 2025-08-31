// Sistema de Favoritos - Prosperiuz
class FavoritesManager {
    constructor() {
        this.favorites = this.loadFavorites();
        this.init();
    }
    
    init() {
        this.updateFavoritesDisplay();
        this.bindEvents();
    }
    
    // Carregar favoritos do localStorage
    loadFavorites() {
        const saved = localStorage.getItem('prosperiuz_favorites');
        return saved ? JSON.parse(saved) : [];
    }
    
    // Salvar favoritos no localStorage
    saveFavorites() {
        localStorage.setItem('prosperiuz_favorites', JSON.stringify(this.favorites));
        this.updateFavoritesDisplay();
    }
    
    // Adicionar/remover favorito
    toggleFavorite(product) {
        const existingIndex = this.favorites.findIndex(item => item.id === product.id);
        
        if (existingIndex >= 0) {
            this.favorites.splice(existingIndex, 1);
            this.showMessage(`${product.name} removido dos favoritos!`, 'info');
        } else {
            this.favorites.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image || '',
                category: product.category || '',
                addedAt: new Date().toISOString()
            });
            this.showMessage(`${product.name} adicionado aos favoritos!`, 'success');
        }
        
        this.saveFavorites();
        this.updateFavoriteButtons();
        this.renderFavoriteItems();
    }
    
    // Verificar se produto está nos favoritos
    isFavorite(productId) {
        return this.favorites.some(item => item.id === productId);
    }
    
    // Atualizar display dos favoritos
    updateFavoritesDisplay() {
        // Atualizar contador se existir
        const favoritesCount = document.getElementById('favorites-count');
        if (favoritesCount) {
            favoritesCount.textContent = this.favorites.length;
        }
    }
    
    // Atualizar botões de favorito
    updateFavoriteButtons() {
        const favoriteButtons = document.querySelectorAll('[data-favorite-id]');
        favoriteButtons.forEach(button => {
            const productId = button.getAttribute('data-favorite-id');
            const icon = button.querySelector('i');
            
            if (this.isFavorite(productId)) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                button.style.color = '#ff4444';
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
                button.style.color = '';
            }
        });
    }
    
    // Renderizar itens favoritos
    renderFavoriteItems() {
        const favoritesContainer = document.getElementById('favorites-list');
        if (!favoritesContainer) return;
        
        if (this.favorites.length === 0) {
            favoritesContainer.innerHTML = `
                <div class="empty-favorites">
                    <i class="far fa-heart" style="font-size: 4rem; color: var(--text-light); margin-bottom: 20px;"></i>
                    <h3 style="color: var(--text-light); margin-bottom: 10px;">Nenhum favorito ainda</h3>
                    <p style="color: var(--text-light);">Adicione produtos aos favoritos para vê-los aqui</p>
                </div>
            `;
            return;
        }
        
        favoritesContainer.innerHTML = `
            <div class="favorites-header">
                <h3>Seus Favoritos (${this.favorites.length})</h3>
                <button class="btn-clear-favorites" onclick="favoritesManager.clearFavorites()">
                    <i class="fas fa-trash"></i> Limpar Favoritos
                </button>
            </div>
            
            <div class="favorites-grid">
                ${this.favorites.map(item => `
                    <div class="favorite-item">
                        <div class="favorite-item-image">
                            <i class="fas fa-box"></i>
                        </div>
                        <div class="favorite-item-info">
                            <h4>${item.name}</h4>
                            <p class="favorite-item-category">${item.category}</p>
                            <p class="favorite-item-price">${item.price}</p>
                        </div>
                        <div class="favorite-item-actions">
                            <button class="btn-add-to-cart" onclick="addToCartFromFavorites('${item.id}')">
                                <i class="fas fa-cart-plus"></i> Adicionar ao Carrinho
                            </button>
                            <button class="btn-remove-favorite" onclick="favoritesManager.toggleFavorite({id: '${item.id}', name: '${item.name}', price: '${item.price}', category: '${item.category}'})">
                                <i class="fas fa-heart-broken"></i> Remover
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Limpar todos os favoritos
    clearFavorites() {
        if (confirm('Tem certeza que deseja remover todos os favoritos?')) {
            this.favorites = [];
            this.saveFavorites();
            this.updateFavoriteButtons();
            this.renderFavoriteItems();
            this.showMessage('Favoritos limpos!', 'info');
        }
    }
    
    // Vincular eventos
    bindEvents() {
        // Eventos já são vinculados via onclick nos elementos
    }
    
    // Mostrar mensagem
    showMessage(text, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        
        const colors = {
            success: '#22c55e',
            error: '#ef4444', 
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        notification.style.background = colors[type] || colors.info;
        notification.textContent = text;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 4000);
    }
}

// Inicializar gerenciador de favoritos
let favoritesManager;
document.addEventListener('DOMContentLoaded', () => {
    favoritesManager = new FavoritesManager();
});

// Função global para toggle favorito
function toggleFavorite(productData) {
    if (typeof favoritesManager !== 'undefined') {
        favoritesManager.toggleFavorite(productData);
    }
}

// Função para adicionar ao carrinho a partir dos favoritos
function addToCartFromFavorites(productId) {
    const favorite = favoritesManager.favorites.find(item => item.id === productId);
    if (favorite && typeof cartManager !== 'undefined') {
        cartManager.addToCart(favorite);
    }
}

