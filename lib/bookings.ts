import { config } from "./config";

export type Booking = {
  calendly_event_uri: string;
  calendly_invitee_uri: string;
  invitee_email: string;
  paystack_reference: string;
  payment_status: "pending_payment" | "paid" | "expired";
  expires_at: string;
};

function headers(prefer?: string) {
  return { apikey: config.supabaseKey(), Authorization: `Bearer ${config.supabaseKey()}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) };
}

export async function findBooking(eventUri: string) {
  const response = await fetch(`${config.supabaseUrl()}/rest/v1/consultation_bookings?calendly_event_uri=eq.${encodeURIComponent(eventUri)}&select=*`, { headers: headers(), cache: "no-store" });
  if (!response.ok) throw new Error("Could not retrieve booking status.");
  return ((await response.json()) as Booking[])[0] ?? null;
}

export async function savePendingBooking(input: Omit<Booking, "payment_status" | "expires_at">) {
  const expiresAt = new Date(Date.now() + config.paymentDeadlineMinutes() * 60_000).toISOString();
  const response = await fetch(`${config.supabaseUrl()}/rest/v1/consultation_bookings?on_conflict=calendly_event_uri`, {
    method: "POST", headers: headers("resolution=merge-duplicates,return=representation"),
    body: JSON.stringify({ ...input, payment_status: "pending_payment", expires_at: expiresAt }), cache: "no-store",
  });
  if (!response.ok) throw new Error("Could not save booking status.");
}

export async function markPaid(reference: string) {
  const response = await fetch(`${config.supabaseUrl()}/rest/v1/consultation_bookings?paystack_reference=eq.${encodeURIComponent(reference)}`, {
    method: "PATCH", headers: headers("return=minimal"), body: JSON.stringify({ payment_status: "paid", paid_at: new Date().toISOString() }), cache: "no-store",
  });
  if (!response.ok) throw new Error("Could not mark payment as paid.");
}

export async function expiredPendingBookings() {
  const now = encodeURIComponent(new Date().toISOString());
  const response = await fetch(`${config.supabaseUrl()}/rest/v1/consultation_bookings?payment_status=eq.pending_payment&expires_at=lte.${now}&select=*`, { headers: headers(), cache: "no-store" });
  if (!response.ok) throw new Error("Could not retrieve expired bookings.");
  return (await response.json()) as Booking[];
}

export async function markExpired(eventUri: string) {
  const response = await fetch(`${config.supabaseUrl()}/rest/v1/consultation_bookings?calendly_event_uri=eq.${encodeURIComponent(eventUri)}`, {
    method: "PATCH", headers: headers("return=minimal"), body: JSON.stringify({ payment_status: "expired" }), cache: "no-store",
  });
  if (!response.ok) throw new Error("Could not mark booking as expired.");
}
