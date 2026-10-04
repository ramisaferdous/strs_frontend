"use client";

import { Trophy } from "lucide-react";
import { useDashboard, useSubmissions } from "@/lib/api/hooks";
import type { Submission } from "@/lib/api/types";
import { RatingBadge } from "@/components/domain";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { num, percent } from "@/lib/underwriting/format";
import { cn } from "@/lib/utils";

/** Highest accuracy first; ties go to the smaller deviation, then the earlier attempt. */
export function rankSubmissions(subs: Submission[]): Submission[] {
  return [...subs].sort(
    (a, b) =>
      (num(b.accuracy) ?? 0) - (num(a.accuracy) ?? 0) ||
      (num(a.breakdown.deviation) ?? 1) - (num(b.breakdown.deviation) ?? 1) ||
      new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime(),
  );
}

const TOP = 5;

export function Leaderboard({ currentId }: { currentId: number }) {
  const submissions = useSubmissions();
  const dashboard = useDashboard();
  const names = new Map(dashboard.data?.properties.map((p) => [p.zpid, p.address?.split(",")[0] ?? p.zpid]));

  if (submissions.isPending) return <Skeleton className="h-64 rounded-xl" />;
  const ranked = rankSubmissions(submissions.data ?? []);
  const myIndex = ranked.findIndex((s) => s.id === currentId);
  const rows = ranked.slice(0, TOP);
  const outside = myIndex >= TOP ? ranked[myIndex] : null;

  return (
    <Card data-testid="leaderboard" role="region" aria-labelledby="leaderboard-title">
      <CardHeader>
        <CardTitle id="leaderboard-title" className="flex items-center gap-2 text-base">
          <Trophy className="size-4 text-medium" aria-hidden /> Leaderboard
        </CardTitle>
        <CardDescription data-testid="leaderboard-rank">
          {myIndex >= 0 ? (
            <>
              You&apos;re <strong className="text-foreground">#{myIndex + 1}</strong> of {ranked.length} {ranked.length === 1 ? "attempt" : "attempts"}.
            </>
          ) : (
            "Ranking of every submitted attempt, by accuracy."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="divide-y rounded-lg border">
          {rows.map((s, i) => (
            <Row key={s.id} rank={i + 1} s={s} name={names.get(s.zpid)} current={s.id === currentId} />
          ))}
          {outside && (
            <>
              <li className="px-3 py-1 text-center text-xs text-muted-foreground" aria-hidden>
                ···
              </li>
              <Row rank={myIndex + 1} s={outside} name={names.get(outside.zpid)} current />
            </>
          )}
        </ol>
      </CardContent>
    </Card>
  );
}

function Row({ rank, s, name, current }: { rank: number; s: Submission; name?: string; current: boolean }) {
  return (
    <li
      data-current={current}
      aria-current={current ? "true" : undefined}
      className={cn("grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-3 py-2 text-sm", current && "bg-accent")}
    >
      <span className="font-semibold text-muted-foreground tabular">{rank}</span>
      <span className="min-w-0">
        <span className="block truncate font-medium">
          {name ?? s.zpid}
          {current && <span className="ml-2 text-xs font-normal text-primary">You</span>}
        </span>
        <span className="text-xs text-muted-foreground tabular">{percent(num(s.breakdown.deviation), 1)} off the analyst</span>
      </span>
      <span className="flex items-center gap-2">
        <span className="font-semibold tabular">{Math.round(num(s.accuracy) ?? 0)}</span>
        <RatingBadge rating={s.rating} />
      </span>
    </li>
  );
}
