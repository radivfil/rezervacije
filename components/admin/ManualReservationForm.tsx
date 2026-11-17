"use client";

import { useActionState, useState } from "react";
import { staffCreateAction } from "@/app/k/[slug]/admin/actions";
import { INITIAL_MANUAL_STATE, type ManualField } from "@/lib/admin/form-state";
import { interpolate, messages } from "@/lib/i18n";
import type { StaffReservationKind } from "@/lib/reservations/staff";
import { PartySizePicker } from "../reservation/PartySizePicker";

interface ManualReservationFormProps {
  slug: string;
  tableId: string;
  date: string;
  capacity: number;
  depositLabel: string;
}

const t = messages.admin.manual;
const booking = messages.booking;

/** Ručna rezervacija osoblja za slobodan stol (pravilo 8). */
export function ManualReservationForm({ slug, tableId, date, capacity, depositLabel }: ManualReservationFormProps) {
  const [state, formAction, pending] = useActionState(staffCreateAction.bind(null, slug), INITIAL_MANUAL_STATE);
  const [kind, setKind] = useState<StaffReservationKind>("confirmed");
  const [partySize, setPartySize] = useState(Math.min(2, capacity));
  const invalid = (field: ManualField): boolean => state.fields.includes(field);

  if (state.createdCode) {
    return (
      <p role="status" className="note note-ok font-medium">
        {interpolate(t.created, { code: state.createdCode })}
      </p>
    );
  }

  const kinds: { value: StaffReservationKind; label: string; hint: string }[] = [
    { value: "confirmed", label: t.kindConfirmed, hint: interpolate(t.kindConfirmedHint, { amount: depositLabel }) },
    { value: "hold", label: t.kindHold, hint: t.kindHoldHint },
  ];

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <h3 className="eyebrow">{t.title}</h3>
      <input type="hidden" name="tableId" value={tableId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="partySize" value={partySize} />
      {state.error ? (
        <p role="alert" className="note note-danger font-medium">
          {state.error === "unauthorized" ? messages.admin.actionErrors.unauthorized : booking.errors[state.error]}
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">{t.kindLabel}</legend>
        {kinds.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-ctl border p-3 transition-colors ${
              kind === option.value ? "border-brand-primary bg-brand-primary/8" : "border-line-strong"
            }`}
          >
            <input
              type="radio"
              name="kind"
              value={option.value}
              checked={kind === option.value}
              onChange={() => setKind(option.value)}
              className="mt-1 size-5 accent-[var(--brand-primary)]"
            />
            <span>
              <span className="block font-medium">{option.label}</span>
              <span className="block text-xs text-muted">{option.hint}</span>
            </span>
          </label>
        ))}
        {invalid("kind") ? <span className="text-sm text-booked">{t.errors.kind}</span> : null}
      </fieldset>

      <PartySizePicker value={partySize} capacity={capacity} onChange={setPartySize} invalid={invalid("partySize")} />
      {invalid("partySize") ? <span className="text-sm text-booked">{booking.errors.partySize}</span> : null}

      <label className="flex flex-col gap-1">
        <span className="font-medium">{booking.guestName}</span>
        <input name="guestName" required maxLength={60} aria-invalid={invalid("guestName")} className="field" />
        {invalid("guestName") ? <span className="text-sm text-booked">{booking.errors.guestName}</span> : null}
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-medium">{t.guestPhoneOptional}</span>
        <input name="guestPhone" type="tel" inputMode="tel" aria-invalid={invalid("guestPhone")} className="field" />
        {invalid("guestPhone") ? <span className="text-sm text-booked">{booking.errors.guestPhone}</span> : null}
      </label>

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary"
      >
        {pending ? messages.admin.actions.working : t.submit}
      </button>
    </form>
  );
}
