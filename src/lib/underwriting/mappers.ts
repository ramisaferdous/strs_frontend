import type { SavePayload, Underwriting } from "@/lib/api/types";
import { DEAL_TAGS, emptyTags } from "./tags";
import { checkNumber, FIELD_SPECS, initialValues, LINE_ITEM_SPEC, type NumberFieldKey, type WorkspaceValues } from "./schema";
import { fractionToPct, moneyToText, pctToFraction, textToMoney } from "./percent";

const valid = (values: WorkspaceValues, keys: NumberFieldKey[]) =>
  keys.every((k) => checkNumber(values[k], FIELD_SPECS[k]) === null);

/**
 * Form -> API. Sections are included only when complete and valid, because the
 * API rejects a half-filled purchase/forecast/tax section with a 422. Partial
 * work stays in the form and is flagged in the UI instead of failing the save.
 */
export function toPayload(v: WorkspaceValues): SavePayload {
  const payload: SavePayload = {};

  if (valid(v, ["purchasePrice", "downPaymentPct", "interestRate", "mortgageYears", "closingCostsPct"])) {
    payload.purchase_details = {
      purchase_price: textToMoney(v.purchasePrice),
      down_payment_pct: pctToFraction(v.downPaymentPct),
      interest_rate: pctToFraction(v.interestRate),
      mortgage_years: Number(v.mortgageYears),
      closing_costs_pct: pctToFraction(v.closingCostsPct),
    };
  }

  if (valid(v, ["lowRevenue", "midRevenue", "highRevenue", "coHostingFeePct", "appreciationPct"])) {
    payload.forecasted_revenue = {
      co_hosting_fee_pct: pctToFraction(v.coHostingFeePct),
      annual_re_appreciation_pct: pctToFraction(v.appreciationPct),
      scenarios: {
        low: { forecasted_revenue: textToMoney(v.lowRevenue) },
        mid: { forecasted_revenue: textToMoney(v.midRevenue) },
        high: { forecasted_revenue: textToMoney(v.highRevenue) },
      },
    };
  }

  if (valid(v, ["landPct", "slaPct", "bonusPct", "taxRatePct"])) {
    payload.taxes = {
      land_assumptions_pct: pctToFraction(v.landPct),
      sla_multiplier_pct: pctToFraction(v.slaPct),
      bonus_amount_pct: pctToFraction(v.bonusPct),
      tax_rate_pct: pctToFraction(v.taxRatePct),
    };
  }

  payload.optimization_items = v.optimization
    .filter((r) => r.category.trim() && checkNumber(r.amount, LINE_ITEM_SPEC) === null)
    .map((r) => ({ category: r.category.trim(), total_price: textToMoney(r.amount) }));

  payload.operating_expenses = v.opex
    .filter((r) => r.name.trim() && checkNumber(r.monthly, LINE_ITEM_SPEC) === null)
    .map((r) => ({ expense_name: r.name.trim(), monthly_amount: textToMoney(r.monthly) }));

  payload.tags = { ...v.tags };
  return payload;
}

/** API -> form. Anything the server hasn't stored yet falls back to the defaults. */
export function fromUnderwriting(uw: Underwriting): WorkspaceValues {
  const base = initialValues(moneyToText(uw.purchase_price));
  const pd = uw.detail?.purchase_details;
  const fr = uw.detail?.forecasted_revenue;
  const taxes = uw.taxes;

  const tags = emptyTags();
  for (const t of DEAL_TAGS) tags[t.key] = uw[t.key] === true;

  return {
    ...base,
    purchasePrice: pd?.purchase_price != null ? moneyToText(pd.purchase_price) : base.purchasePrice,
    downPaymentPct: pd?.down_payment_pct != null ? fractionToPct(pd.down_payment_pct) : base.downPaymentPct,
    interestRate: pd?.interest_rate != null ? fractionToPct(pd.interest_rate) : base.interestRate,
    mortgageYears: pd?.mortgage_years != null ? String(pd.mortgage_years) : base.mortgageYears,
    closingCostsPct: pd?.closing_costs_pct != null ? fractionToPct(pd.closing_costs_pct) : base.closingCostsPct,
    landPct: taxes?.land_assumptions_pct != null ? fractionToPct(taxes.land_assumptions_pct) : base.landPct,
    slaPct: taxes?.sla_multiplier_pct != null ? fractionToPct(taxes.sla_multiplier_pct) : base.slaPct,
    bonusPct: taxes?.bonus_amount_pct != null ? fractionToPct(taxes.bonus_amount_pct) : base.bonusPct,
    taxRatePct: taxes?.tax_rate_pct != null ? fractionToPct(taxes.tax_rate_pct) : base.taxRatePct,
    lowRevenue: moneyToText(fr?.scenarios?.low?.forecasted_revenue),
    midRevenue: moneyToText(fr?.scenarios?.mid?.forecasted_revenue),
    highRevenue: moneyToText(fr?.scenarios?.high?.forecasted_revenue),
    coHostingFeePct: fr?.co_hosting_fee_pct != null ? fractionToPct(fr.co_hosting_fee_pct) : base.coHostingFeePct,
    appreciationPct: fr?.annual_re_appreciation_pct != null ? fractionToPct(fr.annual_re_appreciation_pct) : base.appreciationPct,
    optimization: uw.optimization_items.map((i) => ({ category: i.category ?? "", amount: moneyToText(i.total_price) })),
    opex: uw.operating_expenses.map((e) => ({ name: e.expense_name ?? "", monthly: moneyToText(e.monthly_amount) })),
    tags,
  };
}
