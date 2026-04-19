-- CreateEnum
CREATE TYPE "AcademicLevel" AS ENUM ('APPLICANT', 'ADMITTED', 'FRESHMAN', 'SOPHOMORE', 'JUNIOR', 'SENIOR', 'GRADUATED');

-- AlterEnum
ALTER TYPE "StudentStatus" ADD VALUE 'WITHDRAWN';

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "academicLevel" "AcademicLevel" NOT NULL DEFAULT 'FRESHMAN';
