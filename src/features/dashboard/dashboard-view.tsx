"use client";

import { useState } from "react";
import { useDashboard } from "@/lib/api/hooks";
import type { DashboardProperty, TrainingStatus } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/domain";
import { num } from "@/lib/underwriting/format";
import { PropertyCard } from "./property-card";

type Filter = "all" | TrainingStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All cases" },
  { id: "not_started", label: "Not started" },
  { id: "in_progress", label: "In progress" },
  { id: "submitted", label: "Submitted" },
];

export function DashboardView() {
  const { data, error, isPending, refetch } = useDashboard();
  const [filter, setFilter] = useState<Filter>("all");

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  const summary = data?.summary;
  const properties = data?.properties ?? [];
  const visible = filter === "all" ? properties : properties.filter((p) => p.status === filter);
  const counts = (id: Filter) => (id === "all" ? properties.length : properties.filter((p) => p.status === id).length);
  const completion = summary && summary.total_properties > 0 ? Math.round((summary.submitted / summary.total_properties) * 100) : 0;
  const average = num(summary?.average_accuracy);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Training dashboard</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Pick a property, underwrite it from scratch, and see how close your forecast lands to the analyst&apos;s. You&apos;ll never see their
          version until you submit.
        </p>
      </div>

      <section aria-label="Your progress" className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Progress</p>
            {isPending ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-semibold tabular" data-testid="progress-count">
                {summary?.submitted ?? 0}
                <span className="text-base font-normal text-muted-foreground"> of {summary?.total_properties ?? 0} cases submitted</span>
              </p>
            )}
            <Progress value={completion} aria-label="Cases submitted" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">Average accuracy</p>
            {isPending ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-semibold tabular" data-testid="average-accuracy">
                {average != null ? Math.round(average) : "—"}
              </p>
            )}
            <p className="text-xs text-muted-foreground">Across your submitted cases, out of 100</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">Open drafts</p>
            {isPending ? <Skeleton className="h-8 w-10" /> : <p className="text-2xl font-semibold tabular">{summary?.in_progress ?? 0}</p>}
            <p className="text-xs text-muted-foreground">Saved automatically as you work</p>
          </CardContent>
        </Card>
      </section>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="gap-4">
        <TabsList aria-label="Filter cases" className="max-w-full justify-start overflow-x-auto overflow-y-hidden">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.id} value={f.id} className="flex-none px-3">
              {f.label}
              <span className="tabular text-muted-foreground">{isPending ? "" : counts(f.id)}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* One panel, re-filtered per tab, so the grid isn't rendered four times. */}
        <TabsContent value={filter}>
          {isPending ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-xl" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">No cases match this filter.</CardContent>
            </Card>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Training cases">
              {visible.map((p: DashboardProperty) => (
                <li key={p.zpid}>
                  <PropertyCard property={p} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
