import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AdminFloorplan } from "@/components/admin/AdminFloorplan";
import { CodeLookupForm } from "@/components/admin/CodeLookupForm";
import { LoginForm } from "@/components/admin/LoginForm";
import { ReservationList } from "@/components/admin/ReservationList";
import { StaffCounts } from "@/components/admin/StaffCounts";
import { PageSkeleton } from "@/components/reservation/PageSkeleton";
import { IsoDateSchema } from "@/lib/domain/schemas";
import { isoDateInTimeZone } from "@/lib/format";
import { messages } from "@/lib/i18n";
import { DATE_PARAM } from "@/lib/routes";
import { listEventReservations } from "@/lib/services/staff";
import { getFloorplan, getVenue } from "@/lib/services/venues";
import { loginAction, logoutAction } from "./actions";
import { hasStaffSession } from "./session";

export const metadata: Metadata = { title: messages.admin.metaTitle, robots: { index: false, follow: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function AdminPage({ params, searchParams }: PageProps<"/k/[slug]/admin">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 pb-8">
      <Suspense fallback={<PageSkeleton />}>
        <AdminContent params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function AdminContent({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: SearchParams }) {
  await connection();
  const { slug } = await params;
  const venue = await getVenue(slug);
  if (!venue) notFound();

  // Bez valjane sesije osoblja prikazuje se samo prijava (pravilo 4).
  if (!(await hasStaffSession(slug))) {
    return (
      <div className="mx-auto w-full max-w-sm pt-6">
        <LoginForm action={loginAction.bind(null, slug)} />
      </div>
    );
  }

  const date = IsoDateSchema.safeParse((await searchParams)[DATE_PARAM]);
  const plan = await getFloorplan(slug, {
    date: date.success ? date.data : undefined,
    fromDate: isoDateInTimeZone(new Date(), venue.timezone),
  });
  if (!plan) notFound();
  const list = plan.event ? await listEventReservations(slug, plan.event.date) : null;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{messages.admin.title}</h1>
        <form action={logoutAction.bind(null, slug)}>
          <button type="submit" className="min-h-11 rounded-xl px-4 text-sm underline opacity-80">
            {messages.admin.logout}
          </button>
        </form>
      </div>
      <CodeLookupForm slug={slug} />
      <AdminFloorplan
        venue={plan.venue}
        bookingOpen={plan.bookingOpen}
        events={plan.events}
        event={plan.event}
        floors={plan.floors}
        zones={plan.zones}
        tables={plan.tables}
        decorations={plan.decorations}
        availability={plan.availability}
        rows={list?.rows ?? []}
      >
        {list ? <StaffCounts counts={list.counts} /> : <p className="opacity-70">{messages.admin.noEvent}</p>}
      </AdminFloorplan>
      {list ? <ReservationList slug={slug} rows={list.rows} /> : null}
    </>
  );
}
