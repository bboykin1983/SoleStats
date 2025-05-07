// SoleStats Authentication API
const express = require('express');
const router = express.Router();
const UserModel = require('./user-model');

// Register a new user
router.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  
  // Validate input
  if (!username || !email || !password) {
    return res.json({ 
      success: false, 
      message: 'Username, email, and password are required' 
    });
  }
  
  // Register user
  UserModel.register({ username, email, password }, (result) => {
    res.json(result);
  });
});

// Login user
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // Validate input
  if (!username || !password) {
    return res.json({ 
      success: false, 
      message: 'Username and password are required' 
    });
  }
  
  // DEMO BYPASS: Allow direct login for demo accounts
  if ((username === 'demouser' && password === 'demo123') || 
      (username === 'admin' && password === 'admin123')) {
    console.log('Demo login bypass activated for:', username);
    
    // Create a mock user response
    const mockUser = {
      id: username === 'admin' ? 999 : 1,
      username: username,
      email: username === 'admin' ? 'admin@solestats.com' : 'demo@solestats.com'
    };
    
    // Set session
    req.session = { userId: mockUser.id };
    
    // Return success
    return res.json({
      success: true,
      message: 'Login successful (Demo Mode)',
      user: mockUser
    });
  }
  
  // Regular login for non-demo accounts
  UserModel.login({ username, password }, (result) => {
    // Set session cookie if login successful
    if (result.success) {
      req.session = { userId: result.user.id };
    }
    
    res.json(result);
  });
});

// Get current user info
router.get('/user', (req, res) => {
  // Check if user is logged in
  if (!req.session.userId) {
    return res.json({ success: false, message: 'Not logged in' });
  }
  
  // Get user info
  UserModel.getUserById(req.session.userId, (result) => {
    res.json(result);
  });
});

// Logout user
router.post('/logout', (req, res) => {
  // Clear session
  req.session = null;
  
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;