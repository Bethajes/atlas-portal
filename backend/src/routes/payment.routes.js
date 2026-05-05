const express = require('express');
const router = express.Router();
const { authenticateToken: protect } = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/role.middleware');
const {
  initiatePayment,
  verifyPayment,
  paymentWebhook,
  getMyInvoices,
  uploadProof,
  getMyPayments,
  getAllPayments,
  getAllPaymentsAdmin,
  approvePayment,
  rejectPayment,
  generateInvoices,
  applyDiscountEndpoint,
} = require('../controllers/payment.controller');
const upload = require('../utils/upload');

// Public webhook — bank calls this (no auth)
router.post('/webhook', paymentWebhook);

// Student
router.post('/initiate', protect, allowRoles('STUDENT'), initiatePayment);
router.post('/verify', protect, allowRoles('STUDENT'), verifyPayment);
router.get('/my-invoices', protect, allowRoles('STUDENT'), getMyInvoices);
router.post('/upload-proof', protect, allowRoles('STUDENT'), upload.single('proof'), uploadProof);
router.get('/my-payments', protect, allowRoles('STUDENT'), getMyPayments);

// Admin / Registrar — legacy
router.get('/', protect, allowRoles('ADMIN', 'REGISTRAR'), getAllPayments);

// Admin / Registrar — payment proof management (Requirements: 3.1, 4.1, 4.3)
router.get('/admin/payments', protect, allowRoles('ADMIN', 'REGISTRAR'), getAllPaymentsAdmin);
router.put('/admin/payments/:id/approve', protect, allowRoles('ADMIN', 'REGISTRAR'), approvePayment);
router.put('/admin/payments/:id/reject', protect, allowRoles('ADMIN', 'REGISTRAR'), rejectPayment);

// Admin / Registrar — invoice management (Requirements: 6.1, 8.1)
router.post('/admin/invoices/generate', protect, allowRoles('ADMIN', 'REGISTRAR'), generateInvoices);
router.put('/admin/invoices/:id/discount', protect, allowRoles('ADMIN', 'REGISTRAR'), applyDiscountEndpoint);

module.exports = router;