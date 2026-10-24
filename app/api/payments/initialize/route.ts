import { NextResponse } from "next/server";
import { initializePayment } from "@/lib/paystack";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { eventUri, inviteeUri, email } = (await request.json()) as { eventUri?: string; inviteeUri?: string; email?: string };
    
    // For inline checkout, we might not have Calendly URIs yet
    // Generate a reference
    const reference = `bw_${crypto.randomUUID().replaceAll("-", "")}`;
    
    // Use provided email or a default
    const customerEmail = email || "customer@example.com";
    
    const payment = await initializePayment({ 
      email: customerEmail, 
      reference,
      eventUri: eventUri || "pending"
    });
    
    return NextResponse.json(payment);
  } catch (error) {
    console.error("Payment initialization failed", error);
    return NextResponse.json({ message: "Unable to start secure payment." }, { status: 500 });
  }
}
