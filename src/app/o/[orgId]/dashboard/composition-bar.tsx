const CATEGORY_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

export function CompositionBar({
  segments,
}: {
  segments: { categoryId: string; name: string; total: number }[];
}) {
  const sortedById = [...segments].sort((a, b) =>
    a.categoryId.localeCompare(b.categoryId),
  );
  const total = segments.reduce((sum, s) => sum + s.total, 0);

  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No spend to break down this period.
      </p>
    );
  }

  const ordered = [...segments].sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-3">
      {/* A single 100%-stacked bar — part-to-whole at a glance, with a
          2px surface gap between segments per the dataviz skill's mark
          spec for adjacent fills. */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
        {ordered.map((s, i) => {
          const colorIndex = sortedById.findIndex(
            (c) => c.categoryId === s.categoryId,
          );
          const widthPct = (s.total / total) * 100;
          return (
            <div
              key={s.categoryId}
              style={{
                width: `${widthPct}%`,
                background:
                  CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length],
                marginLeft: i === 0 ? 0 : "2px",
              }}
              title={`${s.name}: ${Math.round(widthPct)}%`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {ordered.map((s) => {
          const colorIndex = sortedById.findIndex(
            (c) => c.categoryId === s.categoryId,
          );
          const pct = Math.round((s.total / total) * 100);
          return (
            <div
              key={s.categoryId}
              className="flex items-center gap-1.5 text-xs"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background:
                    CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length],
                }}
              />
              <span className="text-foreground">{s.name}</span>
              <span className="font-mono text-muted-foreground">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
