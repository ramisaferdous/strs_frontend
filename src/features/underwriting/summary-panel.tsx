"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { compute } from "@/lib/underwriting/calc";
import { money, percent } from "@/lib/underwriting/format";
import type { WorkspaceValues } from "@/lib/underwriting/schema";
import { cn } from "@/lib/utils";

/** The three-step chain from the brief, kept in view while the trainee types. */
export function SummaryPanel() {
  const { control } = useFormContext<WorkspaceValues>();
  const values = useWatch({ control }) as WorkspaceValues;
  const c = compute(values);
  const mid = c.scenarios.mid;

  return (
    <Card className="gap-3" data-testid="summary-panel" aria-label="Live deal snapshot" role="complementary">
      <CardHeader>
        <CardTitle className="text-base">Deal snapshot</CardTitle>
        <p className="text-xs text-muted-foreground">Live estimate as you type</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Step n={1} label="Total Out of Pocket" value={money(c.totalOutOfPocket)} testId="snapshot-oop" />
        <Arrow />
        <Step n={2} label="Annual Free Cash Flow (Mid)" value={money(mid.freeCashFlow)} negative={(mid.freeCashFlow ?? 0) < 0} testId="snapshot-fcf" />
        <Arrow />
        <Step n={3} label="Cash-on-Cash (Mid)" value={percent(mid.cashOnCash)} negative={(mid.cashOnCash ?? 0) < 0} testId="snapshot-coc" emphasize />

        <dl className="divide-y rounded-lg border text-sm">
          {(["low", "mid", "high"] as const).map((k) => (
            <div key={k} className="flex items-center justify-between px-3 py-1.5">
              <dt className="text-muted-foreground">{{ low: "Low", mid: "Mid", high: "High" }[k]} Cash-on-Cash</dt>
              <dd className="font-medium tabular">{percent(c.scenarios[k].cashOnCash)}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-1.5">
            <dt className="text-muted-foreground">Tax savings</dt>
            <dd className="font-medium tabular">{money(c.taxSavings)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function Step({ n, label, value, emphasize, negative, testId }: { n: number; label: string; value: string; emphasize?: boolean; negative?: boolean; testId: string }) {
  return (
    <div className={cn("rounded-lg border p-3", emphasize ? "border-primary/30 bg-accent" : "bg-muted/40")}>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">{n}</span>
        {label}
      </p>
      <p className={cn("mt-1 text-xl font-semibold tabular", negative && "text-low")} data-testid={testId}>
        {value}
      </p>
    </div>
  );
}

const Arrow = () => (
  <div className="flex justify-center text-muted-foreground" aria-hidden>
    <ArrowDown className="size-4" />
  </div>
);
