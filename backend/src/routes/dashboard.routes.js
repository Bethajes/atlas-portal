const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { getMyDashboard } = require('../controllers/dashboard.controller');

router.get('/me', authenticateToken, getMyDashboard);

module.exports = router;
