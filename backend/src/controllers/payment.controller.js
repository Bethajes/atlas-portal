const prisma = require('../services/prisma');
const crypto = require('crypto');
const { applyOverdueIfNeeded, generateReferenceNumber, applyDiscount } = require('../utils/payment.utils');
const chapaService = require('../services/chapa.service');
const paymentService = require('../services/paymentService');

// ─── UNIFIED PAYMENT INITIALIZATION ───────────────────────────
const initiateUnifiedPayment = async (req, res) => {
  try {
    const { amount, phoneNumber, provider } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    if (!provider) {
      return res.status(400).json({ success: false, message: 'Payment provider is required' });
    }

    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const payment = await paymentService.initiate({
      studentId: student.id,
      amount,
      phoneNumber,
      provider,
    });

    return res.status(200).json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        reference: payment.reference,
        status: payment.status,
        amount: payment.amount,
        expiresAt: payment.expiresAt,
      },
    });
  } catch (error) {
    console.error('Unified Payment Initiation Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── UNIFIED PAYMENT STATUS ───────────────────────────────────
const getUnifiedPaymentStatus = async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Reference is required' });
    }

    const payment = await paymentService.getStatus(reference);

    return res.status(200).json({
      success: true,
      data: {
        reference: payment.reference,
        status: payment.status,
        amount: payment.amount,
        paidAt: payment.paidAt,
        provider: payment.provider,
      },
    });
  } catch (error) {
    console.error('Unified Payment Status Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── AWASH WEBHOOK HANDLER ────────────────────────────────────
const awashWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-arifpay-signature'];
    const payload = req.body;

    await paymentService.handleWebhook('AWASH', payload, signature);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Awash Webhook Error:', error.message);
    // Always return 200 to provider but log error
    return res.status(200).json({ success: false, message: error.message });
  }
};

