/**
 * Payment utility functions — pure, side-effect-free helpers.
 * Requirements: 6.2, 7.1, 7.3, 8.1, 8.3
 */

/**
 * Generate a unique invoice reference number.
 * Format: {studentId}-{YYYY}-{MM}  (MM is zero-padded)
 * @param {string} studentId
 * @param {number} year  - full calendar year, e.g. 2024
 * @param {number} month - 1-based month (1–12)
 * @returns {string}
 */
function generateReferenceNumber(studentId, year, month) {
  const mm = String(month).padStart(2, '0');
  return `${studentId}-${year}-${mm}`;
}

/**
 * Calculate a 5% late fee on the original total amount.
 * @param {number} totalAmount
 * @returns {number}
 */
function calculateLateFee(totalAmount) {
  return totalAmount * 0.05;
}

/**
 * Apply a discount to the due amount, clamped to zero.
 * Does NOT modify totalAmount.
 * @param {number} dueAmount
 * @param {number} discount
 * @returns {number}
 */
function applyDiscount(dueAmount, discount) {
  return Math.max(0, dueAmount - discount);
}

/**
 * Determine whether an invoice is overdue.
 * An invoice is overdue when its dueDate is in the past and status is PENDING.
 * @param {Date|string} dueDate
 * @param {string} status
 * @returns {boolean}
 */
function isOverdue(dueDate, status) {
  if (status !== 'PENDING') return false;
  return new Date(dueDate) < new Date();
}

/**
 * Apply the OVERDUE transition to an invoice if needed — idempotent.
 * If the invoice is already OVERDUE or lateFeeApplied is true, no change is made.
 * Returns a new invoice object; does not mutate the input.
 * @param {{ dueDate: Date|string, status: string, totalAmount: number, dueAmount: number, lateFeeApplied: boolean }} invoice
 * @returns {typeof invoice}
 */
function applyOverdueIfNeeded(invoice) {
  // Already processed — idempotent guard
  if (invoice.status === 'OVERDUE' || invoice.lateFeeApplied) {
    return { ...invoice, status: 'OVERDUE' };
  }

  if (!isOverdue(invoice.dueDate, invoice.status)) {
    return { ...invoice };
  }

  const lateFee = calculateLateFee(invoice.totalAmount);
  return {
    ...invoice,
    status: 'OVERDUE',
    dueAmount: invoice.dueAmount + lateFee,
    lateFeeApplied: true,
  };
}

module.exports = {
  generateReferenceNumber,
  calculateLateFee,
  applyDiscount,
  isOverdue,
  applyOverdueIfNeeded,
};
