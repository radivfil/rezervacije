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
      <label htmlFor="staff-code" className="text-sm font-medium">
        {t.codeLabel}
      </label>
      <div className="flex gap-2">
        <input
          id="staff-code"
          name="code"
          autoCapitalize="characters"
          autoComplete="off"
          placeholder={t.codePlaceholder}
          className="min-h-12 flex-1 rounded-xl border border-brand-text/20 bg-brand-background px-3 font-mono text-lg uppercase text-brand-text outline-none focus:border-brand-primary"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 rounded-xl bg-brand-primary px-5 font-semibold text-brand-on-primary disabled:opacity-60"
        >
          {t.codeSubmit}
        </button>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-red-500">
          {t.codeNotFound}
        </p>
      ) : null}
    </form>
  );
}
