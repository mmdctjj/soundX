-- AlterTable
ALTER TABLE "Album" ADD COLUMN "description" TEXT;
ALTER TABLE "Album" ADD COLUMN "tags" TEXT;

-- AlterTable
ALTER TABLE "Artist" ADD COLUMN "description" TEXT;
ALTER TABLE "Artist" ADD COLUMN "tags" TEXT;

-- AlterTable
ALTER TABLE "Track" ADD COLUMN "tags" TEXT;
