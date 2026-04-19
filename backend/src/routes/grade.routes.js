const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');
const { enterFinalGrade, getMyGrades, getCourseGrades } = require('../controllers/grade.controller');

// Student: get own grades
router.get('/my-grades', authenticateToken, authorizeRoles('STUDENT'), getMyGrades);

// Instructor/Admin: enter final grade
router.post('/enter', authenticateToken, authorizeRoles('INSTRUCTOR', 'ADMIN'), enterFinalGrade);

// Instructor/Admin: get all grades for a course
router.get('/course/:courseId', authenticateToken, authorizeRoles('INSTRUCTOR', 'ADMIN'), getCourseGrades);

module.exports = router;
