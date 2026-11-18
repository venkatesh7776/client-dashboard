// One Zod schema per entity — used by the form (instant feedback) and the server action.
import { z } from "zod";
import { CLIENT_STATUSES, LEAD_SOURCES, PAYMENT_MODES, PRIORITIES, PROJECT_STATUSES, SECTOR_KEYS } from "./constants";
import { todayIST } from "./dates";

const blankToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const optText = (max = 5000) =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : blankToNull(v)),
    z.string().max(max, `Keep it under ${max} characters`).nullable(),
  );

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
const optDate = z.preprocess(blankToNull, isoDate.nullable());

const optMoney = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z.number({ error: "Enter a number" }).min(0, "Must be 0 or more").nullable(),
);

const optEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(blankToNull, z.enum(values).nullable());

const PHONE_RE = /^(\d{10}|\+\d{7,15})$/;

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Client name is required").max(120, "Keep it under 120 characters"),
  contact_person: optText(120),
  phone: optText(20).refine((v) => !v || PHONE_RE.test(v.replace(/[\s-]/g, "")), {
    message: "Enter a 10-digit mobile, or a number with +country code",
  }),
  email: optText(200).refine((v) => !v || z.email().safeParse(v).success, { message: "Enter a valid email" }),
  source: optEnum(LEAD_SOURCES),
  status: z.enum(CLIENT_STATUSES),
  expected_value: optMoney,
  follow_up_date: optDate,
  lost_reason: optText(500),
  notes: optText(),
});

export const projectSchema = z
  .object({
    client_id: z.string().min(1, "Select a client"),
    name: z.string().trim().min(1, "Project name is required").max(120, "Keep it under 120 characters"),
    start_date: optDate,
    deadline: optDate,
    priority: z.enum(PRIORITIES),
    status: z.enum(PROJECT_STATUSES),
    value: optMoney,
    notes: optText(20000),
  })
  .refine((p) => !p.deadline || !p.start_date || p.deadline >= p.start_date, {
    path: ["deadline"],
    message: "Deadline can't be before the start date",
  });

export const paymentSchema = z.object({
  client_id: z.string().min(1, "Select a client"),
  amount: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/,/g, "").trim() : v),
    z
      .union([z.string(), z.number()])
      .refine((v) => String(v) !== "" && /^\d+(\.\d{1,2})?$/.test(String(v)), "Enter an amount with up to 2 decimals")
      .transform(Number)
      .refine((n) => n > 0, "Amount must be more than 0"),
  ),
  payment_date: isoDate.refine((d) => d <= todayIST(), "Payment date can't be in the future"),
  mode: optEnum(PAYMENT_MODES),
  notes: optText(500),
});

export const todoSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Keep it under 200 characters"),
  due_date: optDate,
  priority: optEnum(PRIORITIES),
  project_id: z.preprocess(blankToNull, z.string().nullable()),
  notes: optText(),
  is_done: z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean()),
});

/** Rupee amount with up to 2 decimals; commas allowed. `blankAsZero` turns an empty box into 0. */
const money = (blankAsZero = false) =>
  z.preprocess(
    (v) => {
      const s = typeof v === "string" ? v.replace(/,/g, "").trim() : v;
      return blankAsZero && (s === "" || s === undefined || s === null) ? "0" : s;
    },
    z
      .union([z.string(), z.number()])
      .refine((v) => String(v) !== "", "Enter the amount")
      .refine((v) => String(v) === "" || /^\d+(\.\d{1,2})?$/.test(String(v)), "Enter an amount with up to 2 decimals")
      .transform(Number),
  );

export const budgetSchema = z
  .object({
    month: z.string().regex(/^\d{4}-\d{2}-01$/, "Pick a month"),
    total: money().refine((n) => n > 0, "Main budget must be more than 0"),
    personal: money(true),
    ads: money(true),
    physical: money(true),
    digital: money(true),
  })
  .refine((b) => b.personal + b.ads + b.physical + b.digital <= b.total + 0.005, {
    path: ["total"],
    message: "The four sectors add up to more than the main budget",
  });

export const expenseSchema = z.object({
  amount: money().refine((n) => n > 0, "Amount must be more than 0"),
  category: z.enum(SECTOR_KEYS, { error: "Pick a sector" }),
  purpose: z.string().trim().min(1, "What was it for?").max(200, "Keep it under 200 characters"),
  spent_on: isoDate.refine((d) => d <= todayIST(), "Date can't be in the future"),
});

export type FieldErrors = Record<string, string | undefined>;

export function parseForm<S extends z.ZodType>(
  schema: S,
  input: unknown,
): { ok: true; data: z.output<S> } | { ok: false; errors: FieldErrors } {
  const r = schema.safeParse(input);
  if (r.success) return { ok: true, data: r.data };
  const errors: FieldErrors = {};
  for (const issue of r.error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}
