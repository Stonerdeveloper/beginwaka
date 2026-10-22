import { NextResponse } from "next/server";
import { findBooking, savePendingBooking } from "@/lib/bookings";
import { getBookingDetails } from "@/lib/calendly";
import { initializePayment } from "@/lib/paystack";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { eventUri, inviteeUri } = (await request.json()) as { eventUri?: string; inviteeUri?: string };
    if (typeof eventUri !== "string" || typeof inviteeUri !== "string") return NextResponse.json({ message: "Missing Calendly booking details." }, { status: 400 });
    const existing = await findBooking(eventUri);
    if (existing?.payment_status === "paid") return NextResponse.json({ message: "This consultation has already been paid for." }, { status: 409 });
    const booking = await getBookingDetails(eventUri, inviteeUri);
    const reference = `bw_${crypto.randomUUID().replaceAll("-", "")}`;
    const payment = await initializePayment({ ...booking, reference });
    await savePendingBooking({ calendly_event_uri: booking.eventUri, calendly_invitee_uri: booking.inviteeUri, invitee_email: booking.email, paystack_reference: reference });
    return NextResponse.json(payment);
  } catch (error) {
    console.error("Payment initialization failed", error);
    return NextResponse.json({ message: "Unable to start secure payment." }, { status: 500 });
  }
}
