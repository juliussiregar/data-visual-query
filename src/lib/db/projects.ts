import { getPrisma, resetPrismaClient } from "@/lib/db/prisma";
import type { DashboardLayout } from "@/lib/types";
import type { Project } from "@/lib/project-types";
import {
  normalizeActiveDbTables,
  syncLegacyActiveDbTable,
} from "@/lib/db-table-datasets";
import { normalizeTableRelations } from "@/lib/table-relations";
import { normalizeDerivedFields } from "@/lib/derived-fields";
import type { DerivedField } from "@/lib/derived-fields";
import type { TableRelation } from "@/lib/sql-query-types";
import type { Prisma } from "@prisma/client";
import { Prisma as PrismaRuntime } from "@prisma/client";

export async function filterOwnedDbConnectionIds(
  userId: string,
  ids: string[]
): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await getPrisma().userDbConnection.findMany({
    where: { userId, id: { in: ids } },
    select: { id: true },
  });
  const owned = new Set(rows.map((row) => row.id));
  return ids.filter((id) => owned.has(id));
}

export async function sanitizeProjectDbRefs(
  userId: string,
  input: Pick<ProjectUpsertInput, "dbConnectionIds" | "activeDbConnectionId">
): Promise<Pick<ProjectUpsertInput, "dbConnectionIds" | "activeDbConnectionId">> {
  const result: Pick<ProjectUpsertInput, "dbConnectionIds" | "activeDbConnectionId"> = {};

  if (input.dbConnectionIds !== undefined) {
    result.dbConnectionIds = await filterOwnedDbConnectionIds(userId, input.dbConnectionIds);
  }

  if (input.activeDbConnectionId !== undefined) {
    if (input.activeDbConnectionId === null) {
      result.activeDbConnectionId = null;
    } else {
      const owned = await filterOwnedDbConnectionIds(userId, [input.activeDbConnectionId]);
      result.activeDbConnectionId = owned[0] ?? null;
    }
  }

  return result;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim() !== "");
}

function toProject(row: {
  id: string;
  name: string;
  description: string | null;
  sheetUrls: unknown;
  mergeMode: boolean;
  dbConnectionIds: unknown;
  activeDbConnectionId: string | null;
  activeDbTable: string | null;
  activeDbTables: unknown;
  tableRelations: unknown;
  derivedFields?: unknown;
  layoutJson: unknown;
  lastOpenedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sheetUrls: parseStringArray(row.sheetUrls),
    mergeMode: row.mergeMode,
    dbConnectionIds: parseStringArray(row.dbConnectionIds),
    activeDbConnectionId: row.activeDbConnectionId,
    activeDbTable: row.activeDbTable,
    activeDbTables: parseStringArray(row.activeDbTables),
    tableRelations: normalizeTableRelations(row.tableRelations),
    derivedFields: normalizeDerivedFields(row.derivedFields ?? []),
    layout: (row.layoutJson as DashboardLayout | null) ?? null,
    lastOpenedAt: row.lastOpenedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listUserProjects(userId: string): Promise<Project[]> {
  const rows = await getPrisma().project.findMany({
    where: { userId },
    orderBy: { lastOpenedAt: "desc" },
  });
  return rows.map(toProject);
}

export async function getUserProject(userId: string, projectId: string): Promise<Project | null> {
  const row = await getPrisma().project.findFirst({
    where: { id: projectId, userId },
  });
  return row ? toProject(row) : null;
}

export interface ProjectUpsertInput {
  name?: string;
  description?: string | null;
  sheetUrls?: string[];
  mergeMode?: boolean;
  dbConnectionIds?: string[];
  activeDbConnectionId?: string | null;
  activeDbTable?: string | null;
  activeDbTables?: string[];
  tableRelations?: TableRelation[];
  derivedFields?: DerivedField[];
  layout?: DashboardLayout | null;
  touchOpened?: boolean;
}

function isUnknownPrismaFieldError(error: unknown, field: string): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes(`Unknown argument \`${field}\``) ||
    error.message.includes(`Unknown arg \`${field}\``)
  );
}

function stripUnknownProjectFields(data: Prisma.ProjectCreateInput): Prisma.ProjectCreateInput {
  const copy = { ...data } as Record<string, unknown>;
  for (const field of ["tableRelations", "derivedFields"]) {
    if (field in copy) delete copy[field];
  }
  return copy as Prisma.ProjectCreateInput;
}

async function createProjectRow(data: Prisma.ProjectCreateInput) {
  const prisma = getPrisma();
  try {
    return await prisma.project.create({ data });
  } catch (error) {
    if (
      !isUnknownPrismaFieldError(error, "tableRelations") &&
      !isUnknownPrismaFieldError(error, "derivedFields")
    ) {
      throw error;
    }
    resetPrismaClient();
    console.warn(
      "[projects] Prisma client usang — simpan tanpa tableRelations/derivedFields. Jalankan ulang `npm run dev` setelah migration."
    );
    return await getPrisma().project.create({ data: stripUnknownProjectFields(data) });
  }
}

