import type { DashboardLayout } from "./types";
import type { TableRelation } from "./sql-query-types";
import type { DerivedField } from "./derived-fields";

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
  derivedFields: DerivedField[];
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
    | "derivedFields"
    | "layout"
  >
> & { touchOpened?: boolean };
