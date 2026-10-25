import { z } from "zod";

export const CATEGORIES = [["general", "General"], ["associate", "Associate"]] as const;
export const GENDERS = [["male", "Male"], ["female", "Female"], ["other", "Other"]] as const;
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => [g, g] as const);
const PHONE_RE = /^\+?[0-9][0-9\s\-()]{6,19}$/;
const CTRL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g;

// Missing/null optional fields are treated as empty strings.
const clean = (v: unknown) => (typeof v === "string" ? v.replace(CTRL_RE, "").trim() : (v ?? ""));

const text = (max: number) => z.preprocess(clean, z.string().max(max, `Maximum ${max} characters`));
const requiredText = (max: number) =>
  z.preprocess(clean, z.string().min(1, "This field is required").max(max, `Maximum ${max} characters`));
const optionalPhone = z.preprocess(
  clean,
  z.string().refine((v) => v === "" || PHONE_RE.test(v), "Enter a valid phone number"),
);
const requiredPhone = z.preprocess(
  clean,
  z.string().min(1, "This field is required").regex(PHONE_RE, "Enter a valid phone number"),
);
const requiredChoice = <T extends readonly (readonly [string, string])[]>(options: T) =>
  z.preprocess(
    clean,
    z.string().min(1, "This field is required").refine((v) => options.some(([k]) => k === v), "Invalid choice"),
  );
const oneOf = <T extends readonly (readonly [string, string])[]>(options: T) =>
  z.preprocess(
    clean,
    z.string().refine((v) => v === "" || options.some(([k]) => k === v), "Invalid choice"),
  );

export const membershipSchema = z.object({
  category: requiredChoice(CATEGORIES),
  full_name: requiredText(120),
  gender: requiredChoice(GENDERS),
  date_of_birth: z.preprocess(
    clean,
    z.string().min(1, "This field is required").refine((v) => {
      const d = new Date(v);
      return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(d.getTime()) && d < new Date() &&
        d.getFullYear() > new Date().getFullYear() - 110;
    }, "Enter a valid date of birth"),
  ),
  nationality: requiredText(80),
  mobile: requiredPhone,
  whatsapp: optionalPhone,
  email: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(CTRL_RE, "").trim().toLowerCase() : (v ?? "")),
    z.string().min(1, "This field is required").max(254).email("Enter a valid email address"),
  ),
  blood_group: oneOf(BLOOD_GROUPS),
  qualification: text(120),
  occupation: text(120),
  organization: text(120),
  ksa_region: requiredText(80),
  ksa_city: requiredText(80),
  iqama_number: text(20),
  passport_number: requiredText(20),
  india_state: requiredText(80),
  india_district: requiredText(80),
  india_village: requiredText(120),
  india_pin: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/\s/g, "") : (v ?? "")),
    z.string().min(1, "This field is required").regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit PIN code"),
  ),
  india_address: requiredText(500),
  ksa_emergency_name: requiredText(120),
  ksa_emergency_relationship: requiredText(80),
  ksa_emergency_phone: requiredPhone,
  india_emergency_name: requiredText(120),
  india_emergency_relationship: requiredText(80),
  india_emergency_phone: requiredPhone,
  why_join: text(1000),
  photo: z.string().max(560_000).regex(/^(data:image\/jpeg;base64,[A-Za-z0-9+/=]+)?$/, "Invalid photo").default(""),
  consent: z.literal(true, { errorMap: () => ({ message: "You must accept the declaration to apply" }) }),
});

/** Submitted body = form values + honeypot (must stay empty). */
export const submissionSchema = membershipSchema.extend({
  website: z.string().max(0).optional(),
});

export type MembershipApplicationInput = z.input<typeof membershipSchema>;
export type MembershipApplication = z.output<typeof membershipSchema>;
