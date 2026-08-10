import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

function money(n: number, opts: { maxFractionDigits?: number } = {}) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: opts.maxFractionDigits ?? 0,
  });
}

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

export function StatTile({
  label,
  value,
  deltaPercent,
  tone,
  sublabel,
}: {
  label: string;
  value: string;
  deltaPercent?: number | null;
  tone?: "good" | "critical" | "warning";
  sublabel?: string;
}) {
  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-serif text-2xl tabular-nums text-foreground",
          tone === "critical" && "text-status-critical",
          tone === "good" && "text-status-good",
        )}
      >
        {value}
      </p>
      <div className="mt-1 flex items-center gap-2">
        {deltaPercent !== undefined && <DeltaBadge percent={deltaPercent} />}
        {sublabel && (
          <span className="text-xs text-muted-foreground">{sublabel}</span>
        )}
      </div>
    </div>
  );
}

export { money };
