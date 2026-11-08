import { z } from "zod";
import { REGIONS } from "./membership";

const PHONE_RE = /^\+?[0-9][0-9\s\-()]{6,19}$/;
const CTRL = /[\u0000-\u001f]/g;
const clean = (v: unknown) => (typeof v === "string" ? v.replace(CTRL, " ").trim() : "");
const req = (label: string, min: number, max: number) =>
  z.preprocess(clean, z.string().min(min, `Enter ${label}.`).max(max, `${label} is too long.`));

export const eventRegistrationSchema = z.object({
  event_id: z.coerce.number().int().positive(),
  name: req("your full name", 2, 120),
  phone: z.preprocess(clean, z.string().regex(PHONE_RE, "Enter a valid phone number.")),
  email: z.preprocess((v) => clean(v).toLowerCase(), z.string().email("Enter a valid email address.").max(254)),
  region: z.preprocess(clean, z.enum(REGIONS.map((r) => r[0]) as [string, ...string[]], { message: "Choose your province." })),
  place: req("your place", 2, 120),
  website: z.preprocess(clean, z.string().max(0)).optional(), // honeypot: real people leave it empty
});
export type EventRegistration = z.infer<typeof eventRegistrationSchema>;
