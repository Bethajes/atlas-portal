# Design Document — Payment System

## Overview

The Payment System extends the existing Atlas Health College portal to support a proof-upload-based monthly payment workflow. Students view semester invoices, upload a bank/mobile-money transfer screenshot as proof, and track approval status. Admins and registrars review uploaded proofs and approve or reject them, which drives invoice status transitions. The system is built on the existing React 19 / Node.js / Express 5 / Prisma / PostgreSQL stack.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  PaymentPage (student)   AdminPaymentsPage (admin)       │
│       │                          │                       │
│  useStudentPayments()      useAdminPayments()            │
└──────────────┬───────────────────┬──────────────────────┘
               │  REST / multipart │
┌──────────────▼───────────────────▼──────────────────────┐
│                  Express API (backend)                    │
│                                                          │
│  POST /api/payments/upload-proof                         │
│  GET  /api/payments/my-invoices                          │
│  GET  /api/payments/my-payments                          │
│  GET  /api/admin/payments                                │
│  PUT  /api/admin/payments/:id/approve                    │
│  PUT  /api/admin/payments/:id/reject                     │
│  POST /api/admin/invoices/generate                       │
│  PUT  /api/admin/invoices/:id/discount                   │
└──────────────┬───────────────────────────────────────────┘
               │ Prisma ORM
┌──────────────▼───────────────────────────────────────────┐
│              PostgreSQL Database                          │
│   Invoice  ←──→  Payment  ←──→  Student  ←──→  User     │
└──────────────────────────────────────────────────────────┘
               │ multer
┌──────────────▼───────────────────────────────────────────┐
│         uploads/receipts/  (local disk)                  │
└──────────────────────────────────────────────────────────┘
```

---

## Components and Interfaces

### Backend

#### `payment.controller.js` (extended)
| Function | Method | Route | Auth |
|---|---|---|---|
| `getMyInvoices` | GET | `/api/payments/my-invoices` | STUDENT |
| `uploadProof` | POST | `/api/payments/upload-proof` | STUDENT |
| `getMyPayments` | GET | `/api/payments/my-payments` | STUDENT |
| `getAllPaymentsAdmin` | GET | `/api/admin/payments` | ADMIN, REGISTRAR |
| `approvePayment` | PUT | `/api/admin/payments/:id/approve` | ADMIN, REGISTRAR |
| `rejectPayment` | PUT | `/api/admin/payments/:id/reject` | ADMIN, REGISTRAR |
| `generateInvoices` | POST | `/api/admin/invoices/generate` | ADMIN, REGISTRAR |
| `applyDiscount` | PUT | `/api/admin/invoices/:id/discount` | ADMIN, REGISTRAR |

#### `upload.js` (extended)
- Add `proof` fieldname → `uploads/receipts/`
- Restrict to `image/jpeg`, `image/png`, `image/webp`
- Limit to 2 MB

### Frontend

#### `PaymentPage.jsx` (student — refactored)
- Invoice list with status badges
- Upload proof form per invoice
- Payment history table

#### `AdminPaymentsPage.jsx` (new)
- Payments table with status filter tabs
- Proof image preview modal
- Approve / Reject buttons with confirmation

---

## Data Models

### Schema Changes

The existing `PaymentStatus` enum covers `PENDING`, `SUCCESSFUL`, `FAILED`, `REFUNDED`. We need `PAID` and `OVERDUE` for invoices. Rather than a breaking migration, we extend the enum and map values:

```prisma
enum InvoiceStatus {
  PENDING
  PAID
  OVERDUE
}

