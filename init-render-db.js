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

      // FIX: Instead of using a single prepared statement for all sneakers,
      // we'll handle each sneaker insert separately to avoid the "Statement already finalized" error
      
      // Process each sneaker one by one
      const insertNextSneaker = (index) => {
        // If we've processed all sneakers, we're done
        if (index >= sampleSneakers.length) {
          console.log('Sample sneakers initialized');
          return;
        }
        
        const sneaker = sampleSneakers[index];
        
        // Check if this sneaker already exists
        db.get('SELECT * FROM sneakers WHERE user_id = ? AND name = ? AND size = ?', 
          [user.id, sneaker.name, sneaker.size], (err, row) => {
          if (err) {
            console.error('Error checking for existing sneaker:', err);
            // Continue with the next sneaker even if there's an error
            insertNextSneaker(index + 1);
            return;
          }

          if (!row) {
            // Create a new statement for each insert
            db.run(
              `INSERT INTO sneakers (
                user_id, brand, name, style_code, colorway, size, condition, 
                purchase_price, purchase_date, purchase_location, retail_price, 
                market_value, image_url, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                user.id, sneaker.brand, sneaker.name, sneaker.style_code, 
                sneaker.colorway, sneaker.size, sneaker.condition, 
                sneaker.purchase_price, sneaker.purchase_date, sneaker.purchase_location, 
                sneaker.retail_price, sneaker.market_value, sneaker.image_url, sneaker.status
              ],
              (err) => {
                if (err) {
                  console.error(`Error inserting sneaker ${sneaker.name}:`, err);
                }
                // Move to the next sneaker
                insertNextSneaker(index + 1);
              }
            );
          } else {
            // Sneaker already exists, move to the next one
            insertNextSneaker(index + 1);
          }
        });
      };
      
      // Start inserting sneakers from index 0
      insertNextSneaker(0);
    });
  };

  // Create subscription plans
  db.run(`CREATE TABLE IF NOT EXISTS subscription_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price_monthly REAL,
    price_yearly REAL,
    max_inventory INTEGER,
    features TEXT
  )`, function(err) {
    if (err) {
      console.error('Error creating subscription_plans table:', err);
      return;
    }

    // Check if subscription plans exist
    db.get('SELECT COUNT(*) as count FROM subscription_plans', (err, row) => {
      if (err) {
        console.error('Error checking subscription plans:', err);
        return;
      }

      if (row.count === 0) {
        // Create subscription plans
        const plans = [
          {
            name: 'Free',
            description: 'Basic inventory management for casual collectors',
            price_monthly: 0,
            price_yearly: 0,
            max_inventory: 10,
            features: JSON.stringify(['Basic inventory tracking', 'Limited market data'])
          },
          {
            name: 'Pro',
            description: 'Advanced features for serious collectors',
            price_monthly: 9.99,
            price_yearly: 99.99,
            max_inventory: 100,
            features: JSON.stringify(['Unlimited inventory', 'Market price alerts', 'CSV import/export', 'Basic analytics'])
          },
          {
            name: 'Enterprise',
            description: 'Full-featured solution for resellers',
            price_monthly: 19.99,
            price_yearly: 199.99,
            max_inventory: 1000,
            features: JSON.stringify(['Everything in Pro', 'StockX integration', 'Advanced analytics', 'Tax reporting', 'Profit forecasting'])
          }
        ];

        // Insert each plan individually to avoid statement finalization issues
        const insertPlan = (index) => {
          if (index >= plans.length) {
            console.log('Subscription plans created');
            return;
          }
          
          const plan = plans[index];
          
          db.run(
            `INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, max_inventory, features)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [plan.name, plan.description, plan.price_monthly, plan.price_yearly, plan.max_inventory, plan.features],
            (err) => {
              if (err) {
                console.error(`Error inserting plan ${plan.name}:`, err);
              }
              insertPlan(index + 1);
            }
          );
        };
        
        insertPlan(0);
      }
    });
  });

  // Create user_subscriptions table
  db.run(`CREATE TABLE IF NOT EXISTS user_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    plan_id INTEGER,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    status TEXT DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
  )`);

  // Execute the demo data creation
  createDemoUsers();
  setTimeout(createSampleSneakers, 1000); // Slight delay to ensure users are created first
});

// Close the database connection when done
setTimeout(() => {
  db.close();
  console.log('Database initialization completed');
}, 5000); // Increased timeout to ensure all operations complete
