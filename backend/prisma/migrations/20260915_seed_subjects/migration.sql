-- Seed standard subjects (idempotent; code is unique).
INSERT INTO "subjects" ("id", "name", "code") VALUES
  ('20000000-0000-4000-8000-000000000001', 'English', 'ENG'),
  ('20000000-0000-4000-8000-000000000002', 'Hindi', 'HIN'),
  ('20000000-0000-4000-8000-000000000003', 'Mathematics', 'MAT'),
  ('20000000-0000-4000-8000-000000000004', 'Science', 'SCI'),
  ('20000000-0000-4000-8000-000000000005', 'Social Science', 'SST'),
  ('20000000-0000-4000-8000-000000000006', 'Sanskrit', 'SAN'),
  ('20000000-0000-4000-8000-000000000007', 'Computer Science', 'CSC'),
  ('20000000-0000-4000-8000-000000000008', 'Art & Craft', 'ART'),
  ('20000000-0000-4000-8000-000000000009', 'Physical Education', 'PET'),
  ('20000000-0000-4000-8000-000000000010', 'General Knowledge', 'GKN')
ON CONFLICT ("code") DO NOTHING;
