import { describe, expect, it } from "vitest";
import { compute } from "./calc";
import { fromUnderwriting, toPayload } from "./mappers";
import { fractionToPct, moneyToText, parseNumber, pctToFraction, textToMoney } from "./percent";
import { initialValues, validateWorkspace, type WorkspaceValues } from "./schema";
import type { Underwriting } from "@/lib/api/types";


const filled = (): WorkspaceValues => ({
  ...initialValues("675000"),
  downPaymentPct: "20",
  interestRate: "7",
  mortgageYears: "30",
  closingCostsPct: "3",
  optimization: [{ category: "Furniture", amount: "50000" }],
  opex: [{ name: "Utilities", monthly: "500" }],
  lowRevenue: "100000",
  midRevenue: "120000",
  highRevenue: "140000",
});

describe("percent conversion", () => {
  it("round-trips fractions and whole percentages", () => {
    expect(pctToFraction("20")).toBe("0.2");
    expect(pctToFraction("7.25")).toBe("0.0725");
    expect(pctToFraction("0")).toBe("0");
    expect(fractionToPct("0.0725")).toBe("7.25");
    expect(fractionToPct("0.2000")).toBe("20");
    expect(fractionToPct(null)).toBe("");
  });
  it("tolerates $ , % and spaces in typed numbers", () => {
    expect(parseNumber("$1,250.50")).toBe(1250.5);
    expect(parseNumber("7%")).toBe(7);
    expect(parseNumber("  ")).toBeNaN();
    expect(textToMoney("$120,000")).toBe("120000");
    expect(moneyToText("100000.00")).toBe("100000");
  });
});

describe("compute() matches the API", () => {
  const c = compute(filled());
  it("financing and out-of-pocket", () => {
    expect(c.loanAmount).toBeCloseTo(540000, 2);
    expect(c.totalOutOfPocket).toBeCloseTo(205250, 2);
    expect(c.annualDebtService).toBeCloseTo(43111.6, 1);
    expect(c.principalPayDown).toBeCloseTo(5485.37, 1);
  });
  it("tax chain", () => {
    expect(c.improvementBasis).toBeCloseTo(590000, 2);
    expect(c.taxSavings).toBeCloseTo(32745, 2);
  });
  it("scenario returns", () => {
    expect(c.scenarios.mid.noi).toBeCloseTo(114000, 2);
    expect(c.scenarios.mid.freeCashFlow).toBeCloseTo(70888.4, 1);
    expect(c.scenarios.low.operatingExpenses).toBeCloseTo(5760, 2);
    expect(c.scenarios.high.operatingExpenses).toBeCloseTo(6240, 2);
    expect(c.scenarios.low.cashOnCash).toBeCloseTo(0.2491, 3);
    expect(c.scenarios.mid.cashOnCash).toBeCloseTo(0.3454, 3);
    expect(c.scenarios.high.cashOnCash).toBeCloseTo(0.4416, 3);
    expect(c.scenarios.mid.totalReCash).toBeCloseTo(0.4708, 3);
    expect(c.prr).toBeCloseTo(0.1778, 3);
  });
  it("handles a 0% interest rate without dividing by zero", () => {
    const zero = compute({ ...filled(), interestRate: "0" });
    expect(zero.monthlyPayment).toBeCloseTo(540000 / 360, 4);
  });
  it("returns nulls, not NaN, for incomplete input", () => {
    const empty = compute(initialValues("675000"));
    expect(empty.totalOutOfPocket).toBeNull();
    expect(empty.scenarios.mid.cashOnCash).toBeNull();
  });
});

