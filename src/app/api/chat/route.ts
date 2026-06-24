import { NextRequest, NextResponse } from "next/server";
import { buildActiveViewHelpHint } from "@/lib/app-help";
import OpenAI from "openai";
import type { ChatMessage } from "@/lib/types";
import type { DashboardContext } from "@/lib/types";
import { getOpenAIConfig, getOpenAIConfigError } from "@/lib/openai-config";
import { parseAiQueryDataset } from "@/lib/ai-query-dataset";
import { runAiChatWithTools } from "@/lib/ai-chat-runner";
import { rolePermissions } from "@/lib/auth";
import { AuthError, requireSessionUser } from "@/lib/session-server";

export const dynamic = "force-dynamic";

function buildDashboardContextBlock(ctx: DashboardContext | undefined, canEditLayout: boolean): string {
  if (!ctx) return "";

  const scopeLine = ctx.dataScope?.values?.length
    ? `Scope aktif: kolom "${ctx.dataScope.columnKey}" = ${ctx.dataScope.values.join(", ")}`
    : "Scope akses: tidak aktif (seluruh sheet)";
  const editLayoutNote = canEditLayout
    ? "User BOLEH edit widget (kirim widgetProposal jika diminta)."
    : "User VIEWER — JANGAN kirim widgetProposal; hanya jelaskan cara pakai atau analisis data.";

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
${widgetLines}`;
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
    const canEditLayout = ctx?.userRole ? rolePermissions(ctx.userRole).canEditLayout : true;

    const openai = new OpenAI({ apiKey: config.apiKey });

    const result = await runAiChatWithTools(
      openai,
      config.model,
      dataset,
      messages as ChatMessage[],
      {
        dashboardContextBlock: buildDashboardContextBlock(ctx, canEditLayout),
      }
    );

    const safeProposal =
      result.widgetProposal && canEditLayout ? result.widgetProposal : null;

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
