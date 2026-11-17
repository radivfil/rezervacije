import { messages } from "@/lib/i18n";

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

const buttonClass =
  "flex size-11 items-center justify-center text-brand-text transition-colors hover:bg-brand-text/8 active:bg-brand-text/15";

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 18 18",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  "aria-hidden": true,
} as const;

export function ZoomControls({ onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <div className="pointer-events-auto flex divide-x divide-line overflow-hidden rounded-ctl border border-line-strong bg-brand-surface/90 shadow-[0_6px_20px_rgba(0,0,0,0.14)] backdrop-blur-sm">
      <button type="button" className={buttonClass} onClick={onZoomOut} aria-label={messages.floorplan.zoomOut}>
        <svg {...iconProps}>
          <path d="M3.5 9h11" />
        </svg>
      </button>
      <button type="button" className={buttonClass} onClick={onZoomIn} aria-label={messages.floorplan.zoomIn}>
        <svg {...iconProps}>
          <path d="M9 3.5v11M3.5 9h11" />
        </svg>
      </button>
      <button type="button" className={buttonClass} onClick={onReset} aria-label={messages.floorplan.zoomReset}>
        <svg {...iconProps} strokeLinejoin="round">
          <path d="M3 6.5V3h3.5M15 6.5V3h-3.5M3 11.5V15h3.5M15 11.5V15h-3.5" />
        </svg>
      </button>
    </div>
  );
}
