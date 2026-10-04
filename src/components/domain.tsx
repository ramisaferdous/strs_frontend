import { AlertCircle, CheckCircle2, CircleDashed, PencilLine } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <Alert data-testid="error-state" className="border-low/30 bg-low-soft p-6 text-low">
      <AlertCircle aria-hidden />
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        {onRetry && (
          <Button variant="link" size="sm" onClick={onRetry} className="mt-2 h-auto px-0">
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
