import type { WidgetConfig } from "./types";

export const TABLE_PANEL_MIN_PX = 160;
export const TABLE_PANEL_MAX_PX = 900;

/** Measured from compact DataTable: thead/tbody py-3 + line-height + borders */
const TABLE_HEADER_PX = 45;
const TABLE_ROW_HEIGHT_PX = 47;
const TABLE_SUMMARY_ROW_PX = 52;
/** Room for horizontal scrollbar inside overflow-auto */
const TABLE_HORIZONTAL_SCROLLBAR_PX = 16;
const TABLE_SCROLL_PADDING_PX = 12;
const TABLE_FIT_BUFFER_PX = 6;
export const TABLE_AUTO_FIT_MAX_ROWS = 24;

/** @deprecated Presets kept for legacy layout JSON — height is auto-fit by default. */
export const TABLE_PANEL_HEIGHTS = {
  sm: 240,
  md: 360,
  lg: 520,
  xl: 680,
} as const;

export type TablePanelHeight = keyof typeof TABLE_PANEL_HEIGHTS;

export const TABLE_PANEL_HEIGHT_LABELS: Record<TablePanelHeight, string> = {
  sm: "Ringkas",
  md: "Sedang",
  lg: "Tinggi",
  xl: "Sangat tinggi",
};

export function clampTablePanelHeight(px: number): number {
  return Math.min(TABLE_PANEL_MAX_PX, Math.max(TABLE_PANEL_MIN_PX, Math.round(px)));
}

export function naturalTablePanelHeight(rowCount: number, hasSummaryRow = false): number {
  const bodyRows = Math.max(0, rowCount);
  return (
    TABLE_HEADER_PX +
    bodyRows * TABLE_ROW_HEIGHT_PX +
    (hasSummaryRow ? TABLE_SUMMARY_ROW_PX + TABLE_FIT_BUFFER_PX : 0) +
    TABLE_HORIZONTAL_SCROLLBAR_PX +
    TABLE_SCROLL_PADDING_PX
  );
}

export function tablePanelNeedsScroll(
  rowCount: number,
  heightPx: number,
  hasSummaryRow = false
): boolean {
  if (rowCount > TABLE_AUTO_FIT_MAX_ROWS) return true;
  const full = naturalTablePanelHeight(rowCount, hasSummaryRow);
  return heightPx < full - TABLE_FIT_BUFFER_PX;
}

export function resolveTablePanelHeight(
  widget: Pick<WidgetConfig, "tablePanelHeight" | "tablePanelHeightPx">,
  options?: { rowCount?: number; hasSummaryRow?: boolean }
): number {
  if (widget.tablePanelHeightPx != null && widget.tablePanelHeightPx >= TABLE_PANEL_MIN_PX) {
    return clampTablePanelHeight(widget.tablePanelHeightPx);
  }

  const rowCount = options?.rowCount ?? 0;
  const hasSummary = options?.hasSummaryRow ?? false;

  if (rowCount <= 0) {
    return TABLE_PANEL_HEIGHTS.md;
  }

  const fitRows = Math.min(rowCount, TABLE_AUTO_FIT_MAX_ROWS);
  return clampTablePanelHeight(naturalTablePanelHeight(fitRows, hasSummary));
}
