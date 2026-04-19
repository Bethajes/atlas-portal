const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');
const {
  getStudentMe, updateStudentMe, getMyProfile, getMyCourses, getMyGrades,
  getMyAcademicRecord, getMyLifecycle, getMyTranscript,
} = require('../controllers/student.controller');

if (!fs.existsSync('uploads/students')) {
  fs.mkdirSync('uploads/students', { recursive: true });
}

const studentPhotoStorage = multer.diskStorage({
  destination: 'uploads/students',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `student-photo-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const studentPhotoUpload = multer({
  storage: studentPhotoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = String(file.mimetype || '').toLowerCase();
    const allowedImage = ['.jpg', '.jpeg', '.png'].includes(ext) && ['image/jpeg', 'image/jpg', 'image/png'].includes(mime);
    if (!allowedImage) return cb(new Error('Only JPG and PNG images are allowed'));
    cb(null, true);
  },
});

router.get('/me', authenticateToken, authorizeRoles('STUDENT'), getStudentMe);
router.put('/me', authenticateToken, authorizeRoles('STUDENT'), studentPhotoUpload.single('photo'), updateStudentMe);
router.get('/profile', authenticateToken, authorizeRoles('STUDENT'), getMyProfile);
router.get('/courses', authenticateToken, authorizeRoles('STUDENT'), getMyCourses);
router.get('/grades', authenticateToken, authorizeRoles('STUDENT'), getMyGrades);
router.get('/academic-record', authenticateToken, authorizeRoles('STUDENT'), getMyAcademicRecord);
router.get('/lifecycle', authenticateToken, authorizeRoles('STUDENT'), getMyLifecycle);
router.get('/transcript', authenticateToken, authorizeRoles('STUDENT'), getMyTranscript);
router.get('/assignments', authenticateToken, authorizeRoles('STUDENT'), async (req, res) => {
  // Proxy to assignment controller logic
  const { getMyAssignments } = require('../controllers/assignment.controller');
  return getMyAssignments(req, res);
});

module.exports = router;
