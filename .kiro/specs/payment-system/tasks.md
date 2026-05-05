# Implementation Plan — Payment System

- [x] 1. Extend Prisma schema and run migration
  - Add `PAID`, `OVERDUE`, `APPROVED`, `REJECTED` values to `PaymentStatus` enum
  - Add `referenceNumber String @unique`, `lateFeeApplied Boolean @default(false)`, `discountAmount Float @default(0)` fields to `Invoice` model
  - Add `proofUrl String?` field to `Payment` model
  - Run `npx prisma migrate dev --name add_payment_proof_fields`
  - _Requirements: 1.3, 2.3, 6.2, 7.1, 8.1_

- [x] 2. Implement payment utility functions
- [x] 2.1 Create `backend/src/utils/payment.utils.js` with pure functions
  - Implement `generateReferenceNumber(studentId, year, month)` → `{studentId}-{YYYY}-{MM}`
  - Implement `calculateLateFee(totalAmount)` → `totalAmount * 0.05`
  - Implement `applyDiscount(dueAmount, discount)` → `Math.max(0, dueAmount - discount)`
  - Implement `isOverdue(dueDate, status)` → boolean
  - Implement `applyOverdueIfNeeded(invoice)` → updated invoice object (idempotent)
  - _Requirements: 6.2, 7.1, 7.3, 8.1, 8.3_

- [x] 2.2 Write property test for `generateReferenceNumber`
  - **Property 10: Reference number format**
  - **Validates: Requirements 6.2**

- [x] 2.3 Write property test for `applyDiscount` clamping
  - **Property 12: Discount clamping**
  - **Validates: Requirements 8.1, 8.3**

- [x] 2.4 Write property test for `applyOverdueIfNeeded` idempotency
  - **Property 2: OVERDUE transition idempotency**
  - **Validates: Requirements 1.2, 7.1, 7.3**

- [x] 2.5 Write property test for due date arithmetic
  - **Property 11: Due date is 14 days after generation**
  - **Validates: Requirements 6.5**

- [x] 2.6 Write property test for serialization round-trip
  - **Property 13: Serialization round-trip**
  - **Validates: Requirements 9.1, 9.2**

- [x] 3. Extend multer upload config for payment proofs
  - Add `proof` fieldname to `backend/src/utils/upload.js` → destination `uploads/receipts/`
  - Restrict `proof` field to `image/jpeg`, `image/png`, `image/webp` only
  - Set file size limit to 2 MB (2,097,152 bytes) for `proof` field
  - _Requirements: 2.1, 2.2_

- [x] 3.1 Write property test for file type validation
  - **Property 4: File type validation**
  - **Validates: Requirements 2.1**

- [x] 3.2 Write property test for file size validation
  - **Property 5: File size validation**
  - **Validates: Requirements 2.2**

- [x] 4. Implement student payment controller functions
- [x] 4.1 Implement `getMyInvoices` in `backend/src/controllers/payment.controller.js`
  - Query all invoices for the authenticated student
  - Call `applyOverdueIfNeeded` on each invoice before returning
  - Persist any status changes to the database
  - Return invoices ordered by `dueDate` descending with semester name included
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 4.2 Write property test for invoice list ordering
  - **Property 1: Invoice list ordering invariant**
  - **Validates: Requirements 1.1**

- [x] 4.3 Implement `uploadProof` in `backend/src/controllers/payment.controller.js`
  - Accept `multipart/form-data` with `proof` file and `invoiceId` body field
  - Validate invoice exists and belongs to the authenticated student
  - Check for existing `PENDING` or `APPROVED` payment on the invoice — return 409 if found
  - Create Payment record with `status: PENDING`, `proofUrl` set to uploaded file path, `paymentMethod` from request body
  - _Requirements: 2.3, 2.4, 2.5_

- [x] 4.4 Write property test for duplicate proof prevention
  - **Property 6: Duplicate proof prevention**
  - **Validates: Requirements 2.4**

- [x] 5. Implement admin payment controller functions
- [x] 5.1 Implement `getAllPaymentsAdmin` in `backend/src/controllers/payment.controller.js`
  - Accept optional `status`, `page`, `limit` query parameters
  - Return Payment records with student name, studentId, invoice number, reference number, amount, proofUrl, paymentMethod, status
  - Apply status filter when provided; default order by `createdAt` descending
  - Implement offset-based pagination using `page` and `limit`
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5.2 Write property test for status filter correctness
  - **Property — filter**: for any status value, all returned records match that status
  - Inline property, not a numbered design property — skip if not in design doc

