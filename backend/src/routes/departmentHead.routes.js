const express = require('express');
const router = express.Router();
const { authenticateToken: protect } = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/role.middleware');
const {
  getMyDepartment,
  getDepartmentInstructors,
  getDepartmentCourses,
  assignInstructorToCourse,
  getUnassignedCourses,
  getInstructorWorkload,
  promoteToDepartmentHead,
} = require('../controllers/departmentHead.controller');

// All routes require authentication
router.use(protect);

// Department Head routes (we'll use allowRoles temporarily until isDepartmentHead middleware is fixed)
router.get('/my-department', allowRoles('INSTRUCTOR', 'ADMIN'), getMyDepartment);
router.get('/instructors', allowRoles('INSTRUCTOR', 'ADMIN'), getDepartmentInstructors);
router.get('/courses', allowRoles('INSTRUCTOR', 'ADMIN'), getDepartmentCourses);
router.get('/courses/unassigned', allowRoles('INSTRUCTOR', 'ADMIN'), getUnassignedCourses);
router.post('/courses/:courseId/assign', allowRoles('INSTRUCTOR', 'ADMIN'), assignInstructorToCourse);
router.get('/instructors/workload', allowRoles('INSTRUCTOR', 'ADMIN'), getInstructorWorkload);
router.put('/promote/:instructorId', allowRoles('ADMIN'), promoteToDepartmentHead);

module.exports = router;