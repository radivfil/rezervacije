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
import { ReservationCodeSchema } from "@/lib/domain/schemas";
import { formatEur, formatEventDate, formatReservationCode, formatTime } from "@/lib/format";
import { interpolate, messages } from "@/lib/i18n";
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
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 pb-8">
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
      return <ConfirmedReservation view={view} qr={await qrSvg(url)} backHref={backHref} />;
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
      <section className="flex flex-col gap-3 rounded-2xl bg-brand-surface p-5">
        <h1 className="text-xl font-semibold">{interpolate(t.heldTitle, { label: view.table.label })}</h1>
        <p className="text-sm opacity-80">{t.heldBody}</p>
        <HoldCountdown expiresAt={reservation.holdExpiresAt} totalMinutes={venue.policy.holdMinutes} />
      </section>
      <section className="rounded-2xl bg-brand-surface px-4 py-2">
        <DetailRows
          rows={[
            ...summaryRows(view),
            { label: t.minSpend, value: formatEur(reservation.minSpendCents) },
            { label: t.deposit, value: formatEur(reservation.depositCents), emphasis: true },
            { label: t.remaining, value: formatEur(remainingCents(reservation)) },
          ]}
        />
      </section>
      <section className="flex flex-col gap-2 rounded-2xl bg-brand-surface p-4">
        <DemoPaymentForm
          action={payReservationAction.bind(null, slug, reservation.code)}
          amountLabel={formatEur(reservation.depositCents)}
        />
        <form action={abandonReservationAction.bind(null, slug, reservation.code, event.date)}>
          <button type="submit" className="min-h-11 w-full rounded-xl px-4 text-sm opacity-70">
            {t.abandon}
          </button>
        </form>
      </section>
    </>
  );
}

function ConfirmedReservation({ view, qr, backHref }: { view: ReservationView; qr: string; backHref: string }) {
  const { reservation, venue } = view;
  const tableSheet = messages.tableSheet;
  return (
    <>
      <section className="flex flex-col items-center gap-3 rounded-2xl bg-brand-surface p-5 text-center">
        <h1 className="text-xl font-semibold">{t.confirmedTitle}</h1>
        <p className="text-sm opacity-80">{t.confirmedBody}</p>
        <div
          role="img"
          aria-label={interpolate(t.qrAlt, { code: reservation.code })}
          className="w-56 max-w-full rounded-xl bg-white p-3 [&>svg]:h-auto [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: qr }}
        />
        <p className="text-xs uppercase tracking-wide opacity-70">{t.code}</p>
        <p className="font-mono text-3xl font-bold tracking-widest">{formatReservationCode(reservation.code)}</p>
        {reservation.checkedInAt ? (
          <p className="rounded-full bg-green-500/20 px-3 py-1 text-sm font-semibold">
            {interpolate(messages.admin.checkedInAt, { time: formatTime(reservation.checkedInAt, venue.timezone) })}
          </p>
        ) : null}
      </section>
      <section className="rounded-2xl bg-brand-surface px-4 py-2">
        <DetailRows
          rows={[
            { label: t.venue, value: venue.name },
            ...summaryRows(view),
            ...(reservation.guestName ? [{ label: t.guest, value: reservation.guestName }] : []),
            { label: t.minSpend, value: formatEur(reservation.minSpendCents) },
            { label: t.depositPaid, value: formatEur(reservation.depositCents), emphasis: true },
            { label: t.remaining, value: formatEur(remainingCents(reservation)), emphasis: true },
          ]}
        />
      </section>
      <section className="rounded-2xl bg-brand-surface p-4 text-sm">
        <h2 className="mb-1 font-semibold">{tableSheet.termsTitle}</h2>
        <ul className="list-disc space-y-1 pl-5 opacity-90">
          <li>{tableSheet.termsDepositCounts}</li>
          <li>{interpolate(tableSheet.termsCancellation, { hours: venue.policy.freeCancellationHours })}</li>
        </ul>
      </section>
      <Link
        href={backHref}
        className="flex min-h-12 items-center justify-center rounded-xl bg-brand-surface px-4 font-semibold"
      >
        {t.backToFloorplan}
      </Link>
    </>
  );
}
