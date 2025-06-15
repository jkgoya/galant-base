/*
  Warnings:

  - Made the column `format` on table `Piece` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Piece" ALTER COLUMN "meiData" DROP NOT NULL,
ALTER COLUMN "format" SET NOT NULL;
