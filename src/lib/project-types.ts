import type { DashboardLayout } from "./types";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  sheetUrls: string[];
  mergeMode: boolean;
  dbConnectionIds: string[];
  activeDbConnectionId: string | null;
  activeDbTable: string | null;
  layout: DashboardLayout | null;
  lastOpenedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectPatch = Partial<
  Pick<
    Project,
    | "name"
    | "description"
    | "sheetUrls"
    | "mergeMode"
    | "dbConnectionIds"
    | "activeDbConnectionId"
    | "activeDbTable"
    | "layout"
  >
> & { touchOpened?: boolean };
