-- Migrate legacy students into learners, then drop the students table.
INSERT INTO "learners" ("id", "name", "phone", "standard", "image_url", "created_at")
SELECT "id", "name", "phone", "standard", "image_url", "created_at"
FROM "students"
ON CONFLICT ("id") DO NOTHING;

DROP TABLE IF EXISTS "students";
