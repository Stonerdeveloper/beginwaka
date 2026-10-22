import { NextResponse } from "next/server";
import { expiredPendingBookings, markExpired } from "@/lib/bookings";
import { cancelBooking } from "@/lib/calendly";
import { config } from "@/lib/config";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${config.cronSecret()}`) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  const bookings = await expiredPendingBookings();
  let cancelled = 0;
  for (const booking of bookings) {
    try { await cancelBooking(booking.calendly_event_uri); await markExpired(booking.calendly_event_uri); cancelled += 1; }
    catch (error) { console.error("Expiry cancellation failed", booking.calendly_event_uri, error); }
  }
  return NextResponse.json({ checked: bookings.length, cancelled });
}
