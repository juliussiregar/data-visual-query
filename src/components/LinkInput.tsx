"use client";

import { useEffect, useState } from "react";
import { Link2, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkInputProps {
  onSubmit: (url: string) => void;
  loading?: boolean;
  initialUrl?: string;
  compact?: boolean;
}

const EXAMPLE_URL =
  "https://docs.google.com/spreadsheets/d/147gb63OkHk3U9avUWTDqXA0K5K4TpjJS9uGxb5HMMGs/edit?gid=0#gid=0";

export function LinkInput({ onSubmit, loading, initialUrl = "", compact }: LinkInputProps) {
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    if (initialUrl) setUrl(initialUrl);
  }, [initialUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && !loading) onSubmit(url.trim());
  };

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex w-full min-w-0 items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
          <Link2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Ganti link sheet..."
            className="w-full min-w-0 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={!url.trim() || loading}
          className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Load"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="surface-card flex flex-col gap-2 p-2 sm:flex-row sm:items-stretch">
        <div className="flex flex-1 items-center gap-3 rounded-lg bg-slate-50 px-3 py-1">
          <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            id="sheet-link-input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste link Google Sheet publik..."
            className="w-full bg-transparent py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={!url.trim() || loading}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 sm:shrink-0"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat...
            </>
          ) : (
            <>
              Buat Dashboard
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
      <button
        type="button"
        onClick={() => setUrl(EXAMPLE_URL)}
        className="mt-3 text-xs text-slate-500 transition-colors hover:text-indigo-600"
      >
        Coba dengan contoh sheet →
      </button>
    </form>
  );
}
