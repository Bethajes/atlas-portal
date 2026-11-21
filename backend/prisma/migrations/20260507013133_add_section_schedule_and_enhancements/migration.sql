-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "roomNumber" TEXT,
ADD COLUMN     "sectionCode" TEXT;

-- AlterTable
ALTER TABLE "SectionEnrollment" ADD COLUMN     "attendanceRate" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "SectionSchedule" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SectionSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SectionSchedule_sectionId_idx" ON "SectionSchedule"("sectionId");

-- CreateIndex
CREATE INDEX "SectionSchedule_dayOfWeek_startTime_endTime_idx" ON "SectionSchedule"("dayOfWeek", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "Section_semesterId_departmentId_idx" ON "Section"("semesterId", "departmentId");

-- CreateIndex
CREATE INDEX "Section_instructorId_semesterId_idx" ON "Section"("instructorId", "semesterId");

-- CreateIndex
CREATE INDEX "SectionEnrollment_sectionId_status_idx" ON "SectionEnrollment"("sectionId", "status");

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "AcademicSemester"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionSchedule" ADD CONSTRAINT "SectionSchedule_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;
