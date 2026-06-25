const API_BASE = '/api';

let products = [];
let currentTab = 'dashboard';

document.addEventListener('DOMContentLoaded', () => {
  init();
});

async function init() {
  const loading = document.getElementById('loading-screen');
  const authScreen = document.getElementById('auth-screen');
  const app = document.getElementById('app');

  try {
    const check = await fetchAPI('/admin/check');
    if (check && check.admin) {
      authScreen.style.display = 'none';
      app.style.display = 'flex';
      loading.style.display = 'none';
      loadMyIP();
      loadDashboard();
      loadProductsTable();
      loadSettings();
      loadAdmins();
    } else if (check && check.needsRegistration) {
      showAuth();
      loading.style.display = 'none';
    } else {
      const res = await fetchAPI('/admin/register', { method: 'POST' });
      if (res && res.success && res.admin) {
        authScreen.style.display = 'none';
        app.style.display = 'flex';
        loading.style.display = 'none';
        loadMyIP();
        loadDashboard();
        loadProductsTable();
        loadSettings();
        loadAdmins();
      } else if (res && res.needsRegistration) {
        showAuth();
        loading.style.display = 'none';
      } else {
        showAuth();
        loading.style.display = 'none';
      }
    }
  } catch (e) {
    showAuth();
    loading.style.display = 'none';
  }

  setupNavigation();
  setupForms();
  setupFileInputs();
  setupSidebar();
}

function showAuth() {
  const authScreen = document.getElementById('auth-screen');
  const app = document.getElementById('app');
  authScreen.style.display = 'flex';
  app.style.display = 'none';

  fetchAPI('/myip').then(data => {
    if (data && data.ip) {
      document.getElementById('auth-ip').textContent = `عنوان IP الخاص بك: ${data.ip}`;
    } else {
      document.getElementById('auth-ip').textContent = 'تعذر الحصول على عنوان IP';
    }
  });

  document.getElementById('register-admin-btn').onclick = async () => {
    const btn = document.getElementById('register-admin-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التسجيل...';
    try {
      const res = await fetchAPI('/admin/register', { method: 'POST' });
      if (res && res.success) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        loadDashboard();
        loadProductsTable();
        loadSettings();
        loadAdmins();
      } else {
        document.getElementById('register-error').textContent = res?.error || 'فشل التسجيل';
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> تسجيل هذا الجهاز كمدير';
      }
    } catch (e) {
      document.getElementById('register-error').textContent = 'خطأ في الاتصال';
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> تسجيل هذا الجهاز كمدير';
    }
  };
}

async function fetchAPI(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    });
    const data = await res.json();
    return data;
  } catch (e) {
    console.error('API Error:', e);
    return null;
  }
}

function switchTab(tabId) {
  currentTab = tabId;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`.nav-item[data-tab="${tabId}"]`)?.classList.add('active');

  const titles = {
    dashboard: 'الإحصائيات',
    products: 'المنتجات',
    'add-product': 'إضافة منتج',
    settings: 'الإعدادات',
    admins: 'المديرين'
  };
  document.getElementById('page-title').textContent = titles[tabId] || 'الإحصائيات';

  if (tabId === 'products') loadProductsTable();
  if (tabId === 'dashboard') loadDashboard();
  if (tabId === 'settings') loadSettings();
  if (tabId === 'admins') loadAdmins();
}

function setupNavigation() {
  document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(item.dataset.tab);
    });
  });
}

function setupSidebar() {
  const toggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768) sidebar.classList.remove('open');
    });
  });
}

