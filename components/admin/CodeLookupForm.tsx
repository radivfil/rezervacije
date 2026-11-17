"use client";

import { useActionState } from "react";
import { lookupCodeAction } from "@/app/k/[slug]/admin/actions";
import { INITIAL_CODE_LOOKUP_STATE } from "@/lib/admin/form-state";
import { messages } from "@/lib/i18n";

const t = messages.admin;

export function CodeLookupForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(lookupCodeAction.bind(null, slug), INITIAL_CODE_LOOKUP_STATE);
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <label htmlFor="staff-code" className="eyebrow mb-1">
        {t.codeLabel}
      </label>
      <div className="flex gap-2">
        <input
          id="staff-code"
          name="code"
          autoCapitalize="characters"
          autoComplete="off"
          placeholder={t.codePlaceholder}
          className="field flex-1 font-mono text-lg tracking-[0.08em] uppercase placeholder:tracking-normal placeholder:normal-case"
        />
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary"
        >
          {t.codeSubmit}
        </button>
      </div>
      {state.error ? (
        <p role="alert" className="mt-1 text-sm text-booked">
          {t.codeNotFound}
        </p>
      ) : null}
    </form>
  );
}
