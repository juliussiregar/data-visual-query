import { Suspense } from "react";
import { DashboardApp } from "@/components/DashboardApp";
import { ToastProvider } from "@/components/ToastProvider";

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ToastProvider>
        <DashboardApp />
      </ToastProvider>
    </Suspense>
  );
}
