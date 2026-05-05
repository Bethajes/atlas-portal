# Requirements Document

## Introduction

This document specifies the requirements for a professional monthly payment system for Atlas Health College's university portal. The system enables students to view invoices, upload payment proof, and track payment status. Admins and registrars can verify uploaded proofs, approve or reject payments, and manage the full payment lifecycle. The system extends the existing Invoice and Payment models in the Prisma schema and integrates with the current React/Node.js/Express/Prisma stack.

## Glossary

- **Invoice**: A record generated per student per semester detailing the amount owed, due date, and current payment status.
- **Payment**: A record representing a student's attempt to pay an invoice, including the uploaded proof image and verification status.
- **Proof Upload**: An image file (JPEG, PNG, WEBP) submitted by a student as evidence of a completed bank or mobile money transfer.
- **Reference Number**: A unique identifier in the format `STUDENTID-YEAR-MONTH` assigned to each invoice to be used when making a bank transfer.
- **PaymentStatus**: An enumeration of invoice states: `PENDING`, `PAID`, `OVERDUE`.
- **VerificationStatus**: An enumeration of payment proof states: `PENDING`, `APPROVED`, `REJECTED`.
- **Admin**: A user with role `ADMIN` or `REGISTRAR` who has authority to approve or reject payment proofs.
- **Student**: A user with role `STUDENT` who owes tuition fees and submits payment proofs.
- **Late Fee**: An additional charge applied to an invoice when payment is not received before the due date.
- **Scholarship/Discount**: A reduction applied to the total invoice amount before it is presented to the student.
- **FeeStructure**: An existing Prisma model that defines tuition and ancillary fees per program per semester.
- **OVERDUE**: An invoice status applied automatically when the due date has passed and the invoice remains unpaid.

---

## Requirements

### Requirement 1

**User Story:** As a student, I want to view all my invoices with their amounts, due dates, statuses, and reference numbers, so that I know exactly what I owe and when.

#### Acceptance Criteria

1. WHEN a student requests their invoice list, THE Payment System SHALL return all invoices belonging to that student ordered by due date descending.
2. WHEN an invoice's due date has passed and its status is `PENDING`, THE Payment System SHALL automatically update the invoice status to `OVERDUE` before returning it.
3. WHEN an invoice is returned to the student, THE Payment System SHALL include the fields: `invoiceNumber`, `referenceNumber`, `totalAmount`, `dueAmount`, `dueDate`, `status`, and the associated semester name.
4. IF a student has no invoices, THEN THE Payment System SHALL return an empty list with a 200 status code.

---

### Requirement 2

**User Story:** As a student, I want to upload a payment proof image for a specific invoice, so that the admin can verify my payment.

#### Acceptance Criteria

1. WHEN a student submits a payment proof, THE Payment System SHALL accept only files with MIME types `image/jpeg`, `image/png`, or `image/webp`.
2. WHEN a student submits a payment proof, THE Payment System SHALL reject files exceeding 2 MB in size and return a 400 error with a descriptive message.
3. WHEN a student submits a valid proof for an invoice, THE Payment System SHALL create a Payment record with status `PENDING` and store the uploaded file URL.
4. WHEN a student attempts to submit a proof for an invoice that already has a `PENDING` or `APPROVED` payment, THE Payment System SHALL reject the submission and return a 409 conflict error.
5. WHEN a student submits a proof, THE Payment System SHALL associate the payment with the correct invoice using the provided `invoiceId`.

---

### Requirement 3

**User Story:** As an admin, I want to view all submitted payment proofs with filtering by status, so that I can efficiently process the verification queue.

#### Acceptance Criteria

1. WHEN an admin requests the payments list, THE Payment System SHALL return all Payment records including student name, student ID, invoice number, reference number, amount, proof image URL, payment method, and verification status.
2. WHEN an admin provides a `status` query parameter, THE Payment System SHALL return only Payment records matching that status.
3. WHEN no `status` filter is provided, THE Payment System SHALL return all Payment records ordered by `createdAt` descending.
4. WHILE an admin is viewing payments, THE Payment System SHALL include pagination support with `page` and `limit` query parameters.

