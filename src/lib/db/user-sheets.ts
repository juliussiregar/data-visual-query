import { query } from "@/lib/db/app-pool";
import type { SavedSheet } from "@/lib/sheet-storage";

export async function listUserSheets(userId: string): Promise<SavedSheet[]> {
  const res = await query<{
    id: string;
    url: string;
    label: string;
    saved_at: string;
    last_opened_at: string;
  }>(
    `SELECT id, url, label, saved_at, last_opened_at
     FROM user_sheet_connections WHERE user_id = $1
     ORDER BY last_opened_at DESC`,
    [userId]
  );
  return res.rows.map((r) => ({
    id: r.id,
    url: r.url,
    label: r.label,
    savedAt: r.saved_at,
    lastOpenedAt: r.last_opened_at,
  }));
}

export async function getUserLastSheetUrl(userId: string): Promise<string | null> {
  const res = await query<{ url: string }>(
    `SELECT url FROM user_sheet_connections
     WHERE user_id = $1 ORDER BY last_opened_at DESC LIMIT 1`,
    [userId]
  );
  return res.rows[0]?.url ?? null;
}

export async function upsertUserSheet(
  userId: string,
  url: string,
  label: string
): Promise<SavedSheet> {
  const res = await query<{
    id: string;
    url: string;
    label: string;
    saved_at: string;
    last_opened_at: string;
  }>(
    `INSERT INTO user_sheet_connections (user_id, url, label)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, url) DO UPDATE SET
       label = EXCLUDED.label,
       last_opened_at = NOW()
     RETURNING id, url, label, saved_at, last_opened_at`,
    [userId, url, label]
  );
  const r = res.rows[0];
  return {
    id: r.id,
    url: r.url,
    label: r.label,
    savedAt: r.saved_at,
    lastOpenedAt: r.last_opened_at,
  };
}

export async function touchUserSheet(userId: string, url: string) {
  await query(
    `UPDATE user_sheet_connections SET last_opened_at = NOW()
     WHERE user_id = $1 AND url = $2`,
    [userId, url]
  );
}

export async function deleteUserSheet(userId: string, sheetId: string) {
  await query(`DELETE FROM user_sheet_connections WHERE user_id = $1 AND id = $2`, [
    userId,
    sheetId,
  ]);
}

export async function getUserLayout(
  userId: string,
  layoutKey: string
): Promise<unknown | null> {
  const res = await query<{ layout_json: unknown }>(
    `SELECT layout_json FROM user_layouts WHERE user_id = $1 AND layout_key = $2`,
    [userId, layoutKey]
  );
  return res.rows[0]?.layout_json ?? null;
}

export async function saveUserLayout(
  userId: string,
  layoutKey: string,
  layoutJson: unknown
) {
  await query(
    `INSERT INTO user_layouts (user_id, layout_key, layout_json, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, layout_key) DO UPDATE SET
       layout_json = EXCLUDED.layout_json,
       updated_at = NOW()`,
    [userId, layoutKey, JSON.stringify(layoutJson)]
  );
}
