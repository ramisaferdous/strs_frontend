import { z } from "zod";
import type { FieldErrors, Resolver } from "react-hook-form";
import { emptyTags, type TagValues } from "./tags";
import { parseNumber } from "./percent";
import { compute } from "./calc";

/**
 * Form state keeps every number as the text the trainee typed. That keeps
 * "blank" and "invalid" distinguishable from "0", and avoids NaN in inputs.
 * Percentages are whole numbers here (20 = 20%); see percent.ts for the API side.
 */
export interface WorkspaceValues {
  // Financials: purchase & financing
  purchasePrice: string;
  downPaymentPct: string;
  interestRate: string;
  mortgageYears: string;
  closingCostsPct: string;
  // Financials: lists
  optimization: { category: string; amount: string }[];
  opex: { name: string; monthly: string }[];
  // Financials: taxes
  landPct: string;
  slaPct: string;
  bonusPct: string;
  taxRatePct: string;
  // Analysis
  lowRevenue: string;
  midRevenue: string;
  highRevenue: string;
  coHostingFeePct: string;
  appreciationPct: string;
  // Deal tags
  tags: TagValues;
}

export type SectionId = "financials" | "analysis" | "tags";

export const SECTIONS: { id: SectionId; label: string; blurb: string }[] = [
  { id: "financials", label: "Financials", blurb: "What the deal costs" },
  { id: "analysis", label: "Analysis", blurb: "What the deal earns" },
  { id: "tags", label: "Deal Tags", blurb: "The deal at a glance" },
];

export const emptyRow = {
  optimization: () => ({ category: "", amount: "" }),
  opex: () => ({ name: "", monthly: "" }),
};

/** Taxes are prefilled with the values most training deals use. */
export function initialValues(purchasePrice: string): WorkspaceValues {
  return {
    purchasePrice,
    downPaymentPct: "",
    interestRate: "",
    mortgageYears: "",
    closingCostsPct: "",
    optimization: [],
    opex: [],
    landPct: "20",
    slaPct: "25",
    bonusPct: "60",
    taxRatePct: "37",
    lowRevenue: "",
    midRevenue: "",
    highRevenue: "",
    coHostingFeePct: "0",
    appreciationPct: "3",
    tags: emptyTags(),
  };
}

// ------------------------------------------------------------------ fields --

interface NumSpec {
  label: string;
  min?: number;
  max?: number;
  /** Strictly greater than this value. */
  gt?: number;
  integer?: boolean;
  /** Format limits as dollars in messages. */
  money?: boolean;
}

/**
 * Upper limits keep every value the API stores inside its columns: money is
 * NUMERIC(12,2) (under $10B), so a larger value makes the API fail with a 500.
 */
const PRICE_MAX = 100_000_000;
const REVENUE_MAX = 100_000_000;
export const LINE_ITEM_SPEC: NumSpec = { label: "Amount", min: 0, max: 10_000_000, money: true };

export type NumberFieldKey =
  | "purchasePrice"
  | "downPaymentPct"
  | "interestRate"
  | "mortgageYears"
  | "closingCostsPct"
  | "landPct"
  | "slaPct"
  | "bonusPct"
  | "taxRatePct"
  | "lowRevenue"
  | "midRevenue"
  | "highRevenue"
  | "coHostingFeePct"
  | "appreciationPct";

export const FIELD_SPECS: Record<NumberFieldKey, NumSpec> = {
  purchasePrice: { label: "Purchase price", gt: 0, max: PRICE_MAX, money: true },
  downPaymentPct: { label: "Down payment %", min: 0, max: 100 },
  interestRate: { label: "Interest rate %", min: 0, max: 100 },
  mortgageYears: { label: "Loan term (years)", gt: 0, max: 50, integer: true },
  closingCostsPct: { label: "Closing costs %", min: 0, max: 100 },
  landPct: { label: "Land %", min: 0, max: 100 },
  slaPct: { label: "Short-life asset multiplier %", min: 0, max: 100 },
  bonusPct: { label: "Bonus depreciation %", min: 0, max: 100 },
  taxRatePct: { label: "Tax rate %", min: 0, max: 100 },
  lowRevenue: { label: "Low revenue", min: 0, max: REVENUE_MAX, money: true },
  midRevenue: { label: "Mid revenue", min: 0, max: REVENUE_MAX, money: true },
  highRevenue: { label: "High revenue", min: 0, max: REVENUE_MAX, money: true },
  coHostingFeePct: { label: "Co-hosting fee %", min: 0, max: 100 },
  appreciationPct: { label: "Annual appreciation %", min: 0, max: 100 },
};

