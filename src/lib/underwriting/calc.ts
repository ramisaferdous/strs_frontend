import { parseNumber } from "./percent";
import type { WorkspaceValues } from "./schema";

/**
 * Client-side mirror of the API's formulas. It powers the live preview while the trainee types; the API remains the
 * source of truth and recomputes everything on save/submit.
 *
 * Every output is `number | null`: null means "not enough valid input yet".
 */

export type ScenarioKey = "low" | "mid" | "high";

export interface ScenarioCalc {
  revenue: number | null;
  operatingExpenses: number | null;
  coHostFee: number | null;
  noi: number | null;
  freeCashFlow: number | null;
  cashOnCash: number | null; // fraction
  totalReCash: number | null; // fraction
  firstYearTotalReturn: number | null; // dollars: FCF + tax savings
}

export interface Computed {
  downPayment: number | null;
  loanAmount: number | null;
  closingCosts: number | null;
  optimizationTotal: number;
  totalOutOfPocket: number | null;
  monthlyOpex: number;
  monthlyPayment: number | null;
  annualDebtService: number | null;
  principalPayDown: number | null;
  appreciation: number | null;
  taxSavings: number | null;
  improvementBasis: number | null;
  prr: number | null;
  scenarios: Record<ScenarioKey, ScenarioCalc>;
}

const OPEX_MULTIPLIER: Record<ScenarioKey, number> = { low: 0.96, mid: 1, high: 1.04 };

const ok = (n: number) => Number.isFinite(n);
const pct = (text: string) => parseNumber(text) / 100;
const val = (n: number): number | null => (ok(n) ? n : null);

export function monthlyPayment(loan: number, annualRate: number, years: number): number | null {
  const n = years * 12;
  if (!ok(loan) || !ok(annualRate) || !ok(n) || n <= 0) return null;
  if (loan <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return loan / n;
  const growth = Math.pow(1 + r, n);
  return (loan * r * growth) / (growth - 1);
}

export function yearOnePrincipalPayDown(loan: number, annualRate: number, payment: number): number {
  const r = annualRate / 12;
  let balance = loan;
  let paid = 0;
  for (let i = 0; i < 12; i++) {
    const principal = payment - balance * r;
    paid += principal;
    balance -= principal;
  }
  return paid;
}

export function compute(values: WorkspaceValues): Computed {
  const price = parseNumber(values.purchasePrice);
  const down = pct(values.downPaymentPct);
  const closing = pct(values.closingCostsPct);
  const rate = pct(values.interestRate);
  const years = parseNumber(values.mortgageYears);

  const optimizationTotal = values.optimization.reduce((sum, r) => sum + (val(parseNumber(r.amount)) ?? 0), 0);
  const monthlyOpex = values.opex.reduce((sum, r) => sum + (val(parseNumber(r.monthly)) ?? 0), 0);

  const downPayment = val(price * down);
  const loanAmount = ok(price) && ok(down) ? price - price * down : null;
  const closingCosts = val(price * closing);
  const totalOutOfPocket =
    downPayment != null && closingCosts != null ? downPayment + closingCosts + optimizationTotal : null;

  const payment = loanAmount != null ? monthlyPayment(loanAmount, rate, years) : null;
  const annualDebtService = payment != null ? payment * 12 : null;
  const principalPayDown =
    loanAmount != null && payment != null && loanAmount > 0 ? yearOnePrincipalPayDown(loanAmount, rate, payment) : payment === 0 ? 0 : null;
  const appreciation = val(price * pct(values.appreciationPct));

  const landPct = pct(values.landPct);
  const improvementBasis = ok(price) && ok(landPct) ? price * (1 - landPct) + optimizationTotal : null;
  const sla = improvementBasis != null ? improvementBasis * pct(values.slaPct) : null;
  const y1Loss = sla != null ? sla * pct(values.bonusPct) : null;
  const taxSavings = y1Loss != null ? val(y1Loss * pct(values.taxRatePct)) : null;

  const coHostPct = pct(values.coHostingFeePct);
  const revenueText: Record<ScenarioKey, string> = {
    low: values.lowRevenue,
    mid: values.midRevenue,
    high: values.highRevenue,
  };

  const scenarios = {} as Record<ScenarioKey, ScenarioCalc>;
  for (const key of ["low", "mid", "high"] as const) {
    const revenue = val(parseNumber(revenueText[key]));
    const operatingExpenses = monthlyOpex * 12 * OPEX_MULTIPLIER[key];
    const coHostFee = revenue != null && ok(coHostPct) ? revenue * coHostPct : revenue != null ? 0 : null;
    const noi = revenue != null && coHostFee != null ? revenue - operatingExpenses - coHostFee : null;
    const freeCashFlow = noi != null && annualDebtService != null ? noi - annualDebtService : null;
    const oop = totalOutOfPocket != null && totalOutOfPocket > 0 ? totalOutOfPocket : null;
    scenarios[key] = {
      revenue,
      operatingExpenses,
      coHostFee,
      noi,
      freeCashFlow,
      cashOnCash: freeCashFlow != null && oop != null ? freeCashFlow / oop : null,
      totalReCash:
        freeCashFlow != null && oop != null && principalPayDown != null && appreciation != null
          ? (freeCashFlow + principalPayDown + appreciation) / oop
          : null,
      firstYearTotalReturn: freeCashFlow != null && taxSavings != null ? freeCashFlow + taxSavings : null,
    };
  }

  const midRevenue = scenarios.mid.revenue;
  return {
    downPayment,
    loanAmount,
    closingCosts,
    optimizationTotal,
    totalOutOfPocket,
    monthlyOpex,
    monthlyPayment: payment,
    annualDebtService,
    principalPayDown,
    appreciation,
    taxSavings,
    improvementBasis,
    prr: midRevenue != null && ok(price) && price > 0 ? midRevenue / price : null,
    scenarios,
  };
}
