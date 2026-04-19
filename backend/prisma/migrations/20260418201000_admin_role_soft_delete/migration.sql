-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'STAFF', 'REGISTRAR_ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "adminRole" "AdminRole";

-- AlterTable
ALTER TABLE "Department" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Program" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- Backfill admin sub-role for existing administrators
UPDATE "User" SET "adminRole" = 'SUPER_ADMIN' WHERE "role" = 'ADMIN';
