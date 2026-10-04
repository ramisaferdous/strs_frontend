"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DEAL_TAGS } from "@/lib/underwriting/tags";
import type { WorkspaceValues } from "@/lib/underwriting/schema";
import { SectionCard } from "./fields";

export function TagsSection() {
  const { control, watch } = useFormContext<WorkspaceValues>();
  const selected = DEAL_TAGS.filter((t) => watch(`tags.${t.key}`)).length;

  return (
    <SectionCard
      id="tags"
      title="Deal tags"
      description="Yes/no labels that describe the deal at a glance. They don't affect your score."
      feeds={`${selected} of ${DEAL_TAGS.length} selected`}
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {DEAL_TAGS.map((tag) => (
          <li key={tag.key} className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor={`tag-${tag.key}`}>{tag.label}</Label>
              <p id={`tag-${tag.key}-hint`} className="text-xs text-muted-foreground">
                {tag.hint}
              </p>
            </div>
            <Controller
              control={control}
              name={`tags.${tag.key}`}
              render={({ field }) => (
                <Switch
                  id={`tag-${tag.key}`}
                  aria-describedby={`tag-${tag.key}-hint`}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
