import type { ReactNode } from "react";

interface TicketProps {
  /** Gornji dio: tko, što, kada. */
  children: ReactNode;
  /** Donji dio ispod perforacije: QR i kod. */
  stub: ReactNode;
}

/**
 * Potvrda u obliku ulaznice. Uvijek je svijetli "papir" s tamnom tintom,
 * da QR kod ostane čitljiv i na tamnoj temi kluba.
 */
export function Ticket({ children, stub }: TicketProps) {
  return (
    <article className="animate-rise text-[#16151a] drop-shadow-[0_14px_30px_rgba(0,0,0,0.28)] [--color-muted:#6b6a72] [--color-line:rgba(22,21,26,0.14)]">
      <div className="rounded-t-[14px] border-t-[5px] border-brand-primary bg-[#fbfaf7] px-5 pt-5 pb-6">{children}</div>
      <div aria-hidden className="relative h-5 bg-[#fbfaf7] [mask:radial-gradient(circle_10px_at_0_50%,transparent_98%,#000)_left/51%_100%_no-repeat,radial-gradient(circle_10px_at_100%_50%,transparent_98%,#000)_right/51%_100%_no-repeat]">
        <span className="absolute inset-x-5 top-1/2 border-t-2 border-dashed border-[rgba(22,21,26,0.22)]" />
      </div>
      <div className="rounded-b-[14px] bg-[#fbfaf7] px-5 pt-4 pb-6">{stub}</div>
    </article>
  );
}