const SECTION_OF_FIELD: Record<string, SectionId> = {
  purchasePrice: "financials",
  downPaymentPct: "financials",
  interestRate: "financials",
  mortgageYears: "financials",
  closingCostsPct: "financials",
  optimization: "financials",
  opex: "financials",
  landPct: "financials",
  slaPct: "financials",
  bonusPct: "financials",
  taxRatePct: "financials",
  lowRevenue: "analysis",
  midRevenue: "analysis",
  highRevenue: "analysis",
  coHostingFeePct: "analysis",
  appreciationPct: "analysis",
  tags: "tags",
};

const ROW_LABELS: Record<string, [string, Record<string, string>]> = {
  optimization: ["Optimization item", { category: "Category", amount: "Amount" }],
  opex: ["Operating expense", { name: "Name", monthly: "Monthly amount" }],
};

/** RHF field names that belong to each section, for scoped `trigger()` calls. */
export const SECTION_FIELDS: Record<SectionId, (keyof WorkspaceValues)[]> = {
  financials: ["purchasePrice", "downPaymentPct", "interestRate", "mortgageYears", "closingCostsPct", "optimization", "opex", "landPct", "slaPct", "bonusPct", "taxRatePct"],
  analysis: ["lowRevenue", "midRevenue", "highRevenue", "coHostingFeePct", "appreciationPct"],
  tags: [],
};

/**
 * Cross-field rules attach their error to one field, but RHF only re-validates
 * the field being edited. Leaving a field here re-checks these dependents too.
 */
export const FIELD_DEPS: Partial<Record<NumberFieldKey, NumberFieldKey[]>> = {
  lowRevenue: ["midRevenue", "highRevenue"],
  midRevenue: ["lowRevenue", "highRevenue"],
  highRevenue: ["lowRevenue", "midRevenue"],
  purchasePrice: ["downPaymentPct"],
  closingCostsPct: ["downPaymentPct"],
};

export function labelFor(path: string): string {
  const [head, index, leaf] = path.split(".");
  if (head && head in FIELD_SPECS) return FIELD_SPECS[head as NumberFieldKey].label;
  const row = head ? ROW_LABELS[head] : undefined;
  if (row && index != null) return `${row[0]} ${Number(index) + 1}${leaf ? ` · ${row[1][leaf] ?? leaf}` : ""}`;
  return path;
}

export function sectionOf(path: string): SectionId {
  return SECTION_OF_FIELD[path.split(".")[0] ?? ""] ?? "financials";
}

// -------------------------------------------------------------- validation --

/** Returns an error message, or null when the text is a valid number for the spec. */
export function checkNumber(text: string, spec: NumSpec): string | null {
  if (text.trim() === "") return "Required";
  const n = parseNumber(text);
  if (!Number.isFinite(n)) return "Enter a number";
  if (spec.integer && !Number.isInteger(n)) return "Use a whole number";
  if (spec.gt != null && n <= spec.gt) return `Must be greater than ${spec.gt}`;
  if (spec.min != null && n < spec.min) return spec.max != null ? `Must be between ${spec.min} and ${spec.max}` : `Can't be below ${spec.min}`;
  if (spec.max != null && n > spec.max) {
    if (spec.money) return `Can't exceed $${spec.max.toLocaleString("en-US")}`;
    return spec.min != null ? `Must be between ${spec.min} and ${spec.max}` : `Can't exceed ${spec.max}`;
  }
  return null;
}

/** NUMERIC(6,4) columns (PRR, OOP ÷ price, Cash-on-Cash) hold fractions below 100, i.e. 10,000%. */
const RATIO_LIMIT = 99.9999;
const MONEY_LIMIT = 9_999_999_999.99;

/**
 * Calculated values the API would fail to store, even though every input is
 * individually valid. Saving is blocked while any of these are present.
 */
export function storageIssues(values: WorkspaceValues): { path: NumberFieldKey; message: string }[] {
  const c = compute(values);
  const price = parseNumber(values.purchasePrice);
  const out: { path: NumberFieldKey; message: string }[] = [];
  const oop = c.totalOutOfPocket;
  if (oop != null && oop > MONEY_LIMIT) {
    out.push({ path: "purchasePrice", message: "Total out of pocket is too large to save. Check the price and setup costs" });
  } else if (oop != null && price > 0 && oop / price > RATIO_LIMIT) {
    out.push({ path: "purchasePrice", message: "Total out of pocket is over 100× the price. Check the price and setup costs" });
  }
  if (c.prr != null && c.prr > RATIO_LIMIT) {
    out.push({ path: "midRevenue", message: "Mid revenue is over 100× the purchase price. Check both numbers" });
  }
  const scenarios = Object.values(c.scenarios);
  if (scenarios.some((s) => s.cashOnCash != null && Math.abs(s.cashOnCash) > RATIO_LIMIT)) {
    out.push({ path: "downPaymentPct", message: "Cash-on-Cash would pass 10,000%. Out of pocket is too small for this revenue" });
  }
  return out;
}

