"use client";

import { useActionState, useState } from "react";
import { staffAction } from "@/app/k/[slug]/admin/actions";
import { INITIAL_STAFF_ACTION_STATE } from "@/lib/admin/form-state";
import { messages } from "@/lib/i18n";
import type { StaffActions } from "@/lib/reservations/staff";

const t = messages.admin;

const secondary = "btn btn-outline min-h-11 flex-1 px-3 text-sm";

/** Check-in / no-show / otkazivanje; pravila se ponovno provjeravaju na serveru. */
export function StaffActionButtons({ slug, code, actions }: { slug: string; code: string; actions: StaffActions }) {
  const [state, formAction, pending] = useActionState(staffAction.bind(null, slug, code), INITIAL_STAFF_ACTION_STATE);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const none = !actions.checkIn && !actions.noShow && !actions.cancel;

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {state.done ? (
        <p role="status" className="note note-ok font-medium">
          {t.actions.done[state.done]}
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="note note-danger font-medium">
          {t.actionErrors[state.error]}
        </p>
      ) : null}
      {none && !state.done ? <p className="text-sm text-muted">{t.actions.none}</p> : null}
      {actions.checkIn ? (
        <button
          type="submit"
          name="action"
          value="checkIn"
          disabled={pending}
          className="btn bg-free text-base text-black"
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
            <button type="button" disabled={pending} className={`${secondary} text-booked`} onClick={() => setConfirmingCancel(true)}>
              {t.actions.cancel}
            </button>
          ) : null}
        </div>
      ) : null}
      {actions.cancel && confirmingCancel ? (
        <div role="group" aria-label={t.actions.confirmCancel} className="note note-danger flex flex-col gap-2">
          <p className="text-sm font-medium">{t.actions.confirmCancel}</p>
          <div className="flex gap-2">
            <button
              type="submit"
              name="action"
              value="cancel"
              disabled={pending}
              className="btn min-h-11 flex-1 bg-booked px-3 text-sm text-white"
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
