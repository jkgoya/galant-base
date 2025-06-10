/*
  Warnings:

  - You are about to drop the column `scoreFormat` on the `Piece` table. All the data in the column will be lost.
  - You are about to drop the column `scoreUrl` on the `Piece` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Piece" DROP COLUMN "scoreFormat",
DROP COLUMN "scoreUrl";
