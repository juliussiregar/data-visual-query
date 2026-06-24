import Papa from "papaparse";

export interface ParsedSheetUrl {
  spreadsheetId: string;
  gid: string;
}

export function parseSheetUrl(url: string): ParsedSheetUrl | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) return null;

  const gidMatch = trimmed.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch?.[1] ?? "0";

  return { spreadsheetId: idMatch[1], gid };
}

export function getCsvExportUrl(spreadsheetId: string, gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
}

export function isSummaryRow(row: Record<string, string>): boolean {
  const values = Object.values(row).map((v) => v?.trim() ?? "");
  const normalized = values.map((v) => v.toLowerCase());

  if (values.every((v) => !v)) return true;
  if (normalized.some((v) => v === "total")) return true;
  if (normalized.includes("no") && normalized.includes("nama debitur")) return true;

  return false;
}

function isHtmlResponse(text: string): boolean {
  const snippet = text.trim().slice(0, 200).toLowerCase();
  return snippet.startsWith("<!doctype") || snippet.startsWith("<html");
}

/** Hapus suffix " - Google Spreadsheet" dari judul halaman. */
export function cleanGoogleSheetTitle(raw: string): string {
  const trimmed = raw.trim();
  const cleaned = trimmed
    .replace(/\s*[-–—]\s*Google\s+(Spreadsheets?|Sheets?|Drive)\s*$/i, "")
    .trim();
  return cleaned || trimmed;
}

export interface SpreadsheetMetadata {
  workbookTitle: string | null;
  /** gid → nama tab */
  tabs: Record<string, string>;
}

export function extractWorkbookTitleFromHtml(html: string): string | null {
  const ogMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
  if (ogMatch?.[1]) return cleanGoogleSheetTitle(ogMatch[1]);

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) return cleanGoogleSheetTitle(titleMatch[1]);

  return null;
}

