"use client";

import { useCallback, useContext, useEffect, useId, useRef, type PointerEvent, type ReactNode } from "react";
import { SheetAnchorContext } from "./SheetAnchor";

interface BottomSheetProps {
  /** Mali natpis iznad naslova (npr. zona i etaža). */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Sadržaj desno od naslova (npr. status). */
  aside?: ReactNode;
  closeLabel: string;
  onClose: () => void;
  /** Mijenja se pri odabiru drugog stola (fokus na gumb za zatvaranje). */
  focusKey: string;
  children: ReactNode;
}

const DISMISS_DISTANCE_PX = 90;
const DISMISS_SPEED = 0.6;

/**
 * Panel stola: na mobitelu izlazi odozdo i može se povući prema dolje,
 * na širokom ekranu stoji uz desni rub tlocrta. Nije modalan, tlocrt ostaje dostupan.
 */
export function BottomSheet({ eyebrow, title, aside, closeLabel, onClose, focusKey, children }: BottomSheetProps) {
  const titleId = useId();
  const register = useContext(SheetAnchorContext);
  const sectionRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ id: number; startY: number; lastY: number; lastTime: number; speed: number } | null>(null);

  const attach = useCallback(
    (element: HTMLElement | null) => {
      sectionRef.current = element;
      register?.(element);
      return () => {
        sectionRef.current = null;
        register?.(null);
      };
    },
    [register],
  );

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

  const setOffset = (offset: number, animate: boolean): void => {
    const section = sectionRef.current;
    if (!section) return;
    section.style.transition = animate ? "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)" : "none";
    section.style.transform = offset === 0 ? "" : `translateY(${offset}px)`;
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerType === "mouse") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, startY: event.clientY, lastY: event.clientY, lastTime: event.timeStamp, speed: 0 };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    const elapsed = Math.max(event.timeStamp - state.lastTime, 1);
    state.speed = (event.clientY - state.lastY) / elapsed;
    state.lastY = event.clientY;
    state.lastTime = event.timeStamp;
    setOffset(Math.max(0, event.clientY - state.startY), false);
  };
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>): void => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    drag.current = null;
    const distance = event.clientY - state.startY;
    if (event.type === "pointerup" && (distance > DISMISS_DISTANCE_PX || (distance > 24 && state.speed > DISMISS_SPEED))) {
      onClose();
      return;
    }
    setOffset(0, true);
  };

  return (
    <section
      ref={attach}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className="fixed inset-x-0 bottom-0 z-30 flex max-h-[78dvh] animate-sheet-up flex-col rounded-t-[18px] border-t border-line-strong bg-brand-surface text-brand-text shadow-[0_-18px_50px_rgba(0,0,0,0.32)] lg:absolute lg:inset-x-auto lg:top-3 lg:right-3 lg:bottom-3 lg:max-h-none lg:w-[23.5rem] lg:animate-panel-in lg:rounded-[14px] lg:border lg:shadow-[0_18px_50px_rgba(0,0,0,0.28)]"
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        className="shrink-0 touch-none px-5 pt-2.5 lg:pt-4"
      >
        <div aria-hidden className="mx-auto mb-2 h-1 w-9 rounded-full bg-brand-text/25 lg:hidden" />
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow ? <p className="eyebrow mb-1.5 flex items-center gap-2">{eyebrow}</p> : null}
            <h2 id={titleId} className="display text-[1.75rem]">
              {title}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {aside}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="-mr-2.5 flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-brand-text/8 hover:text-brand-text"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden>
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
            </button>
          </div>
        </header>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </section>
  );
}
