import { messages } from "@/lib/i18n";

export function PageSkeleton() {
  return (
    <div role="status" className="flex animate-pulse flex-col gap-4 pt-4">
      <span className="sr-only">{messages.floorplan.loading}</span>
      <div className="h-3 w-full rounded-full bg-brand-text/10" />
      <div className="h-10 w-2/3 rounded-ctl bg-brand-text/10" />
      <div className="h-48 rounded-ctl bg-brand-text/6" />
      <div className="h-12 rounded-ctl bg-brand-text/10" />
    </div>
  );
}
