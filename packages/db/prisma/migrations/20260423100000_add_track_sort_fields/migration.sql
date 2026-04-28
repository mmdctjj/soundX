-- AlterTable
ALTER TABLE "Track" ADD COLUMN "fileName" TEXT;
ALTER TABLE "Track" ADD COLUMN "relativePath" TEXT;
ALTER TABLE "Track" ADD COLUMN "fileCreatedAt" DATETIME;
ALTER TABLE "Track" ADD COLUMN "scanOrder" INTEGER;
