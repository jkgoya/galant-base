-- Drop the Annotation table and its foreign key constraints
ALTER TABLE "Annotation" DROP CONSTRAINT IF EXISTS "Annotation_pieceId_fkey";
ALTER TABLE "Annotation" DROP CONSTRAINT IF EXISTS "Annotation_userEmail_fkey";
DROP TABLE IF EXISTS "Annotation"; 