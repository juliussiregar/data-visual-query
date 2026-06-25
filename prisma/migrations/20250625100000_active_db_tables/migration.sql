ALTER TABLE "projects" ADD COLUMN "active_db_tables" JSONB NOT NULL DEFAULT '[]';

UPDATE "projects"
SET "active_db_tables" = jsonb_build_array("active_db_table")
WHERE "active_db_table" IS NOT NULL AND trim("active_db_table") <> '';
