import { messages } from "@/lib/i18n";

export function PageSkeleton() {
  return (
    <div role="status" className="h-80 animate-pulse rounded-2xl bg-brand-surface p-5 text-sm opacity-70">
      {messages.floorplan.loading}
    </div>
  );
}
