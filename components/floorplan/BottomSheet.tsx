"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

interface BottomSheetProps {
  title: ReactNode;
  closeLabel: string;
  onClose: () => void;
  /** Mijenja se pri odabiru drugog stola (fokus na gumb za zatvaranje). */
  focusKey: string;
  children: ReactNode;
}

/** Donji panel. Nije modalan: tlocrt ostaje dostupan za odabir drugog stola. */
export function BottomSheet({ title, closeLabel, onClose, focusKey, children }: BottomSheetProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, [focusKey]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className="fixed inset-x-0 bottom-0 z-20 mx-auto max-h-[60dvh] max-w-3xl overflow-y-auto rounded-t-2xl bg-brand-surface px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] text-brand-text shadow-[0_-8px_30px_rgba(0,0,0,0.35)]"
    >
      <div aria-hidden className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-brand-text/30" />
      <header className="flex items-center justify-between gap-2">
        <h2 id={titleId} className="flex items-center gap-2 text-xl font-semibold">
          {title}
        </h2>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="flex size-11 items-center justify-center rounded-full text-2xl hover:bg-brand-background/40"
        >
          ×
        </button>
      </header>
      {children}
    </section>
  );
}
