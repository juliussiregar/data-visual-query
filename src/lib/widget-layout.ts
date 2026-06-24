import type { WidgetConfig, WidgetVisualShape } from "./types";

export type WidgetLayoutWidth = "full" | "half";

const FORCED_FULL_SHAPES: WidgetVisualShape[] = ["table", "ranking"];

export function defaultLayoutWidth(shape?: WidgetVisualShape): WidgetLayoutWidth {
  if (!shape) return "full";
  if (FORCED_FULL_SHAPES.includes(shape)) return "full";
  return "half";
}

export function isForcedFullWidth(widget: WidgetConfig): boolean {
  return !!widget.visualShape && FORCED_FULL_SHAPES.includes(widget.visualShape);
}

export function getWidgetLayoutWidth(widget: WidgetConfig): WidgetLayoutWidth {
  if (isForcedFullWidth(widget)) return "full";
  if (widget.layoutWidth) return widget.layoutWidth;
  if (widget.span === 2 || widget.span === 3) return "full";
  if (widget.span === 1) return "half";
  return defaultLayoutWidth(widget.visualShape);
}

export function layoutWidthLabel(width: WidgetLayoutWidth): string {
  return width === "full" ? "Full width" : "Half width";
}
