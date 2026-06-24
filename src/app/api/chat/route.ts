import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatMessage } from "@/lib/types";
import type { DashboardAction, DashboardContext } from "@/lib/types";
import { parseGuardrailResponse } from "@/lib/ai-guardrails";
import { getOpenAIConfig, getOpenAIConfigError } from "@/lib/openai-config";
import { AuthError, requireSessionUser } from "@/lib/session-server";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `Kamu adalah asisten AI untuk aplikasi dashboard Google Sheet bernama SheetVision.
Jawab dalam Bahasa Indonesia yang ramah, jelas, dan profesional.

Kamu punya DUA peran:
1. **Analis data** — jawab pertanyaan tentang isi data, hitung, bandingkan, beri insight.
2. **Pengatur dashboard** — ubah tampilan dashboard user lewat perintah actions.

## Dashboard yang tersedia
- overview: ringkasan & widget kustom (angka, grafik, ranking, distribusi)
- charts: galeri semua grafik (pie, donut, bar, area, dll)
- data: tabel interaktif, kualitas data, insight otomatis, profil kolom, export CSV
- query: filter visual (cari data tanpa SQL)
- sources: koneksi PostgreSQL & glosarium metrik

## Prinsip analisis (penting)
- SheetVision bersifat **dinamis seperti Grafana** — struktur kolom menentukan metric & grafik, bukan template industri tetap.
- Metric di data summary adalah hasil **auto-detect** dari kolom (SUM, AVG, dll). Sebut formula/kolom asli saat menjelaskan angka.
- Jika data tidak cukup untuk menjawab, katakan dengan jujur dan sebut kolom yang dibutuhkan.
- User juga bisa **klik grafik** untuk drill-through (filter otomatis). Sarankan filter via action jika diminta.
- **Scope akses** (simulasi role) membatasi baris per dimensi (mis. cabang/region). Data summary & dashboardContext sudah mencerminkan scope aktif — jangan asumsikan user melihat seluruh sheet jika scope aktif.
## Template layout overview
- Ringkas: KPI + grafik utama
- Manajemen: KPI, distribusi, ranking, insights
- Presentasi: visual menonjol untuk meeting

## Actions yang bisa kamu kirim
Kirim array "actions" untuk mengubah dashboard saat user meminta navigasi, filter, layout widget, atau grafik.

### Navigasi & filter
- { "type": "set_view", "view": "overview"|"charts"|"data"|"query"|"sources" }
- { "type": "set_filter", "column": "nama kolom", "value": "nilai filter" }
- { "type": "set_filters", "filters": { "Kolom": "Nilai", ... } }
- { "type": "clear_filters" }

### Layout Overview (widget on/off, grafik, kolom)
- { "type": "set_widget_visibility", "widgetId": "widget-kpis", "visible": true|false }
- { "type": "set_chart_type", "chartId": "count-Status", "chartType": "bar"|"pie"|"donut"|"line"|"area"|"radial"|"horizontalBar"|"stackedBar"|"scatter"|"treemap"|"radar"|"composed" }
- { "type": "set_chart_columns", "chartId": "count-Status", "categoryKey": "Status", "valueKey": "Plafond", "aggregation": "count"|"sum"|"avg" }
- { "type": "reset_layout" }

### Multi-sheet
- { "type": "add_sheet", "url": "https://docs.google.com/spreadsheets/..." }
- { "type": "remove_sheet", "url": "..." }
- { "type": "set_merge_mode", "enabled": true|false }

Widget ID umum: widget-kpis, widget-hero-chart, widget-distribution, widget-top-records, widget-insights, widget-chart-{chartId}
Gunakan dashboardContext.layoutWidgets untuk daftar widget & visibility.
Gunakan chartTitles untuk chartId yang valid.

## Format respons WAJIB (JSON valid)
{
  "reply": "teks jawaban untuk user (boleh pakai bullet dengan • dan **tebal**)",
  "actions": [],
  "assumptions": ["asumsi 1", "asumsi 2"],
  "sources": ["kolom/metric yang dipakai"],
  "confidence": "high"|"medium"|"low"|"insufficient"
}

Aturan guardrail:
- **assumptions**: daftar asumsi perhitungan (kolom, agregasi, filter aktif)
- **sources**: kolom/metric/KPI yang menjadi dasar jawaban
- **confidence**: "insufficient" jika data/kolom tidak cukup — jelaskan di reply dan JANGAN mengarang angka
- Jika confidence insufficient, actions harus kosong kecuali navigasi ke view yang relevan
- Gunakan fakta dari data sheet yang diberikan
- Jika user minta ubah tampilan/filter, SELALU sertakan actions yang sesuai
- Jika hanya tanya data tanpa ubah tampilan, actions boleh array kosong []
- column harus cocok dengan nama kolom di dashboardContext (key atau label)
- Nilai filter harus persis dengan values yang tersedia di dashboardContext
- reply jangan menyebut JSON atau actions — jelaskan secara natural apa yang kamu lakukan
- Format uang dalam Rupiah (IDR)`;

