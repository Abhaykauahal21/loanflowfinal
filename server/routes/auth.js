const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

// Create default admin if not exists
const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      const admin = new User({
        name: 'Admin',
        email: 'admin@example.com'.toLowerCase(),
        password: hashedPassword,
        role: 'admin'
      });
      
      await admin.save();
      console.log('Default admin created');
    }
  } catch (err) {
    console.error('Error creating default admin:', err);
  }
};

// Call this function when the server starts
createDefaultAdmin();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Enhanced input validation
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({
        type: 'validation_error',
        message: 'Please enter all required fields',
        status: 400,
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        type: 'validation_error',
        message: 'Please enter a valid email address',
        status: 400,
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        type: 'validation_error',
        message: 'Password must be at least 6 characters long',
        status: 400,
      });
    }

    // Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      return res.status(400).json({
        type: 'validation_error',
        message: 'User already exists',
        status: 400,
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'user'  // default to 'user' if role is not provided
    });

    await user.save();

    // Create token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('❌ Register error:', err);
    res.status(500).json({
      type: 'server_error',
      message: 'Server error during registration',
      status: 500,
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    console.log('👉 Login attempt for email:', req.body.email);
    const { email, password } = req.body;

    // Enhanced input validation
    if (!email?.trim() || !password?.trim()) {
      console.log('❌ Login validation failed: Missing fields');
      return res.status(400).json({
        type: 'validation_error',
        message: 'Please enter all required fields',
        status: 400,
      });
    }

    // Check MongoDB connection first
    if (mongoose.connection.readyState !== 1) {
      console.error('❌ MongoDB not connected. Current state:', mongoose.connection.readyState);
      return res.status(500).json({
        type: 'server_error',
        message: 'Database connection error. Please try again.',
        status: 500,
      });
    }

    // Check if user exists (using index)
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password')  // Explicitly include password field
      .catch(err => {
        console.error('❌ Database query error:', err);
        return null;
      });

    if (!user) {
      console.log('❌ Login failed: User not found for email:', email);
      return res.status(401).json({ 
        type: 'auth_error',
        message: 'Invalid email or password',
        status: 401,
      });
    }

    // Validate password exists in user document
    if (!user.password) {
      console.error('❌ User found but password field is missing for email:', email);
      return res.status(500).json({
        type: 'server_error',
        message: 'Account configuration error. Please contact support.',
        status: 500,
      });
    }

    // Validate password with consistent timing
    const isMatch = await bcrypt.compare(password, user.password)
      .catch(err => {
        console.error('❌ Password comparison error:', err);
        return false;
      });

    if (!isMatch) {
      console.log('❌ Login failed: Invalid password for email:', email);
      return res.status(401).json({ 
        type: 'auth_error',
        message: 'Invalid email or password',
        status: 401,
      });
    }

    console.log('✅ Login successful for email:', email);

    // Create token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({
      type: 'server_error',
      message: 'Server error during login',
      status: 500,
    });
  }
});

// Get current user
router.get('/user', require('../middleware/auth').auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error('❌ Get user error:', err);
    res.status(500).json({
      type: 'server_error',
      message: 'Server error fetching user',
      status: 500,
    });
  }
});

module.exports = router;
