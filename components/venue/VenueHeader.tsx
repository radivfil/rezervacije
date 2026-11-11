import Image from "next/image";
import type { Venue } from "@/lib/domain/types";
import { interpolate, messages } from "@/lib/i18n";

export function VenueHeader({ venue }: { venue: Pick<Venue, "name" | "theme"> }) {
  return (
    <header className="sticky top-0 z-10 bg-brand-background/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center">
        <h1 className="sr-only">{venue.name}</h1>
        <Image
          src={venue.theme.logoUrl}
          alt={interpolate(messages.venue.logoAlt, { venue: venue.name })}
          width={200}
          height={60}
          priority
          unoptimized
          className="h-11 w-auto"
        />
      </div>
    </header>
  );
}