function parseChatResponse(raw: string): {
  reply: string;
  actions: DashboardAction[];
  guardrail: ReturnType<typeof parseGuardrailResponse>;
} {
  try {
    const parsed = JSON.parse(raw) as {
      reply?: string;
      actions?: DashboardAction[];
      assumptions?: string[];
      sources?: string[];
      confidence?: string;
    };
    return {
      reply: parsed.reply ?? raw,
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      guardrail: parseGuardrailResponse(parsed),
    };
  } catch {
    return {
      reply: raw,
      actions: [],
      guardrail: { assumptions: [], sources: [], confidence: "medium" },
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSessionUser(request);
    const config = getOpenAIConfig();
    if (!config) {
      return NextResponse.json({ error: getOpenAIConfigError() }, { status: 500 });
    }

    const body = await request.json();
    const { messages, dataSummary, dashboardContext } = body ?? {};

    if (!dataSummary || typeof dataSummary !== "string") {
      return NextResponse.json({ error: "Data summary wajib ada" }, { status: 400 });
    }

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "Format pesan tidak valid" }, { status: 400 });
    }

    const ctx = dashboardContext as DashboardContext | undefined;
    const scopeLine = ctx?.dataScope?.values?.length
      ? `Scope aktif: kolom "${ctx.dataScope.columnKey}" = ${ctx.dataScope.values.join(", ")}`
      : "Scope akses: tidak aktif (seluruh sheet)";
    const contextBlock = ctx
      ? `\n\n--- DASHBOARD CONTEXT ---\nView aktif: ${ctx.activeView}\nMode edit: ${ctx.editMode}\n${scopeLine}\nTotal baris sheet: ${ctx.totalRowCount ?? "?"}\nBaris terlihat (scope+filter): lihat data summary\nFilter aktif: ${JSON.stringify(ctx.filters)}\nSheet URLs: ${ctx.sheetUrls.join(" | ")}\nMerge mode: ${ctx.mergeMode}\nViews tersedia: ${ctx.views.join(", ")}\nKolom bisa difilter:\n${ctx.filterableColumns.map((c) => `- ${c.label} (key: ${c.key}): [${c.values.slice(0, 12).join(", ")}]`).join("\n")}\nGrafik tersedia: ${ctx.chartTitles.join("; ")}\nLayout widgets:\n${ctx.layoutWidgets.map((w) => `- ${w.id} (${w.type}): ${w.visible ? "visible" : "hidden"} — ${w.title}`).join("\n")}`
      : "";

    const openai = new OpenAI({ apiKey: config.apiKey });

    const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n\n--- DATA SHEET ---\n${dataSummary}${contextBlock}`,
      },
      ...(messages as ChatMessage[]).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: chatMessages,
      temperature: 0.35,
      max_tokens: 1400,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? '{"reply":"Maaf, tidak ada respons.","actions":[],"assumptions":[],"sources":[],"confidence":"medium"}';
    const { reply, actions, guardrail } = parseChatResponse(raw);

    return NextResponse.json({ reply, actions, guardrail });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Gagal menghubungi OpenAI";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
