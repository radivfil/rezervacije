import { messages } from "@/lib/i18n";

export function FloorplanSkeleton() {
  return (
    <div
      role="status"
      className="flex h-[62dvh] min-h-80 w-full animate-pulse items-center justify-center rounded-xl bg-brand-surface text-sm opacity-70"
    >
      {messages.floorplan.loading}
    </div>
  );
}
