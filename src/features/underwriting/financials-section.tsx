"use client";

import { useWatch, useFormContext } from "react-hook-form";
import { compute } from "@/lib/underwriting/calc";
import { money } from "@/lib/underwriting/format";
import type { WorkspaceValues } from "@/lib/underwriting/schema";
import { LineItems, NumberField, Readout, SectionCard } from "./fields";

export function FinancialsSection() {
  const { control } = useFormContext<WorkspaceValues>();
  const values = useWatch({ control }) as WorkspaceValues;
  const c = compute(values);

  return (
    <div className="space-y-5">
      <SectionCard
        id="purchase"
        title="Purchase & financing"
        description="Works out the loan, the monthly mortgage and the cash needed at closing."
        feeds="Feeds Total Out of Pocket"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField name="purchasePrice" prefix="$" hint="Prefilled from the listing. Change it if you'd offer less." />
          <NumberField name="downPaymentPct" suffix="%" placeholder="e.g. 20" />
          <NumberField name="interestRate" suffix="%" placeholder="e.g. 7" />
          <NumberField name="mortgageYears" suffix="yrs" placeholder="e.g. 30" />
          <NumberField name="closingCostsPct" suffix="%" placeholder="e.g. 3" />
        </div>
        <dl className="grid gap-x-8 divide-y rounded-lg border bg-muted/40 px-4 py-1 sm:grid-cols-2 sm:divide-y-0">
          <div className="divide-y">
            <Readout label="Down payment" value={money(c.downPayment)} />
            <Readout label="Closing costs" value={money(c.closingCosts)} />
          </div>
          <div className="divide-y border-t sm:border-t-0">
            <Readout label="Loan amount" value={money(c.loanAmount)} />
            <Readout label="Monthly mortgage" value={money(c.monthlyPayment, { cents: true })} />
          </div>
        </dl>
      </SectionCard>

      <SectionCard
        id="optimization"
        title="Optimization list"
        description="One-time setup costs before the first guest arrives, like furniture, a hot tub or a game room."
        feeds="Feeds Total Out of Pocket"
      >
        <LineItems
          name="optimization"
          textKey="category"
          amountKey="amount"
          itemLabel="Optimization item"
          textLabel="Category"
          amountLabel="Amount"
          suggestions={["Furniture", "Hot tub", "Game room"]}
          total={c.optimizationTotal}
          totalLabel="Total setup spend"
        />
      </SectionCard>

      <SectionCard
        id="opex"
        title="Operating expenses"
        description="Recurring monthly costs taken out of revenue every year. The Low and High scenarios nudge this by ×0.96 and ×1.04."
        feeds="Feeds Annual Free Cash Flow"
      >
        <LineItems
          name="opex"
          textKey="name"
          amountKey="monthly"
          itemLabel="Operating expense"
          textLabel="Name"
          amountLabel="Monthly amount"
          suggestions={["Utilities", "Internet", "Insurance", "Property tax", "Supplies", "Software"]}
          total={c.monthlyOpex}
          totalLabel="Total per month"
        />
        <p className="text-right text-xs text-muted-foreground tabular">{money(c.monthlyOpex * 12)} per year at the Mid scenario</p>
      </SectionCard>

      <SectionCard
        id="taxes"
        title="Taxes"
        description="Estimates first-year tax savings from depreciation. Most training deals use 20%, 25%, 60% and 37%."
        feeds="Adds to First Year Total Return"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField name="landPct" suffix="%" />
          <NumberField name="slaPct" suffix="%" />
          <NumberField name="bonusPct" suffix="%" />
          <NumberField name="taxRatePct" suffix="%" />
        </div>
        <dl className="divide-y rounded-lg border bg-muted/40 px-4 py-1">
          <Readout label="Depreciable improvement basis" value={money(c.improvementBasis)} />
          <Readout label="Estimated first-year tax savings" value={money(c.taxSavings)} strong />
        </dl>
      </SectionCard>
    </div>
  );
}
