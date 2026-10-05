import { describe, expect, it } from "vitest";
import { compute } from "./calc";
import { toPayload } from "./mappers";
import { initialValues, validateWorkspace, type WorkspaceValues } from "./schema";

/**
 * Parity check: the app's own form-to-API mapper and live calculator, run
 * against the REAL backend for several input sets, comparing every number the
 * UI previews with what the API calculates.
 *
 *   API_PARITY=1 npm run test:parity        (backend must be up on :8000)
 *
 * Opt-in because each case creates a draft underwriting in the real database.
 * Reseed afterwards (`python -m scripts.seed --reset`) to clear the drafts, or
 * the dashboard will show them as "in progress".
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const ZPID = "52345678";

// The API rounds money to cents and fractions to 4 decimal places.
const CENTS = 0.011;
const FRACTION = 0.00011;

const base = initialValues("540000");
const withRevenue = (v: Partial<WorkspaceValues>): WorkspaceValues => ({
  ...base,
  lowRevenue: "70000",
  midRevenue: "90000",
  highRevenue: "110000",
  ...v,
});

const CASES: { name: string; values: WorkspaceValues }[] = [
  {
    name: "baseline: one setup item, one expense",
    values: withRevenue({
      purchasePrice: "675000", downPaymentPct: "20", interestRate: "7", mortgageYears: "30", closingCostsPct: "3", appreciationPct: "3",
      optimization: [{ category: "Furniture", amount: "50000" }],
      opex: [{ name: "Utilities", monthly: "500" }],
      lowRevenue: "100000", midRevenue: "120000", highRevenue: "140000",
    }),
  },
  {
    name: "no optimization items and no operating expenses",
    values: withRevenue({ downPaymentPct: "20", interestRate: "6.5", mortgageYears: "30", closingCostsPct: "3" }),
  },
  {
    name: "0% interest rate (no amortization formula)",
    values: withRevenue({ downPaymentPct: "25", interestRate: "0", mortgageYears: "20", closingCostsPct: "2", opex: [{ name: "Utilities", monthly: "400" }] }),
  },
  {
    name: "co-host fee, custom taxes, several line items, fractional rate, 15-year loan",
    values: withRevenue({
      downPaymentPct: "25", interestRate: "6.375", mortgageYears: "15", closingCostsPct: "2",
      coHostingFeePct: "15", appreciationPct: "4.5", landPct: "15", slaPct: "30", bonusPct: "80", taxRatePct: "32",
      optimization: [{ category: "Hot tub", amount: "12000" }, { category: "Game room", amount: "8500.50" }],
      opex: [{ name: "Utilities", monthly: "450" }, { name: "Insurance", monthly: "300.25" }, { name: "Internet", monthly: "90" }],
    }),
  },
  {
    name: "price override (offer below listing) with a tiny down payment",
    values: withRevenue({ purchasePrice: "499999.99", downPaymentPct: "3.5", interestRate: "7.875", mortgageYears: "30", closingCostsPct: "4", opex: [{ name: "Supplies", monthly: "125" }] }),
  },
  {
    name: "zero tax assumptions and zero appreciation",
    values: withRevenue({
      downPaymentPct: "30", interestRate: "5", mortgageYears: "30", closingCostsPct: "1", appreciationPct: "0",
      landPct: "0", slaPct: "0", bonusPct: "0", taxRatePct: "0", opex: [{ name: "Utilities", monthly: "500" }],
    }),
  },
  {
    name: "all-cash purchase (100% down, no loan)",
    values: withRevenue({ downPaymentPct: "100", interestRate: "7", mortgageYears: "30", closingCostsPct: "2", opex: [{ name: "Utilities", monthly: "500" }] }),
  },
  {
    name: "losing money: expenses exceed revenue",
    values: withRevenue({
      downPaymentPct: "20", interestRate: "8", mortgageYears: "30", closingCostsPct: "3",
      opex: [{ name: "Everything", monthly: "9000" }], lowRevenue: "40000", midRevenue: "60000", highRevenue: "80000",
    }),
  },
];

const reachable = process.env.API_PARITY
  ? await fetch(`${API}/api/health`).then((r) => r.ok).catch(() => false)
  : false;

const num = (s: unknown) => Number(s);

describe.skipIf(!process.env.API_PARITY || !reachable)("live preview matches the real API", () => {
  for (const c of CASES) {
    it(c.name, async () => {
      // The inputs must themselves be valid, or we'd be testing the wrong thing.
      expect(validateWorkspace(c.values)).toEqual([]);

      const start = await fetch(`${API}/api/underwritings`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ zpid: ZPID }) });
      const uw = (await start.json()) as { id: number };

      // The payload goes through the app's real mapper (whole % -> fractions).
      const res = await fetch(`${API}/api/underwritings/${uw.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(toPayload(c.values)) });
      expect(res.status, await res.clone().text()).toBe(200);
      const api = await res.json();
      const mine = compute(c.values);

      expect(mine.totalOutOfPocket).toBeCloseTo(num(api.total_oop), 2);
      expect(mine.loanAmount).toBeCloseTo(num(api.detail.purchase_details.loan_amount), 2);
      expect(mine.downPayment).toBeCloseTo(num(api.detail.purchase_details.down_payment_amount), 2);
      expect(mine.closingCosts).toBeCloseTo(num(api.detail.purchase_details.closing_costs_amount), 2);
      expect(Math.abs((mine.taxSavings ?? NaN) - num(api.taxes.tax_savings))).toBeLessThan(CENTS);
      expect(Math.abs((mine.improvementBasis ?? NaN) - num(api.taxes.improvement_basis))).toBeLessThan(CENTS);
      expect(Math.abs((mine.prr ?? NaN) - num(api.prr))).toBeLessThan(FRACTION);

      for (const k of ["low", "mid", "high"] as const) {
        const a = api.detail.forecasted_revenue.scenarios[k];
        const m = mine.scenarios[k];
        const label = `${c.name} / ${k}`;
        expect(Math.abs((m.operatingExpenses ?? NaN) - num(a.operating_expenses_annual)), `${label} opex`).toBeLessThan(CENTS);
        expect(Math.abs((m.coHostFee ?? NaN) - num(a.co_hosting_fee)), `${label} co-host fee`).toBeLessThan(CENTS);
        expect(Math.abs((m.noi ?? NaN) - num(a.net_operating_income)), `${label} NOI`).toBeLessThan(CENTS);
        expect(Math.abs((m.freeCashFlow ?? NaN) - num(a.annual_free_cash_flow)), `${label} free cash flow`).toBeLessThan(CENTS);
        expect(Math.abs((mine.annualDebtService ?? NaN) - num(a.debt_service_annual)), `${label} debt service`).toBeLessThan(CENTS);
        expect(Math.abs((mine.principalPayDown ?? NaN) - num(a.principal_pay_down)), `${label} principal pay-down`).toBeLessThan(CENTS);
        expect(Math.abs((mine.appreciation ?? NaN) - num(a.annual_re_appreciation)), `${label} appreciation`).toBeLessThan(CENTS);
        expect(Math.abs((m.cashOnCash ?? NaN) - num(a.cash_on_cash_pct)), `${label} cash-on-cash`).toBeLessThan(FRACTION);
        expect(Math.abs((m.totalReCash ?? NaN) - num(a.annual_total_re_return_pct)), `${label} total RE return`).toBeLessThan(FRACTION);

        // First-year total return (free cash flow + tax savings) as a share of cash in.
        const y1 = num(api.detail.y1_coc_incl_tax_savings[`${k}_pct`]);
        const mineY1 = (m.firstYearTotalReturn ?? NaN) / (mine.totalOutOfPocket ?? NaN);
        expect(Math.abs(mineY1 - y1), `${label} first-year return`).toBeLessThan(FRACTION);
      }
    });
  }
});
