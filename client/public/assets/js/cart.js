// Sistema de Carrinho - Prosperiuz
class CartManager {
    constructor() {
        this.cart = this.loadCart();
        this.init();
    }
    
    init() {
        this.updateCartDisplay();
        this.bindEvents();
    }
    
    // Carregar carrinho do localStorage
    loadCart() {
        const saved = localStorage.getItem('prosperiuz_cart');
        return saved ? JSON.parse(saved) : [];
    }
    
    // Salvar carrinho no localStorage
    saveCart() {
        localStorage.setItem('prosperiuz_cart', JSON.stringify(this.cart));
        this.updateCartDisplay();
    }
    
    // Adicionar produto ao carrinho
    addToCart(product) {
        const existingItem = this.cart.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image || '',
                category: product.category || '',
                quantity: 1
            });
        }
        
        this.saveCart();
        this.showMessage(`${product.name} adicionado ao carrinho!`, 'success');
    }
    
    // Remover produto do carrinho
    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.saveCart();
        this.renderCartItems();
    }
    
    // Atualizar quantidade
    updateQuantity(productId, quantity) {
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            if (quantity <= 0) {
                this.removeFromCart(productId);
            } else {
                item.quantity = quantity;
                this.saveCart();
                this.renderCartItems();
            }
        }
    }
    
    // Limpar carrinho
    clearCart() {
        this.cart = [];
        this.saveCart();
        this.renderCartItems();
    }
    
    // Atualizar display do carrinho
    updateCartDisplay() {
        const cartCount = document.getElementById('cart-count');
        if (cartCount) {
            const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
            cartCount.textContent = totalItems;
            
            // Mostrar/esconder badge
            const cartBadge = document.querySelector('.cart-badge');
            if (cartBadge) {
                if (totalItems > 0) {
                    cartBadge.style.display = 'flex';
                    cartBadge.textContent = totalItems;
                } else {
                    cartBadge.style.display = 'none';
                }
            }
        }
    }
    
    // Renderizar itens do carrinho
    renderCartItems() {
        const cartContainer = document.getElementById('cart-items');
        if (!cartContainer) {
            console.warn('[Cart] Container #cart-items não encontrado');
            return;
        }
        
        if (this.cart.length === 0) {
            cartContainer.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart" style="font-size: 4rem; color: var(--text-light); margin-bottom: 20px;"></i>
                    <h3 style="color: var(--text-light); margin-bottom: 10px;">Carrinho vazio</h3>
                    <p style="color: var(--text-light);">Adicione produtos para começar suas compras</p>
                </div>
            `;
            return;
        }
        
        let total = 0;
        try {
            total = this.cart.reduce((sum, item) => {
                const price = typeof item.price === 'string' 
                    ? parseFloat(item.price.replace('R$ ', '').replace(',', '.')) 
                    : parseFloat(item.price) || 0;
                return sum + (price * item.quantity);
            }, 0);
        } catch (e) {
            console.error('[Cart] Erro ao calcular total:', e);
            total = 0;
        }
        
        cartContainer.innerHTML = `
            <div class="cart-header">
                <h3>Seus Produtos</h3>
                <button class="btn-clear-cart" onclick="cartManager.clearCart()">
                    <i class="fas fa-trash"></i> Limpar Carrinho
                </button>
            </div>
            
            <div class="cart-items-list">
                ${this.cart.map(item => `
                    <div class="cart-item">
                        <div class="cart-item-image">
                            <i class="fas fa-box"></i>
                        </div>
                        <div class="cart-item-info">
                            <h4>${item.name}</h4>
                            <p class="cart-item-category">${item.category}</p>
                            <p class="cart-item-price">${item.price}</p>
                        </div>
                        <div class="cart-item-controls">
                            <div class="quantity-controls">
                                <button onclick="cartManager.updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
                                <span>${item.quantity}</span>
                                <button onclick="cartManager.updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                            </div>
                            <button class="btn-remove" onclick="cartManager.removeFromCart('${item.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="cart-footer">
                <div class="cart-total">
                    <h3>Total: R$ ${total.toFixed(2).replace('.', ',')}</h3>
                </div>
                <button class="btn-checkout" onclick="cartManager.checkout()">
                    <i class="fas fa-credit-card"></i> Finalizar Compra
                </button>
            </div>
        `;
    }
    
    // Finalizar compra
    checkout() {
        if (this.cart.length === 0) {
            this.showMessage('Carrinho vazio!', 'error');
            return;
        }
        
        // Aqui seria integrado com o sistema de pagamento
        const checkoutUrl = 'https://checkout.prosperiuz.com'; // URL do cliente
        window.open(checkoutUrl, '_blank');
        
        this.showMessage('Redirecionando para o checkout...', 'info');
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

// Inicializar gerenciador de carrinho
let cartManager;

// Função para aguardar DOM
function initializeCart() {
    try {
        if (!cartManager) {
            cartManager = new CartManager();
            console.log('[Cart] Gerenciador de carrinho inicializado');
        }
    } catch (error) {
        console.error('[Cart] Erro ao inicializar carrinho:', error);
    }
}

document.addEventListener('DOMContentLoaded', initializeCart);

// Para casos onde o script é carregado após DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCart);
} else {
    initializeCart();
}

// Função global para adicionar ao carrinho
function addToCart(productData) {
    if (typeof cartManager !== 'undefined' && cartManager) {
        cartManager.addToCart(productData);
    } else {
        console.warn('[Cart] Gerenciador de carrinho não inicializado');
        // Tentar inicializar e adicionar
        setTimeout(() => {
            if (typeof CartManager !== 'undefined') {
                if (!cartManager) cartManager = new CartManager();
                cartManager.addToCart(productData);
            }
        }, 100);
    }
}

// Expor para uso global
window.cartManager = cartManager;
window.addToCart = addToCart;

