import { ArrowDown, ArrowUp, Minus } from "lucide-react";

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export type Mover = {
  categoryName: string;
  current: number;
  previous: number;
};

/** The category whose spend moved the most vs. the prior period, in
 * dollar terms — "what's driving the change," the question behind the
 * question when someone asks why total spend is up or down. */
export function BiggestMover({ movers }: { movers: Mover[] }) {
  const ranked = [...movers]
    .map((m) => ({ ...m, delta: m.current - m.previous }))
    .filter((m) => m.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  if (ranked.length === 0) {
    return <p className="text-sm text-muted-foreground">No change vs. the prior period yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {ranked.slice(0, 4).map((m) => {
        const up = m.delta > 0;
        const pct = m.previous > 0 ? Math.round((m.delta / m.previous) * 100) : null;
        return (
          <li key={m.categoryName} className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">{m.categoryName}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {money(m.previous)} → {money(m.current)}
              </p>
            </div>
            <div
              className={
                "flex items-center gap-1 font-mono text-xs " +
                (up ? "text-status-critical" : "text-status-good")
              }
            >
              {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {money(Math.abs(m.delta))}
              {pct !== null && ` (${Math.abs(pct)}%)`}
            </div>
          </li>
        );
      })}
      {ranked.length === 0 && (
        <li className="flex items-center gap-1 text-sm text-muted-foreground">
          <Minus className="h-3 w-3" /> No movement
        </li>
      )}
    </ul>
  );
}
