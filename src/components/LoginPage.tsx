"use client";

import { useState } from "react";
import { Database, LogIn, UserPlus, Loader2 } from "lucide-react";
import type { AuthUser } from "@/lib/session";

interface LoginPageProps {
  configured: boolean;
  onLogin: (email: string, password: string) => Promise<AuthUser>;
  onRegister: (email: string, password: string, name: string) => Promise<AuthUser>;
}

export function LoginPage({ configured, onLogin, onRegister }: LoginPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "login") {
        await onLogin(email, password);
      } else {
        await onRegister(email, password, name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/30">
            <Database className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">SheetVision</h1>
          <p className="mt-2 text-sm text-slate-500">
            Login untuk menyimpan Google Sheet & koneksi database Anda
          </p>
        </div>

        {!configured && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Database aplikasi belum dikonfigurasi. Set <code>DB_*</code> dan{" "}
            <code>APP_SECRET</code> di <code>.env</code>, lalu jalankan PostgreSQL.
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="surface-card space-y-4 p-6">
          <div className="flex gap-2 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium ${
                mode === "login" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium ${
                mode === "register" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Daftar
            </button>
          </div>

          {mode === "register" && (
            <label className="block">
              <span className="text-xs font-medium text-slate-700">Nama</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                placeholder="Nama lengkap"
              />
            </label>
          )}

          <label className="block">
            <span className="text-xs font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              placeholder="nama@perusahaan.com"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-700">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              placeholder="Min. 6 karakter"
            />
          </label>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !configured}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "Masuk" : "Buat Akun"}
          </button>

          {mode === "login" && (
            <p className="text-center text-[11px] text-slate-400">
              Demo: admin@sheetvision.local / changeme
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
