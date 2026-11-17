import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { StaffBar } from "@/components/admin/StaffBar";
import { DemoPaymentForm } from "@/components/reservation/DemoPaymentForm";
import { DetailRows, type DetailRow } from "@/components/reservation/DetailRows";
import { HoldCountdown } from "@/components/reservation/HoldCountdown";
import { Notice } from "@/components/reservation/Notice";
import { PageSkeleton } from "@/components/reservation/PageSkeleton";
import { PriceSplit } from "@/components/reservation/PriceSplit";
import { Steps } from "@/components/reservation/Steps";
import { Ticket } from "@/components/reservation/Ticket";
import { TicketActions } from "@/components/reservation/TicketActions";
import { ReservationCodeSchema } from "@/lib/domain/schemas";
import { formatDateBesideName, formatEur, formatEventDate, formatReservationCode, formatTime } from "@/lib/format";
import { interpolate, messages } from "@/lib/i18n";
import { icsDataUri } from "@/lib/reservations/calendar";
import { qrSvg } from "@/lib/reservations/qr";
import { remainingCents } from "@/lib/reservations/rules";
import { absoluteUrl, reservationHref, venueDateHref, venueHref } from "@/lib/routes";
import { getReservation, type ReservationView } from "@/lib/services/reservations";
import { abandonReservationAction, payReservationAction } from "../../actions";
import { hasStaffSession } from "../../admin/session";

export const metadata: Metadata = { title: messages.reservation.metaTitle, robots: { index: false, follow: false } };

const t = messages.reservation;

export default function ReservationPage({ params }: PageProps<"/k/[slug]/r/[code]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-2 pb-10">
      <Suspense fallback={<PageSkeleton />}>
        <ReservationContent params={params} />
      </Suspense>
    </main>
  );
}

async function ReservationContent({ params }: { params: Promise<{ slug: string; code: string }> }) {
  await connection();
  const { slug, code } = await params;
  const parsedCode = ReservationCodeSchema.safeParse(code);
  if (!parsedCode.success) notFound();
  const view = await getReservation(slug, parsedCode.data);
  if (!view) notFound();

  const staff = await hasStaffSession(slug);
  return (
    <>
      {staff ? <StaffBar slug={slug} view={view} /> : null}
      {await guestContent(view, slug)}
    </>
  );
}

async function guestContent(view: ReservationView, slug: string) {
  const backHref = venueDateHref(venueHref(slug), view.event.date);
  const { reservation } = view;

  switch (reservation.status) {
    case "held":
      return <HeldReservation view={view} slug={slug} />;
    case "paid":
    case "confirmed":
    case "checked_in": {
      const url = absoluteUrl(await headers(), reservationHref(slug, reservation.code));
      return <ConfirmedReservation view={view} qr={await qrSvg(url)} url={url} backHref={backHref} />;
    }
    default:
      return reservation.cancelReason === "hold_expired" ? (
        <Notice title={t.expiredTitle} body={t.expiredBody} backHref={backHref} backLabel={t.backToFloorplan} />
      ) : (
        <Notice title={t.cancelledTitle} body={t.cancelledBody} backHref={backHref} backLabel={t.backToFloorplan} />
      );
  }
}

function summaryRows(view: ReservationView): DetailRow[] {
  const { reservation, event, venue } = view;
  return [
    { label: t.event, value: `${event.name} · ${formatEventDate(event.date)}` },
    { label: t.startsAt, value: formatTime(event.startsAt, venue.timezone) },
    { label: t.table, value: `${view.table.label} · ${view.zone.name}` },
    { label: t.floor, value: view.floor.name },
    { label: t.partySize, value: reservation.partySize },
  ];
}

function HeldReservation({ view, slug }: { view: ReservationView; slug: string }) {
  const { reservation, venue, event } = view;
  if (!reservation.holdExpiresAt) return null;
  return (
    <>
      <Steps current="payment" />
      <header className="animate-rise">
        <h1 className="display text-[clamp(1.875rem,8vw,2.75rem)]">{interpolate(t.heldTitle, { label: view.table.label })}</h1>
        <p className="mt-2 text-muted">{t.heldBody}</p>
      </header>
      <section className="border-y border-line py-5">
        <HoldCountdown expiresAt={reservation.holdExpiresAt} totalMinutes={venue.policy.holdMinutes} />
      </section>
      <section>
        <PriceSplit
          minSpendCents={reservation.minSpendCents}
          depositCents={reservation.depositCents}
          remainingCents={remainingCents(reservation)}
        />
      </section>
      <section className="flex flex-col gap-1">
        <DemoPaymentForm
          action={payReservationAction.bind(null, slug, reservation.code)}
          amountLabel={formatEur(reservation.depositCents)}
        />
        <form action={abandonReservationAction.bind(null, slug, reservation.code, event.date)} className="flex">
          <button type="submit" className="btn btn-quiet flex-1">
            {t.abandon}
          </button>
        </form>
      </section>
      <section className="border-t border-line pt-2">
        <DetailRows rows={summaryRows(view)} />
      </section>
    </>
  );
}

