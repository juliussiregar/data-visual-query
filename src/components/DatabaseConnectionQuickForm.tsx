"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Plug, XCircle } from "lucide-react";
import type { DatabaseConnectionProfile, DatabaseType } from "@/lib/types";
import { draftConnectionPayload, saveDbConnection } from "@/lib/datasource-storage";
import {
  databaseTypeLabel,
  defaultPortForType,
  defaultSchemaForType,
} from "@/lib/connectors/sql-types";
import { cn } from "@/lib/utils";

function emptyForm(dbType: DatabaseType = "postgresql") {
  return {
    dbType,
    name: "",
    host: "localhost",
    port: String(defaultPortForType(dbType)),
    database: "",
    username: "",
    password: "",
    ssl: false,
    schema: defaultSchemaForType(dbType, ""),
  };
}

function formFromConnection(connection: DatabaseConnectionProfile) {
  return {
    dbType: connection.type,
    name: connection.name,
    host: connection.host,
    port: String(connection.port),
    database: connection.database,
    username: connection.username,
    password: "",
    ssl: connection.ssl,
    schema: connection.schema,
  };
}

interface DatabaseConnectionQuickFormProps {
  compact?: boolean;
  initialConnection?: DatabaseConnectionProfile;
  onSaved: (connection: DatabaseConnectionProfile) => void;
  onCancel?: () => void;
}

export function DatabaseConnectionQuickForm({
  compact,
  initialConnection,
  onSaved,
  onCancel,
}: DatabaseConnectionQuickFormProps) {
  const [form, setForm] = useState(() =>
    initialConnection ? formFromConnection(initialConnection) : emptyForm()
  );
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const isEditing = Boolean(initialConnection);
  const canTest =
    form.host.trim() &&
    form.database.trim() &&
    form.username.trim() &&
    (form.password.trim() || isEditing);

  const setDbType = (dbType: DatabaseType) => {
    setForm((f) => ({
      ...emptyForm(dbType),
      name: f.name,
      host: f.host,
      database: f.database,
      username: f.username,
      password: f.password,
    }));
    setTestResult(null);
  };

  const buildDraft = (): DatabaseConnectionProfile => {
    const schema =
      form.dbType === "mysql"
        ? defaultSchemaForType("mysql", form.database.trim())
        : form.schema.trim() || "public";

    return {
      id: initialConnection?.id ?? crypto.randomUUID(),
      name: form.name.trim() || `${databaseTypeLabel(form.dbType)} ${form.host.trim()}`,
      type: form.dbType,
      host: form.host.trim(),
      port: parseInt(form.port, 10) || defaultPortForType(form.dbType),
      database: form.database.trim(),
      username: form.username.trim(),
      password: form.password,
      rememberPassword: true,
      ssl: form.ssl,
      schema,
      createdAt: initialConnection?.createdAt ?? new Date().toISOString(),
    };
  };

  const handleTestAndSave = async () => {
    if (!canTest) return;
    setTesting(true);
    setTestResult(null);
    try {
      const draft = buildDraft();
      const testBody = form.password.trim()
        ? draftConnectionPayload({ ...draft, password: form.password })
        : initialConnection
          ? { connectionId: initialConnection.id }
          : null;

      if (!testBody) throw new Error("Password wajib diisi untuk koneksi baru");

      const res = await fetch("/api/datasource/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testBody),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Koneksi gagal");

      const saved = await saveDbConnection(
        {
          ...draft,
          lastTestedAt: new Date().toISOString(),
          lastTestStatus: "success",
          lastTestMessage: json.message,
        },
        form.password.trim() || undefined
      );
      if (!saved) throw new Error("Gagal menyimpan koneksi");

      setTestResult({ ok: true, message: json.message });
      onSaved(saved);
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "Koneksi gagal",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-violet-200/80 bg-violet-50/40",
        compact ? "p-3" : "p-4"
      )}
    >
      <p className="text-xs font-medium text-slate-800">
        {isEditing ? "Edit koneksi database" : "Koneksi database baru"}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500">
        {isEditing
          ? "Ubah detail lalu tes koneksi. Password boleh dikosongkan jika tidak diubah."
          : "Pilih PostgreSQL atau MySQL, isi detail lalu tes koneksi."}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {(["postgresql", "mysql"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setDbType(type)}
            className={cn(
              "rounded-lg border py-2 text-[11px] font-medium",
              form.dbType === type
                ? "border-violet-300 bg-white text-violet-800"
                : "border-slate-200 text-slate-600 hover:bg-white/60"
            )}
          >
            {databaseTypeLabel(type)}
          </button>
        ))}
      </div>

      <div className={cn("mt-3 grid gap-2.5 sm:grid-cols-2", compact && "sm:grid-cols-1")}>
        <QuickField
          label="Nama koneksi"
          value={form.name}
          onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          placeholder="Analytics Staging"
        />
        <QuickField
          label="Host"
          value={form.host}
          onChange={(v) => setForm((f) => ({ ...f, host: v }))}
          placeholder="localhost"
        />
        <QuickField
          label="Port"
          value={form.port}
          onChange={(v) => setForm((f) => ({ ...f, port: v }))}
          placeholder={String(defaultPortForType(form.dbType))}
        />
        <QuickField
          label="Database"
          value={form.database}
          onChange={(v) => setForm((f) => ({ ...f, database: v }))}
          placeholder={form.dbType === "mysql" ? "analytics" : "iot_analytics"}
        />
        <QuickField
          label="Username"
          value={form.username}
          onChange={(v) => setForm((f) => ({ ...f, username: v }))}
          placeholder="reader"
        />
        <QuickField
          label="Password"
          type="password"
          value={form.password}
          onChange={(v) => setForm((f) => ({ ...f, password: v }))}
          placeholder={isEditing ? "Kosongkan jika tidak diubah" : "••••••••"}
        />
        {form.dbType === "postgresql" && (
          <QuickField
            label="Schema"
            value={form.schema}
            onChange={(v) => setForm((f) => ({ ...f, schema: v }))}
            placeholder="public"
          />
        )}
      </div>

      {testResult && (
        <div
          className={cn(
            "mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
            testResult.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          )}
        >
          {testResult.ok ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <span>{testResult.message}</span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canTest || testing}
          onClick={() => void handleTestAndSave()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {testing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plug className="h-3.5 w-3.5" />
          )}
          Tes & simpan
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost py-2 text-xs">
            Batal
          </button>
        )}
      </div>
    </div>
  );
}

function QuickField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field mt-1 text-xs"
      />
    </label>
  );
}
