import { config } from "./config";

type CalendlyResource = Record<string, unknown>;

function validCalendlyUri(value: string, expectedPath: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "api.calendly.com" || !url.pathname.startsWith(expectedPath)) throw new Error("Invalid Calendly booking reference.");
  return url.toString();
}

async function getResource(uri: string): Promise<CalendlyResource> {
  const response = await fetch(uri, { headers: { Authorization: `Bearer ${config.calendlyToken()}` }, cache: "no-store" });
  if (!response.ok) throw new Error("We could not verify the Calendly booking.");
  const body = (await response.json()) as { resource?: CalendlyResource };
  return body.resource ?? body;
}

export async function getBookingDetails(eventUri: string, inviteeUri: string) {
  const verifiedEventUri = validCalendlyUri(eventUri, "/scheduled_events/");
  const verifiedInviteeUri = validCalendlyUri(inviteeUri, "/scheduled_events/");
  const [event, invitee] = await Promise.all([getResource(verifiedEventUri), getResource(verifiedInviteeUri)]);
  void event;
  const email = invitee.email;
  if (typeof email !== "string" || !email.includes("@")) throw new Error("Calendly did not provide an invitee email address.");
  return { eventUri: verifiedEventUri, inviteeUri: verifiedInviteeUri, email };
}

export async function cancelBooking(eventUri: string) {
  const verifiedEventUri = validCalendlyUri(eventUri, "/scheduled_events/");
  const response = await fetch(`${verifiedEventUri}/cancellation`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.calendlyToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "Payment was not completed before the reservation expired." }),
  });
  if (!response.ok && response.status !== 404) throw new Error("Calendly cancellation failed.");
}
