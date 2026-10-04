"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useDashboard, useStartUnderwriting, useSubmission, useUnderwriting } from "@/lib/api/hooks";
import type { Rating } from "@/lib/api/types";
import { ErrorState, RATING_COPY } from "@/components/domain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { money, num, percent, ratio } from "@/lib/underwriting/format";
import { cn } from "@/lib/utils";
import { BandScale } from "./band-scale";
import { Leaderboard } from "./leaderboard";

const HEADLINE: Record<Rating, { title: string; tone: string; ring: string }> = {
  best: { title: "Excellent forecast", tone: "text-best", ring: "border-best bg-best-soft" },
  medium: { title: "Close, but not quite", tone: "text-[oklch(0.5_0.12_70)]", ring: "border-medium bg-medium-soft" },
  low: { title: "Off the mark this time", tone: "text-low", ring: "border-low bg-low-soft" },
};

export function ResultsView({ id }: { id: number }) {
  const router = useRouter();
  const submission = useSubmission(id);
  const underwriting = useUnderwriting(submission.data?.underwriting_id ?? 0);
  const dashboard = useDashboard();
  const restart = useStartUnderwriting();

  if (submission.error) return <ErrorState message={submission.error.message} onRetry={() => submission.refetch()} />;
  const s = submission.data;
  if (!s) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const b = s.breakdown;
  const copy = HEADLINE[s.rating];
  const candidate = num(b.candidate);
  const reference = num(b.reference);
  const deviation = num(b.deviation) ?? 0;
  const bestT = num(b.best_threshold) ?? 0.1;
  const mediumT = num(b.medium_threshold) ?? 0.25;
  const direction = candidate != null && reference != null ? (candidate >= reference ? "above" : "below") : null;

  const property = dashboard.data?.properties.find((p) => p.zpid === s.zpid);
  const nextCase = dashboard.data?.properties.find((p) => p.status === "not_started" && p.zpid !== s.zpid);
  const uw = underwriting.data;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Evaluation result</p>
        <h1 className="text-2xl font-semibold tracking-tight">{property?.address?.split(",")[0] ?? "Your underwriting"}</h1>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card data-testid="score-card" data-rating={s.rating}>
            <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className={cn("grid size-32 shrink-0 place-items-center rounded-full border-4", copy.ring)} aria-label={`Score ${Math.round(num(s.accuracy) ?? 0)} out of 100`}>
                <div className="text-center">
                  <p className={cn("text-4xl leading-none font-semibold tabular", copy.tone)} data-testid="score-value">
                    {Math.round(num(s.accuracy) ?? 0)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">out of 100</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className={cn("text-xl font-semibold", copy.tone)} data-testid="score-headline">
                    {copy.title}
                  </h2>
                </div>
                <p className="text-sm font-medium" data-testid="score-band">
                  {RATING_COPY[s.rating].label} · {RATING_COPY[s.rating].band}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground" data-testid="score-explanation">
                  {candidate == null ? (
                    <>You didn&apos;t enter a Mid revenue forecast, so there was nothing to compare with the analyst&apos;s.</>
                  ) : (
                    <>
                      You forecasted <strong className="text-foreground tabular">{money(candidate)}</strong> for Mid revenue. The analyst forecasted{" "}
                      <strong className="text-foreground tabular">{money(reference)}</strong>, so you were{" "}
                      <strong className="text-foreground tabular" data-testid="score-deviation">
                        {percent(deviation, 1)}
                      </strong>{" "}
                      {direction}.
                    </>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">How your forecast compares</CardTitle>
              <CardDescription>The grade looks at one number: your Mid revenue forecast against the analyst&apos;s.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {reference != null && <BandScale candidate={candidate} reference={reference} bestThreshold={bestT} mediumThreshold={mediumT} />}

              <dl className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Your Mid forecast", money(candidate)],
                  ["Analyst's Mid forecast", money(reference)],
                  ["Deviation", candidate == null ? "—" : `${percent(deviation, 1)} ${direction}`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border bg-muted/40 p-3">
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="mt-1 text-lg font-semibold tabular">{v}</dd>
                  </div>
                ))}
              </dl>

              {s.rating !== "best" && reference != null && (
                <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground" data-testid="score-nudge">
                  {s.rating === "medium" ? "To score 100, a Mid forecast" : "To reach the Medium band, a Mid forecast"} would need to land between{" "}
                  <strong className="text-foreground tabular">
                    {money(reference * (1 - (s.rating === "medium" ? bestT : mediumT)))} and {money(reference * (1 + (s.rating === "medium" ? bestT : mediumT)))}
                  </strong>
                  . Revisit the assumptions behind your {direction === "above" ? "optimism" : "caution"}, then try again.
                </p>
              )}
            </CardContent>
          </Card>

          {uw && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your underwriting at a glance</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 sm:grid-cols-4">
                  {[
                    ["Total Out of Pocket", money(num(uw.total_oop))],
                    ["Cash-on-Cash (Mid)", percent(num(uw.m_cash_on_cash))],
                    ["Tax savings (year 1)", money(num(uw.taxes?.tax_savings))],
                    ["PRR", ratio(num(uw.prr), 3)],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-lg border bg-muted/40 p-3">
                      <dt className="text-xs text-muted-foreground">{k}</dt>
                      <dd className="mt-1 text-lg font-semibold tabular">{v}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Leaderboard currentId={s.id} />

          <Card>
            <CardContent className="flex flex-col gap-2">
              <Button
                size="lg"
                onClick={() =>
                  restart.mutate(s.zpid, {
                    onSuccess: (u) => router.push(`/underwriting/${u.id}`),
                    onError: (e) => toast.error("Couldn't start a new attempt", { description: e.message }),
                  })
                }
                disabled={restart.isPending}
              >
                {restart.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <RotateCcw aria-hidden />}
                Try this property again
              </Button>
              {nextCase && (
                <Button asChild variant="outline" size="lg">
                  <Link href={`/properties/${nextCase.zpid}`}>
                    Next case <ArrowRight aria-hidden />
                  </Link>
                </Button>
              )}
              <Button asChild variant="ghost">
                <Link href="/">Back to dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
