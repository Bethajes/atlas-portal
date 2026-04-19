const express = require('express');
const router = express.Router();
const { authenticateToken: protect } = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/role.middleware');
const {
  initiatePayment,
  verifyPayment,
  paymentWebhook,
  getMyPayments,
  getAllPayments,
} = require('../controllers/payment.controller');

// Public webhook — bank calls this (no auth)
router.post('/webhook', paymentWebhook);

// Student
router.post('/initiate', protect, allowRoles('STUDENT'), initiatePayment);
router.post('/verify', protect, allowRoles('STUDENT'), verifyPayment);
router.get('/my-payments', protect, allowRoles('STUDENT'), getMyPayments);

// Admin / Registrar
router.get('/', protect, allowRoles('ADMIN', 'REGISTRAR'), getAllPayments);

module.exports = router;