export function money(n: number, opts: { maxFractionDigits?: number } = {}) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: opts.maxFractionDigits ?? 0,
  });
}
