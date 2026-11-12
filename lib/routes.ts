/** Naziv URL parametra za odabrani datum termina (?datum=YYYY-MM-DD). */
export const DATE_PARAM = "datum";
/** Naziv URL parametra za stol na formi rezervacije (?stol=<id>). */
export const TABLE_PARAM = "stol";

export function venueHref(slug: string): string {
  return `/k/${encodeURIComponent(slug)}`;
}

export function venueDateHref(pathname: string, date: string): string {
  return `${pathname}?${new URLSearchParams({ [DATE_PARAM]: date }).toString()}`;
}

export function bookingHref(slug: string, tableId: string, date: string): string {
  return `${venueHref(slug)}/rezerviraj?${new URLSearchParams({ [TABLE_PARAM]: tableId, [DATE_PARAM]: date }).toString()}`;
}

export function reservationHref(slug: string, code: string): string {
  return `${venueHref(slug)}/r/${encodeURIComponent(code)}`;
}

/** Apsolutni URL iz zaglavlja zahtjeva (za QR potvrde). */
export function absoluteUrl(headers: { get(name: string): string | null }, path: string): string {
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000";
  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}${path}`;
}
