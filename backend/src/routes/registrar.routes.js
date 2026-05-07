const express = require('express');
const router = express.Router();
const {
  openSemesterRegistration,
  closeSemesterRegistration,
  createFeeStructure,
  generateInvoice,
  recordPayment,
  verifyPaymentProof,
  getPendingRegistrations,
  updateRegistrationStatus,
  approveRegistrationWithCourses,
  submitApplication,
  getApplications,
  processApplication,
  getStudents,
  getUnpaidStudents,
  getDashboardStats,
  progressStudentHandler,
  graduateStudentHandler,
  checkGraduationHandler,
  bulkProgressHandler,
} = require('../controllers/registrar.controller');
const { authenticateToken: protect } = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/role.middleware');
const upload = require('../utils/upload');

// Public routes (admissions)
router.post('/admissions/apply', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'transcript', maxCount: 1 },
  { name: 'idDocument', maxCount: 1 }
]), submitApplication);

// Protected routes
router.use(protect);

// Registrar/Admin only routes
router.use(allowRoles('REGISTRAR', 'ADMIN'));

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// Semester management
router.put('/semesters/:id/open-registration', openSemesterRegistration);
router.put('/semesters/close-registration', closeSemesterRegistration);

// Fee management
router.post('/fee-structures', createFeeStructure);
router.post('/invoices/generate', generateInvoice);
router.post('/payments', recordPayment);
router.put('/payments/:id/verify', verifyPaymentProof);

// Registration management
router.get('/registrations/pending', getPendingRegistrations);
router.put('/registrations/:id/approve', approveRegistrationWithCourses);
router.put('/registrations/:id/status', updateRegistrationStatus);

// Admissions management
router.get('/admissions', getApplications);
router.put('/admissions/:id/process', processApplication);

// Students
router.get('/students', getStudents);
router.get('/students/unpaid', getUnpaidStudents);

// Lifecycle management
router.post('/students/:studentId/progress', progressStudentHandler);
router.post('/students/:studentId/graduate', graduateStudentHandler);
router.get('/students/:studentId/graduation-check', checkGraduationHandler);
router.post('/students/bulk-progress', bulkProgressHandler);

module.exports = router;
