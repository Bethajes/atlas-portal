-- CreateEnum
CREATE TYPE "ProgramType" AS ENUM ('DECLARED', 'UNDECLARED');

-- DropForeignKey
ALTER TABLE "Program" DROP CONSTRAINT "Program_departmentId_fkey";

-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "type" "ProgramType" NOT NULL DEFAULT 'DECLARED',
ALTER COLUMN "departmentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "email" TEXT,
ADD COLUMN     "fatherName" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "isFirstLogin" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "profileCompleted" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
