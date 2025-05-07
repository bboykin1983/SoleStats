// Database initialization script for Render deployment
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Define the database path for Render's persistent storage
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'solestats.db');

// Ensure the directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log(`Initializing database at ${dbPath}`);
const db = new sqlite3.Database(dbPath);

// Create necessary tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    subscription_id INTEGER DEFAULT 1,
    is_admin INTEGER DEFAULT 0
  )`);

  // Sneakers table
  db.run(`CREATE TABLE IF NOT EXISTS sneakers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    brand TEXT,
    name TEXT,
    style_code TEXT,
    colorway TEXT,
    size REAL,
    condition TEXT,
    purchase_price REAL,
    purchase_date TEXT,
    purchase_location TEXT,
    retail_price REAL,
    market_value REAL,
    last_price_update TIMESTAMP,
    image_url TEXT,
    status TEXT DEFAULT 'In Stock',
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // Create demo user accounts
  const createDemoUsers = () => {
    // Check if demo user exists
    db.get('SELECT * FROM users WHERE username = ?', ['demouser'], (err, row) => {
      if (err) {
        console.error('Error checking for demo user:', err);
        return;
      }

      if (!row) {
        // Create demo user with SHA-256 hash
        const demoPasswordHash = crypto.createHash('sha256').update('demo123').digest('hex');
        db.run(
          'INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, ?)',
          ['demouser', 'demo@solestats.com', demoPasswordHash, 0],
          (err) => {
            if (err) {
              console.error('Error creating demo user:', err);
            } else {
              console.log('Demo user created');
            }
          }
        );
      }
    });

    // Check if admin user exists
    db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
      if (err) {
        console.error('Error checking for admin user:', err);
        return;
      }

      if (!row) {
        // Create admin user with SHA-256 hash
        const adminPasswordHash = crypto.createHash('sha256').update('admin123').digest('hex');
        db.run(
          'INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, ?)',
          ['admin', 'admin@solestats.com', adminPasswordHash, 1],
          (err) => {
            if (err) {
              console.error('Error creating admin user:', err);
            } else {
              console.log('Admin user created');
            }
          }
        );
      }
    });
  };

  // Create sample sneakers for demo account
  const createSampleSneakers = () => {
    const sampleSneakers = [
      {
        brand: 'Nike',
        name: 'Air Force 1 Low White',
        style_code: '315122-111',
        colorway: 'White/White',
        size: 9,
        condition: 'New',
        purchase_price: 110,
        purchase_date: '2025-01-15',
        purchase_location: 'Nike.com',
        retail_price: 100,
        market_value: 120,
        status: 'In Stock',
        image_url: 'https://images.stockx.com/images/Nike-Air-Force-1-Low-White-Product.jpg'
      },
      {
        brand: 'Jordan',
        name: 'Air Jordan 1 High Chicago',
        style_code: '555088-101',
        colorway: 'Red/White/Black',
        size: 10,
        condition: 'New',
        purchase_price: 170,
        purchase_date: '2025-02-10',
        purchase_location: 'GOAT',
        retail_price: 180,
        market_value: 450,
        status: 'In Stock',
        image_url: 'https://images.stockx.com/images/Air-Jordan-1-Retro-High-Chicago-2015-Product.jpg'
      },
      {
        brand: 'Adidas',
        name: 'Yeezy Boost 350 Zebra',
        style_code: 'CP9654',
        colorway: 'White/Core Black/Red',
        size: 9.5,
        condition: 'Used',
        purchase_price: 250,
        purchase_date: '2025-03-05',
        purchase_location: 'StockX',
        retail_price: 220,
        market_value: 310,
        status: 'Sold',
        image_url: 'https://images.stockx.com/images/Adidas-Yeezy-Boost-350-V2-Zebra-Product.jpg'
      },
      {
        brand: 'Nike',
        name: 'Nike Dunk Low Panda',
        style_code: 'DD1391-100',
        colorway: 'Black/White',
        size: 8.5,
        condition: 'New',
        purchase_price: 120,
        purchase_date: '2025-01-20',
        purchase_location: 'Foot Locker',
        retail_price: 110,
        market_value: 190,
        status: 'In Stock',
        image_url: 'https://images.stockx.com/images/Nike-Dunk-Low-Retro-White-Black-Product.jpg'
      },
      {
        brand: 'New Balance',
        name: 'New Balance 550 White Green',
        style_code: 'BB550WT1',
        colorway: 'White/Green',
        size: 10.5,
        condition: 'New',
        purchase_price: 130,
        purchase_date: '2025-04-01',
        purchase_location: 'New Balance',
        retail_price: 110,
        market_value: 145,
        status: 'In Stock',
        image_url: 'https://images.stockx.com/images/New-Balance-550-White-Green-Product.jpg'
      }
    ];

    // Get demo user ID
    db.get('SELECT id FROM users WHERE username = ?', ['demouser'], (err, user) => {
      if (err || !user) {
        console.error('Error finding demo user:', err || 'User not found');
        return;
      }

      // Insert sample sneakers
      const stmt = db.prepare(`
        INSERT INTO sneakers (
          user_id, brand, name, style_code, colorway, size, condition, 
          purchase_price, purchase_date, purchase_location, retail_price, 
          market_value, image_url, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      sampleSneakers.forEach(sneaker => {
        db.get('SELECT * FROM sneakers WHERE user_id = ? AND name = ? AND size = ?', 
          [user.id, sneaker.name, sneaker.size], (err, row) => {
          if (err) {
            console.error('Error checking for existing sneaker:', err);
            return;
          }

          if (!row) {
            stmt.run(
              user.id, sneaker.brand, sneaker.name, sneaker.style_code, 
              sneaker.colorway, sneaker.size, sneaker.condition, 
              sneaker.purchase_price, sneaker.purchase_date, sneaker.purchase_location, 
              sneaker.retail_price, sneaker.market_value, sneaker.image_url, sneaker.status
            );
          }
        });
      });

      stmt.finalize();
      console.log('Sample sneakers initialized');
    });
  };

  // Execute the demo data creation
  createDemoUsers();
  setTimeout(createSampleSneakers, 1000); // Slight delay to ensure users are created first
});

// Close the database connection when done
setTimeout(() => {
  db.close();
  console.log('Database initialization completed');
}, 3000);
