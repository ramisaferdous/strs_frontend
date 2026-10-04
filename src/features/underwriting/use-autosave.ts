"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWatch, type Control } from "react-hook-form";
import { toPayload } from "@/lib/underwriting/mappers";
import type { WorkspaceValues } from "@/lib/underwriting/schema";
import type { SavePayload, Underwriting } from "@/lib/api/types";

export type SaveStatus = "saved" | "dirty" | "saving" | "error";

/**
 * Debounced autosave. The payload is derived from the form, and a save is only
 * issued when its serialized form differs from the last one the server accepted,
 * so typing in a still-incomplete section never produces a request.
 */
export function useAutosave({
  control,
  initial,
  save,
  delay = 800,
}: {
  control: Control<WorkspaceValues>;
  initial: WorkspaceValues;
  save: (payload: SavePayload) => Promise<Underwriting>;
  delay?: number;
}) {
  const values = useWatch({ control }) as WorkspaceValues;
  const key = useMemo(() => JSON.stringify(toPayload(values)), [values]);
  const keyRef = useRef(key);
  keyRef.current = key;
  const lastSaved = useRef(JSON.stringify(toPayload(initial)));
  const inFlight = useRef<Promise<void> | null>(null);

  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);

  const flush = useCallback(async () => {
    // Serialize saves so an older response can't overwrite a newer one.
    if (inFlight.current) await inFlight.current;
    const sending = keyRef.current;
    if (sending === lastSaved.current) {
      setStatus("saved");
      return true;
    }
    setStatus("saving");
    const run = (async () => {
      try {
        await save(JSON.parse(sending) as SavePayload);
        lastSaved.current = sending;
        setError(null);
        setStatus(keyRef.current === sending ? "saved" : "dirty");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save");
        setStatus("error");
      }
    })();
    inFlight.current = run;
    await run;
    inFlight.current = null;
    return lastSaved.current === sending;
  }, [save]);

  useEffect(() => {
    if (key === lastSaved.current) return;
    setStatus((s) => (s === "saving" ? s : "dirty"));
    const t = setTimeout(() => void flush(), delay);
    return () => clearTimeout(t);
  }, [key, delay, flush]);

  // Don't let someone close the tab with work the server hasn't accepted.
  useEffect(() => {
    if (status === "saved") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  return { status, error, flush };
}