// ─── CHAPA PAYMENT INITIALIZATION ─────────────────────────────
const initializeChapaPayment = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const student = await prisma.student.findUnique({
      where: { userId },
      include: { user: true }
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const tx_ref = `ATLAS-${student.studentId}-${Date.now()}`;

    // Save pending payment in DB
    await prisma.studentPayment.create({
      data: {
        studentId: student.id,
        reference: tx_ref,
        amount: parseFloat(amount),
        status: 'PENDING',
        isPaid: false,
      },
    });

    // Initialize Chapa Payment
    const chapaData = {
      amount: amount.toString(),
      currency: 'ETB',
      email: student.user.institutionalEmail,
      first_name: student.firstName || student.user.name.split(' ')[0],
      last_name: student.user.name.split(' ')[1] || '',
      tx_ref,
      callback_url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/pay/webhook`,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-status?tx_ref=${tx_ref}`,
      customization: {
        title: 'Tuition Fee Payment',
        description: 'Payment for New Generation University College Portal',
      },
    };

    const response = await chapaService.initializePayment(chapaData);

    if (response.status === 'success') {
      return res.status(200).json({
        success: true,
        checkout_url: response.data.checkout_url,
        tx_ref,
      });
    } else {
      throw new Error(response.message || 'Chapa initialization failed');
    }
  } catch (error) {
    console.error('Initialize Chapa Payment Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CHAPA WEBHOOK HANDLER ────────────────────────────────────
const chapaWebhook = async (req, res) => {
  try {
    const hash = crypto
      .createHmac('sha256', process.env.CHAPA_WEBHOOK_SECRET || '')
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-chapa-signature']) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const { tx_ref, status } = req.body;

    if (!tx_ref) {
      return res.status(400).json({ success: false, message: 'No reference provided' });
    }

    // Verify transaction with Chapa API (Production safety)
    const verification = await chapaService.verifyTransaction(tx_ref);

    if (verification.status === 'success' && verification.data.status === 'success') {
      const payment = await prisma.studentPayment.findUnique({
        where: { reference: tx_ref },
      });

      if (payment && !payment.isPaid) {
        await prisma.studentPayment.update({
          where: { id: payment.id },
          data: {
            status: 'SUCCESS',
            isPaid: true,
            paidAt: new Date(),
          },
        });
        console.log(`Payment successful for reference: ${tx_ref}`);
      }
    } else {
      await prisma.studentPayment.update({
        where: { reference: tx_ref },
        data: { status: 'FAILED' },
      });
      console.log(`Payment failed for reference: ${tx_ref}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Chapa Webhook Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET PAYMENT STATUS ───────────────────────────────────────
const getPaymentStatus = async (req, res) => {
  try {
    const { tx_ref } = req.params;

    const payment = await prisma.studentPayment.findUnique({
      where: { reference: tx_ref },
      select: {
        status: true,
        isPaid: true,
        amount: true,
        paidAt: true,
      }
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    return res.status(200).json({
      success: true,
      status: payment.status,
      isPaid: payment.isPaid,
      amount: payment.amount,
      paidAt: payment.paidAt,
    });
  } catch (error) {
    console.error('Get Payment Status Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GENERATE REFERENCE NUMBER ───────────────────────────────
const generateRef = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 90000 + 10000);
  return `ATL-${year}-${rand}`;
};

// ─── MOCK BANK API ───────────────────────────────────────────
const mockBankVerify = (transactionId, amount) => {
  const DEMO_SUCCESS_IDS = ['AWB-12345', 'AWB-54321', 'TLB-99999', 'TLB-11111', 'AWB-00001', 'DEMO-PAY'];
  if (DEMO_SUCCESS_IDS.includes(transactionId.toUpperCase())) {
    return { success: true, verified: true, bankRef: transactionId.toUpperCase(), amountConfirmed: amount, message: 'Transaction verified successfully' };
  }
  const pattern = /^(AWB|TLB|CBE|BOA)-\d{5,}$/i;
  if (pattern.test(transactionId)) {
    return { success: true, verified: true, bankRef: transactionId.toUpperCase(), amountConfirmed: amount, message: 'Transaction verified successfully' };
  }
  return { success: false, verified: false, message: 'Transaction not found in bank records' };
};

// ─── CREATE INVOICE + PENDING PAYMENT ────────────────────────
const initiatePayment = async (req, res) => {
  try {
    const { semesterId } = req.body;
    const userId = req.user.id;
    const student = await prisma.student.findUnique({ where: { userId }, include: { program: true } });
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

    const feeStructure = await prisma.feeStructure.findUnique({
      where: { programId_semesterId: { programId: student.programId, semesterId } },
    });
    if (!feeStructure) return res.status(404).json({ success: false, message: 'No fee structure found for your program this semester' });

    let invoice = await prisma.invoice.findFirst({ where: { studentId: student.id, semesterId } });
    if (!invoice) {
      invoice = await prisma.invoice.create({
        data: {
          id: crypto.randomUUID(),
          invoiceNumber: `INV-${Date.now()}`,
          studentId: student.id,
          semesterId,
          feeStructureId: feeStructure.id,
          totalAmount: feeStructure.totalFee,
          paidAmount: 0,
          dueAmount: feeStructure.totalFee,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          status: 'PENDING',
          updatedAt: new Date(),
        },
      });
    }

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
      payment: { id: payment.id, referenceNumber: payment.referenceNumber, amount: payment.amount, status: payment.status, invoiceNumber: invoice.invoiceNumber },
      instructions: {
        step1: `Note your reference number: ${referenceNumber}`,
        step2: 'Open Awash Bank or Telebirr app',
        step3: 'Select "School / Education Payment"',
        step4: 'Enter New Generation University College and your reference number',
        step5: 'Complete the payment, then come back to verify',
      },
    });
  } catch (error) {
    console.error('Initiate payment error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── VERIFY PAYMENT ──────────────────────────────────────────
const verifyPayment = async (req, res) => {
  try {
    const { referenceNumber, bankTransactionId } = req.body;
    if (!referenceNumber || !bankTransactionId) {
      return res.status(400).json({ success: false, message: 'referenceNumber and bankTransactionId are required' });
    }

    const payment = await prisma.payment.findUnique({ where: { referenceNumber }, include: { invoice: true } });
    if (!payment) return res.status(404).json({ success: false, message: `Reference number ${referenceNumber} not found` });
    if (payment.status === 'SUCCESSFUL') return res.status(400).json({ success: false, message: 'This payment has already been verified' });

    const bankResult = mockBankVerify(bankTransactionId, payment.amount);
    if (!bankResult.verified) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', updatedAt: new Date() } });
      return res.status(400).json({ success: false, message: bankResult.message, tip: 'Valid test IDs: AWB-12345, TLB-99999, or any AWB-XXXXX / TLB-XXXXX format' });
    }

    const receiptNumber = `RCP-${Date.now()}`;
    await prisma.payment.update({
      where: { id: payment.id },
      data: { bankTransactionId: bankResult.bankRef, status: 'SUCCESSFUL', paymentDate: new Date(), verifiedAt: new Date(), receiptNumber, updatedAt: new Date() },
    });
    await prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: { paidAmount: payment.amount, dueAmount: 0, status: 'PAID', updatedAt: new Date() },
    });

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully! You can now register for courses.',
      receipt: { receiptNumber, referenceNumber, bankTransactionId: bankResult.bankRef, amount: payment.amount, verifiedAt: new Date() },
    });
  } catch (error) {
    console.error('Verify payment error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── WEBHOOK ─────────────────────────────────────────────────
const paymentWebhook = async (req, res) => {
  try {
    const { referenceNumber, bankTransactionId, amount, status } = req.body;
    if (!referenceNumber || !bankTransactionId) return res.status(400).json({ success: false, message: 'Invalid webhook payload' });

    const payment = await prisma.payment.findUnique({ where: { referenceNumber } });
    if (!payment) { console.warn(`Webhook: unknown reference ${referenceNumber}`); return res.status(404).json({ success: false, message: 'Reference not found' }); }
    if (payment.status === 'SUCCESSFUL') return res.status(200).json({ success: true, message: 'Already processed' });

    const receiptNumber = `RCP-${Date.now()}`;
    await prisma.payment.update({
      where: { id: payment.id },
      data: { bankTransactionId, status: status === 'SUCCESS' ? 'SUCCESSFUL' : 'FAILED', paymentDate: new Date(), verifiedAt: new Date(), receiptNumber: status === 'SUCCESS' ? receiptNumber : null, updatedAt: new Date() },
    });
    if (status === 'SUCCESS') {
      await prisma.invoice.update({ where: { id: payment.invoiceId }, data: { paidAmount: payment.amount, dueAmount: 0, status: 'PAID', updatedAt: new Date() } });
    }
    console.log(`Webhook processed: ${referenceNumber} → ${status}`);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET MY INVOICES (student) ────────────────────────────────
// Requirements: 1.1, 1.2, 1.3, 1.4
const getMyInvoices = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const invoices = await prisma.invoice.findMany({
      where: { studentId: student.id },
      include: { academicSemester: { select: { name: true } } },
      orderBy: { dueDate: 'desc' },
    });

    if (invoices.length === 0) return res.status(200).json({ success: true, invoices: [] });

    const processed = await Promise.all(
      invoices.map(async (inv) => {
        const updated = applyOverdueIfNeeded(inv);
        if (updated.status !== inv.status || updated.dueAmount !== inv.dueAmount) {
          await prisma.invoice.update({
            where: { id: inv.id },
            data: { status: updated.status, dueAmount: updated.dueAmount, lateFeeApplied: updated.lateFeeApplied, updatedAt: new Date() },
          });
        }
        return {
          id: updated.id,
          invoiceNumber: updated.invoiceNumber,
          referenceNumber: updated.referenceNumber,
          totalAmount: updated.totalAmount,
          dueAmount: updated.dueAmount,
          dueDate: updated.dueDate,
          status: updated.status,
          semesterName: inv.academicSemester?.name ?? null,
        };
      })
    );

    return res.status(200).json({ success: true, invoices: processed });
  } catch (error) {
    console.error('Get my invoices error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── UPLOAD PROOF (student) ───────────────────────────────────
// Requirements: 2.3, 2.4, 2.5
const uploadProof = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Proof image is required' });

    const { invoiceId, paymentMethod } = req.body;
    if (!invoiceId) return res.status(400).json({ success: false, message: 'invoiceId is required' });

    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, studentId: student.id } });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const existing = await prisma.payment.findFirst({ where: { invoiceId, status: { in: ['PENDING', 'APPROVED'] } } });
    if (existing) return res.status(409).json({ success: false, message: 'A payment is already pending or approved for this invoice' });

    const proofUrl = req.file.path;
    const referenceNumber = `PROOF-${crypto.randomUUID()}`;
    const payment = await prisma.payment.create({
      data: {
        id: crypto.randomUUID(),
        studentId: student.id,
        invoiceId,
        amount: invoice.dueAmount,
        referenceNumber,
        paymentMethod: paymentMethod || 'BANK_TRANSFER',
        status: 'PENDING',
        proofUrl,
        updatedAt: new Date(),
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Payment proof uploaded successfully. Awaiting admin verification.',
      payment: { id: payment.id, referenceNumber: payment.referenceNumber, status: payment.status, proofUrl: payment.proofUrl },
    });
  } catch (error) {
    console.error('Upload proof error:', error.message);
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
      include: { invoice: { include: { academicSemester: { select: { name: true } } } } },
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
        student: { include: { user: { select: { name: true, institutionalEmail: true } } } },
        invoice: { include: { academicSemester: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ success: true, payments });
  } catch (error) {
    console.error('Get all payments error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET ALL PAYMENTS ADMIN (admin/registrar) ─────────────────
// Requirements: 3.1, 3.2, 3.3, 3.4
const getAllPaymentsAdmin = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;
    const where = status ? { status } : {};

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          student: { select: { studentId: true, user: { select: { name: true } } } },
          invoice: { select: { invoiceNumber: true, referenceNumber: true, totalAmount: true, academicSemester: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.payment.count({ where }),
    ]);

    const formatted = payments.map((p) => ({
      id: p.id,
      studentName: p.student?.user?.name ?? null,
      studentId: p.student?.studentId ?? null,
      invoiceNumber: p.invoice?.invoiceNumber ?? null,
      referenceNumber: p.invoice?.referenceNumber ?? null,
      semesterName: p.invoice?.academicSemester?.name ?? null,
      amount: p.amount,
      proofUrl: p.proofUrl,
      paymentMethod: p.paymentMethod,
      status: p.status,
      notes: p.notes,
      createdAt: p.createdAt,
      verifiedAt: p.verifiedAt,
      verifiedBy: p.verifiedBy,
    }));

    return res.status(200).json({ success: true, payments: formatted, pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (error) {
    console.error('Get all payments admin error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── APPROVE PAYMENT (admin/registrar) ───────────────────────
// Requirements: 4.1, 4.2
const approvePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await prisma.payment.findUnique({ where: { id }, include: { invoice: true } });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (payment.status === 'APPROVED') return res.status(409).json({ success: false, message: 'Payment has already been approved' });

    await prisma.payment.update({ where: { id }, data: { status: 'APPROVED', verifiedAt: new Date(), verifiedBy: req.user.id, updatedAt: new Date() } });
    await prisma.invoice.update({ where: { id: payment.invoiceId }, data: { status: 'PAID', paidAmount: payment.invoice.totalAmount, updatedAt: new Date() } });

    return res.status(200).json({ success: true, message: 'Payment approved successfully' });
  } catch (error) {
    console.error('Approve payment error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── REJECT PAYMENT (admin/registrar) ────────────────────────
// Requirements: 4.3, 4.4
const rejectPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const payment = await prisma.payment.findUnique({ where: { id }, include: { invoice: true } });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (payment.status === 'APPROVED') return res.status(409).json({ success: false, message: 'Payment has already been approved' });

    await prisma.payment.update({ where: { id }, data: { status: 'REJECTED', notes: reason ?? null, updatedAt: new Date() } });
    // Invoice status and dueAmount remain unchanged — Requirement 4.4
    return res.status(200).json({ success: true, message: 'Payment rejected' });
  } catch (error) {
    console.error('Reject payment error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GENERATE INVOICES (admin/registrar) ─────────────────────
// Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
const generateInvoices = async (req, res) => {
  try {
    const { semesterId } = req.body;
    if (!semesterId) {
      return res.status(400).json({ success: false, message: 'semesterId is required' });
    }

    // Query all active students with approved registrations for the given semester
    const semesterRegistrations = await prisma.semesterRegistration.findMany({
      where: {
        semesterId,
        status: 'APPROVED',
        student: { status: 'ACTIVE' },
      },
      include: {
        student: { include: { program: true } },
      },
    });

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-based
    const dueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    let created = 0;
    const skipped = [];
    const errors = [];

    for (const reg of semesterRegistrations) {
      const { student } = reg;
      try {
        // Skip if invoice already exists for this student + semester — Requirement 6.1
        const existing = await prisma.invoice.findFirst({
          where: { studentId: student.id, semesterId },
        });
        if (existing) {
          skipped.push({ studentId: student.studentId, reason: 'invoice_exists' });
          continue;
        }

        // Look up FeeStructure for student's program + semester — Requirement 6.3, 6.4
        const feeStructure = await prisma.feeStructure.findUnique({
          where: { programId_semesterId: { programId: student.programId, semesterId } },
        });
        if (!feeStructure) {
          skipped.push({ studentId: student.studentId, reason: 'no_fee_structure' });
          continue;
        }

        // Generate reference number — Requirement 6.2
        const referenceNumber = generateReferenceNumber(student.studentId, year, month);
        const invoiceNumber = `INV-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        await prisma.invoice.create({
          data: {
            id: crypto.randomUUID(),
            invoiceNumber,
            studentId: student.id,
            semesterId,
            feeStructureId: feeStructure.id,
            totalAmount: feeStructure.totalFee,
            paidAmount: 0,
            dueAmount: feeStructure.totalFee,
            dueDate, // 14 days from now — Requirement 6.5
            status: 'PENDING',
            referenceNumber,
            updatedAt: new Date(),
          },
        });

        created++;
      } catch (err) {
        errors.push({ studentId: student.studentId, error: err.message });
      }
    }

    return res.status(207).json({
      success: true,
      message: 'Invoice generation complete',
      created,
      skipped,
      errors,
    });
  } catch (error) {
    console.error('Generate invoices error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── APPLY DISCOUNT (admin/registrar) ────────────────────────
// Requirements: 8.1, 8.2, 8.3
const applyDiscountEndpoint = async (req, res) => {
  try {
    const { id } = req.params;
    const { discountAmount, reason } = req.body;

    if (discountAmount === undefined || discountAmount === null) {
      return res.status(400).json({ success: false, message: 'discountAmount is required' });
    }

    const discount = parseFloat(discountAmount);
    if (isNaN(discount) || discount < 0) {
      return res.status(400).json({ success: false, message: 'discountAmount must be a non-negative number' });
    }

    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Apply discount — clamped to zero, totalAmount unchanged — Requirements 8.1, 8.3
    const newDueAmount = applyDiscount(invoice.dueAmount, discount);
    const discountNote = `Discount applied: ${discount} (${reason || 'no reason provided'}) on ${new Date().toISOString()}`;
    const updatedNotes = invoice.notes ? `${invoice.notes}\n${discountNote}` : discountNote;

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        dueAmount: newDueAmount,
        discountAmount: (invoice.discountAmount || 0) + discount,
        notes: updatedNotes, // Requirement 8.2
        updatedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Discount applied successfully',
      invoice: {
        id: updated.id,
        invoiceNumber: updated.invoiceNumber,
        totalAmount: updated.totalAmount,
        dueAmount: updated.dueAmount,
        discountAmount: updated.discountAmount,
        notes: updated.notes,
      },
    });
  } catch (error) {
    console.error('Apply discount error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  initiateUnifiedPayment,
  getUnifiedPaymentStatus,
  awashWebhook,
  initializeChapaPayment,
  chapaWebhook,
  getPaymentStatus,
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
};
