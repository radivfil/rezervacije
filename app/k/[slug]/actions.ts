"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { IsoDateSchema, PaymentResultSchema, ReservationCodeSchema } from "@/lib/domain/schemas";
import type { BookingFormState, PaymentFormState } from "@/lib/reservations/form-state";
import { reservationHref, venueDateHref, venueHref } from "@/lib/routes";
import { abandonReservation, createReservation, payReservation } from "@/lib/services/reservations";

const text = (formData: FormData, name: string): string => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

/** Gost stvara držanje stola; validacija i pravila su u servisnom sloju. */
export async function createReservationAction(
  slug: string,
  _previous: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const result = await createReservation(slug, {
    tableId: text(formData, "tableId"),
    date: text(formData, "date"),
    partySize: text(formData, "partySize"),
    guestName: text(formData, "guestName"),
    guestPhone: text(formData, "guestPhone"),
  });
  if (!result.ok) {
    return result.error === "invalid" ? { error: null, fields: result.fields } : { error: result.error, fields: [] };
  }
  revalidatePath(venueHref(slug));
  redirect(reservationHref(slug, result.code));
}

/** Demo plaćanje akontacije. */
export async function payReservationAction(
  slug: string,
  code: string,
  _previous: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const parsedCode = ReservationCodeSchema.safeParse(code);
  const outcome = PaymentResultSchema.safeParse(text(formData, "outcome"));
  if (!parsedCode.success || !outcome.success) redirect(venueHref(slug));

  const result = await payReservation(slug, parsedCode.data, outcome.data);
  if (result.ok && result.reservation.status === "held") return { error: "payment_failed" };
  if (!result.ok && result.error === "not_found") redirect(venueHref(slug));
  revalidatePath(venueHref(slug));
  redirect(reservationHref(slug, parsedCode.data));
}

/** Gost odustaje od držanja i vraća se na tlocrt. */
export async function abandonReservationAction(slug: string, code: string, date: string): Promise<void> {
  const parsedCode = ReservationCodeSchema.safeParse(code);
  if (parsedCode.success) await abandonReservation(slug, parsedCode.data);
  revalidatePath(venueHref(slug));
  const parsedDate = IsoDateSchema.safeParse(date);
  redirect(parsedDate.success ? venueDateHref(venueHref(slug), parsedDate.data) : venueHref(slug));
}
