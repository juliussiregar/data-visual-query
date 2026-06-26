"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Loader2,
  Plus,
  Pencil,
  RotateCcw,
  Copy,
  Sparkles,
  Trash2,
  X,
  AlertCircle,
} from "lucide-react";
import type { DashboardLayout, SheetData, WidgetConfig, WidgetVisualShape } from "@/lib/types";
import { getVisibleWidgets, widgetLabel } from "@/lib/layout";
import { WIDGET_SHAPES, WIDGET_SHAPE_GROUPS, createWidgetFromShape } from "@/lib/widget-catalog";
import { LayoutSilhouettePreview, ShapeSilhouette } from "./WidgetSilhouette";
import { WidgetDataConfigurator, type WidgetDataConfiguratorHandle } from "./WidgetDataConfigurator";
import { WidgetPreview } from "./WidgetPreview";
import { MultiSheetPanel } from "./MultiSheetPanel";
import type { LayoutSyncStatus } from "@/hooks/useLayoutAutoSave";
import { validateWidgetConfig } from "@/lib/widget-data";
import type { TableRelation } from "@/lib/sql-query-types";
import { formatDatasetLabel } from "@/lib/table-relations";
import type { DerivedField } from "@/lib/derived-fields";
import { sheetDataWithDerivedFields } from "@/lib/derived-fields";
import { resolveWidgetSheetData } from "@/lib/db-table-datasets";
import { detectSourcesKind } from "@/lib/data-source-labels";
import { getWidgetLayoutWidth, layoutWidthLabel } from "@/lib/widget-layout";
import { cn } from "@/lib/utils";
import { useToast } from "./ToastProvider";

type WizardMode = "add" | "edit" | null;

interface DashboardBuilderModalProps {
  open: boolean;
  layout: DashboardLayout;
  data: SheetData;
  derivedFields?: DerivedField[];
  dbDatasets?: Record<string, SheetData> | null;
  activeDbTables?: string[];
  tableRelations?: TableRelation[];
  sheetUrls: string[];
  syncStatus: LayoutSyncStatus;
  initialShape?: WidgetVisualShape;
  initialEditWidgetId?: string;
  onClose: () => void;
  onSave: (layout: DashboardLayout) => void;
  onReset: () => void;
  onAddSheet: (url: string) => void;
  onRemoveSheet: (url: string) => void;
  onToggleMerge: (enabled: boolean) => void;
  onReloadMerged: () => void;
  onDerivedFieldsChange?: (fields: DerivedField[]) => void | Promise<void>;
}

export function DashboardBuilderModal(props: DashboardBuilderModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !props.open) return null;

  return createPortal(<BuilderDialog {...props} />, document.body);
}