/** Trajanje zapisa u kalendaru; termin nema definiran kraj. */
const CALENDAR_HOURS = 5;

function ConfirmedReservation({ view, qr, url, backHref }: { view: ReservationView; qr: string; url: string; backHref: string }) {
  const { reservation, venue, event, table, zone, floor } = view;
  const tableSheet = messages.tableSheet;
  const code = formatReservationCode(reservation.code);
  const calendarHref = icsDataUri({
    uid: `${reservation.code}@${venue.slug}`,
    title: interpolate(t.calendarTitle, { event: event.name, label: table.label }),
    location: venue.name,
    description: interpolate(t.calendarDescription, {
      code,
      label: table.label,
      zone: zone.name,
      floor: floor.name,
      count: reservation.partySize,
    }),
    startsAt: event.startsAt,
    durationHours: CALENDAR_HOURS,
    createdAt: reservation.createdAt,
    url,
  });
  return (
    <>
      <Steps current="ticket" />
      <header className="animate-rise">
        <h1 className="display text-[clamp(1.875rem,8vw,2.75rem)]">{t.confirmedTitle}</h1>
        <p className="mt-2 text-muted">{t.confirmedBody}</p>
      </header>

      <Ticket
        stub={
          <div className="flex items-center gap-4">
            <div
              role="img"
              aria-label={interpolate(t.qrAlt, { code: reservation.code })}
              className="w-32 shrink-0 [&>svg]:h-auto [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qr }}
            />
            <div className="min-w-0">
              <p className="eyebrow">{t.code}</p>
              <p className="mt-1 font-mono text-[1.375rem] leading-tight font-semibold tracking-[0.08em]">{code}</p>
              {reservation.checkedInAt ? (
                <p className="mt-2 inline-block rounded-full bg-[#1a9f5c]/15 px-2.5 py-1 text-xs font-semibold text-[#126e40]">
                  {interpolate(messages.admin.checkedInAt, { time: formatTime(reservation.checkedInAt, venue.timezone) })}
                </p>
              ) : null}
            </div>
          </div>
        }
      >
        <p className="eyebrow">{venue.name}</p>
        <p className="display mt-2 text-[1.625rem]">{event.name}</p>
        <p className="mt-1 text-sm text-[#6b6a72]">
          {formatDateBesideName(event.name, event.date)} · {interpolate(messages.venue.startsAt, { time: formatTime(event.startsAt, venue.timezone) })}
        </p>
        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-[rgba(22,21,26,0.14)] pt-4">
          <div>
            <dt className="eyebrow">{t.table}</dt>
            <dd className="display mt-1 text-[1.75rem]">{table.label}</dd>
          </div>
          <div>
            <dt className="eyebrow">{t.zone}</dt>
            <dd className="mt-1.5 font-semibold">{zone.name}</dd>
            <dd className="text-xs text-[#6b6a72]">{floor.name}</dd>
          </div>
          <div>
            <dt className="eyebrow">{t.partySize}</dt>
            <dd className="display mt-1 text-[1.75rem] tabular-nums">{reservation.partySize}</dd>
          </div>
        </dl>
        {reservation.guestName ? (
          <p className="mt-4 text-sm">
            <span className="text-[#6b6a72]">{t.guest}</span> <span className="font-semibold">{reservation.guestName}</span>
          </p>
        ) : null}
      </Ticket>

      <TicketActions
        calendarHref={calendarHref}
        calendarFile={interpolate(t.calendarFile, { code: reservation.code })}
        shareTitle={venue.name}
        shareText={interpolate(t.shareText, { venue: venue.name, label: table.label, date: formatEventDate(event.date) })}
        shareUrl={url}
      />

      <section className="border-y border-line py-5">
        <PriceSplit
          minSpendCents={reservation.minSpendCents}
          depositCents={reservation.depositCents}
          remainingCents={remainingCents(reservation)}
          paid
        />
      </section>
      <section className="text-sm text-muted">
        <h2 className="eyebrow mb-2">{tableSheet.termsTitle}</h2>
        <ul className="space-y-1.5">
          <li>{tableSheet.termsDepositCounts}</li>
          <li>{interpolate(tableSheet.termsCancellation, { hours: venue.policy.freeCancellationHours })}</li>
        </ul>
      </section>
      <Link href={backHref} className="btn btn-quiet">
        {t.backToFloorplan}
      </Link>
    </>
  );
}
