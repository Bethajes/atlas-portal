const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');
const {
  createSection,
  getSections,
  getSection,
  updateSection,
  deleteSection,
  enrollInSection,
  assignGrade,
  getMyStudents,
  getMySections,
  getMyEnrollments,
  smartAssign,
  bulkAssignStudents,
  getSectionSuggestions,
  validateSection,
} = require('../controllers/section.controller');

// Student — view their own section enrollments
router.get('/my-enrollments', authenticateToken, authorizeRoles('STUDENT'), getMyEnrollments);

// Instructor — view their assigned sections
router.get('/my-sections', authenticateToken, authorizeRoles('INSTRUCTOR'), getMySections);

// Instructor — unified student list across sections (for fast search/dashboard)
router.get('/my-students', authenticateToken, authorizeRoles('INSTRUCTOR'), getMyStudents);

// Admin/Registrar — manage sections
router.post('/', authenticateToken, authorizeRoles('ADMIN', 'REGISTRAR'), createSection);
router.post('/enroll', authenticateToken, authorizeRoles('ADMIN', 'REGISTRAR'), enrollInSection);
router.get('/', authenticateToken, getSections);
router.get('/:id', authenticateToken, getSection);
router.put('/:id', authenticateToken, authorizeRoles('ADMIN', 'REGISTRAR'), updateSection);
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN'), deleteSection);

// Instructor/Admin — assign grades
router.put('/:sectionId/students/:studentId/grade', authenticateToken, authorizeRoles('INSTRUCTOR', 'ADMIN'), assignGrade);

// Advanced features
router.post('/:id/smart-assign', authenticateToken, authorizeRoles('ADMIN', 'REGISTRAR'), smartAssign);
router.post('/bulk/assign', authenticateToken, authorizeRoles('ADMIN', 'REGISTRAR'), bulkAssignStudents);
router.get('/:id/suggestions', authenticateToken, getSectionSuggestions);
router.post('/validate', authenticateToken, validateSection);

module.exports = router;
