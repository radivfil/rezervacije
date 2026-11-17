import { messages } from "@/lib/i18n";

export function FloorplanSkeleton({ className = "min-h-[26rem] flex-1" }: { className?: string }) {
  return (
    <div
      role="status"
      className={`flex w-full animate-pulse items-center justify-center border-y border-line text-sm text-muted ${className}`}
    >
      {messages.floorplan.loading}
    </div>
  );
}
