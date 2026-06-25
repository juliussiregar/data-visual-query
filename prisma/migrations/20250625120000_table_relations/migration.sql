-- AlterTable
ALTER TABLE "projects" ADD COLUMN "table_relations" JSONB NOT NULL DEFAULT '[]';
