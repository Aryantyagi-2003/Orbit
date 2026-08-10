"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PERIOD_OPTIONS, type PeriodKey } from "@/lib/date-ranges";

type Category = { id: string; name: string };

export function FilterBar({
  period,
  categoryId,
  categories,
}: {
  period: PeriodKey;
  categoryId: string | null;
  categories: Category[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const periodLabel =
    PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? "This month";
  const categoryLabel = categoryId
    ? (categories.find((c) => c.id === categoryId)?.name ?? "All categories")
    : "All categories";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={period} onValueChange={(v) => setParam("period", v)}>
        <SelectTrigger className="w-44">
          <SelectValue>{periodLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={categoryId ?? "all"}
        onValueChange={(v) => setParam("category", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-48">
          <SelectValue>{categoryLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
