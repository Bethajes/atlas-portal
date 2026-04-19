const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');
const { getStudentAnnouncements, createAnnouncement } = require('../controllers/announcement.controller');

router.get('/', authenticateToken, getStudentAnnouncements);
router.post('/', authenticateToken, authorizeRoles('INSTRUCTOR', 'ADMIN', 'REGISTRAR'), createAnnouncement);

module.exports = router;
