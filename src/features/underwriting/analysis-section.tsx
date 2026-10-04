"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { compute, type ScenarioKey } from "@/lib/underwriting/calc";
import { money, percent, ratio } from "@/lib/underwriting/format";
import type { WorkspaceValues } from "@/lib/underwriting/schema";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NumberField, SectionCard } from "./fields";

const COLUMNS: { key: ScenarioKey; label: string }[] = [
  { key: "low", label: "Low" },
  { key: "mid", label: "Mid" },
  { key: "high", label: "High" },
];

export function AnalysisSection() {
  const { control } = useFormContext<WorkspaceValues>();
  const values = useWatch({ control }) as WorkspaceValues;
  const c = compute(values);

  const rows: { label: string; hint?: string; get: (k: ScenarioKey) => string; strong?: boolean }[] = [
    { label: "Revenue", get: (k) => money(c.scenarios[k].revenue) },
    { label: "Operating expenses", hint: "Annual, with the ×0.96 / ×1.04 nudge", get: (k) => money(c.scenarios[k].operatingExpenses) },
    { label: "Co-hosting fee", get: (k) => money(c.scenarios[k].coHostFee) },
    { label: "Net Operating Income", hint: "Before the mortgage", get: (k) => money(c.scenarios[k].noi), strong: true },
    { label: "Annual Free Cash Flow", hint: "NOI minus a year of mortgage payments", get: (k) => money(c.scenarios[k].freeCashFlow), strong: true },
    { label: "Cash-on-Cash", hint: "Free cash flow ÷ Total Out of Pocket", get: (k) => percent(c.scenarios[k].cashOnCash), strong: true },
    { label: "Total real-estate return", hint: "Adds principal pay-down and appreciation", get: (k) => percent(c.scenarios[k].totalReCash) },
    { label: "First-year total return", hint: "Free cash flow plus tax savings", get: (k) => money(c.scenarios[k].firstYearTotalReturn) },
  ];

  return (
    <div className="space-y-5">
      <SectionCard
        id="revenue"
        title="Revenue forecast"
        description="A cautious year, an expected year and a strong year. Mid is your expected year, and it's the number the grader compares with the analyst's."
        feeds="Feeds NOI and Cash-on-Cash"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField name="lowRevenue" prefix="$" hint="Cautious year" />
          <NumberField name="midRevenue" prefix="$" hint="Expected year" />
          <NumberField name="highRevenue" prefix="$" hint="Strong year" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField name="coHostingFeePct" suffix="%" hint="Share of revenue paid to a co-host. Use 0 if you self-manage." />
          <NumberField name="appreciationPct" suffix="%" hint="How much the property's value grows each year." />
        </div>
      </SectionCard>

      <SectionCard
        id="results"
        title="Calculated returns"
        description="A live preview as you type. The API recalculates everything when you save."
      >
        <dl className="grid gap-3 sm:grid-cols-3">
          <Stat label="Total Out of Pocket" value={money(c.totalOutOfPocket)} testId="oop" />
          <Stat label="Tax savings (year 1)" value={money(c.taxSavings)} />
          <Stat label="PRR" value={ratio(c.prr, 3)} hint="Mid revenue ÷ purchase price" />
        </dl>

        <div className="rounded-lg border">
          <Table className="min-w-[32rem]">
            <TableCaption className="sr-only">Calculated returns by revenue scenario</TableCaption>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead scope="col" className="px-4 text-muted-foreground">
                  Metric
                </TableHead>
                {COLUMNS.map((col) => (
                  <TableHead key={col.key} scope="col" className={cn("px-4 text-right", col.key === "mid" ? "bg-accent text-accent-foreground" : "text-muted-foreground")}>
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.label}>
                  <TableHead scope="row" className="h-auto px-4 py-2 font-normal whitespace-normal">
                    <span className={row.strong ? "font-medium" : ""}>{row.label}</span>
                    {row.hint && <span className="block text-xs text-muted-foreground">{row.hint}</span>}
                  </TableHead>
                  {COLUMNS.map((col) => (
                    <TableCell
                      key={col.key}
                      data-testid={`${row.label.toLowerCase().replace(/[^a-z]+/g, "-")}-${col.key}`}
                      className={cn("px-4 text-right tabular", col.key === "mid" && "bg-accent/40", row.strong && "font-semibold")}
                    >
                      {row.get(col.key)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}

function Stat({ label, value, hint, testId }: { label: string; value: string; hint?: string; testId?: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular" data-testid={testId}>
        {value}
      </dd>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
