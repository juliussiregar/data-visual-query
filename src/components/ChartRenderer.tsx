"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
  ZAxis,
  Area,
  AreaChart,
} from "recharts";
import { formatNumber, formatCurrency } from "@/lib/format";
import type { ChartConfig } from "@/lib/types";
import { cn } from "@/lib/utils";

const CHART_FALLBACK = [
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

interface ChartRendererProps {
  chart: ChartConfig;
  className?: string;
  large?: boolean;
  /** Klik segmen grafik → filter dimensi kategori */
  onDrillDown?: (categoryValue: string) => void;
}

function pickDrillName(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const name = (payload as { name?: string }).name;
  return name?.trim() ? name : null;
}

function handleDrillClick(
  onDrillDown: ChartRendererProps["onDrillDown"],
  payload: unknown
) {
  const name = pickDrillName(payload);
  if (name && onDrillDown) onDrillDown(name);
}

function CustomTooltip({
  active,
  payload,
  label,
  isCurrency,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { name: string; percentage?: number } }>;
  label?: string;
  isCurrency?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  const name = item.name ?? label;
  const value = payload[0].value;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 shadow-xl backdrop-blur-md">
      <p className="text-xs text-slate-400">{name}</p>
      <p className="text-sm font-semibold text-slate-900">
        {isCurrency ? formatCurrency(value) : formatNumber(value)}
      </p>
      {item.percentage !== undefined && (
        <p className="text-[10px] text-slate-500">{item.percentage.toFixed(1)}%</p>
      )}
    </div>
  );
}

