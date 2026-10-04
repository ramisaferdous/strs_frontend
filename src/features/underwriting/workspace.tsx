"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useProperty, useSaveUnderwriting, useSubmissions, useSubmitUnderwriting, useUnderwriting } from "@/lib/api/hooks";
import type { Underwriting } from "@/lib/api/types";
import { ErrorState } from "@/components/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { fromUnderwriting, toPayload } from "@/lib/underwriting/mappers";
import { issuesBySection, SECTION_FIELDS, SECTIONS, validateWorkspace, workspaceResolver, type SectionId, type WorkspaceValues } from "@/lib/underwriting/schema";
import { cn } from "@/lib/utils";
import { AnalysisSection } from "./analysis-section";
import { FinancialsSection } from "./financials-section";
import { ReviewSection, workspaceWarnings } from "./review-section";
import { SaveIndicator } from "./save-indicator";
import { SummaryPanel } from "./summary-panel";
import { TagsSection } from "./tags-section";
import { useAutosave } from "./use-autosave";

type StepId = SectionId | "review";

const STEPS: { id: StepId; label: string; blurb: string }[] = [...SECTIONS, { id: "review", label: "Review & submit", blurb: "Check and submit" }];

export function Workspace({ id }: { id: number }) {
  const underwriting = useUnderwriting(id);
  if (underwriting.error) return <ErrorState message={underwriting.error.message} onRetry={() => underwriting.refetch()} />;
  if (!underwriting.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (underwriting.data.deal_submitted) return <AlreadySubmitted uw={underwriting.data} />;
  return <WorkspaceForm key={id} uw={underwriting.data} />;
}

function AlreadySubmitted({ uw }: { uw: Underwriting }) {
  const submissions = useSubmissions(uw.zpid ?? undefined);
  const match = submissions.data?.find((s) => s.underwriting_id === uw.id);
  return (
    <Card className="mx-auto max-w-lg">
      <CardContent className="space-y-3 text-center">
        <CheckCircle2 className="mx-auto size-8 text-best" aria-hidden />
        <h1 className="text-lg font-semibold">This underwriting was already submitted</h1>
        <p className="text-sm text-muted-foreground">Submitted work is final. You can review the result, or start a new attempt from the property page.</p>
        <div className="flex justify-center gap-2">
          {match && (
            <Button asChild>
              <Link href={`/results/${match.id}`}>View result</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href={uw.zpid ? `/properties/${uw.zpid}` : "/"}>Back to property</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkspaceForm({ uw }: { uw: Underwriting }) {
  const router = useRouter();
  const property = useProperty(uw.zpid ?? "");
  const initial = useMemo(() => fromUnderwriting(uw), [uw]);
  const form = useForm<WorkspaceValues>({ defaultValues: initial, resolver: workspaceResolver, mode: "onTouched" });
  const save = useSaveUnderwriting(uw.id);
  const submit = useSubmitUnderwriting(uw.id);
  const autosave = useAutosave({ control: form.control, initial, save: save.mutateAsync });

  const values = useWatch({ control: form.control }) as WorkspaceValues;
  const issues = useMemo(() => validateWorkspace(values), [values]);
  const grouped = useMemo(() => issuesBySection(issues), [issues]);
  const warnings = useMemo(() => workspaceWarnings(values), [values]);
  const partial = useMemo(() => {
    const p = toPayload(values);
    return !p.purchase_details || !p.forecasted_revenue || !p.taxes;
  }, [values]);

  const [step, setStep] = useState<StepId>("financials");
  const [visited, setVisited] = useState<Set<StepId>>(new Set(["financials"]));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (next: StepId, focusPath?: string) => {
      const leaving = step;
      setStep(next);
      setVisited((v) => new Set(v).add(next));
      void autosave.flush();
      // Surface errors only for the section being left, or the one the
      // checklist sent us to, so untouched sections don't light up red.
      if (leaving !== "review") void form.trigger(SECTION_FIELDS[leaving]);
      if (next !== "review" && (focusPath || leaving === "review")) setTimeout(() => void form.trigger(SECTION_FIELDS[next]), 0);
      requestAnimationFrame(() => {
        if (focusPath) setTimeout(() => form.setFocus(focusPath as never), 60);
        else topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, autosave.flush, form],
  );

  // Visiting a step marks the one we just left as visited too, so its badge is honest.
  useEffect(() => {
    setVisited((v) => (v.has(step) ? v : new Set(v).add(step)));
  }, [step]);

  async function requestSubmit() {
    const valid = await form.trigger();
    if (!valid || issues.length > 0) {
      toast.error(`${issues.length} ${issues.length === 1 ? "item needs" : "items need"} attention`, {
        description: "Open the checklist on the Review step to jump to each one.",
      });
      setStep("review");
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmSubmit() {
    setConfirmOpen(false);
    await autosave.flush();
    submit.mutate(toPayload(form.getValues()), {
      onSuccess: (result) => router.push(`/results/${result.submission.id}`),
      onError: (e) => toast.error("Couldn't submit your underwriting", { description: e.message }),
    });
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const prev = STEPS[stepIndex - 1];
  const next = STEPS[stepIndex + 1];

  return (
    <FormProvider {...form}>
      <div ref={topRef} className="scroll-mt-20 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <Link href={uw.zpid ? `/properties/${uw.zpid}` : "/"} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" aria-hidden /> Property brief
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="workspace-title">
              {property.data?.address_street ?? uw.property_address ?? "Underwriting"}
            </h1>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {property.data ? `${property.data.address_city}, ${property.data.address_state}` : ""}
              {property.data?.market && <Badge variant="outline">{property.data.market.name}</Badge>}
            </p>
          </div>
          <SaveIndicator status={autosave.status} error={autosave.error} onRetry={() => void autosave.flush()} partial={partial} />
        </div>

        <nav aria-label="Underwriting steps">
          <ol className="grid gap-2 sm:grid-cols-4">
            {STEPS.map((s, i) => {
              const sectionIssues = s.id === "review" ? [] : grouped[s.id];
              const touched = visited.has(s.id) && s.id !== step;
              const current = s.id === step;
              const attention = touched && sectionIssues.length > 0;
              const done = touched && s.id !== "review" && sectionIssues.length === 0;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => go(s.id)}
                    aria-current={current ? "step" : undefined}
                    data-testid={`step-${s.id}`}
                    data-state={attention ? "attention" : done ? "done" : current ? "current" : "idle"}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent",
                      current && "border-primary ring-1 ring-primary",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
                        current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        done && "bg-best-soft text-best",
                        attention && "bg-medium-soft text-[oklch(0.45_0.1_70)]",
                      )}
                    >
                      {done ? <CheckCircle2 className="size-4" aria-hidden /> : attention ? <AlertCircle className="size-4" aria-hidden /> : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{s.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {attention ? `${sectionIssues.length} to fix` : s.id === "review" && issues.length > 0 ? `${issues.length} to fix` : s.blurb}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            {step === "financials" && <FinancialsSection />}
            {step === "analysis" && <AnalysisSection />}
            {step === "tags" && <TagsSection />}
            {step === "review" && (
              <ReviewSection
                values={values}
                issues={issues}
                warnings={warnings}
                onGoTo={(section, path) => go(section, path)}
                onSubmit={requestSubmit}
                submitting={submit.isPending}
              />
            )}

            {step !== "review" && (
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => prev && go(prev.id)} disabled={!prev}>
                  <ArrowLeft aria-hidden /> {prev ? prev.label : "Back"}
                </Button>
                {next && (
                  <Button onClick={() => go(next.id)} data-testid="next-step">
                    {next.label} <ArrowRight aria-hidden />
                  </Button>
                )}
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-20" aria-label="Deal snapshot">
            <SummaryPanel />
          </aside>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit this underwriting?</DialogTitle>
            <DialogDescription>
              Your work is final once submitted. You&apos;ll see how your Mid revenue forecast compares with the analyst&apos;s, and where you land on the leaderboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Keep editing
            </Button>
            <Button onClick={confirmSubmit} data-testid="confirm-submit">
              {submit.isPending && <Loader2 className="animate-spin" aria-hidden />}
              Submit now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormProvider>
  );
}