---

### Requirement 4

**User Story:** As an admin, I want to approve or reject a payment proof, so that the student's invoice is updated accordingly.

#### Acceptance Criteria

1. WHEN an admin approves a payment, THE Payment System SHALL update the Payment status to `APPROVED`, set `verifiedAt` to the current timestamp, and set `verifiedBy` to the admin's user ID.
2. WHEN an admin approves a payment, THE Payment System SHALL update the associated Invoice status to `PAID` and set `paidAmount` equal to `totalAmount`.
3. WHEN an admin rejects a payment, THE Payment System SHALL update the Payment status to `REJECTED` and store the optional rejection reason in the `notes` field.
4. WHEN an admin rejects a payment, THE Payment System SHALL leave the associated Invoice status unchanged so the student may resubmit.
5. IF an admin attempts to approve or reject a payment that is already `APPROVED`, THEN THE Payment System SHALL return a 409 conflict error.

---

### Requirement 5

**User Story:** As a student, I want to see my payment history with statuses, so that I can track which payments were approved, rejected, or are still pending.

#### Acceptance Criteria

1. WHEN a student requests their payment history, THE Payment System SHALL return all Payment records for that student ordered by `createdAt` descending.
2. WHEN returning payment history, THE Payment System SHALL include for each record: `referenceNumber`, `amount`, `paymentMethod`, `status`, `proofUrl`, `createdAt`, and the associated invoice's `invoiceNumber` and semester name.
3. IF a payment was rejected, THE Payment System SHALL include the rejection reason in the response.

---

### Requirement 6

**User Story:** As a system administrator, I want invoices to be generated automatically for enrolled students each semester, so that billing is consistent and requires no manual entry.

#### Acceptance Criteria

1. WHEN an invoice generation request is made for a semester, THE Payment System SHALL create one Invoice per active enrolled student who does not already have an invoice for that semester.
2. WHEN generating an invoice, THE Payment System SHALL set the `referenceNumber` using the format `STUDENTID-YEAR-MONTH` where YEAR is the current calendar year and MONTH is the two-digit month.
3. WHEN generating an invoice, THE Payment System SHALL derive `totalAmount` from the FeeStructure associated with the student's program and the given semester.
4. IF no FeeStructure exists for a student's program and semester combination, THEN THE Payment System SHALL skip that student and include the student ID in the response's `skipped` list.
5. WHEN generating invoices, THE Payment System SHALL set `dueDate` to 14 days after the invoice generation date.

---

### Requirement 7

**User Story:** As a student, I want late fees applied to my overdue invoices, so that I understand the financial consequence of delayed payment.

#### Acceptance Criteria

1. WHEN an invoice transitions to `OVERDUE` status, THE Payment System SHALL calculate a late fee equal to 5% of the original `totalAmount`.
2. WHEN a late fee is applied, THE Payment System SHALL add the late fee to the `dueAmount` field of the invoice.
3. WHEN a late fee has already been applied to an invoice, THE Payment System SHALL NOT apply an additional late fee on subsequent overdue checks.

---

### Requirement 8

**User Story:** As a student, I want to benefit from scholarships or discounts on my invoice, so that my financial aid is reflected in what I owe.

#### Acceptance Criteria

1. WHEN a discount is applied to an invoice, THE Payment System SHALL reduce the `dueAmount` by the specified discount value without modifying `totalAmount`.
2. WHEN a discount is applied, THE Payment System SHALL record the discount amount and reason in the invoice `notes` field.
3. IF a discount would reduce `dueAmount` below zero, THEN THE Payment System SHALL set `dueAmount` to zero.

---

### Requirement 9

**User Story:** As a developer, I want all payment proof data to be serializable and deserializable without loss, so that the system can reliably store and retrieve payment records.

#### Acceptance Criteria

1. WHEN a Payment record is serialized to JSON and then deserialized, THE Payment System SHALL produce an object equal to the original in all fields.
2. WHEN an Invoice record is serialized to JSON and then deserialized, THE Payment System SHALL produce an object equal to the original in all fields.
