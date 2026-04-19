const express = require('express');
const router = express.Router();
const { getMyNotifications, markRead } = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/notifications', getMyNotifications);
router.put('/notifications/:id/read', markRead);

module.exports = router;
