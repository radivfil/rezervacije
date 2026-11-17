import { messages } from "@/lib/i18n";

const t = messages.booking;
const STEPS = ["table", "details", "payment", "ticket"] as const;

export type BookingStep = (typeof STEPS)[number];

/** Gdje je gost u rezervaciji: stol, podaci, akontacija, potvrda. */
export function Steps({ current }: { current: BookingStep }) {
  const currentIndex = STEPS.indexOf(current);
  return (
    <ol aria-label={t.stepsLabel} className="flex gap-1.5">
      {STEPS.map((step, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "next";
        return (
          <li key={step} aria-current={state === "current" ? "step" : undefined} className="flex-1">
            <span
              aria-hidden
              className={`block h-[3px] rounded-full ${state === "next" ? "bg-brand-text/15" : "bg-brand-primary"}`}
            />
            <span
              className={`mt-1.5 block text-[0.6875rem] font-semibold tracking-[0.08em] uppercase ${
                state === "current" ? "text-brand-text" : "text-muted"
              } ${state === "next" ? "opacity-60" : ""}`}
            >
              {t.steps[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