export function ChartRenderer({ chart, className, large, onDrillDown }: ChartRendererProps) {
  const { type, data, aggregation, valueKey } = chart;
  const isCurrency = aggregation !== "count" && !!valueKey;
  const gradientId = `area-${chart.id}`;
  const drillCursor = onDrillDown ? "pointer" : "default";

  if (data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-sm text-slate-500", large ? "h-96" : "h-64")}>
        Tidak ada data untuk ditampilkan
      </div>
    );
  }

  const scatterData = data.map((d, i) => ({
    ...d,
    x: i + 1,
    y: d.value,
    z: d.value,
  }));

  const chartContent = (() => {
    switch (type) {
      case "pie":
      case "donut":
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={type === "donut" ? (large ? 70 : 55) : 0}
              outerRadius={large ? 120 : 90}
              paddingAngle={2}
              style={{ cursor: drillCursor }}
              onClick={(_, index) => {
                const point = data[index ?? 0];
                if (point?.name) onDrillDown?.(point.name);
              }}
              label={({ name, percent }) => {
                const label = name ?? "";
                return `${label.length > 12 ? `${label.slice(0, 12)}…` : label} (${((percent ?? 0) * 100).toFixed(0)}%)`;
              }}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip isCurrency={isCurrency} />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        );

      case "radial":
        return (
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius={large ? "20%" : "15%"}
            outerRadius={large ? "90%" : "80%"}
            data={data}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar
              background={{ fill: "rgba(226,232,240,0.6)" }}
              dataKey="value"
              cornerRadius={6}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </RadialBar>
            <Tooltip content={<CustomTooltip isCurrency={isCurrency} />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </RadialBarChart>
        );

      case "horizontalBar":
        return (
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
            <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 14)}…` : v)}
            />
            <Tooltip content={<CustomTooltip isCurrency={isCurrency} />} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} style={{ cursor: drillCursor }} onClick={(d) => handleDrillClick(onDrillDown, d)}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        );

      case "line":
        return (
          <LineChart data={data} margin={{ left: 0, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
            <Tooltip content={<CustomTooltip isCurrency={isCurrency} />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ fill: "#6366f1", r: 4, cursor: drillCursor }}
              activeDot={{ r: 6, cursor: drillCursor }}
              onClick={(data) => handleDrillClick(onDrillDown, data)}
            />
          </LineChart>
        );

      case "area":
        return (
          <AreaChart data={data} margin={{ left: 0, right: 16 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
            <Tooltip content={<CustomTooltip isCurrency={isCurrency} />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              fill={`url(#${gradientId})`}
              strokeWidth={2}
            />
          </AreaChart>
        );

      case "stackedBar":
        return (
          <BarChart data={data} margin={{ left: 0, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickFormatter={(v: string) => (v.length > 10 ? `${v.slice(0, 10)}…` : v)}
            />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
            <Tooltip content={<CustomTooltip isCurrency={isCurrency} />} />
            <Bar dataKey="value" stackId="a" radius={[6, 6, 0, 0]} style={{ cursor: drillCursor }} onClick={(d) => handleDrillClick(onDrillDown, d)}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        );

      case "scatter":
        return (
          <ScatterChart margin={{ left: 0, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
            <XAxis type="number" dataKey="x" name="urutan" tick={{ fill: "#64748b", fontSize: 11 }} />
            <YAxis type="number" dataKey="y" name="nilai" tick={{ fill: "#64748b", fontSize: 11 }} />
            <ZAxis type="number" dataKey="z" range={[80, 400]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload as { name: string; value: number };
                return (
                  <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 shadow-xl">
                    <p className="text-xs text-slate-400">{item.name}</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {isCurrency ? formatCurrency(item.value) : formatNumber(item.value)}
                    </p>
                  </div>
                );
              }}
            />
            <Scatter data={scatterData} fill="#6366f1" />
          </ScatterChart>
        );

      case "treemap":
        return (
          <Treemap
            data={data.map((d) => ({ ...d }))}
            dataKey="value"
            nameKey="name"
            stroke="#0f172a"
            fill="#6366f1"
            content={({ x, y, width, height, name, value, index }) => {
              if (width < 4 || height < 4 || x == null || y == null) return <g />;
              const fill = data[index ?? 0]?.fill ?? CHART_FALLBACK[(index ?? 0) % CHART_FALLBACK.length];
              return (
                <g>
                  <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} opacity={0.9} />
                  {width > 40 && height > 24 && (
                    <text x={x + 6} y={y + 16} fill="#fff" fontSize={10}>
                      {String(name ?? "").slice(0, 12)}
                    </text>
                  )}
                  {width > 40 && height > 36 && (
                    <text x={x + 6} y={y + 30} fill="#cbd5e1" fontSize={9}>
                      {formatNumber(value as number)}
                    </text>
                  )}
                </g>
              );
            }}
          />
        );

      case "radar":
        return (
          <RadarChart data={data} cx="50%" cy="50%" outerRadius={large ? 120 : 90}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} />
            <PolarRadiusAxis tick={{ fill: "#64748b", fontSize: 9 }} />
            <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
            <Tooltip content={<CustomTooltip isCurrency={isCurrency} />} />
          </RadarChart>
        );

      case "composed":
        return (
          <ComposedChart data={data} margin={{ left: 0, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickFormatter={(v: string) => (v.length > 10 ? `${v.slice(0, 10)}…` : v)}
            />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
            <Tooltip content={<CustomTooltip isCurrency={isCurrency} />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} style={{ cursor: drillCursor }} onClick={(d) => handleDrillClick(onDrillDown, d)}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
            <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} dot={false} />
          </ComposedChart>
        );

      case "bar":
      default:
        return (
          <BarChart data={data} margin={{ left: 0, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickFormatter={(v: string) => (v.length > 10 ? `${v.slice(0, 10)}…` : v)}
            />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
            <Tooltip content={<CustomTooltip isCurrency={isCurrency} />} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} style={{ cursor: drillCursor }} onClick={(d) => handleDrillClick(onDrillDown, d)}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        );
    }
  })();

  return (
    <div className={cn("w-full", large ? "h-96" : "h-72", className)}>
      <ResponsiveContainer width="100%" height="100%">
        {chartContent}
      </ResponsiveContainer>
    </div>
  );
}
