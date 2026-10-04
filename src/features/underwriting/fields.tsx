"use client";

import { useFieldArray, useFormContext, get, type Path } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { money } from "@/lib/underwriting/format";
import { emptyRow, FIELD_DEPS, FIELD_SPECS, type NumberFieldKey, type WorkspaceValues } from "@/lib/underwriting/schema";

export function SectionCard({
  id,
  title,
  description,
  feeds,
  children,
}: {
  id: string;
  title: string;
  description: string;
  /** Which link of the underwriting chain this card feeds. */
  feeds?: string;
  children: React.ReactNode;
}) {
  return (
    <Card role="region" aria-labelledby={`${id}-title`} id={id}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle id={`${id}-title`} className="text-base">
            {title}
          </CardTitle>
          {feeds && <Badge variant="outline">{feeds}</Badge>}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

type NumberFieldName = NumberFieldKey;

export function NumberField({
  name,
  prefix,
  suffix,
  hint,
  placeholder,
  className,
}: {
  name: NumberFieldName;
  prefix?: string;
  suffix?: string;
  hint?: string;
  placeholder?: string;
  className?: string;
}) {
  const { register, formState, getValues, getFieldState, trigger } = useFormContext<WorkspaceValues>();
  const error = get(formState.errors, name)?.message as string | undefined;
  const label = FIELD_SPECS[name].label;
  const field = register(name);
  // A visible error clears as soon as the value is fixed, even before the field is blurred.
  const onChange: typeof field.onChange = async (e) => {
    await field.onChange(e);
    if (getFieldState(name).error) void trigger(name);
  };
  // Re-check dependents the trainee has already filled, so empty ones don't light up early.
  const onBlur: typeof field.onBlur = async (e) => {
    await field.onBlur(e);
    const filled = (FIELD_DEPS[name] ?? []).filter((d) => getValues(d).trim() !== "");
    if (filled.length) void trigger(filled);
  };
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground" aria-hidden>
            {prefix}
          </span>
        )}
        <Input
          id={name}
          inputMode="decimal"
          autoComplete="off"
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
          className={cn("tabular", prefix && "pl-7", suffix && "pr-12")}
          {...field}
          onChange={onChange}
          onBlur={onBlur}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground" aria-hidden>
            {suffix}
          </span>
        )}
      </div>
      {error ? (
        <p id={`${name}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${name}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Readout({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("tabular", strong ? "font-semibold" : "font-medium")}>{value}</dd>
    </div>
  );
}

/** Repeating name + amount rows. Blank rows are ignored; half-filled rows are flagged. */
export function LineItems({
  name,
  textKey,
  amountKey,
  itemLabel,
  textLabel,
  amountLabel,
  suggestions,
  total,
  totalLabel,
}: {
  name: "optimization" | "opex";
  textKey: "category" | "name";
  amountKey: "amount" | "monthly";
  itemLabel: string;
  textLabel: string;
  amountLabel: string;
  suggestions: string[];
  total: number;
  totalLabel: string;
}) {
  const { register, control, formState, watch, getValues, getFieldState, trigger } = useFormContext<WorkspaceValues>();
  const { fields, append, remove } = useFieldArray({ control, name });
  const rows = watch(name) as Record<string, string>[];
  const used = new Set(rows.map((r) => (r[textKey] ?? "").trim().toLowerCase()));

  const rowError = (i: number, key: string) => get(formState.errors, `${name}.${i}.${key}`)?.message as string | undefined;

  /**
   * Registers one cell. Leaving a filled cell re-checks the other half of its row
   * (and OOP for setup spend), unless focus is moving into that other half.
   * A visible error clears as soon as the value is fixed.
   */
  const registerCell = (i: number, key: string, other: string) => {
    const path = `${name}.${i}.${key}` as Path<WorkspaceValues>;
    const otherPath = `${name}.${i}.${other}` as Path<WorkspaceValues>;
    const cell = register(path);
    const onChange: typeof cell.onChange = async (e) => {
      await cell.onChange(e);
      if (getFieldState(path).error) void trigger(path);
    };
    const onBlur: typeof cell.onBlur = async (e) => {
      await cell.onBlur(e);
      if (String(getValues(path) ?? "").trim() === "") return;
      const next = (e as React.FocusEvent<HTMLInputElement>).relatedTarget as HTMLInputElement | null;
      const deps: Path<WorkspaceValues>[] = next?.name === otherPath ? [] : [otherPath];
      if (name === "optimization" && key === amountKey && getValues("downPaymentPct").trim() !== "") deps.push("downPaymentPct");
      if (deps.length) void trigger(deps);
    };
    return { ...cell, onChange, onBlur };
  };

  return (
    <div className="space-y-3">
      {fields.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No {itemLabel.toLowerCase()}s yet. Add one below, or pick a common one.
        </p>
      ) : (
        <ul className="space-y-2">
          {fields.map((field, i) => {
            const textErr = rowError(i, textKey);
            const amountErr = rowError(i, amountKey);
            return (
              <li key={field.id} className="grid grid-cols-[1fr_9.5rem_auto] items-start gap-2">
                <div>
                  <Input
                    aria-label={`${itemLabel} ${i + 1} ${textLabel.toLowerCase()}`}
                    placeholder={textLabel}
                    aria-invalid={textErr ? true : undefined}
                    {...registerCell(i, textKey, amountKey)}
                  />
                  {textErr && (
                    <p role="alert" className="mt-1 text-xs font-medium text-destructive">
                      {textErr}
                    </p>
                  )}
                </div>
                <div>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground" aria-hidden>
                      $
                    </span>
                    <Input
                      aria-label={`${itemLabel} ${i + 1} ${amountLabel.toLowerCase()}`}
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0"
                      className="tabular pl-7"
                      aria-invalid={amountErr ? true : undefined}
                      {...registerCell(i, amountKey, textKey)}
                    />
                  </div>
                  {amountErr && (
                    <p role="alert" className="mt-1 text-xs font-medium text-destructive">
                      {amountErr}
                    </p>
                  )}
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${itemLabel.toLowerCase()} ${i + 1}`} onClick={() => remove(i)}>
                  <Trash2 className="text-muted-foreground" aria-hidden />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => append(emptyRow[name]() as never, { focusName: `${name}.${fields.length}.${textKey}` as never })}>
          <Plus aria-hidden /> Add {itemLabel.toLowerCase()}
        </Button>
        {suggestions
          .filter((s) => !used.has(s.toLowerCase()))
          .map((s) => (
            <button
              key={s}
              type="button"
              onClick={() =>
                append({ [textKey]: s, [amountKey]: "" } as never, {
                  focusName: `${name}.${fields.length}.${amountKey}` as never,
                })
              }
              className="rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              + {s}
            </button>
          ))}
      </div>

      <div className="flex items-center justify-between border-t pt-3 text-sm">
        <span className="text-muted-foreground">{totalLabel}</span>
        <span className="font-semibold tabular" data-testid={`${name}-total`}>
          {money(total)}
        </span>
      </div>
    </div>
  );
}