function BuilderDialog({
  open,
  layout,
  data,
  derivedFields = [],
  dbDatasets,
  activeDbTables = [],
  tableRelations,
  sheetUrls,
  syncStatus,
  initialShape,
  initialEditWidgetId,
  onClose,
  onSave,
  onReset,
  onAddSheet,
  onRemoveSheet,
  onToggleMerge,
  onReloadMerged,
  onDerivedFieldsChange,
}: DashboardBuilderModalProps) {
  const [draft, setDraft] = useState<DashboardLayout>(layout);
  const [wizardMode, setWizardMode] = useState<WizardMode>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const configScrollRef = useRef<HTMLDivElement>(null);
  const configuratorRef = useRef<WidgetDataConfiguratorHandle>(null);
  const { toast } = useToast();

  const reportValidationError = (error: string) => {
    setValidationError(error);
    toast(error, "error");
    configScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const enrichData = (sheet: SheetData) => sheetDataWithDerivedFields(sheet, derivedFields);

  const dataForWidget = (widget: WidgetConfig) =>
    enrichData(resolveWidgetSheetData(data, dbDatasets, widget));

  const baseColumnsForWidget = (widget: WidgetConfig) =>
    resolveWidgetSheetData(data, dbDatasets, widget).columns;

  const baseSheetForTable = (sourceTable?: string) =>
    enrichData(
      sourceTable && dbDatasets?.[sourceTable] ? dbDatasets[sourceTable] : data
    );

  const defaultSourceTable = activeDbTables[0];
  const isDatabase =
    activeDbTables.length > 0 || detectSourcesKind(sheetUrls) === "database";

  useEffect(() => {
    if (open) {
      setDraft(structuredClone(layout));
      setWizardMode(null);
      setWizardStep(1);
      setEditingWidget(null);
      setValidationError(null);

      if (initialEditWidgetId) {
        const target = layout.widgets.find(
          (w) => w.id === initialEditWidgetId && w.visualShape
        );
        if (target) {
          setEditingWidget(structuredClone(target));
          setWizardMode("edit");
          setWizardStep(2);
          return;
        }
      }

      if (initialShape) {
        const maxOrder = Math.max(0, ...layout.widgets.map((w) => w.order));
        const widgetData = baseSheetForTable(defaultSourceTable);
        setEditingWidget(
          createWidgetFromShape(initialShape, widgetData, maxOrder, defaultSourceTable)
        );
        setWizardMode("add");
        setWizardStep(2);
      }
    }
  }, [open, layout, data, dbDatasets, defaultSourceTable, initialShape, initialEditWidgetId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (wizardMode) {
          setWizardMode(null);
          setEditingWidget(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, wizardMode]);

  const visible = getVisibleWidgets(draft);
  const dashboardWidgets = visible.filter((w) => w.visualShape || w.visible);

  const maxOrder = () => Math.max(0, ...draft.widgets.map((w) => w.order));

  const startAdd = () => {
    setWizardMode("add");
    setWizardStep(1);
    setEditingWidget(null);
  };

  const pickShape = (shapeId: WidgetVisualShape) => {
    setEditingWidget(
      createWidgetFromShape(shapeId, baseSheetForTable(defaultSourceTable), maxOrder(), defaultSourceTable)
    );
    setWizardStep(2);
  };

  const startEdit = (widget: WidgetConfig) => {
    if (!widget.visualShape) return;
    setWizardMode("edit");
    setWizardStep(2);
    setEditingWidget(structuredClone(widget));
  };

  const cancelWizard = () => {
    setWizardMode(null);
    setWizardStep(1);
    setEditingWidget(null);
  };

  const mergeEditingWidget = (
    currentDraft: DashboardLayout,
    widget: WidgetConfig
  ): { draft: DashboardLayout } | { error: string } => {
    const err = validateWidgetConfig(widget, dataForWidget(widget));
    if (err) return { error: err };
    const saved = { ...widget, visible: true };
    const exists = currentDraft.widgets.some((w) => w.id === widget.id);
    const widgets = exists
      ? currentDraft.widgets.map((w) => (w.id === widget.id ? saved : w))
      : [...currentDraft.widgets, saved];
    return {
      draft: {
        ...currentDraft,
        updatedAt: new Date().toISOString(),
        widgets,
      },
    };
  };

  const commitWidget = async () => {
    if (!editingWidget) return;
    let widgetToSave = editingWidget;
    const pending = await configuratorRef.current?.commitPendingDerivedField();
    if (pending?.error) {
      reportValidationError(pending.error);
      return;
    }
    if (pending?.widgetPatch) {
      widgetToSave = { ...editingWidget, ...pending.widgetPatch };
      setEditingWidget(widgetToSave);
    }
    const result = mergeEditingWidget(draft, widgetToSave);
    if ("error" in result) {
      reportValidationError(result.error);
      return;
    }
    setValidationError(null);
    setDraft(result.draft);
    onSave(result.draft);
    cancelWizard();
  };

  const saveAndClose = async () => {
    let finalDraft = draft;
    if (wizardMode && wizardStep === 2 && editingWidget) {
      let widgetToSave = editingWidget;
      const pending = await configuratorRef.current?.commitPendingDerivedField();
      if (pending?.error) {
        reportValidationError(pending.error);
        return;
      }
      if (pending?.widgetPatch) {
        widgetToSave = { ...editingWidget, ...pending.widgetPatch };
        setEditingWidget(widgetToSave);
      }
      const result = mergeEditingWidget(draft, widgetToSave);
      if ("error" in result) {
        reportValidationError(result.error);
        return;
      }
      finalDraft = result.draft;
      setDraft(finalDraft);
      setValidationError(null);
    }
    onSave(finalDraft);
    onClose();
  };

  const removeWidget = (widgetId: string) => {
    const nextDraft = {
      ...draft,
      updatedAt: new Date().toISOString(),
      widgets: draft.widgets.filter((w) => w.id !== widgetId),
    };
    setDraft(nextDraft);
    onSave(nextDraft);
  };

  const duplicateWidget = (widget: WidgetConfig) => {
    if (!widget.visualShape) return;
    const copy: WidgetConfig = {
      ...structuredClone(widget),
      id: `w-${crypto.randomUUID()}`,
      order: maxOrder() + 1,
      title: widget.title ? `${widget.title} (copy)` : undefined,
      visible: true,
    };
    const nextDraft = {
      ...draft,
      updatedAt: new Date().toISOString(),
      widgets: [...draft.widgets, copy],
    };
    setDraft(nextDraft);
    onSave(nextDraft);
  };

  const moveWidget = (widgetId: string, dir: "up" | "down") => {
    const vis = getVisibleWidgets(draft);
    const idx = vis.findIndex((w) => w.id === widgetId);
    if (idx < 0) return;
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= vis.length) return;
    const a = vis[idx];
    const b = vis[swapIdx];
    const nextDraft = {
      ...draft,
      updatedAt: new Date().toISOString(),
      widgets: draft.widgets.map((w) => {
        if (w.id === a.id) return { ...w, order: b.order };
        if (w.id === b.id) return { ...w, order: a.order };
        return w;
      }),
    };
    setDraft(nextDraft);
    onSave(nextDraft);
  };

  const patchEditing = (patch: Partial<WidgetConfig>) => {
    setEditingWidget((prev) => (prev ? { ...prev, ...patch } : prev));
    setValidationError(null);
  };

  const previewWidgets = visible;

  const wizardTitle =
    wizardMode === "edit"
      ? "Edit widget"
      : wizardMode === "add"
        ? "Add a widget"
        : "Overview layout";

  const wizardSubtitle =
    wizardMode === "edit"
      ? "Step 2 — update settings for this widget"
      : wizardMode
        ? wizardStep === 1
          ? "Step 1 — pick a visual type"
          : "Step 2 — configure data for this widget only"
        : "Manage widgets on your overview";

  return (
    <div
      className="layer-modal fixed inset-0 flex items-end justify-center sm:items-center sm:p-6"
      role="presentation"
    >
      <div
        className="absolute inset-0 cursor-pointer bg-white/85 backdrop-blur-md animate-fade-in"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit dashboard"
        className="layer-modal-panel chat-pop-in relative flex max-h-[min(92vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 sm:rounded-3xl"
      >
        <div className="relative shrink-0 overflow-hidden border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-600/15 via-violet-600/10 to-transparent" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-indigo-600">
                <Sparkles className="h-3 w-3" />
                Widget builder
              </div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{wizardTitle}</h2>
              <p className="mt-1 text-sm text-slate-400">{wizardSubtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 sm:inline">
                {visible.length} widget
              </span>
              {syncStatus === "saving" && (
                <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {wizardMode && (
            <div className="relative mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={wizardStep === 2 && wizardMode === "add" ? () => setWizardStep(1) : cancelWizard}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {wizardStep === 2 && wizardMode === "add" ? "Change type" : "Back to list"}
              </button>
              <div className="ml-auto flex gap-1.5">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                    wizardStep === 1 ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
                  )}
                >
                  1. Type
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                    wizardStep === 2 ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
                  )}
                >
                  2. Configure
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <div
            ref={configScrollRef}
            className="min-h-0 flex-1 overflow-y-auto border-b border-slate-200 p-5 sm:p-6 lg:border-b-0 lg:border-r"
          >
            {wizardMode ? (
              wizardStep === 1 ? (
                <section className="space-y-5">
                  <p className="text-sm text-slate-600">
                    What should this widget show? You&apos;ll configure columns and filters next.
                  </p>
                  {WIDGET_SHAPE_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {group.label}
                      </p>
                      <p className="mb-2 text-[11px] text-slate-400">{group.description}</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {group.ids.map((id) => {
                          const shape = WIDGET_SHAPES.find((s) => s.id === id)!;
                          return (
                            <button
                              key={shape.id}
                              type="button"
                              onClick={() => pickShape(shape.id)}
                              className="group overflow-hidden rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-indigo-300 hover:shadow-md hover:ring-2 hover:ring-indigo-100"
                            >
                              <ShapeSilhouette shape={shape.id} compact className="mb-2" />
                              <p className="text-xs font-semibold text-slate-900">{shape.label}</p>
                              <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
                                {shape.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </section>
              ) : (
                editingWidget && (
                  <div className="space-y-4">
                    {validationError && (
                      <div
                        role="alert"
                        className="sticky top-0 z-10 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 shadow-sm"
                      >
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{validationError}</span>
                      </div>
                    )}
                    {editingWidget.visualShape && (
                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <ShapeSilhouette
                          shape={editingWidget.visualShape}
                          compact
                          active
                          className="w-24 shrink-0"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {WIDGET_SHAPES.find((s) => s.id === editingWidget.visualShape)?.label}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Set options on the left — preview updates live on the right.
                          </p>
                        </div>
                      </div>
                    )}
                    <WidgetDataConfigurator
                      ref={configuratorRef}
                      data={dataForWidget(editingWidget)}
                      primaryData={data}
                      dbDatasets={dbDatasets}
                      availableTables={activeDbTables}
                      tableRelations={tableRelations}
                      widget={editingWidget}
                      onChange={patchEditing}
                      derivedFields={derivedFields}
                      baseColumns={baseColumnsForWidget(editingWidget)}
                      onDerivedFieldsChange={onDerivedFieldsChange}
                    />
                    <button
                      type="button"
                      onClick={commitWidget}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400"
                    >
                      <Check className="h-4 w-4" />
                      {wizardMode === "add" ? "Add to dashboard" : "Save changes"}
                    </button>
                  </div>
                )
              )
            ) : (
              <>
                <section className="mb-6">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">Widgets</p>
                    <button
                      type="button"
                      onClick={startAdd}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add widget
                    </button>
                  </div>

                  {dashboardWidgets.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                      <p className="text-sm text-slate-500">No widgets yet.</p>
                      <button
                        type="button"
                        onClick={startAdd}
                        className="mt-3 text-sm font-medium text-indigo-600 hover:underline"
                      >
                        Choose a widget type →
                      </button>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {visible.map((w, i) => (
                        <li
                          key={w.id}
                          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-indigo-200 hover:bg-indigo-50/30"
                        >
                          {w.visualShape ? (
                            <ShapeSilhouette
                              shape={w.visualShape}
                              compact
                              className="w-14 shrink-0 !p-1.5"
                            />
                          ) : (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500">
                              {w.type.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-slate-800">
                              {widgetLabel(w, dataForWidget(w))}
                            </p>
                            {w.sourceTable && activeDbTables.length > 1 && (
                              <p className="text-[10px] text-slate-400">
                                {formatDatasetLabel(w.sourceTable, tableRelations)}
                              </p>
                            )}
                            {w.visualShape && (
                              <p className="text-[10px] text-slate-400">
                                {layoutWidthLabel(getWidgetLayoutWidth(w))}
                              </p>
                            )}
                            {!w.visualShape && (
                              <p className="text-[10px] text-slate-400">Legacy widget</p>
                            )}
                          </div>
                          {w.visualShape && (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(w)}
                                className="flex shrink-0 items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                              >
                                <Pencil className="h-3 w-3" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => duplicateWidget(w)}
                                className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Duplicate widget"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          <div className="flex shrink-0 overflow-hidden rounded-lg border border-slate-200">
                            <button
                              type="button"
                              disabled={i === 0}
                              onClick={() => moveWidget(w.id, "up")}
                              className="px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-25"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={i === visible.length - 1}
                              onClick={() => moveWidget(w.id, "down")}
                              className="border-l border-slate-200 px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-25"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeWidget(w.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                            aria-label="Remove widget"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {!isDatabase && (
                  <MultiSheetPanel
                    layout={draft}
                    sheetUrls={sheetUrls}
                    onAddSheet={onAddSheet}
                    onRemoveSheet={onRemoveSheet}
                    onToggleMerge={onToggleMerge}
                    onReloadMerged={onReloadMerged}
                  />
                )}
              </>
            )}
          </div>

          <div className="flex w-full shrink-0 flex-col bg-slate-50/80 lg:w-[min(380px,42%)]">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Layers className="h-4 w-4 text-cyan-500" />
                {wizardMode && wizardStep === 2 && editingWidget
                  ? "Live preview"
                  : "Layout preview"}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {wizardMode && wizardStep === 2
                  ? "How the widget will look with current settings"
                  : "Widget order after you save"}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {wizardMode && wizardStep === 2 && editingWidget ? (
                <WidgetPreview data={dataForWidget(editingWidget)} widget={editingWidget} />
              ) : (
                <div className="mx-auto max-w-[280px] rounded-[1.75rem] border border-slate-200 bg-white p-3 shadow-lg">
                  <div className="mb-2 flex justify-center">
                    <div className="h-1 w-12 rounded-full bg-slate-200" />
                  </div>
                  <div className="max-h-[320px] overflow-y-auto rounded-2xl bg-white p-3">
                    <LayoutSilhouettePreview
                      widgets={previewWidgets}
                      className="!min-h-[180px] !border-0 !bg-transparent !p-0"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white/90 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => {
              onReset();
              setDraft(structuredClone(layout));
              cancelWizard();
            }}
            className="flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-600"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset layout
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveAndClose}
              className="flex items-center gap-2 rounded-xl bg-indigo-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-400"
            >
              <Check className="h-4 w-4" />
              {wizardMode && wizardStep === 2 && editingWidget
                ? wizardMode === "add"
                  ? "Add & close"
                  : "Save & close"
                : "Save & close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
