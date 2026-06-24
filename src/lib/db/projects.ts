import { getPrisma } from "@/lib/db/prisma";
import type { DashboardLayout } from "@/lib/types";
import type { Project } from "@/lib/project-types";
import type { Prisma } from "@prisma/client";
import { Prisma as PrismaRuntime } from "@prisma/client";

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
  layout?: DashboardLayout | null;
  touchOpened?: boolean;
}

export async function createUserProject(
  userId: string,
  name: string,
  description?: string | null,
  initial?: Omit<ProjectUpsertInput, "name" | "description" | "touchOpened">
): Promise<Project> {
  const row = await getPrisma().project.create({
    data: {
      userId,
      name: name.trim() || "Project Baru",
      description: description?.trim() || null,
      sheetUrls: initial?.sheetUrls ?? [],
      mergeMode: initial?.mergeMode ?? false,
      dbConnectionIds: initial?.dbConnectionIds ?? [],
      activeDbConnectionId: initial?.activeDbConnectionId ?? null,
      activeDbTable: initial?.activeDbTable ?? null,
      ...(initial?.layout !== undefined
        ? {
            layoutJson:
              initial.layout === null
                ? PrismaRuntime.JsonNull
                : (initial.layout as unknown as Prisma.InputJsonValue),
          }
        : {}),
    },
  });
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
  if (input.layout !== undefined) {
    data.layoutJson =
      input.layout === null
        ? PrismaRuntime.JsonNull
        : (input.layout as unknown as Prisma.InputJsonValue);
  }
  if (input.touchOpened) data.lastOpenedAt = new Date();

  const row = await getPrisma().project.update({
    where: { id: projectId },
    data,
  });
  return toProject(row);
}

export async function deleteUserProject(userId: string, projectId: string): Promise<boolean> {
  const result = await getPrisma().project.deleteMany({
    where: { id: projectId, userId },
  });
  return result.count > 0;
}