- [x] 5.3 Implement `approvePayment` in `backend/src/controllers/payment.controller.js`
  - Find payment by ID; return 404 if not found
  - Return 409 if payment status is already `APPROVED`
  - Update payment: `status = APPROVED`, `verifiedAt = now()`, `verifiedBy = req.user.id`
  - Update associated invoice: `status = PAID`, `paidAmount = totalAmount`
  - _Requirements: 4.1, 4.2_

- [x] 5.4 Write property test for approve state transition
  - **Property 7: Approve payment drives correct state**
  - **Validates: Requirements 4.1, 4.2**

- [x] 5.5 Implement `rejectPayment` in `backend/src/controllers/payment.controller.js`
  - Find payment by ID; return 404 if not found
  - Return 409 if payment status is already `APPROVED`
  - Update payment: `status = REJECTED`, `notes = reason` from request body
  - Leave invoice status and `dueAmount` unchanged
  - _Requirements: 4.3, 4.4_

- [x] 5.6 Write property test for reject state transition
  - **Property 8: Reject payment leaves invoice unchanged**
  - **Validates: Requirements 4.3, 4.4**

- [x] 6. Implement invoice generation and discount endpoints
- [x] 6.1 Implement `generateInvoices` in `backend/src/controllers/payment.controller.js`
  - Accept `semesterId` in request body
  - Query all active students enrolled in the given semester
  - For each student, skip if invoice already exists for that semester
  - Look up FeeStructure for student's program + semester; add to `skipped` list if missing
  - Create Invoice with `referenceNumber` from `generateReferenceNumber`, `totalAmount` from fee structure, `dueDate` = now + 14 days
  - Return counts of created, skipped, and errors
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6.2 Write property test for invoice generation idempotency
  - **Property 9: Invoice generation idempotency**
  - **Validates: Requirements 6.1**

- [x] 6.3 Implement `applyDiscount` endpoint in `backend/src/controllers/payment.controller.js`
  - Accept `invoiceId`, `discountAmount`, `reason` in request body
  - Apply `applyDiscount(invoice.dueAmount, discountAmount)` utility
  - Update invoice `dueAmount` and append discount info to `notes`
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 7. Register new routes in `backend/src/routes/payment.routes.js`
  - `GET /my-invoices` → `getMyInvoices` (STUDENT)
  - `POST /upload-proof` → `uploadProof` with `upload.single('proof')` middleware (STUDENT)
  - `GET /admin/payments` → `getAllPaymentsAdmin` (ADMIN, REGISTRAR) — add to admin routes
  - `PUT /admin/payments/:id/approve` → `approvePayment` (ADMIN, REGISTRAR)
  - `PUT /admin/payments/:id/reject` → `rejectPayment` (ADMIN, REGISTRAR)
  - `POST /admin/invoices/generate` → `generateInvoices` (ADMIN, REGISTRAR)
  - `PUT /admin/invoices/:id/discount` → `applyDiscount` (ADMIN, REGISTRAR)
  - _Requirements: 1.1, 2.3, 3.1, 4.1, 4.3, 6.1, 8.1_

- [ ] 8. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Refactor `frontend/src/pages/PaymentPage.jsx` for proof-upload flow
  - Replace bank-transaction-ID verify flow with invoice list + proof upload form
  - Show invoice cards with: amount, due date, status badge (PAID=green, PENDING=yellow, OVERDUE=red), reference number
  - Add file input per invoice (accept image/*, max 2MB client-side check)
  - Show upload progress and disable submit while uploading
  - Show toast on success/error using `react-hot-toast`
  - Show payment history table below invoices
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 5.1, 5.2_

- [ ] 10. Create `frontend/src/pages/AdminPaymentsPage.jsx`
  - Fetch payments from `GET /api/admin/payments` with status filter
  - Render status filter tabs: All / Pending / Approved / Rejected
  - Render payments table: student name, student ID, invoice number, reference, amount, method, status badge, date
  - Add "View Proof" button that opens image in a modal
  - Add Approve / Reject buttons on PENDING rows with confirmation
  - Show rejection reason input in reject confirmation modal
  - Show toast notifications on approve/reject
  - _Requirements: 3.1, 3.2, 4.1, 4.3_

- [ ] 11. Wire `AdminPaymentsPage` into the app router and admin navigation
  - Add route `/admin/payments` in `frontend/src/App.jsx` or routes config
  - Add navigation link in admin sidebar/navbar
  - _Requirements: 3.1_

- [ ] 12. Final Checkpoint — Ensure all tests pass, ask the user if questions arise.
