import type { CSSProperties } from "react";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { VenueHeader } from "@/components/venue/VenueHeader";
import { interpolate, messages } from "@/lib/i18n";
import { getVenue, listVenueSlugs } from "@/lib/services/venues";
import { themeToCssVars } from "@/lib/theme";

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return (await listVenueSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: LayoutProps<"/k/[slug]">): Promise<Metadata> {
  const venue = await getVenue((await params).slug);
  if (!venue) return {};
  const description = interpolate(messages.meta.venueDescription, { venue: venue.name });
  return {
    title: venue.name,
    description,
    applicationName: venue.name,
    icons: { icon: venue.theme.logoUrl },
    openGraph: { title: venue.name, description, siteName: venue.name, locale: "hr_HR", type: "website" },
  };
}

export async function generateViewport({ params }: LayoutProps<"/k/[slug]">): Promise<Viewport> {
  const venue = await getVenue((await params).slug);
  return venue ? { themeColor: venue.theme.colors.background } : {};
}

export default async function VenueLayout({ children, params }: LayoutProps<"/k/[slug]">) {
  const venue = await getVenue((await params).slug);
  if (!venue) notFound();

  return (
    <div
      style={themeToCssVars(venue.theme) as CSSProperties}
      className="flex min-h-dvh flex-1 flex-col bg-brand-background font-brand text-brand-text"
    >
      <VenueHeader venue={venue} />
      {children}
    </div>
  );
}
