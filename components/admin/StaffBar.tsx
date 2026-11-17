import type { ReservationView } from "@/lib/services/reservations";
import { messages } from "@/lib/i18n";
import { StaffReservationDetails } from "./ReservationSummary";
import { StaffActionButtons } from "./StaffActionButtons";

/** Prikazuje se na stranici rezervacije samo uz valjanu sesiju osoblja. */
export function StaffBar({ slug, view }: { slug: string; view: ReservationView }) {
  return (
    <section
      aria-label={messages.admin.staffBarTitle}
      className="flex flex-col gap-3 rounded-ctl border border-brand-primary bg-brand-primary/6 p-4"
    >
      <h2 className="eyebrow">{messages.admin.staffBarTitle}</h2>
      <StaffReservationDetails reservation={view.reservation} />
      <StaffActionButtons key={view.reservation.code} slug={slug} code={view.reservation.code} actions={view.staffActions} />
    </section>
  );
}
