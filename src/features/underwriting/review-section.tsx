"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, CircleAlert, Loader2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { compute } from "@/lib/underwriting/calc";
import { money, percent } from "@/lib/underwriting/format";
import { parseNumber } from "@/lib/underwriting/percent";
import { issuesBySection, SECTIONS, type Issue, type SectionId, type WorkspaceValues } from "@/lib/underwriting/schema";
import { DEAL_TAGS } from "@/lib/underwriting/tags";

export interface Warning {
  section: SectionId;
  message: string;
}

/** Non-blocking nudges: they teach, but never stop a submission. */
export function workspaceWarnings(values: WorkspaceValues): Warning[] {
  const warnings: Warning[] = [];
  const c = compute(values);
  if (values.opex.every((r) => !r.name.trim() && !r.monthly.trim())) {
    warnings.push({ section: "financials", message: "No operating expenses entered. Real properties always carry costs like utilities, insurance and taxes." });
  }
  if (c.scenarios.mid.freeCashFlow != null && c.scenarios.mid.freeCashFlow < 0) {
    warnings.push({ section: "analysis", message: "At your Mid forecast the property loses money after the mortgage. Double-check your revenue and expense assumptions." });
  }
  return warnings;
}

const pctText = (t: string) => (Number.isFinite(parseNumber(t)) ? `${parseNumber(t)}%` : "—");
const moneyText = (t: string) => (Number.isFinite(parseNumber(t)) ? money(parseNumber(t)) : "—");

export function ReviewSection({
  values,
  issues,
  warnings,
  onGoTo,
  onSubmit,
  submitting,
}: {
  values: WorkspaceValues;
  issues: Issue[];
  warnings: Warning[];
  onGoTo: (section: SectionId, path?: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const c = compute(values);
  const grouped = issuesBySection(issues);
  const ready = issues.length === 0;
  const tagsOn = DEAL_TAGS.filter((t) => values.tags[t.key]);

  const assumptions: { title: string; section: SectionId; rows: [string, string][] }[] = [
    {
      title: "Purchase & financing",
      section: "financials",
      rows: [
        ["Purchase price", moneyText(values.purchasePrice)],
        ["Down payment", pctText(values.downPaymentPct)],
        ["Interest rate", pctText(values.interestRate)],
        ["Loan term", values.mortgageYears ? `${values.mortgageYears} years` : "—"],
        ["Closing costs", pctText(values.closingCostsPct)],
        ["Setup spend", money(c.optimizationTotal)],
        ["Operating expenses", `${money(c.monthlyOpex)} / month`],
      ],
    },
    {
      title: "Taxes",
      section: "financials",
      rows: [
        ["Land", pctText(values.landPct)],
        ["Short-life assets", pctText(values.slaPct)],
        ["Bonus depreciation", pctText(values.bonusPct)],
        ["Tax rate", pctText(values.taxRatePct)],
      ],
    },
    {
      title: "Revenue & growth",
      section: "analysis",
      rows: [
        ["Low", moneyText(values.lowRevenue)],
        ["Mid", moneyText(values.midRevenue)],
        ["High", moneyText(values.highRevenue)],
        ["Co-hosting fee", pctText(values.coHostingFeePct)],
        ["Appreciation / year", pctText(values.appreciationPct)],
      ],
    },
  ];

  return (
    <div className="space-y-5">
      <div
        role="status"
        data-testid="review-banner"
        data-ready={ready}
        className={ready ? "flex items-start gap-3 rounded-xl border border-best/30 bg-best-soft p-4" : "flex items-start gap-3 rounded-xl border border-low/30 bg-low-soft p-4"}
      >
        {ready ? <CheckCircle2 className="mt-0.5 size-5 text-best" aria-hidden /> : <CircleAlert className="mt-0.5 size-5 text-low" aria-hidden />}
        <div>
          <p className="font-medium">{ready ? "Ready to submit" : `${issues.length} ${issues.length === 1 ? "item needs" : "items need"} attention before you can submit`}</p>
          <p className="text-sm text-muted-foreground">
            {ready ? "Check the assumptions below one last time. Once you submit, you'll see how close you landed to the analyst." : "Fix the items below. Each one jumps straight to the field."}
          </p>
        </div>
      </div>

      {!ready && (
        <Card role="region" aria-labelledby="issues-title">
          <CardHeader>
            <CardTitle id="issues-title" className="text-base">
              Incomplete or invalid inputs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {SECTIONS.filter((s) => grouped[s.id].length > 0).map((s) => (
              <div key={s.id}>
                <p className="mb-1.5 text-sm font-medium">{s.label}</p>
                <ul className="divide-y rounded-lg border" data-testid={`issues-${s.id}`}>
                  {grouped[s.id].map((issue) => (
                    <li key={issue.path}>
                      <button
                        type="button"
                        onClick={() => onGoTo(issue.section, issue.path)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <span>
                          <span className="font-medium">{issue.label}</span>
                          <span className="text-muted-foreground"> · {issue.message}</span>
                        </span>
                        <span className="flex items-center gap-1 text-xs text-primary">
                          Fix <ArrowRight className="size-3.5" aria-hidden />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {warnings.length > 0 && (
        <Card role="region" aria-labelledby="warnings-title" className="border-medium/40 bg-medium-soft/60">
          <CardHeader>
            <CardTitle id="warnings-title" className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-medium" aria-hidden /> Worth a second look
            </CardTitle>
            <CardDescription>These won&apos;t block you from submitting.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {warnings.map((w) => (
                <li key={w.message} className="flex items-start justify-between gap-3">
                  <span>{w.message}</span>
                  <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onGoTo(w.section)}>
                    Review
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card role="region" aria-labelledby="outputs-title">
        <CardHeader>
          <CardTitle id="outputs-title" className="text-base">
            What your numbers say
          </CardTitle>
          <CardDescription>Calculated from the assumptions below.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-4">
            {[
              ["Total Out of Pocket", money(c.totalOutOfPocket)],
              ["Annual Free Cash Flow (Mid)", money(c.scenarios.mid.freeCashFlow)],
              ["Cash-on-Cash (Mid)", percent(c.scenarios.mid.cashOnCash)],
              ["Tax savings (year 1)", money(c.taxSavings)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border bg-muted/40 p-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-lg font-semibold tabular">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card role="region" aria-labelledby="assumptions-title">
        <CardHeader>
          <CardTitle id="assumptions-title" className="text-base">
            Your assumptions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {assumptions.map((group) => (
            <div key={group.title} className="rounded-lg border">
              <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2">
                <p className="text-sm font-medium">{group.title}</p>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onGoTo(group.section)} aria-label={`Edit ${group.title}`}>
                  <Pencil aria-hidden /> Edit
                </Button>
              </div>
              <dl className="divide-y px-3">
                {group.rows.map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 text-sm">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium tabular">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
          <div className="md:col-span-3">
            <p className="mb-1.5 text-sm font-medium">Deal tags</p>
            {tagsOn.length ? (
              <div className="flex flex-wrap gap-1.5">
                {tagsOn.map((t) => (
                  <Badge key={t.key} variant="secondary">
                    {t.label}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tags selected.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">Submitting grades your Mid revenue forecast against the analyst&apos;s.</p>
        <Button size="lg" onClick={onSubmit} disabled={submitting} data-testid="submit-underwriting">
          {submitting && <Loader2 className="animate-spin" aria-hidden />}
          Submit underwriting
        </Button>
      </div>
    </div>
  );
}
