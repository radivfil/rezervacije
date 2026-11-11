/** Naziv URL parametra za odabrani datum termina (?datum=YYYY-MM-DD). */
export const DATE_PARAM = "datum";

export function venueDateHref(pathname: string, date: string): string {
  return `${pathname}?${new URLSearchParams({ [DATE_PARAM]: date }).toString()}`;
}
