document.addEventListener('DOMContentLoaded', () => {

  const API_BASE = '/api';
  let products = [];
  let settings = {};

  const loadingScreen = document.getElementById('loading-screen');
  const productsGrid = document.getElementById('products-grid');
  const skeletonLoader = document.getElementById('skeleton-loader');
  const modal = document.getElementById('product-modal');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalClose = document.getElementById('modal-close');
  const hamburger = document.getElementById('hamburger');
  const header = document.getElementById('header');

  function showNotification(message, type = 'success') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    document.body.appendChild(notif);

    requestAnimationFrame(() => notif.classList.add('show'));
    setTimeout(() => {
      notif.classList.remove('show');
      setTimeout(() => notif.remove(), 300);
    }, 3000);
  }

  async function fetchAPI(endpoint, options = {}) {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
      });
      return await res.json();
    } catch (e) {
      console.error('API Error:', e);
      return null;
    }
  }

  async function loadSettings() {
    const data = await fetchAPI('/settings');
    if (data) {
      settings = data;
      const storeName = data.store_name || 'متجر روبلكس';
      document.getElementById('store-name').textContent = storeName;
      document.getElementById('page-title').textContent = storeName;
      document.getElementById('footer-store-name').textContent = storeName;
      if (data.welcome_text) {
        document.getElementById('hero-title').textContent = data.welcome_text;
      }
      if (data.about_text) {
        document.getElementById('about-text').textContent = data.about_text;
      }
      if (data.theme_color) {
        document.querySelector(':root').style.setProperty('--primary', data.theme_color);
      }
    }
  }

  async function loadProducts() {
    skeletonLoader.style.display = 'grid';
    const data = await fetchAPI('/products');
    if (Array.isArray(data)) {
      products = data;
      renderProducts(products);
      updateStats(products);
    }
    skeletonLoader.style.display = 'none';
  }

  function getStatusText(status) {
    switch (status) {
      case 'available': return 'متوفر';
      case 'out_of_stock': return 'نفد';
      default: return 'متوفر';
    }
  }

  function renderProducts(productsList) {
    const existingCards = productsGrid.querySelectorAll('.product-card');
    existingCards.forEach(c => c.remove());

    if (productsList.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'no-products';
      empty.innerHTML = '<i class="fas fa-box-open"></i><p>لا توجد منتجات متاحة حالياً</p>';
      productsGrid.appendChild(empty);
      return;
    }

    productsList.forEach(product => {
      const card = document.createElement('div');
      card.className = `product-card${product.status === 'out_of_stock' ? ' out-of-stock' : ''}`;
      card.dataset.id = product.id;

      const imgSrc = product.image ? product.image : '';
      const isAvailable = product.status === 'available';

      card.innerHTML = `
        <span class="product-badge ${product.status}">
          <i class="fas ${isAvailable ? 'fa-check-circle' : 'fa-times-circle'}"></i>
          ${getStatusText(product.status)}
        </span>
        <span class="product-orders-badge">
          <i class="fas fa-shopping-cart"></i> ${product.orders_count || 0}
        </span>
        <div class="product-image-wrapper">
          ${imgSrc
            ? `<img src="${imgSrc}" alt="${product.name}" loading="lazy">`
            : `<div class="no-image"><i class="fas fa-cube"></i></div>`
          }
        </div>
        <div class="product-info">
          <h3 class="product-name">${product.name}</h3>
          <p class="product-desc">${product.description || 'لا يوجد وصف'}</p>
          <div class="product-price-row">
            <span class="product-price">${parseFloat(product.price).toFixed(2)} <span class="currency">ريال</span></span>
            <button class="buy-btn-small ${!isAvailable ? 'out-of-stock-btn' : ''}" ${!isAvailable ? 'disabled' : ''}>
              <i class="fab fa-whatsapp"></i>
              <span>${isAvailable ? 'شراء' : 'نفد'}</span>
            </button>
          </div>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.buy-btn-small')) return;
        openModal(product);
      });

      const buyBtn = card.querySelector('.buy-btn-small');
      buyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isAvailable) handleBuy(product.id);
      });

      productsGrid.appendChild(card);
    });
  }

  function updateStats(productsList) {
    const totalProducts = document.getElementById('total-products');
    const totalOrders = document.getElementById('total-orders');
    totalProducts.textContent = productsList.length;
    const ordersSum = productsList.reduce((sum, p) => sum + (p.orders_count || 0), 0);
    totalOrders.textContent = ordersSum;
  }

  function openModal(product) {
    const imgSrc = product.image ? product.image : '';
    const isAvailable = product.status === 'available';

    document.getElementById('modal-img').src = imgSrc || '';
    document.getElementById('modal-img').alt = product.name;
    document.getElementById('modal-name').textContent = product.name;
    document.getElementById('modal-price').textContent = `${parseFloat(product.price).toFixed(2)} ريال`;
    document.getElementById('modal-desc').textContent = product.description || 'لا يوجد وصف';
    document.getElementById('modal-orders-count').textContent = product.orders_count || 0;

    const badge = document.getElementById('modal-badge');
    badge.className = `modal-badge ${product.status}`;
    badge.innerHTML = `<i class="fas ${isAvailable ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${getStatusText(product.status)}`;

    const buyBtn = document.getElementById('modal-buy-btn');
    if (isAvailable) {
      buyBtn.disabled = false;
      buyBtn.innerHTML = '<i class="fab fa-whatsapp"></i><span>شراء الآن</span>';
      buyBtn.onclick = () => handleBuy(product.id);
    } else {
      buyBtn.disabled = true;
      buyBtn.innerHTML = '<i class="fas fa-times-circle"></i><span>المنتج نفد</span>';
      buyBtn.onclick = null;
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  modalOverlay.addEventListener('click', closeModal);
  modalClose.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  async function handleBuy(productId) {
    const data = await fetchAPI(`/order/${productId}`, { method: 'POST' });
    if (data && data.url) {
      showNotification('جاري تحويلك إلى واتساب...');
      window.open(data.url, '_blank');
      const product = products.find(p => p.id === productId);
      if (product) {
        product.orders_count = (product.orders_count || 0) + 1;
        renderProducts(products);
        updateStats(products);
        closeModal();
      }
    } else {
      showNotification('حدث خطأ، حاول مرة أخرى', 'error');
    }
  }

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    const existingNav = document.querySelector('.mobile-nav');
    const existingOverlay = document.querySelector('.mobile-nav-overlay');

    if (existingNav) {
      existingNav.classList.remove('open');
      existingOverlay.classList.remove('open');
      setTimeout(() => { existingNav.remove(); existingOverlay.remove(); }, 300);
      hamburger.classList.remove('active');
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'mobile-nav-overlay open';

    const nav = document.createElement('nav');
    nav.className = 'mobile-nav open';
    nav.innerHTML = `
      <a href="#products"><i class="fas fa-store"></i> المنتجات</a>
      <a href="#about"><i class="fas fa-info-circle"></i> عن المتجر</a>
      <a href="#contact"><i class="fas fa-headset"></i> استفسارات</a>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(nav);

    overlay.addEventListener('click', () => {
      nav.classList.remove('open');
      overlay.classList.remove('open');
      hamburger.classList.remove('active');
      setTimeout(() => { nav.remove(); overlay.remove(); }, 300);
    });

    nav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        nav.classList.remove('open');
        overlay.classList.remove('open');
        hamburger.classList.remove('active');
        setTimeout(() => { nav.remove(); overlay.remove(); }, 300);
      });
    });
  });

  const heroParticles = document.getElementById('hero-particles');
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.top = Math.random() * 100 + '%';
    p.style.animationDelay = Math.random() * 6 + 's';
    p.style.animationDuration = (4 + Math.random() * 4) + 's';
    p.style.width = p.style.height = (2 + Math.random() * 4) + 'px';
    heroParticles.appendChild(p);
  }

  const scrollTop = document.getElementById('scroll-top');
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (scrollY > 300) {
      header.classList.add('scrolled');
      scrollTop.classList.add('visible');
    } else {
      header.classList.remove('scrolled');
      scrollTop.classList.remove('visible');
    }
  });

  scrollTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.getElementById('year').textContent = new Date().getFullYear();

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  async function init() {
    await loadSettings();
    await loadProducts();
    setTimeout(() => {
      loadingScreen.classList.add('hidden');
    }, 500);
  }

  init();
});
