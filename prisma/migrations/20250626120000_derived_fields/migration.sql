-- Add per-project derived field formulas (e.g. Matematika = Tugas + Ulangan + Ujian)
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "derived_fields" JSONB NOT NULL DEFAULT '[]';
