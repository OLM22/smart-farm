const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');

router.post('/register', async (req, res) => {
  const { username, password, email, role = 'user' } = req.body;

  try {
    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      username,
      password: hashedPassword,
      email,
      role,
      created_at: new Date()
    });

    const savedUser = await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        user_id: savedUser._id.toString(),
        username: savedUser.username,
        email: savedUser.email,
        role: savedUser.role
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Hardcoded admin credentials bypass
  const ADMIN_USERNAME = 'aiotchlorella';
  const ADMIN_PASSWORD = 'P@$$w0rd2025';

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return res.json({
      message: 'Login successful',
      user: {
        userId: 'admin-hardcoded',
        username: ADMIN_USERNAME,
        role: 'admin',
        email: 'admin@aiotchlorella.local'
      }
    });
  }

  try {
    // Find user by username (need to explicitly select password since toJSON strips it)
    const user = await User.findOne({ username }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Compare password with hashed password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // On success, just return user info (no token)
    res.json({
      message: 'Login successful',
      user: {
        userId: user._id.toString(),
        username: user.username,
        role: user.role,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;