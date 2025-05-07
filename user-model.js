// SoleStats User Authentication Model
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();

// Database setup
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'solestats.db');
const db = new sqlite3.Database(dbPath);

// Initialize users table
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
)`);

// User Model
const UserModel = {
  // Register a new user
  register: function(userData, callback) {
    const { username, email, password } = userData;
    
    // First check if username or email already exists
    db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], (err, user) => {
      if (err) {
        return callback({ success: false, message: 'Database error', error: err });
      }
      
      if (user) {
        if (user.username === username) {
          return callback({ success: false, message: 'Username already taken' });
        } else {
          return callback({ success: false, message: 'Email already registered' });
        }
      }
      
      // Hash the password using SHA-256 (no salt needed)
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      
      // Insert the new user
      db.run(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        [username, email, passwordHash],
        function(err) {
          if (err) {
            return callback({ success: false, message: 'Error creating user', error: err });
          }
          
          // Return success with user ID
          callback({ 
            success: true, 
            message: 'User registered successfully',
            userId: this.lastID
          });
        }
      );
    });
  },
  
  // Login a user
  login: function(credentials, callback) {
    const { username, password } = credentials;
    
    // Find user by username
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
      if (err) {
        return callback({ success: false, message: 'Database error', error: err });
      }
      
      if (!user) {
        return callback({ success: false, message: 'Invalid username or password' });
      }
      
      // Verify password with SHA-256 hash
      const hash = crypto.createHash('sha256').update(password).digest('hex');
      if (hash !== user.password_hash) {
        return callback({ success: false, message: 'Invalid username or password' });
      }
      
      // Update last login time
      db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
      
      // Return success with user data (excluding sensitive info)
      callback({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    });
  },
  
  // Get user by ID
  getUserById: function(userId, callback) {
    db.get('SELECT id, username, email, created_at, last_login FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        return callback({ success: false, message: 'Database error', error: err });
      }
      
      if (!user) {
        return callback({ success: false, message: 'User not found' });
      }
      
      callback({ success: true, user });
    });
  }
};

module.exports = UserModel;
