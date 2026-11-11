import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { FloorplanSkeleton } from "@/components/floorplan/FloorplanSkeleton";
import { FloorplanView } from "@/components/floorplan/FloorplanView";
import { EventSummary } from "@/components/venue/EventSummary";
import { isoDateInTimeZone } from "@/lib/format";
import { getFloorplan, getVenue } from "@/lib/services/venues";

export default async function VenuePage({ params }: PageProps<"/k/[slug]">) {
  const { slug } = await params;
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-4 pb-6">
      <Suspense fallback={<FloorplanSkeleton />}>
        <VenueFloorplan slug={slug} />
      </Suspense>
    </main>
  );
}

/** Ovisi o današnjem datumu, pa se renderira po zahtjevu. */
async function VenueFloorplan({ slug }: { slug: string }) {
  await connection();
  const venue = await getVenue(slug);
  if (!venue) notFound();
  const plan = await getFloorplan(slug, { fromDate: isoDateInTimeZone(new Date(), venue.timezone) });
  if (!plan) notFound();

  return (
    <>
      <EventSummary event={plan.event} />
      <FloorplanView
        floors={plan.floors}
        zones={plan.zones}
        tables={plan.tables}
        decorations={plan.decorations}
        availability={plan.availability}
        theme={plan.venue.theme}
      />
    </>
  );
}