const numberText = (spec: NumSpec) =>
  z.string().superRefine((text, ctx) => {
    const message = checkNumber(text, spec);
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  });

const moneyRow = <K extends string, L extends string>(textKey: K, amountKey: L, textLabel: string, amountLabel: string) =>
  z
    .object({ [textKey]: z.string(), [amountKey]: z.string() } as Record<K | L, z.ZodString>)
    .superRefine((row, ctx) => {
      const text = (row[textKey] ?? "").trim();
      const amount = (row[amountKey] ?? "").trim();
      if (!text && !amount) return; // blank rows are ignored
      if (!text) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [textKey], message: `${textLabel} is required` });
      const msg = checkNumber(amount, { ...LINE_ITEM_SPEC, label: amountLabel });
      if (msg) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [amountKey], message: msg });
    });

const field = (key: NumberFieldKey) => numberText(FIELD_SPECS[key]);

export const workspaceSchema = z
  .object({
    purchasePrice: field("purchasePrice"),
    downPaymentPct: field("downPaymentPct"),
    interestRate: field("interestRate"),
    mortgageYears: field("mortgageYears"),
    closingCostsPct: field("closingCostsPct"),
    landPct: field("landPct"),
    slaPct: field("slaPct"),
    bonusPct: field("bonusPct"),
    taxRatePct: field("taxRatePct"),
    lowRevenue: field("lowRevenue"),
    midRevenue: field("midRevenue"),
    highRevenue: field("highRevenue"),
    coHostingFeePct: field("coHostingFeePct"),
    appreciationPct: field("appreciationPct"),
    optimization: z.array(moneyRow("category", "amount", "Category", "Amount")),
    opex: z.array(moneyRow("name", "monthly", "Name", "Monthly amount")),
    tags: z.record(z.boolean()),
  })
  .superRefine((v, ctx) => {
    const low = parseNumber(v.lowRevenue);
    const mid = parseNumber(v.midRevenue);
    const high = parseNumber(v.highRevenue);
    if (Number.isFinite(low) && Number.isFinite(mid) && low > mid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lowRevenue"], message: "Low can't be above Mid" });
    }
    if (Number.isFinite(mid) && Number.isFinite(high) && mid > high) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["highRevenue"], message: "High can't be below Mid" });
    }
    // The API refuses a deal with no cash going in.
    const price = parseNumber(v.purchasePrice);
    const down = parseNumber(v.downPaymentPct);
    const closing = parseNumber(v.closingCostsPct);
    if ([price, down, closing].every(Number.isFinite) && price > 0) {
      const optimization = v.optimization.reduce((s, r) => s + (Number.isFinite(parseNumber(r.amount)) ? parseNumber(r.amount) : 0), 0);
      if ((price * (down + closing)) / 100 + optimization <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["downPaymentPct"],
          message: "Total out of pocket must be above $0",
        });
      }
    }
    for (const issue of storageIssues(v as WorkspaceValues)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [issue.path], message: issue.message });
    }
  });

export interface Issue {
  path: string;
  section: SectionId;
  label: string;
  message: string;
}

export function validateWorkspace(values: WorkspaceValues): Issue[] {
  const result = workspaceSchema.safeParse(values);
  if (result.success) return [];
  return result.error.issues.map((i) => {
    const path = i.path.join(".");
    return { path, section: sectionOf(path), label: labelFor(path), message: i.message };
  });
}

export const issuesBySection = (issues: Issue[]) =>
  SECTIONS.reduce(
    (acc, s) => ({ ...acc, [s.id]: issues.filter((i) => i.section === s.id) }),
    {} as Record<SectionId, Issue[]>,
  );

// ----------------------------------------------------- react-hook-form glue --

function setIn(target: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split(".");
  let node: Record<string, unknown> = target;
  keys.forEach((key, i) => {
    const last = i === keys.length - 1;
    if (last) {
      node[key] = value;
      return;
    }
    if (node[key] == null) node[key] = /^\d+$/.test(keys[i + 1] ?? "") ? [] : {};
    node = node[key] as Record<string, unknown>;
  });
}

/** One validation source for the form, the stepper badges and the review screen. */
export const workspaceResolver: Resolver<WorkspaceValues> = async (values) => {
  const issues = validateWorkspace(values);
  if (issues.length === 0) return { values, errors: {} };
  const errors: Record<string, unknown> = {};
  // Keep the first message per field: field-level rules come before cross-field ones and are more specific.
  const seen = new Set<string>();
  for (const issue of issues) {
    if (seen.has(issue.path)) continue;
    seen.add(issue.path);
    setIn(errors, issue.path, { type: "validation", message: issue.message });
  }
  return { values: {}, errors: errors as FieldErrors<WorkspaceValues> };
};
