import { CheckCircle2, CircleDashed, PencilLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Rating, TrainingStatus } from "@/lib/api/types";

export const RATING_COPY: Record<Rating, { label: string; band: string }> = {
  best: { label: "Best", band: "Within 10% of the analyst" },
  medium: { label: "Medium", band: "Within 25% of the analyst" },
  low: { label: "Low", band: "More than 25% from the analyst" },
};

export function RatingBadge({ rating }: { rating: Rating | null | undefined }) {
  if (!rating) return null;
  return <Badge variant={rating}>{RATING_COPY[rating].label}</Badge>;
}

export function StatusBadge({ status }: { status: TrainingStatus }) {
  if (status === "submitted") {
    return (
      <Badge variant="secondary">
        <CheckCircle2 aria-hidden /> Submitted
      </Badge>
    );
  }
  if (status === "in_progress") {
    return (
      <Badge variant="medium">
        <PencilLine aria-hidden /> In progress
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      <CircleDashed aria-hidden /> Not started
    </Badge>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" data-testid="error-state" className="rounded-xl border border-low/30 bg-low-soft p-6 text-sm">
      <p className="font-medium text-low">Something went wrong</p>
      <p className="mt-1 text-muted-foreground">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline">
          Try again
        </button>
      )}
    </div>
  );
}
