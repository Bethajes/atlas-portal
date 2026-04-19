const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required',
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this'
    );
    // Normalize: ensure req.user.id is always set regardless of token payload shape
    req.user = { ...decoded, id: decoded.id || decoded.userId };
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }
    
    return res.status(403).json({
      success: false,
      message: 'Invalid token',
    });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

// Default export for routes that do `const protect = require('../middleware/auth.middleware')`
module.exports = authenticateToken;
module.exports.protect = authenticateToken;
module.exports.authorize = authorizeRoles;
module.exports.authenticateToken = authenticateToken;
module.exports.authorizeRoles = authorizeRoles;