describe("validation", () => {
  it("accepts a complete form", () => {
    expect(validateWorkspace(filled())).toEqual([]);
  });
  it("flags required fields on an empty form", () => {
    const paths = validateWorkspace(initialValues("675000")).map((i) => i.path);
    expect(paths).toEqual(
      expect.arrayContaining(["downPaymentPct", "interestRate", "mortgageYears", "closingCostsPct", "lowRevenue", "midRevenue", "highRevenue"]),
    );
  });
  it("rejects out-of-range and non-numeric values", () => {
    const issues = validateWorkspace({ ...filled(), downPaymentPct: "150", interestRate: "abc", mortgageYears: "2.5" });
    const by = Object.fromEntries(issues.map((i) => [i.path, i.message]));
    expect(by.downPaymentPct).toMatch(/between 0 and 100/);
    expect(by.interestRate).toBe("Enter a number");
    expect(by.mortgageYears).toBe("Use a whole number");
  });
  it("enforces Low <= Mid <= High", () => {
    const issues = validateWorkspace({ ...filled(), lowRevenue: "130000" });
    expect(issues.map((i) => i.path)).toContain("lowRevenue");
  });
  it("flags half-filled line items but ignores blank ones", () => {
    const issues = validateWorkspace({
      ...filled(),
      opex: [{ name: "Internet", monthly: "" }, { name: "", monthly: "" }],
    });
    expect(issues.map((i) => i.path)).toEqual(["opex.0.monthly"]);
  });
  it("rejects a deal with zero cash going in", () => {
    const issues = validateWorkspace({ ...filled(), downPaymentPct: "0", closingCostsPct: "0", optimization: [] });
    expect(issues.map((i) => i.path)).toContain("downPaymentPct");
  });
});

describe("toPayload()", () => {
  it("sends fractions to the API", () => {
    const p = toPayload(filled());
    expect(p.purchase_details).toEqual({
      purchase_price: "675000",
      down_payment_pct: "0.2",
      interest_rate: "0.07",
      mortgage_years: 30,
      closing_costs_pct: "0.03",
    });
    expect(p.forecasted_revenue?.scenarios.mid.forecasted_revenue).toBe("120000");
    expect(p.taxes?.tax_rate_pct).toBe("0.37");
    expect(p.optimization_items).toEqual([{ category: "Furniture", total_price: "50000" }]);
  });
  it("omits incomplete sections instead of triggering a 422", () => {
    const p = toPayload({ ...filled(), interestRate: "", midRevenue: "" });
    expect(p.purchase_details).toBeUndefined();
    expect(p.forecasted_revenue).toBeUndefined();
    expect(p.taxes).toBeDefined();
  });
  it("skips half-filled rows", () => {
    const p = toPayload({ ...filled(), opex: [{ name: "Utilities", monthly: "500" }, { name: "Oops", monthly: "" }] });
    expect(p.operating_expenses).toEqual([{ expense_name: "Utilities", monthly_amount: "500" }]);
  });
});

describe("fromUnderwriting()", () => {
  it("hydrates a saved draft back into whole percentages", () => {
    const uw = {
      id: 7,
      purchase_price: "675000.00",
      turnkey: true,
      detail: {
        purchase_details: { purchase_price: "675000", down_payment_pct: "0.20", interest_rate: "0.07", mortgage_years: 30, closing_costs_pct: "0.03" },
        forecasted_revenue: {
          co_hosting_fee_pct: "0",
          annual_re_appreciation_pct: "0.03",
          scenarios: { low: { forecasted_revenue: "100000.00" }, mid: { forecasted_revenue: "120000.00" }, high: { forecasted_revenue: "140000.00" } },
        },
      },
      taxes: { land_assumptions_pct: "0.2000", sla_multiplier_pct: "0.2500", bonus_amount_pct: "0.6000", tax_rate_pct: "0.3700" },
      optimization_items: [{ id: 1, category: "Furniture", total_price: "50000.00" }],
      operating_expenses: [{ id: 1, expense_name: "Utilities", monthly_amount: "500.00" }],
    } as unknown as Underwriting;
    const v = fromUnderwriting(uw);
    expect(v).toMatchObject({ downPaymentPct: "20", interestRate: "7", midRevenue: "120000", landPct: "20", appreciationPct: "3" });
    expect(v.tags.turnkey).toBe(true);
    expect(validateWorkspace(v)).toEqual([]);
  });
  it("falls back to defaults for a fresh draft", () => {
    const v = fromUnderwriting({ id: 1, purchase_price: "675000.00", detail: null, taxes: null, optimization_items: [], operating_expenses: [] } as unknown as Underwriting);
    expect(v.purchasePrice).toBe("675000");
    expect(v.landPct).toBe("20");
    expect(v.downPaymentPct).toBe("");
  });
});
