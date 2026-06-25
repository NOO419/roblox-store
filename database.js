const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'store.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const initSQL = `
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price REAL NOT NULL DEFAULT 0,
  image TEXT DEFAULT '',
  status TEXT DEFAULT 'available' CHECK(status IN ('available','out_of_stock')),
  orders_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

db.exec(initSQL);

const defaultSettings = {
  store_name: 'متجر روبلكس',
  whatsapp_number: '966576053726',
  welcome_text: 'مرحباً بكم في متجر روبلكس!',
  about_text: 'متجر متخصص في بيع منتجات روبلكس بأفضل الأسعار وأسرع توصيل.',
  theme_color: '#ed1c24'
};

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(defaultSettings)) {
  insertSetting.run(key, value);
}

module.exports = {
  db,
  getProducts() {
    return db.prepare('SELECT * FROM products ORDER BY orders_count DESC, created_at DESC').all();
  },
  getProduct(id) {
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  },
  addProduct({ name, description, price, image, status }) {
    const stmt = db.prepare(
      'INSERT INTO products (name, description, price, image, status) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(name, description, price, image || '', status || 'available');
    return result.lastInsertRowid;
  },
  updateProduct(id, { name, description, price, image, status, orders_count }) {
    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }
    if (price !== undefined) { fields.push('price = ?'); values.push(price); }
    if (image !== undefined) { fields.push('image = ?'); values.push(image); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (orders_count !== undefined) { fields.push('orders_count = ?'); values.push(orders_count); }
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    const sql = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`;
    return db.prepare(sql).run(...values);
  },
  deleteProduct(id) {
    const product = this.getProduct(id);
    if (product && product.image) {
      const imgPath = path.join(__dirname, 'public', product.image);
      if (fs.existsSync(imgPath)) {
        try { fs.unlinkSync(imgPath); } catch (e) { /* ignore */ }
      }
    }
    return db.prepare('DELETE FROM products WHERE id = ?').run(id);
  },
  incrementOrders(id) {
    db.prepare('UPDATE products SET orders_count = orders_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  },
  getSetting(key) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : null;
  },
  setSetting(key, value) {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  },
  getAllSettings() {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const obj = {};
    for (const row of rows) obj[row.key] = row.value;
    return obj;
  },
  isAdmin(ip) {
    const row = db.prepare('SELECT id FROM admins WHERE ip_address = ?').get(ip);
    return !!row;
  },
  addAdmin(ip) {
    db.prepare('INSERT OR IGNORE INTO admins (ip_address) VALUES (?)').run(ip);
  },
  removeAdmin(ip) {
    db.prepare('DELETE FROM admins WHERE ip_address = ?').run(ip);
  },
  getAdmins() {
    return db.prepare('SELECT * FROM admins ORDER BY created_at DESC').all();
  },
  close() {
    db.close();
  }
};
