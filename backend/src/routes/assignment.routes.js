const express = require('express');
const router = express.Router();
const { authenticateToken: protect } = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/role.middleware');
const {
  createAssignment,
  getCourseAssignments,
  getMyAssignments,
  submitAssignment,
  getSubmissions,
  gradeSubmission,
} = require('../controllers/assignment.controller');

// Student
router.get('/my-assignments', protect, allowRoles('STUDENT'), getMyAssignments);
router.post('/submit', protect, allowRoles('STUDENT'), submitAssignment);

// Instructor / Admin
router.post('/', protect, allowRoles('INSTRUCTOR', 'ADMIN'), createAssignment);
router.get('/course/:courseId', protect, allowRoles('INSTRUCTOR', 'ADMIN'), getCourseAssignments);
router.get('/:assignmentId/submissions', protect, allowRoles('INSTRUCTOR', 'ADMIN'), getSubmissions);
router.put('/:submissionId/grade', protect, allowRoles('INSTRUCTOR', 'ADMIN'), gradeSubmission);

module.exports = router;