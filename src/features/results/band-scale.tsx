import { money } from "@/lib/underwriting/format";
import { cn } from "@/lib/utils";

/**
 * Shows where the trainee's Mid forecast landed relative to the analyst's and
 * the two grading bands, so the score is explained rather than just stated.
 */
export function BandScale({
  candidate,
  reference,
  bestThreshold,
  mediumThreshold,
}: {
  candidate: number | null;
  reference: number;
  bestThreshold: number;
  mediumThreshold: number;
}) {
  const span = Math.max(0.5, mediumThreshold * 2);
  const min = reference * (1 - span);
  const max = reference * (1 + span);
  const pos = (v: number) => Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
  const offScale = candidate != null && (candidate < min || candidate > max);

  const medLo = reference * (1 - mediumThreshold);
  const medHi = reference * (1 + mediumThreshold);
  const bestLo = reference * (1 - bestThreshold);
  const bestHi = reference * (1 + bestThreshold);

  return (
    <figure className="space-y-3" data-testid="band-scale">
      <div
        role="img"
        aria-label={`Scale from ${money(min)} to ${money(max)}. Best band ${money(bestLo)} to ${money(bestHi)}, medium band ${money(medLo)} to ${money(medHi)}. The analyst forecast ${money(reference)}${
          candidate != null ? `; you forecast ${money(candidate)}` : "; you entered no forecast"
        }.`}
        className="relative h-[4.5rem] pt-6"
      >
        <div className="absolute inset-x-0 top-6 h-5 overflow-hidden rounded-full bg-low-soft ring-1 ring-border">
          <div className="absolute inset-y-0 bg-medium-soft" style={{ left: `${pos(medLo)}%`, width: `${pos(medHi) - pos(medLo)}%` }} />
          <div className="absolute inset-y-0 bg-best/25" style={{ left: `${pos(bestLo)}%`, width: `${pos(bestHi) - pos(bestLo)}%` }} />
        </div>

        {/* Labels sit on opposite sides of the bar so close forecasts never overlap. */}
        <Marker left={pos(reference)} label="Analyst" tone="analyst" side="below" />
        {candidate != null && <Marker left={pos(candidate)} label={offScale ? "You (off scale)" : "You"} tone="you" side="above" />}
      </div>

      <figcaption className="grid grid-cols-3 text-xs text-muted-foreground tabular">
        <span>{money(min)}</span>
        <span className="text-center">&nbsp;</span>
        <span className="text-right">{money(max)}</span>
      </figcaption>

      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <Legend className="bg-best/40" label={`Best · ${money(bestLo)}–${money(bestHi)}`} />
        <Legend className="bg-medium-soft ring-1 ring-medium/40" label={`Medium · ${money(medLo)}–${money(medHi)}`} />
        <Legend className="bg-low-soft ring-1 ring-low/30" label="Low · anything else" />
      </ul>
    </figure>
  );
}

function Marker({ left, label, tone, side }: { left: number; label: string; tone: "you" | "analyst"; side: "above" | "below" }) {
  const chip = (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[11px] leading-none font-semibold whitespace-nowrap",
        tone === "you" ? "bg-primary text-primary-foreground" : "bg-foreground text-background",
      )}
    >
      {label}
    </span>
  );
  const line = <span className={cn("h-7 w-0.5 shrink-0", tone === "you" ? "bg-primary" : "bg-foreground")} />;
  // Near either end, pin the chip to that edge so it grows inwards instead of spilling out of the card.
  const align = left < 12 ? "start" : left > 88 ? "end" : "center";
  return (
    <div
      className={cn(
        "absolute flex flex-col",
        align === "start" && "items-start",
        align === "center" && "-translate-x-1/2 items-center",
        align === "end" && "-translate-x-full items-end",
        side === "above" ? "top-0" : "top-[1.25rem]",
      )}
      style={{ left: `${left}%` }}
      aria-hidden
    >
      {side === "above" ? (
        <>
          <span className="mb-0.5">{chip}</span>
          {line}
        </>
      ) : (
        <>
          {line}
          <span className="mt-0.5">{chip}</span>
        </>
      )}
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={cn("size-3 rounded-sm", className)} aria-hidden />
      {label}
    </li>
  );
}
