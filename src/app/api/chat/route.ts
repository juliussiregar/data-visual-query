import { NextRequest, NextResponse } from "next/server";
import { buildActiveViewHelpHint } from "@/lib/app-help";
import OpenAI from "openai";
import type { ChatMessage } from "@/lib/types";
import type { DashboardContext } from "@/lib/types";
import { getOpenAIConfig, getOpenAIConfigError } from "@/lib/openai-config";
import { parseAiQueryDataset } from "@/lib/ai-query-dataset";
import { runAiChatWithTools } from "@/lib/ai-chat-runner";
import { AuthError, requireSessionUser } from "@/lib/session-server";

export const dynamic = "force-dynamic";

function buildDashboardContextBlock(ctx: DashboardContext | undefined): string {
  if (!ctx) return "";

  const scopeLine = ctx.dataScope?.values?.length
    ? `Scope aktif: kolom "${ctx.dataScope.columnKey}" = ${ctx.dataScope.values.join(", ")}`
    : "Scope akses: tidak aktif (seluruh sheet)";
  const editLayoutNote =
    "User login — BOLEH CRUD widget di project ini (create/update/delete via widgetProposal). Tawarkan ide widget secara proaktif setelah insight — minimal 1 suggestedFollowUp kind widget.";

  const visibleWidgetCount = ctx.layoutWidgets.filter((w) => w.visible).length;
  const widgetCoaching =
    visibleWidgetCount < 3
      ? `\nCOACHING: Overview punya ${visibleWidgetCount} widget visible — sedikit! Setelah jawab, tawarkan 1–2 ide widget konkret (kolom + bentuk) + chip kind "widget".`
      : `\nCOACHING: ${visibleWidgetCount} widget di Overview. Tawarkan update/hapus/tambah jika relevan dengan pertanyaan user.`;

  const filterLines = ctx.filterableColumns
    .map((c) => `- ${c.label} (key: ${c.key}): [${c.values.join(", ")}]`)
    .join("\n");

  const widgetLines = ctx.layoutWidgets
    .map(
      (w) =>
        `- id:${w.id} | ${w.title} | bentuk:${w.visualShape ?? "?"} | visible:${w.visible}${w.groupByKey ? ` | grup:${w.groupByKey}` : ""}${w.measureKey ? ` | ukur:${w.measureKey}` : ""}${w.aggregation ? ` | agregasi:${w.aggregation}` : ""}`
    )
    .join("\n");

  return `\n\n--- DASHBOARD CONTEXT ---
View aktif: ${ctx.activeView}
${buildActiveViewHelpHint(ctx.activeView)}
${scopeLine}
${editLayoutNote}
Total baris sheet: ${ctx.totalRowCount ?? "?"}
Filter aktif: ${JSON.stringify(ctx.filters)}
Sheet URLs: ${ctx.sheetUrls.join(" | ")}
Merge mode: ${ctx.mergeMode}
Views: ${ctx.views.join(", ")}

Kolom bisa difilter (semua nilai unik terlihat):
${filterLines}

Grafik auto-detect: ${ctx.chartTitles.join("; ")}

Layout widgets:
${widgetLines}${widgetCoaching}`;
}

export async function POST(request: NextRequest) {
  try {
    await requireSessionUser(request);
    const config = getOpenAIConfig();
    if (!config) {
      return NextResponse.json({ error: getOpenAIConfigError() }, { status: 500 });
    }

    const body = await request.json();
    const { messages, queryDataset: rawDataset, dashboardContext } = body ?? {};

    const dataset = parseAiQueryDataset(rawDataset);
    if (!dataset) {
      return NextResponse.json(
        { error: "queryDataset wajib ada (columns + rows)" },
        { status: 400 }
      );
    }

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "Format pesan tidak valid" }, { status: 400 });
    }

    const ctx = dashboardContext as DashboardContext | undefined;

    const openai = new OpenAI({ apiKey: config.apiKey });

    const result = await runAiChatWithTools(
      openai,
      config.model,
      dataset,
      messages as ChatMessage[],
      {
        dashboardContextBlock: buildDashboardContextBlock(ctx),
      }
    );

    const safeProposal = result.widgetProposal;

    return NextResponse.json({
      reply: result.reply,
      actions: result.actions,
      widgetProposal: safeProposal,
      guardrail: result.guardrail,
      suggestedFollowUps: result.suggestedFollowUps,
      queryFacts: result.queryFacts,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Gagal menghubungi OpenAI";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
