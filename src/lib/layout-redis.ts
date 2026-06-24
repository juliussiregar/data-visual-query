import { Redis } from "@upstash/redis";
import type { DashboardLayout } from "./types";

const PREFIX = "sheetvision:layout:";

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function isLayoutStorageConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export async function getStoredLayout(key: string): Promise<DashboardLayout | null> {
  const redis = getRedis();
  if (!redis) return null;
  const data = await redis.get<DashboardLayout>(`${PREFIX}${key}`);
  return data ?? null;
}

export async function saveStoredLayout(key: string, layout: DashboardLayout): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    throw new Error("Penyimpanan layout belum dikonfigurasi (Upstash Redis)");
  }
  await redis.set(`${PREFIX}${key}`, layout);
}
