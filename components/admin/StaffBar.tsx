import type { ReservationView } from "@/lib/services/reservations";
import { messages } from "@/lib/i18n";
import { StaffReservationDetails } from "./ReservationSummary";
import { StaffActionButtons } from "./StaffActionButtons";

/** Prikazuje se na stranici rezervacije samo uz valjanu sesiju osoblja. */
export function StaffBar({ slug, view }: { slug: string; view: ReservationView }) {
  return (
    <section
      aria-label={messages.admin.staffBarTitle}
      className="flex flex-col gap-3 rounded-2xl border-2 border-brand-primary bg-brand-surface p-4"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-primary">{messages.admin.staffBarTitle}</h2>
      <StaffReservationDetails reservation={view.reservation} />
      <StaffActionButtons key={view.reservation.code} slug={slug} code={view.reservation.code} actions={view.staffActions} />
    </section>
  );
}
