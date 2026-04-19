const prisma = require('../services/prisma');
const crypto = require('crypto');

// ─── GENERATE REFERENCE NUMBER ───────────────────────────────
const generateRef = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 90000 + 10000);
  return `ATL-${year}-${rand}`;
};

// ─── MOCK BANK API ───────────────────────────────────────────
// Simulates Awash Bank / Telebirr verification
// In production: replace this with real bank API call
const mockBankVerify = (transactionId, amount) => {
  // These transaction IDs always succeed in demo mode
  const DEMO_SUCCESS_IDS = [
    'AWB-12345', 'AWB-54321', 'TLB-99999',
    'TLB-11111', 'AWB-00001', 'DEMO-PAY',
  ];

  if (DEMO_SUCCESS_IDS.includes(transactionId.toUpperCase())) {
    return {
      success: true,
      verified: true,
      bankRef: transactionId.toUpperCase(),
      amountConfirmed: amount,
      message: 'Transaction verified successfully',
    };
  }

  // Simulate: any ID starting with "AWB-" or "TLB-" with 5+ digits works
  const pattern = /^(AWB|TLB|CBE|BOA)-\d{5,}$/i;
  if (pattern.test(transactionId)) {
    return {
      success: true,
      verified: true,
      bankRef: transactionId.toUpperCase(),
      amountConfirmed: amount,
      message: 'Transaction verified successfully',
    };
  }

  return {
    success: false,
    verified: false,
    message: 'Transaction not found in bank records',
  };
};

// ─── CREATE INVOICE + PENDING PAYMENT ────────────────────────
const initiatePayment = async (req, res) => {
  try {
    const { semesterId } = req.body;
    const userId = req.user.id;

    const student = await prisma.student.findUnique({
      where: { userId },
      include: { program: true },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    // Get fee structure for this program + semester
    const feeStructure = await prisma.feeStructure.findUnique({
      where: { programId_semesterId: { programId: student.programId, semesterId } },
    });

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message: 'No fee structure found for your program this semester',
      });
    }

    // Check if invoice already exists
    let invoice = await prisma.invoice.findFirst({
      where: { studentId: student.id, semesterId },
    });

    if (!invoice) {
      const invoiceNumber = `INV-${Date.now()}`;
      invoice = await prisma.invoice.create({
        data: {
          id: crypto.randomUUID(),
          invoiceNumber,
          studentId: student.id,
          semesterId,
          feeStructureId: feeStructure.id,
          totalAmount: feeStructure.totalFee,
          paidAmount: 0,
          dueAmount: feeStructure.totalFee,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
          status: 'PENDING',
          updatedAt: new Date(),
        },
      });
    }

    // Create a pending payment record with unique reference
    const referenceNumber = generateRef();

    const payment = await prisma.payment.create({
      data: {
        id: crypto.randomUUID(),
        studentId: student.id,
        invoiceId: invoice.id,
        amount: feeStructure.totalFee,
        referenceNumber,
        status: 'PENDING',
        updatedAt: new Date(),
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Payment initiated. Use the reference number at your bank.',
      payment: {
        id: payment.id,
        referenceNumber: payment.referenceNumber,
        amount: payment.amount,
        status: payment.status,
        invoiceNumber: invoice.invoiceNumber,
      },
      instructions: {
        step1: `Note your reference number: ${referenceNumber}`,
        step2: 'Open Awash Bank or Telebirr app',
        step3: 'Select "School / Education Payment"',
        step4: 'Enter Atlas Health College and your reference number',
        step5: 'Complete the payment, then come back to verify',
      },
    });
  } catch (error) {
    console.error('Initiate payment error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── VERIFY PAYMENT (student clicks "Verify My Payment") ─────
const verifyPayment = async (req, res) => {
  try {
    const { referenceNumber, bankTransactionId } = req.body;

    if (!referenceNumber || !bankTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'referenceNumber and bankTransactionId are required',
      });
    }

    // Find the pending payment
    const payment = await prisma.payment.findUnique({
      where: { referenceNumber },
      include: { invoice: true },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: `Reference number ${referenceNumber} not found`,
      });
    }

    if (payment.status === 'SUCCESSFUL') {
      return res.status(400).json({
        success: false,
        message: 'This payment has already been verified',
      });
    }

    // Call mock bank API (replace with real Awash/Telebirr API in production)
    const bankResult = mockBankVerify(bankTransactionId, payment.amount);

    if (!bankResult.verified) {
      // Mark as failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', updatedAt: new Date() },
      });
      return res.status(400).json({
        success: false,
        message: bankResult.message,
        tip: 'Valid test IDs: AWB-12345, TLB-99999, or any AWB-XXXXX / TLB-XXXXX format',
      });
    }

    // Payment verified — update payment + invoice
    const receiptNumber = `RCP-${Date.now()}`;

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        bankTransactionId: bankResult.bankRef,
        status: 'SUCCESSFUL',
        paymentDate: new Date(),
        verifiedAt: new Date(),
        receiptNumber,
        updatedAt: new Date(),
      },
    });

    await prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: {
        paidAmount: payment.amount,
        dueAmount: 0,
        status: 'PAID',
        updatedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully! You can now register for courses.',
      receipt: {
        receiptNumber,
        referenceNumber,
        bankTransactionId: bankResult.bankRef,
        amount: payment.amount,
        verifiedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Verify payment error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── WEBHOOK (bank calls this automatically after payment) ────
const paymentWebhook = async (req, res) => {
  try {
    const { referenceNumber, bankTransactionId, amount, status } = req.body;

    // In production: validate webhook signature from bank here
    // const signature = req.headers['x-bank-signature'];
    // if (!validateSignature(signature, req.body)) return res.status(401).end();

    if (!referenceNumber || !bankTransactionId) {
      return res.status(400).json({ success: false, message: 'Invalid webhook payload' });
    }

    const payment = await prisma.payment.findUnique({
      where: { referenceNumber },
    });

    if (!payment) {
      console.warn(`Webhook: unknown reference ${referenceNumber}`);
      return res.status(404).json({ success: false, message: 'Reference not found' });
    }

    if (payment.status === 'SUCCESSFUL') {
      return res.status(200).json({ success: true, message: 'Already processed' });
    }

    const receiptNumber = `RCP-${Date.now()}`;

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        bankTransactionId,
        status: status === 'SUCCESS' ? 'SUCCESSFUL' : 'FAILED',
        paymentDate: new Date(),
        verifiedAt: new Date(),
        receiptNumber: status === 'SUCCESS' ? receiptNumber : null,
        updatedAt: new Date(),
      },
    });

    if (status === 'SUCCESS') {
      await prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          paidAmount: payment.amount,
          dueAmount: 0,
          status: 'PAID',
          updatedAt: new Date(),
        },
      });
    }

    console.log(`Webhook processed: ${referenceNumber} → ${status}`);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET MY PAYMENTS (student) ────────────────────────────────
const getMyPayments = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const payments = await prisma.payment.findMany({
      where: { studentId: student.id },
      include: {
        invoice: {
          include: { semester: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ success: true, payments });
  } catch (error) {
    console.error('Get payments error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET ALL PAYMENTS (admin/registrar) ───────────────────────
const getAllPayments = async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        student: {
          include: { user: { select: { name: true, institutionalEmail: true } } },
        },
        invoice: {
          include: { semester: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ success: true, payments });
  } catch (error) {
    console.error('Get all payments error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  initiatePayment,
  verifyPayment,
  paymentWebhook,
  getMyPayments,
  getAllPayments,
};