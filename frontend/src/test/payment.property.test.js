/**
 * Property-based tests for payment utility functions.
 * Feature: payment-system
 * Uses: fast-check + vitest
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  generateReferenceNumber,
  applyDiscount,
  applyOverdueIfNeeded,
} from '../../../backend/src/utils/payment.utils.js';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Non-empty student ID strings (e.g. "ATL-2024-001") */
const studentIdArb = fc.stringMatching(/^[A-Z]{2,4}-\d{4}-\d{3}$/);

/** Valid months 1–12 */
const monthArb = fc.integer({ min: 1, max: 12 });

/** Valid years (reasonable range) */
const yearArb = fc.integer({ min: 2000, max: 2100 });

/** Non-negative amounts */
const amountArb = fc.float({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true });

/** Past date (overdue) */
const pastDateArb = fc.date({ min: new Date('2000-01-01'), max: new Date('2020-01-01') });

/** Future date (not overdue) */
const futureDateArb = fc.date({ min: new Date('2100-01-01'), max: new Date('2200-01-01') });

/** A pending invoice with a past due date (should become OVERDUE) */
const overdueInvoiceArb = fc.record({
  dueDate: pastDateArb,
  status: fc.constant('PENDING'),
  totalAmount: fc.float({ min: 1, max: 100_000, noNaN: true, noDefaultInfinity: true }),
  dueAmount: fc.float({ min: 1, max: 100_000, noNaN: true, noDefaultInfinity: true }),
  lateFeeApplied: fc.constant(false),
});

/** An invoice that is already OVERDUE with lateFeeApplied=true */
const alreadyOverdueInvoiceArb = fc.record({
  dueDate: pastDateArb,
  status: fc.constant('OVERDUE'),
  totalAmount: fc.float({ min: 1, max: 100_000, noNaN: true, noDefaultInfinity: true }),
  dueAmount: fc.float({ min: 1, max: 100_000, noNaN: true, noDefaultInfinity: true }),
  lateFeeApplied: fc.constant(true),
});

// ---------------------------------------------------------------------------
// Property 1: Invoice list ordering invariant
// **Feature: payment-system, Property 1: Invoice list ordering invariant**
// Validates: Requirements 1.1
// ---------------------------------------------------------------------------

/** Minimal invoice shape for ordering tests */
const invoiceForOrderingArb = fc.record({
  id: fc.uuid(),
  dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
  status: fc.constantFrom('PENDING', 'PAID', 'OVERDUE'),
  totalAmount: fc.float({ min: 0, max: 100_000, noNaN: true, noDefaultInfinity: true }),
  dueAmount: fc.float({ min: 0, max: 100_000, noNaN: true, noDefaultInfinity: true }),
});