async function updateProjectRow(projectId: string, data: Prisma.ProjectUpdateInput) {
  const prisma = getPrisma();
  try {
    return await prisma.project.update({ where: { id: projectId }, data });
  } catch (error) {
    if (
      !isUnknownPrismaFieldError(error, "tableRelations") &&
      !isUnknownPrismaFieldError(error, "derivedFields")
    ) {
      throw error;
    }
    resetPrismaClient();
    console.warn(
      "[projects] Prisma client usang — update tanpa tableRelations/derivedFields. Jalankan ulang `npm run dev` setelah migration."
    );
    const rest = { ...data } as Record<string, unknown>;
    delete rest.tableRelations;
    delete rest.derivedFields;
    return await getPrisma().project.update({
      where: { id: projectId },
      data: rest as Prisma.ProjectUpdateInput,
    });
  }
}

export async function createUserProject(
  userId: string,
  name: string,
  description?: string | null,
  initial?: Omit<ProjectUpsertInput, "name" | "description" | "touchOpened">
): Promise<Project> {
  const tables = normalizeActiveDbTables(initial?.activeDbTables ?? []);
  const legacyTable = initial?.activeDbTable?.trim() ?? null;
  const activeDbTables = tables.length > 0 ? tables : legacyTable ? [legacyTable] : [];
  const activeDbTable = syncLegacyActiveDbTable(activeDbTables) ?? legacyTable;
  const normalizedRelations = normalizeTableRelations(initial?.tableRelations ?? []);
  const normalizedDerived = normalizeDerivedFields(initial?.derivedFields ?? []);

  const data: Prisma.ProjectCreateInput = {
    user: { connect: { id: userId } },
    name: name.trim() || "Project Baru",
    description: description?.trim() || null,
    sheetUrls: initial?.sheetUrls ?? [],
    mergeMode: initial?.mergeMode ?? false,
    dbConnectionIds: initial?.dbConnectionIds ?? [],
    activeDbConnectionId: initial?.activeDbConnectionId ?? null,
    activeDbTable,
    activeDbTables,
    ...(normalizedRelations.length > 0
      ? {
          tableRelations: normalizedRelations as unknown as Prisma.InputJsonValue,
        }
      : {}),
    ...(normalizedDerived.length > 0
      ? {
          derivedFields: normalizedDerived as unknown as Prisma.InputJsonValue,
        }
      : {}),
    ...(initial?.layout !== undefined
      ? {
          layoutJson:
            initial.layout === null
              ? PrismaRuntime.JsonNull
              : (initial.layout as unknown as Prisma.InputJsonValue),
        }
      : {}),
  };

  const row = await createProjectRow(data);
  return toProject(row);
}

export async function updateUserProject(
  userId: string,
  projectId: string,
  input: ProjectUpsertInput
): Promise<Project | null> {
  const existing = await getPrisma().project.findFirst({
    where: { id: projectId, userId },
  });
  if (!existing) return null;

  const data: Prisma.ProjectUpdateInput = {};

  if (input.name !== undefined) data.name = input.name.trim() || existing.name;
  if (input.description !== undefined) data.description = input.description?.trim() || null;
  if (input.sheetUrls !== undefined) data.sheetUrls = input.sheetUrls;
  if (input.mergeMode !== undefined) data.mergeMode = input.mergeMode;
  if (input.dbConnectionIds !== undefined) data.dbConnectionIds = input.dbConnectionIds;
  if (input.activeDbConnectionId !== undefined) {
    data.activeDbConnectionId = input.activeDbConnectionId;
  }
  if (input.activeDbTable !== undefined) data.activeDbTable = input.activeDbTable;
  if (input.activeDbTables !== undefined) {
    const tables = normalizeActiveDbTables(input.activeDbTables);
    data.activeDbTables = tables;
    data.activeDbTable = syncLegacyActiveDbTable(tables);
  }
  if (input.tableRelations !== undefined) {
    const normalized = normalizeTableRelations(input.tableRelations);
    if (normalized.length > 0) {
      data.tableRelations = normalized as unknown as Prisma.InputJsonValue;
    }
  }
  if (input.derivedFields !== undefined) {
    data.derivedFields = normalizeDerivedFields(
      input.derivedFields
    ) as unknown as Prisma.InputJsonValue;
  }
  if (input.layout !== undefined) {
    data.layoutJson =
      input.layout === null
        ? PrismaRuntime.JsonNull
        : (input.layout as unknown as Prisma.InputJsonValue);
  }
  if (input.touchOpened) data.lastOpenedAt = new Date();

  const row = await updateProjectRow(projectId, data);
  return toProject(row);
}

export async function deleteUserProject(userId: string, projectId: string): Promise<boolean> {
  const result = await getPrisma().project.deleteMany({
    where: { id: projectId, userId },
  });
  return result.count > 0;
}
