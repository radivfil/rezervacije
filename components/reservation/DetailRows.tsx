import type { ReactNode } from "react";

export interface DetailRow {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
}

export function DetailRows({ rows }: { rows: readonly DetailRow[] }) {
  return (
    <dl className="divide-y divide-line text-[0.9375rem]">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="text-muted">{row.label}</dt>
          <dd className={`text-right tabular-nums ${row.emphasis ? "font-semibold" : "font-medium"}`}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
