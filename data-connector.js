// SoleStats Data Connector - Connects to your real sneaker database
const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const path = require('path');
const router = express.Router();
const fs = require('fs');

// Database path - adjust this if your database is in a different location
const dbPath = path.join(__dirname, 'data/sneakers.db');

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Connect to SQLite database
let db;
try {
  db = new sqlite3.Database(dbPath);
  console.log(`Connected to database at ${dbPath}`);
} catch (err) {
  console.error(`Error connecting to database: ${err.message}`);
}

// Initialize database tables if they don't exist
function initializeDatabase() {
  // Create subscription_plans table if it doesn't exist
  db.run(`CREATE TABLE IF NOT EXISTS subscription_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price_monthly REAL NOT NULL,
    price_yearly REAL NOT NULL,
    max_inventory INTEGER NOT NULL,
    features TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Insert default subscription plans if they don't exist
  db.get(`SELECT COUNT(*) as count FROM subscription_plans`, [], (err, row) => {
    if (err) {
      console.error(err.message);
      return;
    }
    
    if (row.count === 0) {
      // Insert Basic plan
      db.run(`INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, max_inventory, features) 
        VALUES (?, ?, ?, ?, ?, ?)`, 
        ['Basic', 'Basic inventory management for casual collectors', 
        0, 0, 25, JSON.stringify([
          'Basic inventory management',
          'Manual barcode scanning',
          'Basic profit/loss tracking',
          'Limited market price lookups (5/day)'
        ])
      ]);
      
      // Insert Premium plan
      db.run(`INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, max_inventory, features) 
        VALUES (?, ?, ?, ?, ?, ?)`, 
        ['Premium', 'Advanced features for serious collectors', 
        9.99, 99.99, 250, JSON.stringify([
          'Expanded inventory (up to 250 sneakers)',
          'Advanced analytics dashboard',
          'Price history tracking and charts',
          'Unlimited barcode scanning',
          'Automatic price monitoring',
          'Profit/loss projections',
          'Export capabilities (CSV, PDF)',
          'Email alerts for price changes'
        ])
      ]);
      
      // Insert Business plan
      db.run(`INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, max_inventory, features) 
        VALUES (?, ?, ?, ?, ?, ?)`, 
        ['Business', 'Complete solution for resellers and stores', 
        24.99, 249.99, -1, JSON.stringify([
          'Unlimited inventory',
          'Multi-user accounts',
          'Advanced sales forecasting',
          'Bulk operations',
          'Integration with marketplaces',
          'Purchase order management',
          'Customer database',
          'ROI calculators and investment tools'
        ])
      ]);
      
      console.log('Default subscription plans created');
    }
  });
  
  // Create users table if it doesn't exist
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    subscription_id INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscription_plans (id)
  )`);
  
  // Create user_subscriptions table if it doesn't exist
  db.run(`CREATE TABLE IF NOT EXISTS user_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    payment_status TEXT DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (plan_id) REFERENCES subscription_plans (id)
  )`);
  
  // Create price_alerts table if it doesn't exist
  db.run(`CREATE TABLE IF NOT EXISTS price_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    sneaker_id INTEGER NOT NULL,
    target_price REAL NOT NULL,
    condition TEXT CHECK(condition IN ('above', 'below')) NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    is_triggered BOOLEAN DEFAULT 0,
    notification_method TEXT DEFAULT 'app',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (sneaker_id) REFERENCES sneakers (id)
  )`);
  
  // Create price_history table if it doesn't exist
  db.run(`CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sneaker_id INTEGER NOT NULL,
    price REAL NOT NULL,
    source TEXT NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sneaker_id) REFERENCES sneakers (id)
  )`);
  
  // Create sneakers table if it doesn't exist
  db.run(`CREATE TABLE IF NOT EXISTS sneakers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand TEXT NOT NULL,
    name TEXT NOT NULL,
    sku TEXT,
    colorway TEXT,
    release_date TEXT,
    retail_price REAL,
    description TEXT,
    image_path TEXT,
    thumbnail TEXT,
    stockx_price REAL,
    goat_price REAL,
    market_value REAL,
    barcode TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Create inventory table if it doesn't exist
  db.run(`CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sneaker_id INTEGER NOT NULL,
    size TEXT NOT NULL,
    condition TEXT NOT NULL,
    purchase_price REAL NOT NULL,
    purchase_date TEXT NOT NULL,
    purchase_location TEXT,
    sale_price REAL,
    sale_date TEXT,
    sale_platform TEXT,
    profit REAL,
    roi REAL,
    status TEXT DEFAULT 'In Stock' NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sneaker_id) REFERENCES sneakers(id) ON DELETE CASCADE
  )`);
  
  console.log('Database tables initialized');
}

// Set up API routes
function setupApiRoutes(app) {
  // Create router for API endpoints
  const apiRouter = express.Router();
  
  // PRICE TRACKING & ALERTS ENDPOINTS
  
  // Get price history for a sneaker
  apiRouter.get('/price-history/:sneakerId', (req, res) => {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not logged in' });
    }
    
    // Get sneaker price history
    db.all(
      `SELECT * FROM price_history 
       WHERE sneaker_id = ? 
       ORDER BY recorded_at DESC`, 
      [req.params.sneakerId], 
      (err, rows) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Error fetching price history' });
        }
        res.json({ success: true, data: rows });
      }
    );
  });
  
  // Create a price alert
  apiRouter.post('/price-alerts', (req, res) => {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not logged in' });
    }
    
    // Get user's subscription plan
    db.get(
      `SELECT subscription_plans.* 
       FROM users 
       JOIN subscription_plans ON users.subscription_id = subscription_plans.id 
       WHERE users.id = ?`, 
      [req.session.userId], 
      (err, subscription) => {
        if (err || !subscription) {
          return res.status(500).json({ success: false, message: 'Error checking subscription' });
        }
        
        // Check if user has a premium or business subscription (ids 2 and 3)
        if (subscription.id === 1) {
          return res.status(403).json({ 
            success: false, 
            message: 'Price alerts are only available for Premium and Business plans',
            upgradeRequired: true
          });
        }
        
        // Extract request data
        const { sneakerId, targetPrice, condition, notificationMethod } = req.body;
        
        // Validate inputs
        if (!sneakerId || !targetPrice || !condition) {
          return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        
        // Validate condition
        if (condition !== 'above' && condition !== 'below') {
          return res.status(400).json({ success: false, message: 'Condition must be "above" or "below"' });
        }
        
        // Create price alert
        db.run(
          `INSERT INTO price_alerts 
           (user_id, sneaker_id, target_price, condition, notification_method) 
           VALUES (?, ?, ?, ?, ?)`, 
          [req.session.userId, sneakerId, targetPrice, condition, notificationMethod || 'app'], 
          function(err) {
            if (err) {
              return res.status(500).json({ success: false, message: 'Error creating price alert' });
            }
            
            res.json({ success: true, alertId: this.lastID });
          }
        );
      }
    );
  });
  
  // Get user's price alerts
  apiRouter.get('/price-alerts', (req, res) => {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not logged in' });
    }
    
    // Get user's alerts joined with sneaker info
    db.all(
      `SELECT price_alerts.*, sneakers.brand, sneakers.name, sneakers.thumbnail, 
              sneakers.stockx_price, sneakers.market_value 
       FROM price_alerts 
       JOIN sneakers ON price_alerts.sneaker_id = sneakers.id 
       WHERE price_alerts.user_id = ? 
       ORDER BY price_alerts.created_at DESC`, 
      [req.session.userId], 
      (err, rows) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Error fetching price alerts' });
        }
        res.json({ success: true, data: rows });
      }
    );
  });
  
  // Delete a price alert
  apiRouter.delete('/price-alerts/:alertId', (req, res) => {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not logged in' });
    }
    
    // Delete the alert (only if it belongs to the user)
    db.run(
      `DELETE FROM price_alerts 
       WHERE id = ? AND user_id = ?`, 
      [req.params.alertId, req.session.userId], 
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: 'Error deleting price alert' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ success: false, message: 'Alert not found or unauthorized' });
        }
        
        res.json({ success: true });
      }
    );
  });
  
  // Update a price alert
  apiRouter.put('/price-alerts/:alertId', (req, res) => {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not logged in' });
    }
    
    // Extract request data
    const { targetPrice, condition, notificationMethod, isActive } = req.body;
    
    // Build update query dynamically based on provided fields
    let updateFields = [];
    let queryParams = [];
    
    if (targetPrice !== undefined) {
      updateFields.push('target_price = ?');
      queryParams.push(targetPrice);
    }
    
    if (condition !== undefined) {
      if (condition !== 'above' && condition !== 'below') {
        return res.status(400).json({ success: false, message: 'Condition must be "above" or "below"' });
      }
      updateFields.push('condition = ?');
      queryParams.push(condition);
    }
    
    if (notificationMethod !== undefined) {
      updateFields.push('notification_method = ?');
      queryParams.push(notificationMethod);
    }
    
    if (isActive !== undefined) {
      updateFields.push('is_active = ?');
      queryParams.push(isActive ? 1 : 0);
    }
    
    // If no fields to update
    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    // Add alertId and userId to query params
    queryParams.push(req.params.alertId);
    queryParams.push(req.session.userId);
    
    // Update the alert
    db.run(
      `UPDATE price_alerts 
       SET ${updateFields.join(', ')} 
       WHERE id = ? AND user_id = ?`, 
      queryParams, 
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: 'Error updating price alert' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ success: false, message: 'Alert not found or unauthorized' });
        }
        
        res.json({ success: true });
      }
    );
  });
  
  // Update price data for a sneaker (would be called by background job in production)
  apiRouter.post('/update-price/:sneakerId', (req, res) => {
    // In production, this would be protected by admin auth
    // For now, anyone can update prices for demo purposes
    
    const { price, source } = req.body;
    const sneakerId = req.params.sneakerId;
    
    if (!price || !source) {
      return res.status(400).json({ success: false, message: 'Missing price or source' });
    }
    
    // Start a transaction
    db.serialize(() => {
      // Add to price history
      db.run(
        `INSERT INTO price_history (sneaker_id, price, source) VALUES (?, ?, ?)`,
        [sneakerId, price, source]
      );
      
      // Update current price in sneakers table based on source
      if (source === 'stockx') {
        db.run(
          `UPDATE sneakers SET stockx_price = ? WHERE id = ?`,
          [price, sneakerId]
        );
      } else if (source === 'market') {
        db.run(
          `UPDATE sneakers SET market_value = ? WHERE id = ?`,
          [price, sneakerId]
        );
      }
      
      // Check for triggered alerts
      db.all(
        `SELECT price_alerts.*, users.username, users.email 
         FROM price_alerts 
         JOIN users ON price_alerts.user_id = users.id 
         WHERE price_alerts.sneaker_id = ? 
         AND price_alerts.is_active = 1 
         AND price_alerts.is_triggered = 0
         AND ((price_alerts.condition = 'above' AND ? >= price_alerts.target_price) 
              OR (price_alerts.condition = 'below' AND ? <= price_alerts.target_price))`,
        [sneakerId, price, price],
        (err, alertsToTrigger) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Error checking alerts' });
          }
          
          // Mark alerts as triggered
          const triggeredAlerts = [];
          
          if (alertsToTrigger && alertsToTrigger.length > 0) {
            alertsToTrigger.forEach(alert => {
              db.run(
                `UPDATE price_alerts SET is_triggered = 1 WHERE id = ?`,
                [alert.id]
              );
              
              triggeredAlerts.push({
                id: alert.id,
                userId: alert.user_id,
                username: alert.username,
                email: alert.email,
                notificationMethod: alert.notification_method
              });
              
              // In production, would send actual notifications here
              console.log(`Alert triggered for user ${alert.username}: Price ${alert.condition} ${alert.target_price}`);
            });
          }
          
          res.json({ 
            success: true, 
            priceUpdated: true, 
            triggeredAlerts: triggeredAlerts.length 
          });
        }
      );
    });
  });
  
  // Get all sneakers
  apiRouter.get('/sneakers', (req, res) => {
    const brand = req.query.brand;
    const search = req.query.search;
    
    let query = 'SELECT * FROM sneakers';
    const params = [];
    
    if (brand) {
      query += ' WHERE brand = ?';
      params.push(brand);
    } else if (search) {
      query += ' WHERE brand LIKE ? OR name LIKE ? OR sku LIKE ? OR barcode LIKE ?';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }
    
    query += ' ORDER BY brand, name LIMIT 1000';
    
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error fetching sneakers:', err.message);
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }
      
      console.log(`Found ${rows.length} sneakers matching criteria`);
      res.json(rows);
    });
  });
  
  // Get sneaker by barcode
  apiRouter.get('/barcode/:barcode', (req, res) => {
    const barcode = req.params.barcode;
    
    db.get('SELECT * FROM sneakers WHERE barcode = ?', [barcode], (err, row) => {
      if (err) {
        console.error('Error fetching sneaker by barcode:', err.message);
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Sneaker not found' });
      }
      
      res.json(row);
    });
  });
  
  // Get a single sneaker by ID
  apiRouter.get('/sneakers/:id', (req, res) => {
    const id = req.params.id;
    
    db.get('SELECT * FROM sneakers WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.error('Error fetching sneaker:', err.message);
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Sneaker not found' });
      }
      
      res.json(row);
    });
  });
  
  // Add a new sneaker
  apiRouter.post('/sneakers', (req, res) => {
    const {
      brand,
      name,
      sku,
      colorway,
      release_date,
      retail_price,
      description,
      image_path,
      thumbnail,
      stockx_price,
      goat_price,
      barcode
    } = req.body;
    
    // Validate required fields
    if (!brand || !name) {
      return res.status(400).json({ error: 'Brand and name are required' });
    }
    
    // Calculate market value as average of stockx and goat prices
    const market_value = stockx_price && goat_price
      ? (parseFloat(stockx_price) + parseFloat(goat_price)) / 2
      : stockx_price
        ? parseFloat(stockx_price)
        : goat_price
          ? parseFloat(goat_price)
          : null;
    
    const query = `
      INSERT INTO sneakers (
        brand,
        name,
        sku,
        colorway,
        release_date,
        retail_price,
        description,
        image_path,
        thumbnail,
        stockx_price,
        goat_price,
        market_value,
        barcode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(
      query,
      [
        brand,
        name,
        sku,
        colorway,
        release_date,
        retail_price,
        description,
        image_path,
        thumbnail,
        stockx_price,
        goat_price,
        market_value,
        barcode
      ],
      function(err) {
        if (err) {
          console.error('Error adding sneaker:', err.message);
          return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        
        console.log(`Added new sneaker: ${brand} ${name} with ID ${this.lastID}`);
        res.status(201).json({
          id: this.lastID,
          brand,
          name,
          sku,
          colorway,
          release_date,
          retail_price,
          description,
          image_path,
          thumbnail,
          stockx_price,
          goat_price,
          market_value,
          barcode
        });
      }
    );
  });
  
  // Get all inventory items
  apiRouter.get('/inventory', (req, res) => {
    const status = req.query.status;
    
    let query = `
      SELECT i.*, s.brand, s.name, s.sku, s.image_path, s.thumbnail_path, s.retail_price
      FROM inventory i
      JOIN sneakers s ON i.sneaker_id = s.id
    `;
    
    const params = [];
    
    if (status) {
      query += ' WHERE i.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY i.purchase_date DESC';
    
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error fetching inventory:', err.message);
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }
      
      console.log(`Found ${rows.length} inventory items`);
      res.json(rows);
    });
  });
  
  // Add to inventory
  apiRouter.post('/inventory', (req, res) => {
    const { sneaker_id, size, condition, purchase_price, purchase_date,
            purchase_location, sale_price, sale_date, sale_platform, status, notes } = req.body;
    
    // Calculate profit and ROI if item is sold
    let profit = null;
    let roi = null;
    
    if (status === 'Sold' && sale_price && purchase_price) {
      profit = sale_price - purchase_price;
      roi = (profit / purchase_price) * 100;
    }
    
    const query = `
      INSERT INTO inventory (
        sneaker_id, size, condition, purchase_price, purchase_date,
        purchase_location, sale_price, sale_date, sale_platform,
        profit, roi, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      sneaker_id, size, condition, purchase_price, purchase_date,
      purchase_location, sale_price, sale_date, sale_platform,
      profit, roi, status, notes
    ];
    
    db.run(query, params, function(err) {
      if (err) {
        console.error('Error adding inventory item:', err.message);
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }
      
      res.status(201).json({
        id: this.lastID,
        sneaker_id, size, condition, purchase_price, purchase_date,
        purchase_location, sale_price, sale_date, sale_platform,
        profit, roi, status, notes
      });
    });
  });
  
  // Get inventory statistics
  apiRouter.get('/inventory/stats', (req, res) => {
    const query = `
      SELECT
        COUNT(*) as total_items,
        SUM(CASE WHEN status = 'In Stock' THEN 1 ELSE 0 END) as in_stock,
        SUM(CASE WHEN status = 'Sold' THEN 1 ELSE 0 END) as sold,
        SUM(CASE WHEN status = 'In Stock' THEN purchase_price ELSE 0 END) as inventory_value,
        SUM(CASE WHEN status = 'Sold' THEN profit ELSE 0 END) as total_profit,
        AVG(CASE WHEN status = 'Sold' THEN roi ELSE NULL END) as avg_roi
      FROM inventory
    `;
    
    db.get(query, [], (err, row) => {
      if (err) {
        console.error('Error fetching inventory stats:', err.message);
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }
      
      res.json(row);
    });
  });
  
  // Mount the API router
  app.use('/api', apiRouter);
}

// Export module
module.exports = {
  initializeDatabase,
  setupApiRoutes
};
