// SoleStats Live Server - Connects to real database
const express = require('express');
const path = require('path');
const dataConnector = require('./data-connector');
const cors = require('cors');
const session = require('express-session');
const authRoutes = require('./auth-api');

// Create Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure session middleware
app.use(session({
  secret: 'solestats-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Authentication middleware to check if user is logged in
// TEMPORARILY BYPASSED - all routes accessible without login
const requireAuth = (req, res, next) => {
  // Always allow access for now
  return next();
};

// IMPORTANT: Route definitions must come BEFORE static file serving
// Otherwise, static files will be served first and route handlers won't be called

// We'll serve static files at the end

// Initialize database
dataConnector.initializeDatabase();

// Cleaner organization - ALL PAGE ROUTES DEFINED HERE
// This makes route precedence clear and prevents conflicts

// Home page
app.get('/', (req, res) => {
  // Set cache control to ensure fresh content
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Always serve the solestats-home.html file, never a demo
  res.sendFile(path.join(__dirname, 'solestats-home.html'));
});

// Login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Price tracking page
app.get('/price-tracking', (req, res) => {
  res.sendFile(path.join(__dirname, 'price-tracking.html'));
});

// Profile page
app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'profile.html'));
});

// Subscription page
app.get('/subscription', (req, res) => {
  res.sendFile(path.join(__dirname, 'subscription-plans.html'));
});

// Payment page
app.get('/payment', (req, res) => {
  res.sendFile(path.join(__dirname, 'payment.html'));
});

// Barcode scanner page
app.get('/scanner', (req, res) => {
  res.sendFile(path.join(__dirname, 'barcode-scanner.html'));
});

// Deal calculator page
app.get('/deal-calculator', (req, res) => {
  res.sendFile(path.join(__dirname, 'deal-calculator.html'));
});

// Inventory page
app.get('/inventory', (req, res) => {
  res.sendFile(path.join(__dirname, 'inventory.html'));
});

// Add product page
app.get('/add', (req, res) => {
  res.sendFile(path.join(__dirname, 'add-product.html'));
});

// Bulk import page
app.get('/import', (req, res) => {
  res.sendFile(path.join(__dirname, 'import.html'));
});

// Dashboard page
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'live-dashboard.html'));
});

// Authentication API routes
app.use('/api/auth', authRoutes);

// API routes (must come after page routes but before static serving)
dataConnector.setupApiRoutes(app);

// API endpoint to check user's subscription status
app.get('/api/subscriptions/status', (req, res) => {
  // For now, just return basic info since we're still setting up subscriptions
  // In a real implementation, this would check the database
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      message: 'Not logged in'
    });
  }
  
  // Get user's subscription from database
  db.get(`SELECT users.*, subscription_plans.* 
         FROM users 
         JOIN subscription_plans ON users.subscription_id = subscription_plans.id 
         WHERE users.id = ?`, 
         [req.session.userId], (err, row) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Database error'
      });
    }
    
    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      subscription: {
        id: row.subscription_id,
        name: row.name,
        description: row.description,
        price_monthly: row.price_monthly,
        price_yearly: row.price_yearly,
        max_inventory: row.max_inventory,
        features: JSON.parse(row.features)
      }
    });
  });
});

// API endpoint to select a subscription plan
app.get('/api/subscriptions/select/:planId', (req, res) => {
  const planId = req.params.planId;
  
  // If not logged in, redirect to login page with return URL
  if (!req.session.userId) {
    return res.redirect(`/login?redirect=/api/subscriptions/select/${planId}`);
  }
  
  // Get plan details
  db.get('SELECT * FROM subscription_plans WHERE id = ?', [planId], (err, plan) => {
    if (err || !plan) {
      return res.status(404).send('Subscription plan not found');
    }
    
    // For free plan (id=1), just update the user's subscription
    if (planId == 1) {
      db.run('UPDATE users SET subscription_id = ? WHERE id = ?', 
        [planId, req.session.userId], (err) => {
          if (err) {
            return res.status(500).send('Error updating subscription');
          }
          
          // Redirect to dashboard with success message
          res.redirect('/dashboard?subscription_updated=true');
      });
    } else {
      // For paid plans, redirect to a payment page
      // In a real implementation, this would integrate with Stripe, PayPal, etc.
      res.redirect(`/payment?plan=${planId}`);
    }
  });
});

