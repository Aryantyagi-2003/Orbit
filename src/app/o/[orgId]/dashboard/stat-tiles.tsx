"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { cn } from "@/lib/utils";

export function StatTileGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {children}
    </div>
  );
}

function DeltaBadge({ percent }: { percent: number | null }) {
  if (percent === null || !Number.isFinite(percent)) return null;
  const rounded = Math.round(percent);
  if (rounded === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-[11px] text-muted-foreground">
        <Minus className="h-3 w-3" />
        flat
      </span>
    );
  }
  const up = rounded > 0;
  return (
    <span className="inline-flex items-center gap-0.5 font-mono text-[11px] text-muted-foreground">
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(rounded)}% vs last period
    </span>
  );
}

// A tiny, axis-less area chart tucked into the tile's corner — legible as
// "shape of the trend," not a chart meant to be read precisely (that's
// what the full chart below it is for).
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const points = data.map((v, i) => ({ i, v }));
  const gradientId = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <div className="absolute inset-x-0 bottom-0 h-8 opacity-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatTile({
  label,
  value,
  deltaPercent,
  tone,
  sublabel,
  icon,
  sparkline,
}: {
  label: string;
  value: string;
  deltaPercent?: number | null;
  tone?: "good" | "critical" | "warning";
  sublabel?: string;
  // A rendered element, not a component reference — StatTile is a Client
  // Component, and a bare component reference (e.g. the Banknote import
  // itself) isn't serializable across the server/client boundary the way
  // an already-rendered element is.
  icon?: React.ReactNode;
  sparkline?: number[];
}) {
  return (
    <div className="group relative overflow-hidden rounded-sm border border-border bg-card p-4 shadow-[0_1px_2px_rgba(38,32,25,0.04)] transition-shadow hover:shadow-[0_4px_16px_rgba(38,32,25,0.08)]">
      <div className="flex items-start justify-between">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {icon}
      </div>
      <p
        className={cn(
          "mt-1.5 font-serif text-3xl tabular-nums text-foreground",
          tone === "critical" && "text-status-critical",
          tone === "good" && "text-status-good",
        )}
      >
        {value}
      </p>
      <div className="mt-1 flex items-center gap-2">
        {deltaPercent !== undefined && <DeltaBadge percent={deltaPercent} />}
        {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
      </div>
      {sparkline && sparkline.length > 1 && (
        <Sparkline
          data={sparkline}
          color={
            tone === "critical"
              ? "var(--status-critical)"
              : tone === "good"
                ? "var(--status-good)"
                : "var(--chart-1)"
          }
        />
      )}
    </div>
  );
}
