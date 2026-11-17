"use client";

import { useActionState } from "react";
import { INITIAL_LOGIN_STATE, type LoginFormState } from "@/lib/admin/form-state";
import { interpolate, messages } from "@/lib/i18n";

const t = messages.admin;

export function LoginForm({ action }: { action: (state: LoginFormState, formData: FormData) => Promise<LoginFormState> }) {
  const [state, formAction, pending] = useActionState(action, INITIAL_LOGIN_STATE);
  return (
    <form action={formAction} className="flex animate-rise flex-col gap-4">
      <h1 className="display text-[2rem]">{t.loginTitle}</h1>
      <p className="text-muted">{t.loginBody}</p>
      {state.error ? (
        <p role="alert" className="note note-danger font-medium">
          {interpolate(t.errors[state.error], { minutes: state.retryMinutes })}
        </p>
      ) : null}
      <label className="flex flex-col gap-1.5">
        <span className="eyebrow">{t.pin}</span>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          required
          className="field h-14 text-center font-mono text-2xl tracking-[0.5em]"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary"
      >
        {pending ? t.loggingIn : t.login}
      </button>
    </form>
  );
}
