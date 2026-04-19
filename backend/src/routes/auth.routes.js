const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const {
  register,
  login,
  getMe,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
} = require('../controllers/auth.controller');

const upload = require('../utils/upload');

router.post('/register', upload.single('profileImage'), register);
router.post('/login', login);
router.post('/change-password', authenticateToken, changePassword);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/me', authenticateToken, getMe);

module.exports = router;
