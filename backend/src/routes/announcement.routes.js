const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');
const { getStudentAnnouncements, getInstructorAnnouncements, createAnnouncement } = require('../controllers/announcement.controller');

router.get('/', authenticateToken, getStudentAnnouncements);
router.get('/instructor', authenticateToken, authorizeRoles('INSTRUCTOR'), getInstructorAnnouncements);
router.post('/', authenticateToken, authorizeRoles('INSTRUCTOR', 'ADMIN', 'REGISTRAR'), createAnnouncement);

module.exports = router;
