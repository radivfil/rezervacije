"use client";

import { useActionState, useState } from "react";
import { staffCreateAction } from "@/app/k/[slug]/admin/actions";
import { INITIAL_MANUAL_STATE, type ManualField } from "@/lib/admin/form-state";
import { interpolate, messages } from "@/lib/i18n";
import type { StaffReservationKind } from "@/lib/reservations/staff";

interface ManualReservationFormProps {
  slug: string;
  tableId: string;
  date: string;
  capacity: number;
  depositLabel: string;
}

const t = messages.admin.manual;
const booking = messages.booking;

const inputClass =
  "min-h-12 w-full rounded-xl border border-brand-text/20 bg-brand-background px-3 text-base text-brand-text outline-none focus:border-brand-primary aria-[invalid=true]:border-red-500";

/** Ručna rezervacija osoblja za slobodan stol (pravilo 8). */
export function ManualReservationForm({ slug, tableId, date, capacity, depositLabel }: ManualReservationFormProps) {
  const [state, formAction, pending] = useActionState(staffCreateAction.bind(null, slug), INITIAL_MANUAL_STATE);
  const [kind, setKind] = useState<StaffReservationKind>("confirmed");
  const [partySize, setPartySize] = useState(Math.min(2, capacity));
  const invalid = (field: ManualField): boolean => state.fields.includes(field);

  if (state.createdCode) {
    return (
      <p role="status" className="rounded-xl bg-green-500/15 p-3 text-sm font-medium">
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
      <h3 className="font-semibold">{t.title}</h3>
      <input type="hidden" name="tableId" value={tableId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="partySize" value={partySize} />
      {state.error ? (
        <p role="alert" className="rounded-xl bg-red-500/15 p-3 text-sm font-medium">
          {state.error === "unauthorized" ? messages.admin.actionErrors.unauthorized : booking.errors[state.error]}
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">{t.kindLabel}</legend>
        {kinds.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3 ${
              kind === option.value ? "border-brand-primary" : "border-brand-text/20"
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
              <span className="block text-xs opacity-70">{option.hint}</span>
            </span>
          </label>
        ))}
        {invalid("kind") ? <span className="text-sm text-red-500">{t.errors.kind}</span> : null}
      </fieldset>

      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{booking.partySize}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={booking.decrease}
            disabled={partySize <= 1}
            onClick={() => setPartySize((value) => Math.max(1, value - 1))}
            className="flex size-11 items-center justify-center rounded-full bg-brand-background text-xl disabled:opacity-40"
          >
            −
          </button>
          <output className="min-w-8 text-center text-xl font-semibold">{partySize}</output>
          <button
            type="button"
            aria-label={booking.increase}
            disabled={partySize >= capacity}
            onClick={() => setPartySize((value) => Math.min(capacity, value + 1))}
            className="flex size-11 items-center justify-center rounded-full bg-brand-background text-xl disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>
      {invalid("partySize") ? <span className="text-sm text-red-500">{booking.errors.partySize}</span> : null}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{booking.guestName}</span>
        <input name="guestName" required maxLength={60} aria-invalid={invalid("guestName")} className={inputClass} />
        {invalid("guestName") ? <span className="text-sm text-red-500">{booking.errors.guestName}</span> : null}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t.guestPhoneOptional}</span>
        <input name="guestPhone" type="tel" inputMode="tel" aria-invalid={invalid("guestPhone")} className={inputClass} />
        {invalid("guestPhone") ? <span className="text-sm text-red-500">{booking.errors.guestPhone}</span> : null}
      </label>

      <button
        type="submit"
        disabled={pending}
        className="flex min-h-12 items-center justify-center rounded-xl bg-brand-primary px-4 font-semibold text-brand-on-primary disabled:opacity-60"
      >
        {pending ? messages.admin.actions.working : t.submit}
      </button>
    </form>
  );
}
