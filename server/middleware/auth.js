const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({
        type: 'auth_error',
        message: 'Missing Authorization header',
        status: 401,
      });
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        type: 'auth_error',
        message: 'Invalid Authorization header format',
        status: 401,
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({
          type: 'auth_error',
          message: 'User no longer exists',
          status: 401,
        });
      }

      req.user = {
        id: user._id.toString(),
        role: user.role,
        email: user.email
      };
      
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          type: 'auth_error',
          message: 'Token has expired. Please login again.',
          status: 401,
        });
      }
      
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
          type: 'auth_error',
          message: 'Invalid token. Please login again.',
          status: 401,
        });
      }
      
      throw err;
    }
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({
      type: 'server_error',
      message: 'Internal server error during authentication',
      status: 500,
    });
  }
}

function adminOnly(req,res,next){
  if(req.user?.role !== 'admin') {
    return res.status(403).json({
      type: 'forbidden',
      message: 'Admins only',
      status: 403,
    });
  }
  next();
}

module.exports = { auth, adminOnly };
