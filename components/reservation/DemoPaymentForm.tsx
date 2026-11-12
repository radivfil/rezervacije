"use client";

import { useActionState } from "react";
import { interpolate, messages } from "@/lib/i18n";
import { INITIAL_PAYMENT_STATE, type PaymentFormState } from "@/lib/reservations/form-state";

interface DemoPaymentFormProps {
  action: (state: PaymentFormState, formData: FormData) => Promise<PaymentFormState>;
  amountLabel: string;
}

const t = messages.reservation;

export function DemoPaymentForm({ action, amountLabel }: DemoPaymentFormProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_PAYMENT_STATE);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <p className="rounded-xl border border-dashed border-brand-text/30 p-3 text-sm opacity-80">{t.demoNotice}</p>
      {state.error ? (
        <p role="alert" className="rounded-xl bg-red-500/15 p-3 text-sm font-medium">
          {t.paymentFailed}
        </p>
      ) : null}
      <button
        type="submit"
        name="outcome"
        value="succeeded"
        disabled={pending}
        className="flex min-h-12 items-center justify-center rounded-xl bg-brand-primary px-4 text-base font-semibold text-brand-on-primary disabled:opacity-60"
      >
        {pending ? t.paying : interpolate(t.pay, { amount: amountLabel })}
      </button>
      <button
        type="submit"
        name="outcome"
        value="failed"
        disabled={pending}
        className="min-h-11 rounded-xl px-4 text-sm underline opacity-80 disabled:opacity-40"
      >
        {t.simulateDecline}
      </button>
    </form>
  );
}
