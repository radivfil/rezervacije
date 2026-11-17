import { interpolate, messages } from "@/lib/i18n";

interface PartySizePickerProps {
  value: number;
  capacity: number;
  onChange: (value: number) => void;
  invalid?: boolean;
  errorId?: string;
}

const t = messages.booking;

/** Broj osoba jednim dodirom: po jedan gumb do kapaciteta stola. */
export function PartySizePicker({ value, capacity, onChange, invalid = false, errorId }: PartySizePickerProps) {
  const options = Array.from({ length: capacity }, (_, index) => index + 1);
  return (
    <fieldset aria-describedby={invalid ? errorId : undefined}>
      <legend className="mb-2 flex w-full items-baseline justify-between">
        <span className="font-medium">{t.partySize}</span>
        <span className="text-xs text-muted">{interpolate(t.partySizeHint, { count: capacity })}</span>
      </legend>
      <div role="radiogroup" aria-label={t.partySize} className="grid grid-cols-6 gap-1.5">
        {options.map((option) => {
          const selected = option === value;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={interpolate(t.people, { count: option })}
              onClick={() => onChange(option)}
              className={`flex h-12 items-center justify-center rounded-ctl border text-lg font-semibold tabular-nums transition-colors ${
                selected
                  ? "border-brand-primary bg-brand-primary text-brand-on-primary"
                  : "border-line-strong hover:border-brand-text"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
