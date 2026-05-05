-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PAID';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'OVERDUE';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- AlterTable Invoice
ALTER TABLE "Invoice"
  ADD COLUMN IF NOT EXISTS "referenceNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "lateFeeApplied" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_referenceNumber_key" ON "Invoice"("referenceNumber");

-- AlterTable Payment
ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "proofUrl" TEXT;
