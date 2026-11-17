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
      {state.error ? (
        <p role="alert" className="note note-danger font-medium">
          {t.paymentFailed}
        </p>
      ) : null}
      <button type="submit" name="outcome" value="succeeded" disabled={pending} className="btn btn-primary justify-between text-base">
        {pending ? t.paying : interpolate(t.pay, { amount: amountLabel })}
        <span aria-hidden>→</span>
      </button>
      <p className="rounded-ctl border border-dashed border-line-strong px-3.5 py-3 text-sm text-muted">{t.demoNotice}</p>
      <button type="submit" name="outcome" value="failed" disabled={pending} className="btn btn-quiet">
        {t.simulateDecline}
      </button>
    </form>
  );
}
