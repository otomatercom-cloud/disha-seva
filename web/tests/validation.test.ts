import { describe, expect, it } from "vitest";
import { membershipSchema, submissionSchema } from "@/lib/validation/membership";

const valid = {
  category: "general", full_name: "Asha Nair", gender: "female", date_of_birth: "1992-04-12", nationality: "Indian",
  mobile: "+966501234567", whatsapp: "", email: "asha@example.com", blood_group: "O+",
  ksa_region: "central", ksa_city: "Riyadh", passport_number: "P1234567",
  india_state: "Kerala", india_district: "Thrissur", india_village: "Irinjalakuda", india_pin: "680121",
  india_address: "Nair House, Irinjalakada P.O.",
  ksa_emergency_name: "Ravi Nair", ksa_emergency_relationship: "Brother", ksa_emergency_phone: "+966500000001",
  india_emergency_name: "Lakshmi Nair", india_emergency_relationship: "Mother", india_emergency_phone: "+919847000001",
  consent: true,
};

describe("membership application schema", () => {
  it("accepts a complete application and trims/lowercases", () => {
    const r = membershipSchema.parse({ ...valid, email: "  Asha@Example.COM ", full_name: "  Asha Nair " });
    expect(r.email).toBe("asha@example.com");
    expect(r.full_name).toBe("Asha Nair");
  });

  it.each(["full_name", "gender", "date_of_birth", "mobile", "email", "ksa_city", "passport_number", "india_pin",
    "india_address", "ksa_emergency_phone", "india_emergency_name"])("requires %s", (field) => {
    expect(membershipSchema.safeParse({ ...valid, [field]: "" }).success).toBe(false);
  });

  it("requires consent to be literally true", () => {
    expect(membershipSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
    expect(membershipSchema.safeParse({ ...valid, consent: "true" }).success).toBe(false);
  });

  it.each(["abc", "12", "+966-abc-123"])("rejects invalid phone %s", (mobile) => {
    expect(membershipSchema.safeParse({ ...valid, mobile }).success).toBe(false);
  });

  it.each(["12345", "0123456", "ABCDEF"])("rejects invalid PIN %s", (india_pin) => {
    expect(membershipSchema.safeParse({ ...valid, india_pin }).success).toBe(false);
  });

  it("accepts only General or Associate and known blood groups", () => {
    expect(membershipSchema.safeParse({ ...valid, category: "associate" }).success).toBe(true);
    expect(membershipSchema.safeParse({ ...valid, category: "vip" }).success).toBe(false);
    expect(membershipSchema.safeParse({ ...valid, blood_group: "" }).success).toBe(true);
    expect(membershipSchema.safeParse({ ...valid, blood_group: "Z+" }).success).toBe(false);
  });

  it("accepts only the known provinces", () => {
    expect(membershipSchema.safeParse({ ...valid, ksa_region: "eastern" }).success).toBe(true);
    for (const bad of ["Central", "mars", ""]) {
      expect(membershipSchema.safeParse({ ...valid, ksa_region: bad }).success).toBe(false);
    }
  });

  it("rejects future and malformed birth dates", () => {
    expect(membershipSchema.safeParse({ ...valid, date_of_birth: "2999-01-01" }).success).toBe(false);
    expect(membershipSchema.safeParse({ ...valid, date_of_birth: "12/04/1990" }).success).toBe(false);
  });

  it("strips unknown keys (no mass assignment)", () => {
    const r = membershipSchema.parse({ ...valid, state: "approved", id: 1 });
    expect(r).not.toHaveProperty("state");
    expect(r).not.toHaveProperty("id");
  });

  it("enforces length limits", () => {
    expect(membershipSchema.safeParse({ ...valid, why_join: "x".repeat(1001) }).success).toBe(false);
  });

  it("honeypot must stay empty", () => {
    expect(submissionSchema.safeParse({ ...valid, website: "http://spam" }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...valid, website: "" }).success).toBe(true);
  });

  it("photo accepts empty and jpeg data URL only", () => {
    expect(membershipSchema.safeParse(valid).success).toBe(true);
    expect(membershipSchema.safeParse({ ...valid, photo: "data:image/jpeg;base64,/9j/4AAQ" }).success).toBe(true);
    expect(membershipSchema.safeParse({ ...valid, photo: "data:text/html;base64,PHNjcmlwdD4=" }).success).toBe(false);
    expect(membershipSchema.safeParse({ ...valid, photo: "javascript:alert(1)" }).success).toBe(false);
  });
});
