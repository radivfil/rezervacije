import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { FloorplanSkeleton } from "@/components/floorplan/FloorplanSkeleton";
import { FloorplanView } from "@/components/floorplan/FloorplanView";
import { IsoDateSchema } from "@/lib/domain/schemas";
import { DATE_PARAM } from "@/lib/floorplan/routes";
import { isoDateInTimeZone } from "@/lib/format";
import { getFloorplan, getVenue } from "@/lib/services/venues";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function VenuePage({ params, searchParams }: PageProps<"/k/[slug]">) {
  const { slug } = await params;
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-4 pb-6">
      <Suspense fallback={<FloorplanSkeleton />}>
        <VenueFloorplan slug={slug} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** Ovisi o današnjem datumu i ?datum=, pa se renderira po zahtjevu. */
async function VenueFloorplan({ slug, searchParams }: { slug: string; searchParams: SearchParams }) {
  await connection();
  const venue = await getVenue(slug);
  if (!venue) notFound();

  const requested = (await searchParams)[DATE_PARAM];
  const parsed = IsoDateSchema.safeParse(requested);
  const plan = await getFloorplan(slug, {
    date: parsed.success ? parsed.data : undefined,
    fromDate: isoDateInTimeZone(new Date(), venue.timezone),
  });
  if (!plan) notFound();

  return (
    <FloorplanView
      venue={plan.venue}
      events={plan.events}
      event={plan.event}
      floors={plan.floors}
      zones={plan.zones}
      tables={plan.tables}
      decorations={plan.decorations}
      availability={plan.availability}
    />
  );
}
