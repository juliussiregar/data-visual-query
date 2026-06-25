import type { DashboardLayout } from "./types";
import type { TableRelation } from "./sql-query-types";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  sheetUrls: string[];
  mergeMode: boolean;
  dbConnectionIds: string[];
  activeDbConnectionId: string | null;
  activeDbTable: string | null;
  activeDbTables: string[];
  tableRelations: TableRelation[];
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
    | "activeDbTables"
    | "tableRelations"
    | "layout"
  >
> & { touchOpened?: boolean };
