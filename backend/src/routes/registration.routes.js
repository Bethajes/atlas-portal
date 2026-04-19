const express = require('express');
const router = express.Router();
const {
  getAvailableCourses,
  getMyDraft,
  saveDraft,
  uploadReceiptAndSubmit,
  confirmRegistration,
  sendRegistrationNotifications,
} = require('../controllers/registration.controller');
const { authenticateToken: protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { registrationDraftSchema } = require('../validators/registration.validator');
const upload = require('../utils/upload');

// All routes are protected and for students only
router.use(protect);

// Registrar/Admin notification endpoint (before student-only middleware)
router.post('/notify', authorize('REGISTRAR', 'ADMIN'), sendRegistrationNotifications);

router.use(authorize('STUDENT'));

router.get('/available-courses', getAvailableCourses);
router.get('/my-draft', getMyDraft);
router.post('/confirm', confirmRegistration);
router.post('/draft', validate(registrationDraftSchema), saveDraft);
router.post('/:id/receipt', upload.single('receipt'), uploadReceiptAndSubmit);

module.exports = router;
