import type { ReactNode } from "react";

export interface DetailRow {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
}

export function DetailRows({ rows }: { rows: readonly DetailRow[] }) {
  return (
    <dl className="divide-y divide-brand-text/10">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-4 py-2">
          <dt className="opacity-70">{row.label}</dt>
          <dd className={`text-right font-medium ${row.emphasis ? "text-lg" : ""}`}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
