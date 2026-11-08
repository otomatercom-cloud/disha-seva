import "server-only";
import type { EventRegistration } from "@/lib/validation/event-registration";
import { odooPost } from "./client";

export async function registerForEvent(v: EventRegistration) {
  const { data } = await odooPost<{ ok: boolean; reference?: string }>("/api/disha/event-registration", {
    event_id: v.event_id, name: v.name, phone: v.phone, email: v.email, region: v.region, place: v.place,
  });
  if (!data.ok || !data.reference) throw new Error("unexpected_odoo_response");
  return data.reference;
}
