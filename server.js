const express = require('express');
const multer = require('multer');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'public', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = crypto.randomBytes(12).toString('hex');
    cb(null, `${name}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|webp|gif)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('يُسمح فقط بصور JPG, PNG, WEBP, GIF'), false);
    }
  }
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'طلبات كثيرة جداً، حاول لاحقاً' }
});
app.use('/api/', limiter);

function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '0.0.0.0';
}

function requireAdmin(req, res, next) {
  const ip = getClientIP(req);
  if (db.isAdmin(ip)) {
    next();
  } else {
    res.status(403).json({ error: 'غير مصرح بالوصول' });
  }
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.get('/api/products', (req, res) => {
  try {
    const products = db.getProducts();
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: 'خطأ في جلب المنتجات' });
  }
});

app.get('/api/products/:id', (req, res) => {
  try {
    const product = db.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
    res.json(product);
  } catch (e) {
    res.status(500).json({ error: 'خطأ في جلب المنتج' });
  }
});

app.get('/api/myip', (req, res) => {
  res.json({ ip: getClientIP(req) });
});

app.get('/api/settings', (req, res) => {
  try {
    const settings = db.getAllSettings();
    res.json(settings);
  } catch (e) {
    res.status(500).json({ error: 'خطأ في جلب الإعدادات' });
  }
});

app.post('/api/order/:id', (req, res) => {
  try {
    const product = db.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
    db.incrementOrders(req.params.id);
    const whatsapp = db.getSetting('whatsapp_number') || '966576053726';
    const message = `مرحباً، أريد شراء منتج روبلكس: ${product.name} - السعر: ${product.price} ريال`;
    const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
    res.json({ success: true, url, product: product.name });
  } catch (e) {
    res.status(500).json({ error: 'خطأ في معالجة الطلب' });
  }
});

app.post('/api/admin/register', (req, res) => {
  try {
    const ip = getClientIP(req);
    const admins = db.getAdmins();
    if (admins.length === 0) {
      db.addAdmin(ip);
      return res.json({ success: true, message: 'تم تسجيل جهازك كمدير' });
    }
    const existingIP = req.body.ip;
    if (existingIP) {
      db.addAdmin(existingIP);
      return res.json({ success: true, message: 'تمت الإضافة' });
    }
    if (db.isAdmin(ip)) {
      return res.json({ success: true, admin: true });
    }
    res.status(403).json({ error: 'طلب الرفض', needsRegistration: true });
  } catch (e) {
    res.status(500).json({ error: 'خطأ في التسجيل' });
  }
});

app.get('/api/admin/check', (req, res) => {
  const ip = getClientIP(req);
  res.json({ admin: db.isAdmin(ip) });
});

app.get('/api/admin/products', requireAdmin, (req, res) => {
  try {
    const products = db.getProducts();
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: 'خطأ في جلب المنتجات' });
  }
});

app.post('/api/admin/products', requireAdmin, upload.single('image'), (req, res) => {
  try {
    const { name, description, price, status } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: 'الاسم والسعر مطلوبان' });
    }
    let imagePath = '';
    if (req.file) {
      imagePath = '/public/uploads/' + req.file.filename;
    }
    const id = db.addProduct({
      name,
      description: description || '',
      price: parseFloat(price),
      image: imagePath,
      status: status || 'available'
    });
    res.json({ success: true, id });
  } catch (e) {
    res.status(500).json({ error: 'خطأ في إضافة المنتج' });
  }
});

app.put('/api/admin/products/:id', requireAdmin, upload.single('image'), (req, res) => {
  try {
    const product = db.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });

    const updateData = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.price !== undefined) updateData.price = parseFloat(req.body.price);
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.orders_count !== undefined) updateData.orders_count = parseInt(req.body.orders_count);

    if (req.file) {
      if (product.image) {
        const oldPath = path.join(__dirname, 'public', product.image);
        if (require('fs').existsSync(oldPath)) {
          try { require('fs').unlinkSync(oldPath); } catch (e) { /* ignore */ }
        }
      }
      updateData.image = '/public/uploads/' + req.file.filename;
    }

    db.updateProduct(req.params.id, updateData);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'خطأ في تحديث المنتج' });
  }
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  try {
    db.deleteProduct(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'خطأ في حذف المنتج' });
  }
});

app.get('/api/admin/settings', requireAdmin, (req, res) => {
  try {
    const settings = db.getAllSettings();
    res.json(settings);
  } catch (e) {
    res.status(500).json({ error: 'خطأ في جلب الإعدادات' });
  }
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  try {
    const allowed = ['store_name', 'whatsapp_number', 'welcome_text', 'about_text', 'theme_color'];
    for (const [key, value] of Object.entries(req.body)) {
      if (allowed.includes(key)) {
        db.setSetting(key, value);
      }
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'خطأ في حفظ الإعدادات' });
  }
});

app.get('/api/admin/admins', requireAdmin, (req, res) => {
  try {
    const admins = db.getAdmins();
    res.json(admins);
  } catch (e) {
    res.status(500).json({ error: 'خطأ في جلب المديرين' });
  }
});

app.post('/api/admin/admins', requireAdmin, (req, res) => {
  try {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP مطلوب' });
    db.addAdmin(ip);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'خطأ في إضافة المدير' });
  }
});

app.delete('/api/admin/admins/:ip', requireAdmin, (req, res) => {
  try {
    const admins = db.getAdmins();
    if (admins.length <= 1) {
      return res.status(400).json({ error: 'لا يمكن حذف آخر مدير' });
    }
    db.removeAdmin(req.params.ip);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'خطأ في حذف المدير' });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message || 'حدث خطأ' });
  }
  next();
});

process.on('uncaughtException', (err) => {
  console.error('❌ خطأ غير متوقع:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ وعد غير معالج:', reason);
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(45));
  console.log(`  🚀  متجر روبلكس يعمل`);
  console.log(`  🌐  http://localhost:${PORT}`);
  console.log(`  📊  لوحة الإدارة: http://localhost:${PORT}/admin`);
  console.log('='.repeat(45));
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ المنفذ ${PORT} مشغول. حاول تشغيل: taskkill /F /IM node.exe`);
  } else {
    console.error('❌ خطأ في تشغيل السيرفر:', err.message);
  }
});
