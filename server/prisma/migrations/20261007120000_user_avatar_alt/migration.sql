-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatarUrlAlt" TEXT;
ALTER TABLE "User" ADD COLUMN "avatarPhotoSlot" TEXT NOT NULL DEFAULT 'primary';
