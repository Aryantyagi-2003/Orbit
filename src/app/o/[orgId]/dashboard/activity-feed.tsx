function money(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type Activity = {
  id: string;
  amount: number;
  categoryName: string;
  submittedByName: string;
  createdAt: string;
};

export function ActivityFeed({ items }: { items: Activity[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-start justify-between gap-3 text-sm"
        >
          <p className="text-foreground">
            <span className="font-medium">{item.submittedByName}</span> logged{" "}
            <span className="font-mono tabular">${money(item.amount)}</span> in{" "}
            {item.categoryName}
          </p>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {timeAgo(item.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
