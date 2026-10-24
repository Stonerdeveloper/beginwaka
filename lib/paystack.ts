import { config } from "./config";

type InitializedPayment = { data?: { access_code?: string; authorization_url?: string } };

export async function initializePayment(input: { email: string; reference: string; eventUri?: string }) {
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.paystackSecretKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ 
      email: input.email, 
      amount: config.paystackAmount(), 
      currency: config.paystackCurrency(), 
      reference: input.reference, 
      callback_url: `${config.appUrl()}/payment/complete`, 
      metadata: input.eventUri ? { calendly_event_uri: input.eventUri } : {}
    }),
    cache: "no-store",
  });
  const body = (await response.json()) as InitializedPayment;
  if (!response.ok || !body.data?.authorization_url) throw new Error("Paystack could not start the payment.");
  return { authorizationUrl: body.data.authorization_url, accessCode: body.data.access_code };
}

export async function verifyPayment(reference: string) {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${config.paystackSecretKey()}` }, cache: "no-store" });
  if (!response.ok) throw new Error("Paystack verification failed.");
  return (await response.json()) as { data?: { status?: string; amount?: number; currency?: string } };
}
