-- Add admission fields to students (idempotent: safe on fresh and existing DBs).
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "student_name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "father_name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "father_phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "mother_name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "mother_phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "aadhar_number" TEXT NOT NULL DEFAULT '';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'students_aadhar_number_key') THEN
    -- Backfill any legacy '' aadhar values to unique placeholders before constraining.
    WITH dupes AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY "aadhar_number" ORDER BY id) AS rn
      FROM "students"
    )
    UPDATE "students" s
    SET "aadhar_number" = 'PENDING-' || LEFT(s.id::TEXT, 8)
    FROM dupes d
    WHERE s.id = d.id AND (d.rn > 1 OR s."aadhar_number" = '');
    CREATE UNIQUE INDEX "students_aadhar_number_key" ON "students"("aadhar_number");
  END IF;
END $$;
