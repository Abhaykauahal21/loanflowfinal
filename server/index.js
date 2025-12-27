require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const checkEnvVariables = require('./utils/checkEnv');

// Check required environment variables before starting
checkEnvVariables();

const app = express();

// Log all requests in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
}

// Enhanced CORS configuration
const corsOrigins = ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3003', 'http://127.0.0.1:3003'];

// Add production frontend URLs
if (process.env.FRONTEND_URL) {
  const frontendUrls = Array.isArray(process.env.FRONTEND_URL) 
    ? process.env.FRONTEND_URL 
    : process.env.FRONTEND_URL.split(',').map(url => url.trim());
  corsOrigins.push(...frontendUrls);
}

// Add common Render frontend URLs
corsOrigins.push('https://loan-p6fo.onrender.com');

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Allow all Render.com domains in production
    if (origin.includes('.onrender.com')) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (corsOrigins.some(allowed => origin === allowed || origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      // Log for debugging but allow in production to avoid blocking
      console.warn(`CORS: Origin ${origin} not in allowed list, but allowing for production`);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Increased payload size limit and proper body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static('uploads')); // serve files in dev

// Root route
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Loan App API Server',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  await connectDB();

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (process.env.NODE_ENV === 'development') {
          return callback(null, true);
        }
        // Allow all Render.com domains
        if (origin.includes('.onrender.com')) {
          return callback(null, true);
        }
        if (corsOrigins.some(allowed => origin === allowed || origin.startsWith(allowed))) {
          callback(null, true);
        } else {
          callback(null, true); // Allow in production
        }
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake?.auth?.token;
    if (!token) return next();
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.userId = decoded?.id;
      socket.data.role = decoded?.role;
      return next();
    } catch (err) {
      return next();
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data?.userId;
    const role = socket.data?.role;

    if (userId) socket.join(`user:${userId}`);
    if (role) socket.join(`role:${role}`);
  });

  app.set('io', io);

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/loans', require('./routes/loan'));
  app.use('/api/payments', require('./routes/payment'));
  app.use('/api/admin', require('./routes/admin'));

  // 404 handler for undefined routes
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      type: 'not_found',
      message: `Route ${req.method} ${req.path} not found`,
      status: 404,
      availableEndpoints: [
        'GET /',
        'GET /api/health',
        'POST /api/auth/register',
        'POST /api/auth/login',
        'GET /api/loans/my',
        'GET /api/loans/dashboard-stats',
        'POST /api/loans/apply',
        'GET /api/admin/loans',
        'GET /api/admin/stats'
      ]
    });
  });

  app.use((err, req, res, next) => {
    const status = Number(err?.status || err?.statusCode || 500);
    const type = err?.type || (status >= 500 ? 'server_error' : 'request_error');
    const message = err?.message || 'Internal Server Error';

    if (status >= 500) {
      console.error(err);
    }

    res.status(status).json({ type, message, status });
  });

  const PORT = process.env.PORT || 5006;

  server.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log('👉 API endpoints:');
    console.log('   POST /api/auth/login');
    console.log('   POST /api/auth/register');
    console.log('   GET  /api/health');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Try a different port.`);
      process.exit(1);
    } else {
      console.error('❌ Server error:', err);
      process.exit(1);
    }
  });
}

start().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
