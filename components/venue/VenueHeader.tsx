import Image from "next/image";
import Link from "next/link";
import type { Venue } from "@/lib/domain/types";
import { interpolate, messages } from "@/lib/i18n";
import { venueHref } from "@/lib/routes";

export function VenueHeader({ venue }: { venue: Pick<Venue, "name" | "slug" | "theme"> }) {
  return (
    <header className="px-4 pt-3 pb-1 lg:px-8 lg:pt-5">
      <h1 className="sr-only">{venue.name}</h1>
      <Link href={venueHref(venue.slug)} className="inline-flex min-h-11 items-center rounded-ctl">
        <Image
          src={venue.theme.logoUrl}
          alt={interpolate(messages.venue.logoAlt, { venue: venue.name })}
          width={200}
          height={60}
          priority
          unoptimized
          className="h-9 w-auto"
        />
      </Link>
    </header>
  );
}
