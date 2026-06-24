import type { ViewId } from "./types";
import type { UserRole } from "./auth";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BarChart3,
  Table2,
  Search,
  Database,
  ClipboardList,
} from "lucide-react";

export interface NavItem {
  id: ViewId;
  label: string;
  icon: LucideIcon;
  desc: string;
  requiresData?: boolean;
  adminOnly?: boolean;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "analyze",
    label: "Analyze",
    items: [
      {
        id: "overview",
        label: "Overview",
        icon: LayoutDashboard,
        desc: "Dashboard & widgets",
        requiresData: true,
      },
      {
        id: "charts",
        label: "Charts",
        icon: BarChart3,
        desc: "All visualizations",
        requiresData: true,
      },
      {
        id: "data",
        label: "Data",
        icon: Table2,
        desc: "Table & columns",
        requiresData: true,
      },
      {
        id: "query",
        label: "Explore",
        icon: Search,
        desc: "Visual filters",
        requiresData: true,
      },
    ],
  },
  {
    id: "setup",
    label: "Settings",
    items: [
      {
        id: "sources",
        label: "Sources",
        icon: Database,
        desc: "PostgreSQL connections",
      },
      {
        id: "audit",
        label: "Audit Log",
        icon: ClipboardList,
        desc: "Activity history",
        adminOnly: true,
      },
    ],
  },
];

export const DATA_VIEW_IDS = new Set<ViewId>(
  NAV_SECTIONS[0].items.filter((i) => i.requiresData).map((i) => i.id)
);

export function navItemsForRole(role?: UserRole): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.adminOnly || role === "admin"),
  })).filter((section) => section.items.length > 0);
}

export function flatNavItemsForRole(role?: UserRole): NavItem[] {
  return navItemsForRole(role).flatMap((s) => s.items);
}

/** Primary tabs shown on mobile; rest go under overflow via sidebar */
export const MOBILE_PRIMARY_VIEWS: ViewId[] = ["overview", "charts", "data", "query"];
