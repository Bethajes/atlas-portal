-- CreateEnum
CREATE TYPE "GradeStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED', 'INCOMPLETE');

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0;

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "academicYear" TEXT,
ADD COLUMN     "semester" TEXT;

-- AlterTable
ALTER TABLE "CourseStudent" ADD COLUMN     "letterGrade" TEXT,
ADD COLUMN     "status" "GradeStatus" NOT NULL DEFAULT 'IN_PROGRESS';

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100;

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "score" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "gradePoint" DOUBLE PRECISION,
    "letterGrade" TEXT,
    "type" TEXT NOT NULL DEFAULT 'ASSIGNMENT',
    "semester" TEXT,
    "academicYear" TEXT,
    "gradedBy" TEXT,
    "gradedAt" TIMESTAMP(3),
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