// Mock payment confirmation page
app.get('/payment', (req, res) => {
  const planId = req.query.plan;
  
  // If not logged in, redirect to login
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  
  // Get plan details
  db.get('SELECT * FROM subscription_plans WHERE id = ?', [planId], (err, plan) => {
    if (err || !plan) {
      return res.status(404).send('Subscription plan not found');
    }
    
    // In a real implementation, this would show a payment form and process payment
    // For now, we'll just fake it and update the user's subscription
    db.run('UPDATE users SET subscription_id = ? WHERE id = ?', 
      [planId, req.session.userId], (err) => {
        if (err) {
          return res.status(500).send('Error updating subscription');
        }
        
        // Record subscription in user_subscriptions table
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        
        db.run(`INSERT INTO user_subscriptions (user_id, plan_id, end_date) 
                VALUES (?, ?, ?)`, 
               [req.session.userId, planId, oneYearFromNow.toISOString()], (err) => {
          if (err) {
            console.error('Error recording subscription:', err);
          }
          
          // Redirect to dashboard with success message
          res.redirect('/dashboard?subscription_updated=true');
        });
    });
  });
});

// Route handling was moved to the top of the file

// Process login - for actual authentication
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // For demonstration, accept any username/password combination
  // In a real app, you would verify against the database
  if (username && password) {
    // Set the user in the session
    req.session.userId = 1;
    req.session.username = username;
    
    // Return success with user info
    res.json({
      success: true, 
      message: 'Login successful',
      user: {
        id: 1,
        username: username,
        email: `${username}@example.com`
      }
    });
  } else {
    res.status(400).json({ 
      success: false, 
      message: 'Username and password are required' 
    });
  }
});

// Process registration - for actual user creation
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  
  // Validate inputs
  if (!username || !email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username, email, and password are required' 
    });
  }
  
  // For demonstration, always succeed
  // In a real app, you would save to the database
  res.json({
    success: true,
    message: 'Registration successful',
    userId: Date.now() // Generate a random ID
  });
});

// Route for individual sneaker details
app.get('/sneaker/:id', (req, res) => {
  // For now, redirect to dashboard if sneaker detail page doesn't exist yet
  res.sendFile(path.join(__dirname, 'live-dashboard.html'));
});

// Settings page - authentication temporarily bypassed
app.get('/settings', (req, res) => {
  // For now, redirect to dashboard if settings page doesn't exist yet
  res.sendFile(path.join(__dirname, 'live-dashboard.html'));
});

// Route for the live dashboard - this connects to real database
// Adding requireAuth as optional for now during development
app.get('/live', (req, res) => {
  res.sendFile(path.join(__dirname, 'live-dashboard.html'));
});

// All API routes handled by data connector
dataConnector.setupApiRoutes(app);

// Serve static files - css, js, images
// IMPORTANT: This must come AFTER all route definitions
app.use(express.static(path.join(__dirname), {
  maxAge: '1d', // Cache for 1 day
  setHeaders: (res, path) => {
    if (path.endsWith('.jpg') || path.endsWith('.png')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

// Catch-all route for 404s
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SoleStats LIVE Server running at: http://localhost:${PORT}`);
  console.log(`This server is connected to your real database!`);
  console.log(`Login at: http://localhost:${PORT}/login`);
  console.log(`Dashboard at: http://localhost:${PORT}/dashboard`);
  console.log(`Add products at: http://localhost:${PORT}/add`);
  
  // Log network access information
  console.log(`\n📱 To access on your iPhone:`);
  console.log(`1. Make sure your iPhone is on the same WiFi network as this computer`);
  console.log(`2. Find this computer's IP address using 'ifconfig' or check Network settings`);
  console.log(`3. On your iPhone, visit: http://YOUR_COMPUTER_IP:${PORT}`);
});
