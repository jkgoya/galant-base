-- Add orderIndex column to Gschema table
ALTER TABLE "Gschema" ADD COLUMN "orderIndex" INTEGER NOT NULL DEFAULT 1000; 