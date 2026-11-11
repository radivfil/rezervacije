import { messages } from "@/lib/i18n";

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

const buttonClass =
  "flex size-11 items-center justify-center rounded-full bg-brand-surface text-xl font-semibold text-brand-text shadow-md active:scale-95";

export function ZoomControls({ onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <div className="absolute right-2 bottom-2 flex flex-col gap-2">
      <button type="button" className={buttonClass} onClick={onZoomIn} aria-label={messages.floorplan.zoomIn}>
        +
      </button>
      <button type="button" className={buttonClass} onClick={onZoomOut} aria-label={messages.floorplan.zoomOut}>
        −
      </button>
      <button type="button" className={buttonClass} onClick={onReset} aria-label={messages.floorplan.zoomReset}>
        ⤢
      </button>
    </div>
  );
}
