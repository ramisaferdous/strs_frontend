"use client";

import { AlertCircle, Check, Loader2, PencilLine } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SaveStatus } from "./use-autosave";

const COPY: Record<SaveStatus, string> = {
  saved: "All changes saved",
  dirty: "Unsaved changes",
  saving: "Saving…",
  error: "Couldn't save",
};

export function SaveIndicator({ status, error, onRetry, partial }: { status: SaveStatus; error: string | null; onRetry: () => void; partial: boolean }) {
  const Icon = status === "saved" ? Check : status === "saving" ? Loader2 : status === "error" ? AlertCircle : PencilLine;
  return (
    <div role="status" aria-live="polite" data-testid="save-status" data-state={status} className="flex flex-col items-end text-sm">
      <span className={cn("inline-flex items-center gap-1.5", status === "error" ? "text-destructive" : "text-muted-foreground")}>
        <Icon className={cn("size-4", status === "saving" && "animate-spin", status === "saved" && "text-best")} aria-hidden />
        {COPY[status]}
        {status === "error" && (
          <button type="button" onClick={onRetry} className="font-medium underline underline-offset-2">
            Retry
          </button>
        )}
      </span>
      {status === "error" && error ? (
        <span className="max-w-xs truncate text-xs text-destructive" title={error}>
          {error}
        </span>
      ) : partial && status === "saved" ? (
        <span className="text-xs text-muted-foreground">Incomplete sections save once they&apos;re complete</span>
      ) : null}
    </div>
  );
}
