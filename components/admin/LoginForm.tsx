"use client";

import { useActionState } from "react";
import { INITIAL_LOGIN_STATE, type LoginFormState } from "@/lib/admin/form-state";
import { interpolate, messages } from "@/lib/i18n";

const t = messages.admin;

export function LoginForm({ action }: { action: (state: LoginFormState, formData: FormData) => Promise<LoginFormState> }) {
  const [state, formAction, pending] = useActionState(action, INITIAL_LOGIN_STATE);
  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-2xl bg-brand-surface p-5">
      <h1 className="text-xl font-semibold">{t.loginTitle}</h1>
      <p className="text-sm opacity-80">{t.loginBody}</p>
      {state.error ? (
        <p role="alert" className="rounded-xl bg-red-500/15 p-3 text-sm font-medium">
          {interpolate(t.errors[state.error], { minutes: state.retryMinutes })}
        </p>
      ) : null}
      <label className="flex flex-col gap-1">
        <span className="font-medium">{t.pin}</span>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          required
          className="min-h-12 rounded-xl border border-brand-text/20 bg-brand-background px-3 text-center text-2xl tracking-[0.5em] text-brand-text outline-none focus:border-brand-primary"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-12 items-center justify-center rounded-xl bg-brand-primary px-4 font-semibold text-brand-on-primary disabled:opacity-60"
      >
        {pending ? t.loggingIn : t.login}
      </button>
    </form>
  );
}
