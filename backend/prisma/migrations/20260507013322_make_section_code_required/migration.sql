/*
  Warnings:

  - A unique constraint covering the columns `[sectionCode]` on the table `Section` will be added. If there are existing duplicate values, this will fail.
  - Made the column `sectionCode` on table `Section` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Section" ALTER COLUMN "sectionCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Section_sectionCode_key" ON "Section"("sectionCode");
