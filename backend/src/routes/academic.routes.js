const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');
const {
  createDepartment, getDepartments, getDepartmentById,
  createProgram, getPrograms, getProgramCurriculum,
  createStudentProfile, getStudentProfile, getStudents,
  createInstructorProfile, getInstructors, getInstructorSchedule,
  createSemester, getActiveSemester, getSemesters,
} = require('../controllers/academic.controller');

// ── Semesters ──────────────────────────────────────────────
// IMPORTANT: /active must come before /:id
router.get('/semesters/active', getActiveSemester); // Public for admissions
router.get('/semesters', getSemesters); // Public for admissions
router.post('/semesters', authenticateToken, authorizeRoles('ADMIN', 'REGISTRAR'), createSemester);
router.put('/semesters/:id', authenticateToken, authorizeRoles('ADMIN', 'REGISTRAR'), async (req, res) => {
  // Inline update for flexibility
  const prisma = require('../services/prisma');
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Resolve date values for validation (use existing record values if not provided)
    const existing = await prisma.academicSemester.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Semester not found' });

    const regStart = updates.registrationStart ? new Date(updates.registrationStart) : existing.registrationStart;
    const regEnd = updates.registrationEnd ? new Date(updates.registrationEnd) : existing.registrationEnd;
    const start = updates.startDate ? new Date(updates.startDate) : existing.startDate;
    const end = updates.endDate ? new Date(updates.endDate) : existing.endDate;

    if (regStart >= regEnd) {
      return res.status(400).json({ success: false, message: 'registrationStart must be before registrationEnd' });
    }
    if (start >= end) {
      return res.status(400).json({ success: false, message: 'startDate must be before endDate' });
    }

    const dateFields = ['startDate', 'endDate', 'registrationStart', 'registrationEnd', 'dropDeadline', 'addDeadline'];
    dateFields.forEach(f => { if (updates[f]) updates[f] = new Date(updates[f]); });
    if (updates.year) updates.year = parseInt(updates.year);
    const semester = await prisma.academicSemester.update({ where: { id }, data: updates });
    res.json({ success: true, data: semester });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});
router.patch('/semesters/:id/activate', authenticateToken, authorizeRoles('ADMIN', 'REGISTRAR'), async (req, res) => {
  const prisma = require('../services/prisma');
  try {
    const semester = await prisma.$transaction(async (tx) => {
      await tx.academicSemester.updateMany({ data: { isActive: false } });
      return tx.academicSemester.update({ where: { id: req.params.id }, data: { isActive: true } });
    });
    res.json({ success: true, data: semester });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Departments ────────────────────────────────────────────
router.get('/departments', getDepartments); // Make public for admissions
router.post('/departments', authenticateToken, authorizeRoles('ADMIN'), createDepartment);
router.get('/departments/:id', getDepartmentById); // Make public for admissions

// ── Programs ───────────────────────────────────────────────
router.get('/programs', getPrograms); // Public for admissions
router.post('/programs', authenticateToken, authorizeRoles('ADMIN'), createProgram);
router.get('/programs/:id/curriculum', authenticateToken, getProgramCurriculum);

// ── Students ───────────────────────────────────────────────
router.get('/students', authenticateToken, authorizeRoles('ADMIN', 'REGISTRAR'), getStudents);
router.post('/students', authenticateToken, authorizeRoles('ADMIN', 'REGISTRAR'), createStudentProfile);
router.get('/students/:id', authenticateToken, getStudentProfile);

// ── Instructors ────────────────────────────────────────────
router.get('/instructors', authenticateToken, getInstructors);
router.post('/instructors', authenticateToken, authorizeRoles('ADMIN'), createInstructorProfile);
router.get('/instructors/:id/schedule', authenticateToken, getInstructorSchedule);

module.exports = router;
