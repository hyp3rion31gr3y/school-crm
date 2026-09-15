-- Add mandatory gender to students; legacy rows backfill '' (shown as not-set until updated).
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "gender" TEXT NOT NULL DEFAULT '';
