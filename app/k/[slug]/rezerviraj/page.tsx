import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DetailRows } from "@/components/reservation/DetailRows";
import { Notice } from "@/components/reservation/Notice";
import { PageSkeleton } from "@/components/reservation/PageSkeleton";
import { ReservationForm } from "@/components/reservation/ReservationForm";
import { IdSchema, IsoDateSchema } from "@/lib/domain/schemas";
import { formatEur, formatEventDate } from "@/lib/format";
import { interpolate, messages } from "@/lib/i18n";
import { DATE_PARAM, TABLE_PARAM, venueDateHref, venueHref } from "@/lib/routes";
import { getBookingContext } from "@/lib/services/venues";
import { createReservationAction } from "../actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const t = messages.booking;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function BookingPage({ params, searchParams }: PageProps<"/k/[slug]/rezerviraj">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 pb-8">
      <Suspense fallback={<PageSkeleton />}>
        <BookingContent params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function BookingContent({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: SearchParams }) {
  await connection();
  const { slug } = await params;
  const query = await searchParams;
  const tableId = IdSchema.safeParse(query[TABLE_PARAM]);
  const date = IsoDateSchema.safeParse(query[DATE_PARAM]);
  if (!tableId.success || !date.success) notFound();

  const context = await getBookingContext(slug, tableId.data, date.data);
  if (!context) notFound();
  const backHref = venueDateHref(venueHref(slug), date.data);

  if (!context.bookingOpen || context.availability !== "free") {
    return (
      <Notice
        title={interpolate(t.title, { label: context.table.label })}
        body={context.bookingOpen ? t.errors.table_unavailable : t.errors.event_started}
        backHref={backHref}
        backLabel={t.back}
      />
    );
  }

  const { price } = context;
  return (
    <>
      <Link href={backHref} className="flex min-h-11 items-center text-sm underline opacity-80">
        ← {t.back}
      </Link>
      <h1 className="text-2xl font-semibold">{interpolate(t.title, { label: context.table.label })}</h1>
      <section className="rounded-2xl bg-brand-surface px-4 py-2">
        <h2 className="sr-only">{t.summaryTitle}</h2>
        <DetailRows
          rows={[
            { label: t.event, value: `${context.event.name} · ${formatEventDate(context.event.date)}` },
            { label: t.table, value: `${context.table.label} · ${context.zone.name} · ${context.floor.name}` },
            { label: messages.tableSheet.minSpend, value: formatEur(price.minSpendCents) },
            {
              label: interpolate(messages.tableSheet.deposit, { percent: price.depositPercent }),
              value: formatEur(price.depositCents),
              emphasis: true,
            },
            { label: messages.tableSheet.remaining, value: formatEur(price.remainingCents) },
          ]}
        />
      </section>
      <section className="rounded-2xl bg-brand-surface p-4">
        <ReservationForm
          action={createReservationAction.bind(null, slug)}
          tableId={context.table.id}
          date={context.event.date}
          capacity={context.table.capacity}
          holdMinutes={context.venue.policy.holdMinutes}
        />
      </section>
    </>
  );
}