function setupForms() {
  const addForm = document.getElementById('add-product-form');
  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(addForm);
    const btn = addForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

    try {
      const res = await fetch(`${API_BASE}/admin/products`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        showNotification('تم إضافة المنتج بنجاح!', 'success');
        addForm.reset();
        document.getElementById('add-file-name').textContent = 'لم يتم اختيار ملف';
        loadProductsTable();
        loadDashboard();
      } else {
        showNotification(data.error || 'حدث خطأ', 'error');
      }
    } catch (e) {
      showNotification('حدث خطأ في الاتصال', 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> حفظ المنتج';
  });

  const settingsForm = document.getElementById('settings-form');
  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      store_name: document.getElementById('set-store-name').value,
      whatsapp_number: document.getElementById('set-whatsapp').value,
      welcome_text: document.getElementById('set-welcome').value,
      about_text: document.getElementById('set-about').value,
      theme_color: document.getElementById('set-color').value
    };
    const res = await fetchAPI('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    if (res && res.success) {
      showNotification('تم حفظ الإعدادات بنجاح!', 'success');
    } else {
      showNotification('حدث خطأ', 'error');
    }
  });

  const editForm = document.getElementById('edit-product-form');
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const formData = new FormData(editForm);
    const btn = editForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

    try {
      const res = await fetch(`${API_BASE}/admin/products/${id}`, {
        method: 'PUT',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        showNotification('تم تحديث المنتج بنجاح!', 'success');
        closeEditModal();
        loadProductsTable();
        loadDashboard();
      } else {
        showNotification(data.error || 'حدث خطأ', 'error');
      }
    } catch (e) {
      showNotification('حدث خطأ في الاتصال', 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> حفظ التغييرات';
  });

  const addAdminForm = document.getElementById('add-admin-form');
  addAdminForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ip = document.getElementById('admin-ip').value.trim();
    if (!ip) return;
    const res = await fetchAPI('/admin/admins', {
      method: 'POST',
      body: JSON.stringify({ ip })
    });
    if (res && res.success) {
      showNotification('تم إضافة المدير بنجاح!', 'success');
      document.getElementById('admin-ip').value = '';
      loadAdmins();
    } else {
      showNotification(res?.error || 'حدث خطأ', 'error');
    }
  });
}

function setupFileInputs() {
  document.getElementById('add-image').addEventListener('change', (e) => {
    const name = e.target.files[0] ? e.target.files[0].name : 'لم يتم اختيار ملف';
    document.getElementById('add-file-name').textContent = name;
  });
  document.getElementById('edit-image').addEventListener('change', (e) => {
    const name = e.target.files[0] ? e.target.files[0].name : 'اتركه فارغاً للإبقاء على الصورة الحالية';
    document.getElementById('edit-file-name').textContent = name;
  });
}

async function loadDashboard() {
  const data = await fetchAPI('/admin/products');
  if (Array.isArray(data)) {
    products = data;
    const total = products.length;
    const available = products.filter(p => p.status === 'available').length;
    const out = products.filter(p => p.status === 'out_of_stock').length;
    const orders = products.reduce((s, p) => s + (p.orders_count || 0), 0);

    document.getElementById('stat-products').textContent = total;
    document.getElementById('stat-available').textContent = available;
    document.getElementById('stat-out').textContent = out;
    document.getElementById('stat-orders').textContent = orders;

    const tbody = document.getElementById('dashboard-tbody');
    tbody.innerHTML = products.slice(0, 10).map(p => `
      <tr>
        <td>${p.name}</td>
        <td>${parseFloat(p.price).toFixed(2)} ريال</td>
        <td><span class="status-badge ${p.status}">${p.status === 'available' ? 'متوفر' : 'نفد'}</span></td>
        <td>${p.orders_count || 0}</td>
      </tr>
    `).join('');
    if (products.length === 0) {
      tbody.innerHTML = '<tr class="no-data"><td colspan="4">لا توجد منتجات</td></tr>';
    }
  }
}

async function loadProductsTable() {
  const data = await fetchAPI('/admin/products');
  if (Array.isArray(data)) {
    products = data;
    renderProductsTable(products);
  }
}

