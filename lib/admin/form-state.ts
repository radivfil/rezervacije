import type messages from "../../messages/hr.json";
import type { BookingErrorKey } from "../reservations/form-state";

type AdminMessages = (typeof messages)["admin"];

export type LoginErrorKey = keyof AdminMessages["errors"];
export interface LoginFormState {
  error: LoginErrorKey | null;
  retryMinutes: number;
}
export const INITIAL_LOGIN_STATE: LoginFormState = { error: null, retryMinutes: 0 };

export type StaffActionKind = keyof AdminMessages["actions"]["done"];
export type StaffActionErrorKey = keyof AdminMessages["actionErrors"];
export interface StaffActionState {
  error: StaffActionErrorKey | null;
  done: StaffActionKind | null;
}
export const INITIAL_STAFF_ACTION_STATE: StaffActionState = { error: null, done: null };

export type ManualField = "partySize" | "guestName" | "guestPhone" | "kind";
export interface ManualReservationState {
  error: BookingErrorKey | "unauthorized" | null;
  fields: ManualField[];
  createdCode: string | null;
}
export const INITIAL_MANUAL_STATE: ManualReservationState = { error: null, fields: [], createdCode: null };

export interface CodeLookupState {
  error: "code_not_found" | null;
}
export const INITIAL_CODE_LOOKUP_STATE: CodeLookupState = { error: null };

/** "abcd 2345" ili "ABCD-2345" -> "ABCD2345". */
export function normalizeCodeInput(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "");
}
