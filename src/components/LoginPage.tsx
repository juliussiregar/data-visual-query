"use client";

import { useState } from "react";
import {
  Database,
  LogIn,
  UserPlus,
  Loader2,
  BarChart3,
  Shield,
  Sparkles,
} from "lucide-react";
import type { AuthUser } from "@/lib/session";

interface LoginPageProps {
  configured: boolean;
  onLogin: (username: string, password: string) => Promise<AuthUser>;
  onRegister: (username: string, password: string, name: string) => Promise<AuthUser>;
}

const FEATURES = [
  {
    icon: BarChart3,
    title: "Dashboard otomatis",
    desc: "Paste Google Sheet → KPI & grafik langsung tersedia.",
  },
  {
    icon: Database,
    title: "Koneksi PostgreSQL",
    desc: "Simpan koneksi database per akun, aman & terenkripsi.",
  },
  {
    icon: Sparkles,
    title: "AI Assistant",
    desc: "Tanya data dan atur tampilan lewat chat.",
  },
];

export function LoginPage({ configured, onLogin, onRegister }: LoginPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
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
        await onLogin(username, password);
      } else {
        await onRegister(username, password, name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-4xl items-center gap-10 lg:grid-cols-[1fr_400px]">
        {/* Brand & features — desktop */}
        <div className="hidden lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/30">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">SheetVision</h1>
              <p className="text-sm text-slate-500">Dashboard interaktif dari spreadsheet & database</p>
            </div>
          </div>

          <div className="space-y-3">
            {FEATURES.map((item) => (
              <div key={item.title} className="auth-feature">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                  <item.icon className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 flex items-center gap-1.5 text-xs text-slate-400">
            <Shield className="h-3.5 w-3.5" />
            Data sheet & koneksi database tersimpan aman per akun
          </p>
        </div>

        {/* Form */}
        <div className="w-full">
          <div className="mb-6 text-center lg:hidden">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/30">
              <Database className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">SheetVision</h1>
            <p className="mt-2 text-sm text-slate-500">
              Masuk untuk mengelola sheet & koneksi database Anda
            </p>
          </div>

          {!configured && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
              Database aplikasi belum dikonfigurasi. Set <code className="rounded bg-amber-100 px-1">DB_*</code> dan{" "}
              <code className="rounded bg-amber-100 px-1">APP_SECRET</code> di <code className="rounded bg-amber-100 px-1">.env</code>,
              lalu jalankan PostgreSQL.
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="auth-card space-y-4 p-6 sm:p-7">
            <div className="hidden lg:block">
              <h2 className="text-lg font-semibold text-slate-900">
                {mode === "login" ? "Selamat datang kembali" : "Buat akun baru"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {mode === "login"
                  ? "Masuk untuk melanjutkan ke dashboard Anda"
                  : "Daftar untuk menyimpan sheet & koneksi database"}
              </p>
            </div>

            <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium transition-all ${
                  mode === "login"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <LogIn className="h-3.5 w-3.5" />
                Login
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium transition-all ${
                  mode === "register"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Daftar
              </button>
            </div>

            {mode === "register" && (
              <label className="block">
                <span className="text-xs font-medium text-slate-700">Nama tampilan</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="input-field mt-1.5"
                  placeholder="Nama lengkap"
                />
              </label>
            )}

            <label className="block">
              <span className="text-xs font-medium text-slate-700">Username</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="input-field mt-1.5"
                placeholder={mode === "login" ? "admin" : "username Anda"}
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
                className="input-field mt-1.5"
                placeholder="Min. 6 karakter"
              />
            </label>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !configured}
              className="btn-primary w-full py-3"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Masuk" : "Buat Akun"}
            </button>

            {mode === "login" && (
              <p className="text-center text-[11px] text-slate-400">
                Demo: <span className="font-medium text-slate-500">admin</span> atau{" "}
                <span className="font-medium text-slate-500">superadmin</span> / admin123
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
