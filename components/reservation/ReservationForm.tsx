"use client";

import { useActionState, useId, useState } from "react";
import { interpolate, messages } from "@/lib/i18n";
import { INITIAL_BOOKING_STATE, type BookingField, type BookingFormState } from "@/lib/reservations/form-state";
import { PartySizePicker } from "./PartySizePicker";

interface ReservationFormProps {
  action: (state: BookingFormState, formData: FormData) => Promise<BookingFormState>;
  tableId: string;
  date: string;
  capacity: number;
  holdMinutes: number;
}

const t = messages.booking;

export function ReservationForm({ action, tableId, date, capacity, holdMinutes }: ReservationFormProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_BOOKING_STATE);
  const [partySize, setPartySize] = useState(Math.min(2, capacity));
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const id = useId();
  const invalid = (field: BookingField): boolean => state.fields.includes(field);
  const errorId = (field: BookingField): string => `${id}-${field}-error`;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="tableId" value={tableId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="partySize" value={partySize} />

      {state.error ? (
        <p role="alert" className="note note-danger font-medium">
          {t.errors[state.error]}
        </p>
      ) : null}

      <div>
        <PartySizePicker
          value={partySize}
          capacity={capacity}
          onChange={setPartySize}
          invalid={invalid("partySize")}
          errorId={errorId("partySize")}
        />
        {invalid("partySize") ? (
          <p id={errorId("partySize")} className="mt-1.5 text-sm text-booked">
            {t.errors.partySize}
          </p>
        ) : null}
      </div>

      <label className="flex flex-col gap-1.5">
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
          className="field"
        />
        {invalid("guestName") ? (
          <span id={errorId("guestName")} className="text-sm text-booked">
            {t.errors.guestName}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1.5">
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
          className="field"
        />
        {invalid("guestPhone") ? (
          <span id={errorId("guestPhone")} className="text-sm text-booked">
            {t.errors.guestPhone}
          </span>
        ) : (
          <span className="text-xs text-muted">{t.privacy}</span>
        )}
      </label>

      <div className="mt-1 flex flex-col gap-2.5">
        <button type="submit" disabled={pending} className="btn btn-primary justify-between text-base">
          {pending ? t.submitting : t.submit}
          <span aria-hidden>→</span>
        </button>
        <p className="text-sm text-muted">{interpolate(t.holdInfo, { minutes: holdMinutes })}</p>
      </div>
    </form>
  );
}
