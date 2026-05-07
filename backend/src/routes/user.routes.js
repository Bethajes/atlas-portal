const express = require('express');
const router = express.Router();
const { getMyNotifications, markRead, sendUserNotification } = require('../controllers/user.controller');
const { protect, authorizeRoles } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/notifications', getMyNotifications);
router.post('/notifications', authorizeRoles('INSTRUCTOR', 'ADMIN', 'REGISTRAR'), sendUserNotification);
router.put('/notifications/:id/read', markRead);

module.exports = router;
