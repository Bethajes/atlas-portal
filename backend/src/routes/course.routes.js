const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');
const {
  createCourse, getCourses, getCourse, updateCourse,
  enrollStudent, getMyCourses, getInstructorCourses,
} = require('../controllers/course.controller');

// Student
router.get('/my-courses', authenticateToken, authorizeRoles('STUDENT'), getMyCourses);

// Instructor
router.get('/teaching', authenticateToken, authorizeRoles('INSTRUCTOR'), getInstructorCourses);

// Admin/Registrar
router.post('/', authenticateToken, authorizeRoles('ADMIN', 'REGISTRAR'), createCourse);
router.post('/enroll', authenticateToken, authorizeRoles('ADMIN', 'REGISTRAR'), enrollStudent);

// Shared (authenticated)
router.get('/', authenticateToken, getCourses);
router.get('/:id', authenticateToken, getCourse);
router.put('/:id', authenticateToken, authorizeRoles('ADMIN', 'REGISTRAR'), updateCourse);

// Get students in a course
router.get('/:courseId/students', authenticateToken, authorizeRoles('INSTRUCTOR', 'REGISTRAR', 'ADMIN'), async (req, res) => {
  const prisma = require('../services/prisma');
  try {
    const { courseId } = req.params;
    if (req.user.role === 'INSTRUCTOR') {
      const instructor = await prisma.instructor.findUnique({ where: { userId: req.user.id } });
      const course = await prisma.course.findFirst({ where: { id: courseId, instructorId: instructor?.id } });
      if (!course) return res.status(403).json({ success: false, message: 'Not authorized for this course' });
    }
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId, status: 'ENROLLED' },
      include: { student: { include: { user: { select: { id: true, name: true, institutionalEmail: true } } } } },
    });
    const students = enrollments.map(e => ({
      id: e.student.userId,
      studentId: e.student.studentId,
      name: e.student.user.name,
      email: e.student.user.institutionalEmail,
    }));
    res.json({ success: true, students });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
