"use client";

import { useState } from "react";
import { messages } from "@/lib/i18n";

interface TicketActionsProps {
  /** data: URI s .ics zapisom. */
  calendarHref: string;
  calendarFile: string;
  shareTitle: string;
  shareText: string;
  shareUrl: string;
}

const t = messages.reservation;

/** Spremanje termina u kalendar i dijeljenje poveznice na potvrdu. */
export function TicketActions({ calendarHref, calendarFile, shareTitle, shareText, shareUrl }: TicketActionsProps) {
  const [copied, setCopied] = useState(false);

  const share = async (): Promise<void> => {
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Korisnik je zatvorio dijeljenje ili preglednik ne dopušta međuspremnik.
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <a href={calendarHref} download={calendarFile} className="btn btn-outline px-3 text-sm">
        {t.addToCalendar}
      </a>
      <button type="button" onClick={share} className="btn btn-outline px-3 text-sm">
        <span aria-live="polite">{copied ? t.linkCopied : t.share}</span>
      </button>
    </div>
  );
}
