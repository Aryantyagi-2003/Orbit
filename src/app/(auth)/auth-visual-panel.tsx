const previewRows = [
  {
    date: "2026-08-04",
    category: "Travel",
    note: "Client site visit — SFO",
    amount: 842.15,
    running: 842.15,
  },
  {
    date: "2026-08-05",
    category: "Software",
    note: "Design tooling renewal",
    amount: 129.0,
    running: 971.15,
  },
  {
    date: "2026-08-06",
    category: "Meals",
    note: "Team offsite lunch",
    amount: 214.6,
    running: 1185.75,
  },
  {
    date: "2026-08-06",
    category: "Office",
    note: "Monitor arms, x4",
    amount: 361.2,
    running: 1546.95,
  },
  {
    date: "2026-08-07",
    category: "Travel",
    note: "Airport transit",
    amount: 58.4,
    running: 1605.35,
  },
];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function AuthVisualPanel() {
  return (
    <div className="relative hidden h-full flex-col justify-between overflow-hidden bg-[#efe6d3] p-10 lg:flex">
      {/* Graph-paper texture — fine grid at low opacity, ledger-adjacent, no stock imagery */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(#c9bc9c 1px, transparent 1px), linear-gradient(90deg, #c9bc9c 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#efe6d3] via-transparent to-[#e2d5b7]"
      />

      <div className="relative z-10">
        <span className="font-serif text-3xl italic tracking-tight text-[#262019]">
          Orbit
        </span>
        <p className="mt-2 max-w-xs font-sans text-sm text-[#6b6355]">
          Every expense, budget, and role change — recorded, attributed, and
          searchable.
        </p>
      </div>

      {/* A genuine (demo-data) preview of the ledger view, softly receded so
          it reads as "a taste of the product" rather than the focal point. */}
      <div className="relative z-10 overflow-hidden rounded-sm border border-[#c9bc9c]/60 bg-[#faf7f0]/90 opacity-90 shadow-lg backdrop-blur-[1px]">
        <div className="flex items-center justify-between border-b border-[#ddd3be] px-4 py-2.5">
          <span className="font-serif text-sm text-[#262019]">
            Q3 Marketing — Expenses
          </span>
          <span className="font-mono text-[11px] text-[#6b6355]">
            org_4f2c19
          </span>
        </div>
        <table className="w-full text-xs">
          <tbody>
            {previewRows.map((row, i) => (
              <tr
                key={row.date + row.note}
                className={i % 2 === 0 ? "bg-[#faf7f0]" : "bg-[#f0e9da]/70"}
              >
                <td className="whitespace-nowrap px-4 py-2 font-mono text-[11px] text-[#6b6355]">
                  {row.date}
                </td>
                <td className="px-2 py-2 font-sans text-[#262019]">
                  {row.category}
                </td>
                <td className="hidden truncate px-2 py-2 font-sans text-[#6b6355] 2xl:table-cell">
                  {row.note}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right font-serif tabular-nums text-[#262019]">
                  {currency.format(row.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-[#ddd3be] px-4 py-2 text-right font-mono text-[11px] text-[#6b6355]">
          running total {currency.format(previewRows.at(-1)!.running)}
        </div>
      </div>

      <p className="relative z-10 font-mono text-[11px] text-[#6b6355]">
        demo data — not a live organization
      </p>
    </div>
  );
}
