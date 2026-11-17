import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Notice } from "@/components/reservation/Notice";
import { PageSkeleton } from "@/components/reservation/PageSkeleton";
import { PriceSplit } from "@/components/reservation/PriceSplit";
import { ReservationForm } from "@/components/reservation/ReservationForm";
import { Steps } from "@/components/reservation/Steps";
import { ZoneMark } from "@/components/floorplan/TableSheet";
import { IdSchema, IsoDateSchema } from "@/lib/domain/schemas";
import { formatDateBesideName, formatMultiplier, formatTime } from "@/lib/format";
import { interpolate, messages } from "@/lib/i18n";
import { DATE_PARAM, TABLE_PARAM, venueDateHref, venueHref } from "@/lib/routes";
import { getBookingContext } from "@/lib/services/venues";
import { createReservationAction } from "../actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const t = messages.booking;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function BookingPage({ params, searchParams }: PageProps<"/k/[slug]/rezerviraj">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 pt-2 pb-10 lg:max-w-4xl lg:px-8">
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
      <Link href={backHref} className="btn btn-quiet -mb-3 w-fit justify-start no-underline">
        <span aria-hidden>←</span> {t.back}
      </Link>
      <Steps current="details" />
      <div className="grid animate-rise gap-8 lg:grid-cols-[1fr_22rem] lg:gap-12">
        <header className="lg:col-span-2">
          <p className="eyebrow mb-2 flex items-center gap-2">
            <ZoneMark color={context.zone.color} />
            {context.zone.name} · {context.floor.name}
          </p>
          <h1 className="display text-[clamp(2rem,9vw,3rem)]">{interpolate(messages.tableSheet.title, { label: context.table.label })}</h1>
          <p className="mt-2 text-muted">
            {context.event.name} · {formatDateBesideName(context.event.name, context.event.date)} ·{" "}
            {interpolate(messages.venue.startsAt, { time: formatTime(context.event.startsAt, context.venue.timezone) })}
          </p>
        </header>
        <section aria-label={t.summaryTitle} className="border-y border-line py-5 lg:order-2 lg:self-start">
          <PriceSplit
            minSpendCents={price.minSpendCents}
            depositCents={price.depositCents}
            remainingCents={price.remainingCents}
            note={
              price.multiplier === 1
                ? undefined
                : interpolate(messages.tableSheet.multiplier, { multiplier: formatMultiplier(price.multiplier) })
            }
          />
          <p className="mt-4 text-sm text-muted">{messages.tableSheet.termsDepositCounts}</p>
        </section>
        <section aria-labelledby="details-title">
          <h2 id="details-title" className="sr-only">
            {t.detailsTitle}
          </h2>
          <ReservationForm
            action={createReservationAction.bind(null, slug)}
            tableId={context.table.id}
            date={context.event.date}
            capacity={context.table.capacity}
            holdMinutes={context.venue.policy.holdMinutes}
          />
        </section>
      </div>
    </>
  );
}
