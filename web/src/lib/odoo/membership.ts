import "server-only";
import type { MembershipApplication } from "@/lib/validation/membership";
import { odooPost } from "./client";

/** Map validated form values to the Odoo API contract (explicit allowlist, no spreading). */
export function toOdooPayload(v: MembershipApplication) {
  return {
    category: v.category, full_name: v.full_name, gender: v.gender, date_of_birth: v.date_of_birth,
    nationality: v.nationality, mobile: v.mobile, whatsapp: v.whatsapp, email: v.email,
    blood_group: v.blood_group, qualification: v.qualification, occupation: v.occupation,
    organization: v.organization, ksa_region: v.ksa_region, ksa_city: v.ksa_city,
    iqama_number: v.iqama_number, passport_number: v.passport_number,
    india_state: v.india_state, india_district: v.india_district, india_village: v.india_village,
    india_pin: v.india_pin, india_address: v.india_address,
    ksa_emergency_name: v.ksa_emergency_name, ksa_emergency_relationship: v.ksa_emergency_relationship,
    ksa_emergency_phone: v.ksa_emergency_phone, india_emergency_name: v.india_emergency_name,
    india_emergency_relationship: v.india_emergency_relationship, india_emergency_phone: v.india_emergency_phone,
    why_join: v.why_join, consent: v.consent, photo: v.photo || undefined,
  };
}

export async function createMembershipApplication(v: MembershipApplication, idempotencyKey: string) {
  const { data } = await odooPost<{ ok: boolean; reference?: string }>(
    "/api/disha/membership-application",
    toOdooPayload(v),
    { "Idempotency-Key": idempotencyKey },
  );
  if (!data.ok || !data.reference) throw new Error("unexpected_odoo_response");
  return data.reference;
}