/** Parse daftar tab (gid → nama) dari HTML halaman Google Spreadsheet. */
export function parseSpreadsheetTabsFromHtml(html: string): Record<string, string> {
  const tabs: Record<string, string> = {};
  const pattern = /\\"(\d+)\\",\[\{\\"1\\":\[\[0,0,\\"([^\\"]+)\\"/g;

  for (const match of html.matchAll(pattern)) {
    tabs[match[1]] = match[2];
  }

  if (Object.keys(tabs).length === 0) {
    const captions = [...html.matchAll(/docs-sheet-tab-caption">([^<]+)</g)].map((m) => m[1]);
    const activeGid = html.match(/id="(\d+)-grid-container"/)?.[1];
    if (activeGid && captions.length === 1) {
      tabs[activeGid] = captions[0];
    }
  }

  return tabs;
}

async function fetchSpreadsheetHtml(spreadsheetId: string, gid?: string): Promise<string | null> {
  const pageUrl = gid
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?gid=${gid}`
    : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  try {
    const response = await fetch(pageUrl, {
      cache: "no-store",
      headers: { "User-Agent": "SheetVision/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;

    const html = await response.text();
    return isHtmlResponse(html) ? html : null;
  } catch {
    return null;
  }
}

export async function fetchSpreadsheetMetadata(url: string): Promise<SpreadsheetMetadata> {
  const parsed = parseSheetUrl(url);
  if (!parsed) return { workbookTitle: null, tabs: {} };

  const html = await fetchSpreadsheetHtml(parsed.spreadsheetId, parsed.gid);
  if (!html) return { workbookTitle: null, tabs: {} };

  return {
    workbookTitle: extractWorkbookTitleFromHtml(html),
    tabs: parseSpreadsheetTabsFromHtml(html),
  };
}

function formatSheetDisplayName(
  workbookTitle: string | null,
  tabName: string | undefined,
  multiTab: boolean
): string {
  const workbook = workbookTitle?.trim() || "Google Sheet";
  if (tabName && multiTab) return `${workbook} · ${tabName}`;
  if (tabName && workbook === "Google Sheet") return tabName;
  return workbook;
}

/** Ambil judul spreadsheet dari halaman Google (sheet publik). */
export async function fetchSpreadsheetTitle(url: string): Promise<string | null> {
  const meta = await fetchSpreadsheetMetadata(url);
  return meta.workbookTitle;
}

export async function resolveSheetDisplayName(url: string): Promise<string> {
  const parsed = parseSheetUrl(url);
  if (!parsed) return "Google Sheet";

  const meta = await fetchSpreadsheetMetadata(url);
  const tabName = meta.tabs[parsed.gid];
  const multiTab = Object.keys(meta.tabs).length > 1;
  return formatSheetDisplayName(meta.workbookTitle, tabName, multiTab);
}

export async function resolveSheetDisplayNames(
  urls: string[]
): Promise<Record<string, string>> {
  const unique = [...new Set(urls.filter(Boolean))];
  const bySpreadsheet = new Map<string, string[]>();

  for (const url of unique) {
    const parsed = parseSheetUrl(url);
    if (!parsed) continue;
    const list = bySpreadsheet.get(parsed.spreadsheetId) ?? [];
    list.push(url);
    bySpreadsheet.set(parsed.spreadsheetId, list);
  }

  const result: Record<string, string> = {};

  await Promise.all(
    [...bySpreadsheet.entries()].map(async ([spreadsheetId, spreadsheetUrls]) => {
      const firstGid = parseSheetUrl(spreadsheetUrls[0])?.gid;
      const html = await fetchSpreadsheetHtml(spreadsheetId, firstGid);
      if (!html) {
        for (const url of spreadsheetUrls) result[url] = "Google Sheet";
        return;
      }

      const workbookTitle = extractWorkbookTitleFromHtml(html);
      const tabs = parseSpreadsheetTabsFromHtml(html);
      const multiTab = Object.keys(tabs).length > 1;

      for (const url of spreadsheetUrls) {
        const parsed = parseSheetUrl(url);
        if (!parsed) {
          result[url] = "Google Sheet";
          continue;
        }
        result[url] = formatSheetDisplayName(workbookTitle, tabs[parsed.gid], multiTab);
      }
    })
  );

  for (const url of unique) {
    if (!result[url]) result[url] = "Google Sheet";
  }

  return result;
}

export async function fetchSheetData(url: string): Promise<Record<string, string>[]> {
  const parsed = parseSheetUrl(url);
  if (!parsed) {
    throw new Error("URL Google Sheet tidak valid. Pastikan format link benar.");
  }

  const csvUrl = getCsvExportUrl(parsed.spreadsheetId, parsed.gid);

  const response = await fetch(csvUrl, {
    cache: "no-store",
    headers: {
      "User-Agent": "SheetVision/1.0",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(
      "Gagal mengambil data. Pastikan sheet di-share sebagai 'Anyone with the link can view'."
    );
  }

  const csvText = await response.text();

  if (isHtmlResponse(csvText)) {
    throw new Error(
      "Sheet tidak dapat diakses. Ubah pengaturan share menjadi 'Anyone with the link can view'."
    );
  }

  if (!csvText.trim()) {
    throw new Error("Sheet kosong atau tab tidak ditemukan. Periksa gid di URL.");
  }

  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error("Gagal mem-parse data CSV dari Google Sheet.");
  }

  const rows = result.data
    .map((row) => {
      const cleaned: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        if (key && key.trim()) {
          cleaned[key.trim()] = typeof value === "string" ? value.trim() : String(value ?? "");
        }
      }
      return cleaned;
    })
    .filter((row) => Object.keys(row).length > 0 && !isSummaryRow(row));

  if (rows.length === 0) {
    throw new Error("Tidak ada data valid di sheet. Periksa isi sheet dan header kolom.");
  }

  return rows;
}
