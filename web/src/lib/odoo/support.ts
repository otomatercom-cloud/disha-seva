import "server-only";
import type { SupportTicket, TicketView } from "@/lib/validation/support-ticket";
import { odooPost } from "./client";

/** Explicit allowlist, no spreading. */
export function toTicketPayload(v: SupportTicket) {
  return {
    requester_name: v.requester_name, email: v.email, mobile: v.mobile, city: v.city, category: v.category,
    urgency: v.urgency, subject: v.subject, description: v.description, consent: v.consent,
  };
}

export async function createTicket(v: SupportTicket, idempotencyKey: string) {
  const { data } = await odooPost<{ ok: boolean; reference?: string; token?: string | null; priority?: string }>(
    "/api/disha/support/ticket", toTicketPayload(v), { "Idempotency-Key": idempotencyKey });
  if (!data.ok || !data.reference) throw new Error("unexpected_odoo_response");
  return { reference: data.reference, token: data.token ?? null, priority: data.priority ?? null };
}

export async function lookupTicket(token: string) {
  const { data } = await odooPost<{ ok: boolean; ticket?: TicketView }>("/api/disha/support/ticket/lookup", { token });
  if (!data.ok || !data.ticket) throw new Error("unexpected_odoo_response");
  return data.ticket;
}

export async function replyTicket(token: string, message: string) {
  const { data } = await odooPost<{ ok: boolean; ticket?: TicketView }>("/api/disha/support/ticket/reply", { token, message });
  if (!data.ok || !data.ticket) throw new Error("unexpected_odoo_response");
  return data.ticket;
}
