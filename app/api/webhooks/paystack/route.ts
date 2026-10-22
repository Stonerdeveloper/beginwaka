import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { markPaid } from "@/lib/bookings";
import { config } from "@/lib/config";
import { verifyPayment } from "@/lib/paystack";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  const expected = createHmac("sha512", config.paystackSecretKey()).update(rawBody).digest("hex");
  if (!signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return NextResponse.json({ message: "Invalid webhook signature." }, { status: 401 });
  const payload = JSON.parse(rawBody) as { event?: string; data?: { reference?: string } };
  if (payload.event !== "charge.success" || !payload.data?.reference) return NextResponse.json({ received: true });
  try {
    const payment = (await verifyPayment(payload.data.reference)).data;
    if (payment?.status !== "success" || payment.amount !== config.paystackAmount() || payment.currency !== config.paystackCurrency()) return NextResponse.json({ message: "Payment did not pass verification." }, { status: 400 });
    await markPaid(payload.data.reference);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paystack webhook failed", error);
    return NextResponse.json({ message: "Webhook processing failed." }, { status: 500 });
  }
}
