-- Teacher profile columns on users (nullable: existing rows unaffected).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "display_name" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
-- Class-teacher link already exists via classes.class_teacher_id; no change needed.
