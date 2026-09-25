-- Safe, backward-compatible defaults for existing projects.
ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "primaryLanguage" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS "supportedLanguages" TEXT[] NOT NULL DEFAULT ARRAY['en']::TEXT[];

UPDATE "Project"
SET "primaryLanguage" = "language",
    "supportedLanguages" = ARRAY["language"]::TEXT[]
WHERE "language" IN ('en', 'hi', 'gu')
  AND "supportedLanguages" = ARRAY['en']::TEXT[];

UPDATE "Project"
SET "supportedLanguages" = ARRAY["primaryLanguage"]::TEXT[]
WHERE NOT ("primaryLanguage" = ANY("supportedLanguages"));

CREATE INDEX IF NOT EXISTS "DeliverableVersion_deliverableId_language_versionNumber_idx"
ON "DeliverableVersion"("deliverableId", "language", "versionNumber");