enum ProofStatus {
  PENDING
  APPROVED
  REJECTED
}
```

Because Prisma enums are additive, we add `PAID`, `OVERDUE` to `PaymentStatus` and use it for invoices, and add `APPROVED`, `REJECTED` for payment proof status. The existing `SUCCESSFUL`/`FAILED` values remain for backward compatibility with the bank-verification flow.

**Invoice model additions:**
```prisma
referenceNumber  String   @unique   // STUDENTID-YEAR-MONTH
lateFeeApplied   Boolean  @default(false)
discountAmount   Float    @default(0)
```

**Payment model additions:**
```prisma
proofUrl         String?            // uploaded image path
paymentMethod    PaymentMethod      // BANK_TRANSFER | MOBILE_MONEY
```

The `status` field on `Payment` will use the extended `PaymentStatus` enum where `PENDING` = awaiting admin review, `APPROVED` = verified, `REJECTED` = rejected.

### Reference Number Format

```
{studentId_short}-{YYYY}-{MM}
e.g.  STU-2024-04
```

Where `studentId_short` is the student's `studentId` field (already unique, e.g. `ATL-2024-001`).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property 1: Invoice list ordering invariant**
*For any* student with any non-empty set of invoices, the list returned by `getMyInvoices` should be sorted by `dueDate` in descending order.
**Validates: Requirements 1.1**

**Property 2: OVERDUE transition idempotency**
*For any* invoice whose `dueDate` is in the past and whose status is `PENDING`, applying the overdue-check function one or more times should always result in status `OVERDUE` and `lateFeeApplied = true`, with `dueAmount` increased by exactly 5% of `totalAmount` — no more, regardless of how many times the check runs.
**Validates: Requirements 1.2, 7.1, 7.3**

**Property 3: Invoice response shape**
*For any* invoice returned to a student, the response object should contain all required fields: `invoiceNumber`, `referenceNumber`, `totalAmount`, `dueAmount`, `dueDate`, `status`, and `semesterName`.
**Validates: Requirements 1.3**

**Property 4: File type validation**
*For any* MIME type string, the proof upload validator should accept exactly `image/jpeg`, `image/png`, and `image/webp`, and reject all other values.
**Validates: Requirements 2.1**

**Property 5: File size validation**
*For any* file size in bytes, the proof upload validator should accept files ≤ 2,097,152 bytes (2 MB) and reject files > 2,097,152 bytes.
**Validates: Requirements 2.2**

**Property 6: Duplicate proof prevention**
*For any* invoice that already has a payment with status `PENDING` or `APPROVED`, attempting to create another payment for that invoice should be rejected, and the count of payments for that invoice should remain unchanged.
**Validates: Requirements 2.4**

**Property 7: Approve payment drives correct state**
*For any* payment with status `PENDING`, approving it should result in: the payment having status `APPROVED` with `verifiedAt` set and `verifiedBy` set to the admin's ID, and the associated invoice having status `PAID` with `paidAmount` equal to `totalAmount`.
**Validates: Requirements 4.1, 4.2**

**Property 8: Reject payment leaves invoice unchanged**
*For any* payment with status `PENDING` and its associated invoice, rejecting the payment should result in the payment having status `REJECTED`, while the invoice's `status` and `dueAmount` remain identical to their pre-rejection values.
**Validates: Requirements 4.3, 4.4**

**Property 9: Invoice generation idempotency**
*For any* set of students and a given semester, running the invoice generation function twice should produce the same set of invoices — the second run should create zero new invoices for students who already have one.
**Validates: Requirements 6.1**

**Property 10: Reference number format**
*For any* `studentId` string, calendar year integer, and month integer (1–12), the `generateReferenceNumber(studentId, year, month)` function should return a string matching the pattern `{studentId}-{YYYY}-{MM}` where MM is zero-padded.
**Validates: Requirements 6.2**

**Property 11: Due date is 14 days after generation**
*For any* invoice generation date, the resulting invoice's `dueDate` should be exactly 14 days (1,209,600,000 ms) after the generation date.
**Validates: Requirements 6.5**

**Property 12: Discount clamping**
*For any* invoice with a given `dueAmount` and any non-negative discount value, applying `applyDiscount(dueAmount, discount)` should return `max(0, dueAmount - discount)` — never a negative value — and `totalAmount` should be unchanged.
**Validates: Requirements 8.1, 8.3**

**Property 13: Serialization round-trip**
*For any* valid Payment or Invoice record object, serializing it to JSON with `JSON.stringify` and deserializing with `JSON.parse` should produce an object deeply equal to the original (all primitive fields preserved; Date fields compared as ISO strings).
**Validates: Requirements 9.1, 9.2**

---

## Error Handling

| Scenario | HTTP Status | Message |
|---|---|---|
| File not an image | 400 | "Only JPEG, PNG, and WEBP images are allowed" |
| File exceeds 2 MB | 400 | "File size must not exceed 2 MB" |
| Duplicate proof submission | 409 | "A payment is already pending or approved for this invoice" |
| Invoice not found | 404 | "Invoice not found" |
| Payment not found | 404 | "Payment not found" |
| Approving already-approved payment | 409 | "Payment has already been approved" |
| No fee structure for student | 207 | Partial success — student ID included in `skipped` list |
| Unauthenticated | 401 | "Authentication required" |
| Insufficient role | 403 | "Access denied" |

All errors follow the existing `{ success: false, message: string }` envelope.

---

## Testing Strategy

### Property-Based Testing (fast-check)

The frontend already uses `fast-check` (v3.23.2) for property tests. Backend logic utilities (pure functions for reference number generation, late fee calculation, discount clamping, overdue detection) will be extracted into testable modules and tested with fast-check via vitest in the frontend test suite, or with a lightweight fast-check + Node.js setup in the backend.

Each property-based test MUST:
- Run a minimum of 100 iterations
- Be tagged with: `// **Feature: payment-system, Property {N}: {property_text}**`
- Reference the requirement clause it validates

### Unit Tests

- `generateReferenceNumber(studentId, year, month)` — format correctness
- `calculateLateFee(totalAmount)` — 5% calculation
- `applyDiscount(dueAmount, discount)` — clamping to zero
- `isOverdue(dueDate, status)` — date comparison logic
- API endpoint integration tests for approve/reject flows

### Test File Locations

- Backend pure utils: `backend/src/utils/payment.utils.js` + `backend/src/utils/payment.utils.test.js`
- Frontend property tests: `frontend/src/test/payment.property.test.js`
