-- AlterEnum
ALTER TYPE "BookStatus" ADD VALUE 'paused';

-- AlterTable
ALTER TABLE "AuthorProfile" ADD COLUMN     "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "genreId" TEXT,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "subtitle" TEXT;

-- CreateTable
CREATE TABLE "Genre" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE SET NULL ON UPDATE CASCADE;