function renderProductsTable(list) {
  const tbody = document.getElementById('products-tbody');
  if (list.length === 0) {
    tbody.innerHTML = '<tr class="no-data"><td colspan="6">لا توجد منتجات</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(p => `
    <tr>
      <td>${p.image
        ? `<img src="${p.image}" alt="${p.name}">`
        : `<div style="width:50px;height:50px;background:var(--border-color);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--text-gray);font-size:1.2rem;"><i class="fas fa-cube"></i></div>`
      }</td>
      <td>${p.name}</td>
      <td>${parseFloat(p.price).toFixed(2)} ريال</td>
      <td><span class="status-badge ${p.status}">${p.status === 'available' ? 'متوفر' : 'نفد'}</span></td>
      <td>${p.orders_count || 0}</td>
      <td style="display:flex;gap:6px;flex-wrap:wrap;">
        <button class="btn-sm btn-edit" onclick="openEditModal(${p.id})"><i class="fas fa-edit"></i> تعديل</button>
        <button class="btn-sm btn-delete" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i> حذف</button>
      </td>
    </tr>
  `).join('');
}

function filterProducts(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    renderProductsTable(products);
    return;
  }
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.description && p.description.toLowerCase().includes(q))
  );
  renderProductsTable(filtered);
}

async function loadSettings() {
  const data = await fetchAPI('/admin/settings');
  if (data) {
    document.getElementById('set-store-name').value = data.store_name || '';
    document.getElementById('set-whatsapp').value = data.whatsapp_number || '';
    document.getElementById('set-welcome').value = data.welcome_text || '';
    document.getElementById('set-about').value = data.about_text || '';
    document.getElementById('set-color').value = data.theme_color || '#ed1c24';
  }
}

async function loadAdmins() {
  const data = await fetchAPI('/admin/admins');
  const tbody = document.getElementById('admins-tbody');
  if (Array.isArray(data) && data.length > 0) {
    tbody.innerHTML = data.map(a => `
      <tr>
        <td style="font-family:monospace;">${a.ip_address}</td>
        <td>${new Date(a.created_at).toLocaleDateString('ar-SA')}</td>
        <td>
          <button class="btn-sm btn-delete" onclick="deleteAdmin('${a.ip_address}')">
            <i class="fas fa-trash"></i> حذف
          </button>
        </td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = '<tr class="no-data"><td colspan="3">لا يوجد مديرين</td></tr>';
  }
}

async function deleteProduct(id) {
  if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
  const res = await fetchAPI(`/admin/products/${id}`, { method: 'DELETE' });
  if (res && res.success) {
    showNotification('تم حذف المنتج بنجاح', 'success');
    loadProductsTable();
    loadDashboard();
  } else {
    showNotification('حدث خطأ في الحذف', 'error');
  }
}

async function deleteAdmin(ip) {
  if (!confirm('هل أنت متأكد من حذف هذا المدير؟')) return;
  const res = await fetchAPI(`/admin/admins/${encodeURIComponent(ip)}`, { method: 'DELETE' });
  if (res && res.success) {
    showNotification('تم حذف المدير', 'success');
    loadAdmins();
  } else {
    showNotification(res?.error || 'حدث خطأ', 'error');
  }
}

async function openEditModal(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  document.getElementById('edit-id').value = product.id;
  document.getElementById('edit-name').value = product.name;
  document.getElementById('edit-price').value = product.price;
  document.getElementById('edit-desc').value = product.description || '';
  document.getElementById('edit-status').value = product.status;
  document.getElementById('edit-orders').value = product.orders_count || 0;
  document.getElementById('edit-file-name').textContent = 'اتركه فارغاً للإبقاء على الصورة الحالية';

  const currentImg = document.getElementById('edit-current-image');
  if (product.image) {
    currentImg.src = product.image;
    currentImg.style.display = 'block';
  } else {
    currentImg.style.display = 'none';
  }

  document.getElementById('edit-modal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
}

function showNotification(message, type = 'success') {
  const existing = document.querySelector('.admin-notification');
  if (existing) existing.remove();

  const notif = document.createElement('div');
  notif.className = 'admin-notification';
  notif.textContent = message;
  notif.style.cssText = `
    position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
    background: ${type === 'success' ? '#00c853' : '#ff1744'};
    color: white; padding: 12px 28px; border-radius: 8px;
    font-size: 0.95rem; z-index: 9999; font-weight: 600;
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
    animation: slideUp 0.3s ease;
  `;
  document.body.appendChild(notif);

  setTimeout(() => {
    notif.style.opacity = '0';
    notif.style.transition = 'opacity 0.3s';
    setTimeout(() => notif.remove(), 300);
  }, 3000);
}

async function loadMyIP() {
  const data = await fetchAPI('/myip');
  if (data && data.ip) {
    document.getElementById('header-ip').textContent = data.ip;
  }
}