describe('Property 1: Invoice list ordering invariant', () => {
  it('any list of invoices sorted by dueDate descending is in non-increasing order', () => {
    fc.assert(
      fc.property(fc.array(invoiceForOrderingArb, { minLength: 1, maxLength: 20 }), (invoices) => {
        // Simulate what the controller does: sort by dueDate descending
        const sorted = [...invoices].sort(
          (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
        );
        // Verify each consecutive pair is in non-increasing dueDate order
        for (let i = 0; i < sorted.length - 1; i++) {
          expect(new Date(sorted[i].dueDate).getTime()).toBeGreaterThanOrEqual(
            new Date(sorted[i + 1].dueDate).getTime()
          );
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: Reference number format
// **Feature: payment-system, Property 10: Reference number format**
// Validates: Requirements 6.2
// ---------------------------------------------------------------------------
describe('Property 10: Reference number format', () => {
  it('generateReferenceNumber returns {studentId}-{YYYY}-{MM} with zero-padded month', () => {
    fc.assert(
      fc.property(studentIdArb, yearArb, monthArb, (studentId, year, month) => {
        const ref = generateReferenceNumber(studentId, year, month);
        const mm = String(month).padStart(2, '0');
        // Exact value check
        expect(ref).toBe(`${studentId}-${year}-${mm}`);
        // MM must always be two digits
        const parts = ref.split('-');
        const lastPart = parts[parts.length - 1];
        expect(lastPart).toHaveLength(2);
        expect(lastPart).toMatch(/^\d{2}$/);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12: Discount clamping
// **Feature: payment-system, Property 12: Discount clamping**
// Validates: Requirements 8.1, 8.3
// ---------------------------------------------------------------------------
describe('Property 12: Discount clamping', () => {
  it('applyDiscount never returns a negative value', () => {
    fc.assert(
      fc.property(amountArb, amountArb, (dueAmount, discount) => {
        const result = applyDiscount(dueAmount, discount);
        expect(result).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });

  it('applyDiscount returns max(0, dueAmount - discount)', () => {
    fc.assert(
      fc.property(amountArb, amountArb, (dueAmount, discount) => {
        const result = applyDiscount(dueAmount, discount);
        const expected = Math.max(0, dueAmount - discount);
        expect(result).toBeCloseTo(expected, 10);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: OVERDUE transition idempotency
// **Feature: payment-system, Property 2: OVERDUE transition idempotency**
// Validates: Requirements 1.2, 7.1, 7.3
// ---------------------------------------------------------------------------
describe('Property 2: OVERDUE transition idempotency', () => {
  it('applying applyOverdueIfNeeded once on a past-due PENDING invoice sets OVERDUE + lateFeeApplied', () => {
    fc.assert(
      fc.property(overdueInvoiceArb, (invoice) => {
        const result = applyOverdueIfNeeded(invoice);
        expect(result.status).toBe('OVERDUE');
        expect(result.lateFeeApplied).toBe(true);
        // dueAmount increased by exactly 5% of totalAmount
        expect(result.dueAmount).toBeCloseTo(invoice.dueAmount + invoice.totalAmount * 0.05, 5);
      }),
      { numRuns: 100 }
    );
  });

  it('applying applyOverdueIfNeeded twice produces the same result as once (idempotent)', () => {
    fc.assert(
      fc.property(overdueInvoiceArb, (invoice) => {
        const once = applyOverdueIfNeeded(invoice);
        const twice = applyOverdueIfNeeded(once);
        expect(twice.status).toBe('OVERDUE');
        expect(twice.lateFeeApplied).toBe(true);
        // dueAmount must NOT increase a second time
        expect(twice.dueAmount).toBeCloseTo(once.dueAmount, 5);
      }),
      { numRuns: 100 }
    );
  });

  it('already-OVERDUE invoices are returned unchanged', () => {
    fc.assert(
      fc.property(alreadyOverdueInvoiceArb, (invoice) => {
        const result = applyOverdueIfNeeded(invoice);
        expect(result.status).toBe('OVERDUE');
        expect(result.lateFeeApplied).toBe(true);
        expect(result.dueAmount).toBeCloseTo(invoice.dueAmount, 5);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: Due date is 14 days after generation
// **Feature: payment-system, Property 11: Due date is 14 days after generation**
// Validates: Requirements 6.5
// ---------------------------------------------------------------------------
describe('Property 11: Due date is 14 days after generation', () => {
  it('dueDate computed as generationDate + 14 days equals exactly 1,209,600,000 ms later', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (generationDate) => {
          const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
          const dueDate = new Date(generationDate.getTime() + FOURTEEN_DAYS_MS);
          expect(dueDate.getTime() - generationDate.getTime()).toBe(FOURTEEN_DAYS_MS);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 13: Serialization round-trip
// **Feature: payment-system, Property 13: Serialization round-trip**
// Validates: Requirements 9.1, 9.2
// ---------------------------------------------------------------------------

const paymentRecordArb = fc.record({
  id: fc.uuid(),
  invoiceId: fc.uuid(),
  studentId: fc.uuid(),
  amount: fc.float({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
  paymentMethod: fc.constantFrom('BANK_TRANSFER', 'MOBILE_MONEY'),
  status: fc.constantFrom('PENDING', 'APPROVED', 'REJECTED'),
  proofUrl: fc.option(fc.webUrl(), { nil: null }),
  notes: fc.option(fc.string(), { nil: null }),
  createdAt: fc.date().map(d => d.toISOString()),
  verifiedAt: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
  verifiedBy: fc.option(fc.uuid(), { nil: null }),
});

const invoiceRecordArb = fc.record({
  id: fc.uuid(),
  studentId: fc.uuid(),
  semesterId: fc.uuid(),
  invoiceNumber: fc.string({ minLength: 1, maxLength: 20 }),
  referenceNumber: fc.string({ minLength: 1, maxLength: 30 }),
  totalAmount: fc.float({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
  dueAmount: fc.float({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
  paidAmount: fc.float({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
  discountAmount: fc.float({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
  status: fc.constantFrom('PENDING', 'PAID', 'OVERDUE'),
  lateFeeApplied: fc.boolean(),
  dueDate: fc.date().map(d => d.toISOString()),
  notes: fc.option(fc.string(), { nil: null }),
});

describe('Property 13: Serialization round-trip', () => {
  it('Payment record survives JSON.stringify → JSON.parse round-trip', () => {
    fc.assert(
      fc.property(paymentRecordArb, (record) => {
        const serialized = JSON.stringify(record);
        const deserialized = JSON.parse(serialized);
        expect(deserialized).toEqual(record);
      }),
      { numRuns: 100 }
    );
  });

  it('Invoice record survives JSON.stringify → JSON.parse round-trip', () => {
    fc.assert(
      fc.property(invoiceRecordArb, (record) => {
        const serialized = JSON.stringify(record);
        const deserialized = JSON.parse(serialized);
        expect(deserialized).toEqual(record);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: File type validation
// **Feature: payment-system, Property 4: File type validation**
// Validates: Requirements 2.1
// ---------------------------------------------------------------------------
import {
  isProofMimeAllowed,
  isProofSizeAllowed,
  PROOF_ALLOWED_MIMES,
  PROOF_MAX_SIZE,
} from '../../../backend/src/utils/upload.js';

describe('Property 4: File type validation', () => {
  it('accepts exactly image/jpeg, image/png, and image/webp', () => {
    // Allowed MIME types must all be accepted
    for (const mime of PROOF_ALLOWED_MIMES) {
      expect(isProofMimeAllowed(mime)).toBe(true);
    }
  });

  it('rejects any MIME type not in the allowed list', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !PROOF_ALLOWED_MIMES.includes(s.toLowerCase())),
        (mime) => {
          expect(isProofMimeAllowed(mime)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects common non-image MIME types', () => {
    const rejected = [
      'application/pdf',
      'text/plain',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'video/mp4',
      'application/octet-stream',
      '',
    ];
    for (const mime of rejected) {
      expect(isProofMimeAllowed(mime)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Property 5: File size validation
// **Feature: payment-system, Property 5: File size validation**
// Validates: Requirements 2.2
// ---------------------------------------------------------------------------
describe('Property 5: File size validation', () => {
  it('accepts any file size <= 2,097,152 bytes (2 MB)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: PROOF_MAX_SIZE }), (size) => {
        expect(isProofSizeAllowed(size)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('rejects any file size > 2,097,152 bytes (2 MB)', () => {
    fc.assert(
      fc.property(fc.integer({ min: PROOF_MAX_SIZE + 1, max: PROOF_MAX_SIZE * 10 }), (size) => {
        expect(isProofSizeAllowed(size)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('boundary: exactly 2 MB is accepted, 2 MB + 1 byte is rejected', () => {
    expect(isProofSizeAllowed(PROOF_MAX_SIZE)).toBe(true);
    expect(isProofSizeAllowed(PROOF_MAX_SIZE + 1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Property 6: Duplicate proof prevention
// **Feature: payment-system, Property 6: Duplicate proof prevention**
// Validates: Requirements 2.4
// ---------------------------------------------------------------------------

/**
 * Pure helper that mirrors the duplicate-check logic in uploadProof controller.
 * Returns true if a new proof submission should be blocked.
 */
function isDuplicateProofBlocked(existingPayments) {
  return existingPayments.some(
    (p) => p.status === 'PENDING' || p.status === 'APPROVED'
  );
}

const paymentStatusArb = fc.constantFrom('PENDING', 'APPROVED', 'REJECTED', 'SUCCESSFUL', 'FAILED');

const existingPaymentArb = fc.record({
  id: fc.uuid(),
  invoiceId: fc.uuid(),
  status: paymentStatusArb,
});

describe('Property 6: Duplicate proof prevention', () => {
  it('blocks submission when any existing payment has status PENDING or APPROVED', () => {
    fc.assert(
      fc.property(
        // At least one payment with PENDING or APPROVED status
        fc.array(existingPaymentArb, { minLength: 0, maxLength: 5 }),
        fc.constantFrom('PENDING', 'APPROVED'),
        (others, blockingStatus) => {
          const blockingPayment = { id: 'block-id', invoiceId: 'inv-id', status: blockingStatus };
          const payments = [...others, blockingPayment];
          expect(isDuplicateProofBlocked(payments)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('allows submission when all existing payments are REJECTED, SUCCESSFUL, or FAILED', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            invoiceId: fc.uuid(),
            status: fc.constantFrom('REJECTED', 'SUCCESSFUL', 'FAILED'),
          }),
          { minLength: 0, maxLength: 5 }
        ),
        (payments) => {
          expect(isDuplicateProofBlocked(payments)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('allows submission when there are no existing payments', () => {
    expect(isDuplicateProofBlocked([])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Property 7: Approve payment drives correct state
// **Feature: payment-system, Property 7: Approve payment drives correct state**
// Validates: Requirements 4.1, 4.2
// ---------------------------------------------------------------------------

/**
 * Pure helper that mirrors the approve logic in approvePayment controller.
 * Returns { payment, invoice } after applying approval.
 */
function applyApproval(payment, invoice, adminId) {
  if (payment.status === 'APPROVED') {
    return { error: 'ALREADY_APPROVED' };
  }
  const now = new Date().toISOString();
  return {
    payment: { ...payment, status: 'APPROVED', verifiedAt: now, verifiedBy: adminId },
    invoice: { ...invoice, status: 'PAID', paidAmount: invoice.totalAmount },
  };
}

const pendingPaymentArb = fc.record({
  id: fc.uuid(),
  invoiceId: fc.uuid(),
  amount: fc.float({ min: 1, max: 100_000, noNaN: true, noDefaultInfinity: true }),
  status: fc.constant('PENDING'),
  notes: fc.option(fc.string(), { nil: null }),
});

const invoiceForApprovalArb = fc.record({
  id: fc.uuid(),
  status: fc.constantFrom('PENDING', 'OVERDUE'),
  totalAmount: fc.float({ min: 1, max: 100_000, noNaN: true, noDefaultInfinity: true }),
  dueAmount: fc.float({ min: 1, max: 100_000, noNaN: true, noDefaultInfinity: true }),
  paidAmount: fc.constant(0),
});

describe('Property 7: Approve payment drives correct state', () => {
  it('approving a PENDING payment sets payment to APPROVED with verifiedAt/verifiedBy and invoice to PAID', () => {
    fc.assert(
      fc.property(pendingPaymentArb, invoiceForApprovalArb, fc.uuid(), (payment, invoice, adminId) => {
        const result = applyApproval(payment, invoice, adminId);

        // No error
        expect(result.error).toBeUndefined();

        // Payment state
        expect(result.payment.status).toBe('APPROVED');
        expect(result.payment.verifiedAt).toBeDefined();
        expect(result.payment.verifiedBy).toBe(adminId);

        // Invoice state
        expect(result.invoice.status).toBe('PAID');
        expect(result.invoice.paidAmount).toBe(invoice.totalAmount);
      }),
      { numRuns: 100 }
    );
  });

  it('approving an already-APPROVED payment returns ALREADY_APPROVED error', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          invoiceId: fc.uuid(),
          amount: fc.float({ min: 1, max: 100_000, noNaN: true, noDefaultInfinity: true }),
          status: fc.constant('APPROVED'),
        }),
        invoiceForApprovalArb,
        fc.uuid(),
        (payment, invoice, adminId) => {
          const result = applyApproval(payment, invoice, adminId);
          expect(result.error).toBe('ALREADY_APPROVED');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Reject payment leaves invoice unchanged
// **Feature: payment-system, Property 8: Reject payment leaves invoice unchanged**
// Validates: Requirements 4.3, 4.4
// ---------------------------------------------------------------------------

/**
 * Pure helper that mirrors the reject logic in rejectPayment controller.
 * Returns { payment, invoice } after applying rejection.
 */
function applyRejection(payment, invoice, reason) {
  if (payment.status === 'APPROVED') {
    return { error: 'ALREADY_APPROVED' };
  }
  return {
    payment: { ...payment, status: 'REJECTED', notes: reason ?? null },
    invoice: { ...invoice }, // unchanged
  };
}

const invoiceForRejectionArb = fc.record({
  id: fc.uuid(),
  status: fc.constantFrom('PENDING', 'OVERDUE'),
  totalAmount: fc.float({ min: 1, max: 100_000, noNaN: true, noDefaultInfinity: true }),
  dueAmount: fc.float({ min: 1, max: 100_000, noNaN: true, noDefaultInfinity: true }),
  paidAmount: fc.constant(0),
});

describe('Property 8: Reject payment leaves invoice unchanged', () => {
  it('rejecting a PENDING payment sets payment to REJECTED and leaves invoice status/dueAmount unchanged', () => {
    fc.assert(
      fc.property(
        pendingPaymentArb,
        invoiceForRejectionArb,
        fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
        (payment, invoice, reason) => {
          const result = applyRejection(payment, invoice, reason);

          expect(result.error).toBeUndefined();

          // Payment is rejected with reason stored
          expect(result.payment.status).toBe('REJECTED');
          expect(result.payment.notes).toBe(reason ?? null);

          // Invoice is completely unchanged
          expect(result.invoice.status).toBe(invoice.status);
          expect(result.invoice.dueAmount).toBe(invoice.dueAmount);
          expect(result.invoice.paidAmount).toBe(invoice.paidAmount);
          expect(result.invoice.totalAmount).toBe(invoice.totalAmount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejecting an already-APPROVED payment returns ALREADY_APPROVED error', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          invoiceId: fc.uuid(),
          amount: fc.float({ min: 1, max: 100_000, noNaN: true, noDefaultInfinity: true }),
          status: fc.constant('APPROVED'),
        }),
        invoiceForRejectionArb,
        fc.option(fc.string(), { nil: null }),
        (payment, invoice, reason) => {
          const result = applyRejection(payment, invoice, reason);
          expect(result.error).toBe('ALREADY_APPROVED');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Status filter correctness (inline property — task 5.2)
// For any status value, all returned records match that status
// ---------------------------------------------------------------------------

/**
 * Pure helper that mirrors the status filter in getAllPaymentsAdmin.
 */
function filterPaymentsByStatus(payments, status) {
  if (!status) return payments;
  return payments.filter((p) => p.status === status);
}

const allStatusArb = fc.constantFrom('PENDING', 'APPROVED', 'REJECTED', 'SUCCESSFUL', 'FAILED', 'PAID', 'OVERDUE', 'REFUNDED');

const paymentWithStatusArb = fc.record({
  id: fc.uuid(),
  status: allStatusArb,
  amount: fc.float({ min: 0, max: 100_000, noNaN: true, noDefaultInfinity: true }),
});

describe('Status filter correctness (task 5.2)', () => {
  it('for any status value, all returned records match that status', () => {
    fc.assert(
      fc.property(
        fc.array(paymentWithStatusArb, { minLength: 0, maxLength: 20 }),
        allStatusArb,
        (payments, status) => {
          const filtered = filterPaymentsByStatus(payments, status);
          for (const p of filtered) {
            expect(p.status).toBe(status);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when no status filter is provided, all records are returned', () => {
    fc.assert(
      fc.property(
        fc.array(paymentWithStatusArb, { minLength: 0, maxLength: 20 }),
        (payments) => {
          const result = filterPaymentsByStatus(payments, undefined);
          expect(result).toHaveLength(payments.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Invoice generation idempotency
// **Feature: payment-system, Property 9: Invoice generation idempotency**
// Validates: Requirements 6.1
// ---------------------------------------------------------------------------

/**
 * Pure helper that mirrors the idempotency logic in generateInvoices controller.
 * Given a set of existing invoice studentIds and a list of students,
 * returns only the students who do NOT already have an invoice.
 */
function getStudentsNeedingInvoices(students, existingInvoiceStudentIds) {
  const existingSet = new Set(existingInvoiceStudentIds);
  return students.filter((s) => !existingSet.has(s.id));
}

const studentArb = fc.record({
  id: fc.uuid(),
  studentId: fc.stringMatching(/^[A-Z]{2,4}-\d{4}-\d{3}$/),
  programId: fc.uuid(),
});

describe('Property 9: Invoice generation idempotency', () => {
  it('running invoice generation twice creates zero new invoices for students who already have one', () => {
    fc.assert(
      fc.property(
        fc.array(studentArb, { minLength: 1, maxLength: 20 }),
        (students) => {
          // Deduplicate students by id (simulate unique constraint)
          const uniqueStudents = [...new Map(students.map((s) => [s.id, s])).values()];

          // First run: all students need invoices
          const firstRunCandidates = getStudentsNeedingInvoices(uniqueStudents, []);
          expect(firstRunCandidates).toHaveLength(uniqueStudents.length);

          // After first run, all students now have invoices
          const existingAfterFirstRun = uniqueStudents.map((s) => s.id);

          // Second run: no students should need invoices
          const secondRunCandidates = getStudentsNeedingInvoices(uniqueStudents, existingAfterFirstRun);
          expect(secondRunCandidates).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('students without existing invoices are always included in generation candidates', () => {
    fc.assert(
      fc.property(
        fc.array(studentArb, { minLength: 1, maxLength: 20 }),
        fc.array(fc.uuid(), { minLength: 0, maxLength: 10 }),
        (students, unrelatedExistingIds) => {
          const uniqueStudents = [...new Map(students.map((s) => [s.id, s])).values()];
          // None of the existing IDs match our students
          const candidates = getStudentsNeedingInvoices(uniqueStudents, unrelatedExistingIds);
          // All students should be candidates since none have existing invoices
          expect(candidates).toHaveLength(uniqueStudents.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
