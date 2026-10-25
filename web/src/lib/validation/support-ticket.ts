import { z } from "zod";

export const CATEGORIES = [
  ["visa", "Visa"], ["iqama", "Iqama / Residency"], ["passport", "Passport / Consular"],
  ["labour", "Employer / Wages / Labour"], ["medical", "Medical"], ["education", "Education"],
  ["legal", "Legal"], ["travel", "Travel / Tickets"], ["emergency", "Emergency / Distress"], ["other", "Other"],
] as const;
export const URGENCY = [
  ["low", "Not urgent"], ["normal", "Normal"], ["high", "Urgent (within a day or two)"], ["emergency", "Emergency (needs help now)"],
] as const;

// eslint-disable-next-line no-control-regex
const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const clean = (v: unknown) => (typeof v === "string" ? v.replace(CTRL, "").trim() : (v ?? ""));
const text = (max: number, required = false) =>
  z.preprocess(clean, required ? z.string().min(1, "This field is required").max(max, `Maximum ${max} characters`) : z.string().max(max, `Maximum ${max} characters`));

export const TOKEN_RE = /^[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}$/;

export const supportTicketSchema = z.object({
  requester_name: text(120, true),
  email: z.preprocess((v) => String(clean(v)).toLowerCase(), z.string().min(1, "This field is required").max(254).email("Enter a valid email address")),
  mobile: z.preprocess(clean, z.string().regex(/^\+?[0-9][0-9\s\-()]{6,19}$/, "Enter a valid phone number")),
  city: text(80),
  category: z.preprocess(clean, z.enum(CATEGORIES.map(([k]) => k) as [string, ...string[]], { errorMap: () => ({ message: "Choose a category" }) })),
  urgency: z.preprocess(clean, z.enum(URGENCY.map(([k]) => k) as [string, ...string[]], { errorMap: () => ({ message: "Choose how urgent this is" }) })),
  subject: text(150, true),
  description: text(4000, true),
  consent: z.literal(true, { errorMap: () => ({ message: "Please confirm that we may contact you about this request" }) }),
});
export const supportSubmissionSchema = supportTicketSchema.extend({ website: z.string().max(0).optional() });
export type SupportTicketInput = z.input<typeof supportTicketSchema>;
export type SupportTicket = z.output<typeof supportTicketSchema>;

export const tokenSchema = z.object({ token: z.preprocess(clean, z.string().regex(TOKEN_RE, "Enter your token like ABCD-EFGH-JKMN")) });
export const replySchema = tokenSchema.extend({ message: text(4000, true) });

export type TicketView = {
  reference: string; subject: string; category: string; status: string; status_code: string; priority: string;
  created: string; updated: string; description: string; can_reply: boolean;
  messages: { author: string; body: string; date: string }[];
};
