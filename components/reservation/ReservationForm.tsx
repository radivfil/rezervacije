"use client";

import { useActionState, useId, useState } from "react";
import { interpolate, messages } from "@/lib/i18n";
import { INITIAL_BOOKING_STATE, type BookingField, type BookingFormState } from "@/lib/reservations/form-state";

interface ReservationFormProps {
  action: (state: BookingFormState, formData: FormData) => Promise<BookingFormState>;
  tableId: string;
  date: string;
  capacity: number;
  holdMinutes: number;
}

const t = messages.booking;

const inputClass =
  "min-h-12 w-full rounded-xl border border-brand-text/20 bg-brand-background px-3 text-base text-brand-text outline-none focus:border-brand-primary aria-[invalid=true]:border-red-500";
const stepperClass =
  "flex size-12 items-center justify-center rounded-full bg-brand-background text-2xl font-semibold disabled:opacity-40";

export function ReservationForm({ action, tableId, date, capacity, holdMinutes }: ReservationFormProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_BOOKING_STATE);
  const [partySize, setPartySize] = useState(Math.min(2, capacity));
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const id = useId();
  const invalid = (field: BookingField): boolean => state.fields.includes(field);
  const errorId = (field: BookingField): string => `${id}-${field}-error`;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="tableId" value={tableId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="partySize" value={partySize} />

      {state.error ? (
        <p role="alert" className="rounded-xl bg-red-500/15 p-3 text-sm font-medium">
          {t.errors[state.error]}
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">{t.partySize}</legend>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className={stepperClass}
            aria-label={t.decrease}
            disabled={partySize <= 1}
            onClick={() => setPartySize((value) => Math.max(1, value - 1))}
          >
            −
          </button>
          <output aria-live="polite" className="min-w-10 text-center text-2xl font-semibold">
            {partySize}
          </output>
          <button
            type="button"
            className={stepperClass}
            aria-label={t.increase}
            disabled={partySize >= capacity}
            onClick={() => setPartySize((value) => Math.min(capacity, value + 1))}
          >
            +
          </button>
        </div>
        <p className="text-xs opacity-70">{interpolate(t.partySizeHint, { count: capacity })}</p>
        {invalid("partySize") ? (
          <p id={errorId("partySize")} className="text-sm text-red-500">
            {t.errors.partySize}
          </p>
        ) : null}
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="font-medium">{t.guestName}</span>
        <input
          name="guestName"
          autoComplete="name"
          required
          maxLength={60}
          value={guestName}
          onChange={(event) => setGuestName(event.target.value)}
          aria-invalid={invalid("guestName")}
          aria-describedby={invalid("guestName") ? errorId("guestName") : undefined}
          className={inputClass}
        />
        {invalid("guestName") ? (
          <span id={errorId("guestName")} className="text-sm text-red-500">
            {t.errors.guestName}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-medium">{t.guestPhone}</span>
        <input
          name="guestPhone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder={t.guestPhoneHint}
          value={guestPhone}
          onChange={(event) => setGuestPhone(event.target.value)}
          aria-invalid={invalid("guestPhone")}
          aria-describedby={invalid("guestPhone") ? errorId("guestPhone") : undefined}
          className={inputClass}
        />
        {invalid("guestPhone") ? (
          <span id={errorId("guestPhone")} className="text-sm text-red-500">
            {t.errors.guestPhone}
          </span>
        ) : null}
      </label>

      <p className="text-xs opacity-70">{t.privacy}</p>
      <p className="text-sm opacity-80">{interpolate(t.holdInfo, { minutes: holdMinutes })}</p>

      <button
        type="submit"
        disabled={pending}
        className="flex min-h-12 items-center justify-center rounded-xl bg-brand-primary px-4 text-base font-semibold text-brand-on-primary disabled:opacity-60"
      >
        {pending ? t.submitting : t.submit}
      </button>
    </form>
  );
}
