"use client";

import { useActionState, useState } from "react";
import { staffAction } from "@/app/k/[slug]/admin/actions";
import { INITIAL_STAFF_ACTION_STATE } from "@/lib/admin/form-state";
import { messages } from "@/lib/i18n";
import type { StaffActions } from "@/lib/reservations/staff";

const t = messages.admin;

const secondary =
  "flex min-h-11 flex-1 items-center justify-center rounded-xl border border-brand-text/20 px-3 text-sm font-semibold disabled:opacity-50";

/** Check-in / no-show / otkazivanje; pravila se ponovno provjeravaju na serveru. */
export function StaffActionButtons({ slug, code, actions }: { slug: string; code: string; actions: StaffActions }) {
  const [state, formAction, pending] = useActionState(staffAction.bind(null, slug, code), INITIAL_STAFF_ACTION_STATE);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const none = !actions.checkIn && !actions.noShow && !actions.cancel;

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {state.done ? (
        <p role="status" className="rounded-xl bg-green-500/15 p-3 text-sm font-medium">
          {t.actions.done[state.done]}
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="rounded-xl bg-red-500/15 p-3 text-sm font-medium">
          {t.actionErrors[state.error]}
        </p>
      ) : null}
      {none && !state.done ? <p className="text-sm opacity-70">{t.actions.none}</p> : null}
      {actions.checkIn ? (
        <button
          type="submit"
          name="action"
          value="checkIn"
          disabled={pending}
          className="flex min-h-12 items-center justify-center rounded-xl bg-green-600 px-4 text-base font-semibold text-white disabled:opacity-60"
        >
          {pending ? t.actions.working : t.actions.checkIn}
        </button>
      ) : null}
      {actions.noShow || actions.cancel ? (
        <div className="flex gap-2">
          {actions.noShow ? (
            <button type="submit" name="action" value="noShow" disabled={pending} className={secondary}>
              {t.actions.noShow}
            </button>
          ) : null}
          {actions.cancel && !confirmingCancel ? (
            <button type="button" disabled={pending} className={`${secondary} text-red-500`} onClick={() => setConfirmingCancel(true)}>
              {t.actions.cancel}
            </button>
          ) : null}
        </div>
      ) : null}
      {actions.cancel && confirmingCancel ? (
        <div role="group" aria-label={t.actions.confirmCancel} className="flex flex-col gap-2 rounded-xl bg-red-500/10 p-3">
          <p className="text-sm font-medium">{t.actions.confirmCancel}</p>
          <div className="flex gap-2">
            <button
              type="submit"
              name="action"
              value="cancel"
              disabled={pending}
              className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-red-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t.actions.confirmCancelYes}
            </button>
            <button type="button" className={secondary} onClick={() => setConfirmingCancel(false)}>
              {t.actions.confirmCancelNo}
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
