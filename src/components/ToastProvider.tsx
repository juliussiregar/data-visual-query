"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-20 right-4 z-[300] flex w-[min(100%,20rem)] flex-col gap-2 sm:bottom-6"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-2 rounded-xl border px-3.5 py-3 text-sm shadow-lg animate-fade-in-up",
              t.type === "success" && "border-emerald-200 bg-white text-emerald-900",
              t.type === "error" && "border-red-200 bg-white text-red-900",
              t.type === "info" && "border-slate-200 bg-white text-slate-800"
            )}
          >
            {t.type === "success" && (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            )}
            {t.type === "error" && (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            )}
            {t.type === "info" && <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />}
            <p className="min-w-0 flex-1 leading-snug">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: () => {
        /* no-op outside provider */
      },
    };
  }
  return ctx;
}
