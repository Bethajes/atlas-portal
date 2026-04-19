const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');
const requireAdminRole = require('../middleware/adminRole.middleware');
const {
  createDepartment,
  getDepartments,
  getDeletedDepartments,
  restoreDepartment,
  updateDepartment,
  deleteDepartment,
  createProgram,
  getPrograms,
  getDeletedPrograms,
  restoreProgram,
  updateProgram,
  deleteProgram,
  getAuditLogs,
  updateStudentAdmin,
  deleteStudentAdmin,
} = require('../controllers/adminAcademic.controller');
const { getAnalytics } = require('../controllers/analytics.controller');

router.use(authenticateToken, authorizeRoles('ADMIN'));

// Departments
router.post('/departments', createDepartment);
router.get('/departments', getDepartments);
router.get('/departments/deleted', requireAdminRole('SUPER_ADMIN'), getDeletedDepartments);
router.put('/departments/:id/restore', requireAdminRole('SUPER_ADMIN'), restoreDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);

// Programs
router.post('/programs', createProgram);
router.get('/programs', getPrograms);
router.get('/programs/deleted', requireAdminRole('SUPER_ADMIN'), getDeletedPrograms);
router.put('/programs/:id/restore', requireAdminRole('SUPER_ADMIN'), restoreProgram);
router.put('/programs/:id', updateProgram);
router.delete('/programs/:id', deleteProgram);

// Students (admin maintenance)
router.put('/students/:id', updateStudentAdmin);
router.delete('/students/:id', requireAdminRole('SUPER_ADMIN'), deleteStudentAdmin);

// Audit
router.get('/audit-logs', requireAdminRole('SUPER_ADMIN'), getAuditLogs);

// Analytics
router.get('/analytics', getAnalytics);

module.exports = router;
