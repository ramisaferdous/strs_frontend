import Link from "next/link";
import { ArrowRight, Bath, BedDouble, MapPin, Ruler } from "lucide-react";
import type { DashboardProperty } from "@/lib/api/types";
import { RatingBadge, StatusBadge } from "@/components/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListingPhoto } from "@/components/listing-photo";
import { num, titleCaseHomeType } from "@/lib/underwriting/format";

export function PropertyCard({ property: p }: { property: DashboardProperty }) {
  const latest = num(p.latest_accuracy);
  const best = num(p.best_accuracy);
  const street = p.address?.split(",")[0] ?? "Property";

  return (
    <Card className="h-full gap-0 overflow-hidden py-0" data-testid={`property-card-${p.zpid}`}>
      <div className="relative aspect-[16/9] bg-muted">
        <ListingPhoto src={p.img_src} />
        <div className="absolute top-3 left-3">
          <StatusBadge status={p.status} />
        </div>
        {p.market_name && (
          <Badge variant="secondary" className="absolute right-3 bottom-3 bg-card/90 backdrop-blur">
            <MapPin aria-hidden /> {p.market_name}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h2 className="font-semibold tracking-tight">
            <Link href={`/properties/${p.zpid}`} className="hover:underline">
              {street}
            </Link>
          </h2>
          <p className="text-sm text-muted-foreground">
            {p.city}, {p.state} · {titleCaseHomeType(p.home_type)}
          </p>
        </div>

        <p className="text-xl font-semibold tabular">{p.price ?? "—"}</p>

        <dl className="flex gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <BedDouble className="size-4" aria-hidden />
            <dt className="sr-only">Bedrooms</dt>
            <dd>{p.beds ?? "—"}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Bath className="size-4" aria-hidden />
            <dt className="sr-only">Bathrooms</dt>
            <dd>{p.baths ?? "—"}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Ruler className="size-4" aria-hidden />
            <dt className="sr-only">Square feet</dt>
            <dd className="tabular">{p.area?.toLocaleString("en-US") ?? "—"} sqft</dd>
          </div>
        </dl>

        {p.attempts > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm" data-testid="score-strip">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Latest</span>
              <span className="font-semibold tabular">{latest != null ? Math.round(latest) : "—"}</span>
              <RatingBadge rating={p.latest_rating} />
            </div>
            <span className="text-xs text-muted-foreground tabular">
              Best {best != null ? Math.round(best) : "—"} · {p.attempts} {p.attempts === 1 ? "attempt" : "attempts"}
            </span>
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-1">
          {p.status === "in_progress" && p.active_underwriting_id != null ? (
            <Button asChild className="flex-1">
              <Link href={`/underwriting/${p.active_underwriting_id}`}>
                Continue draft <ArrowRight />
              </Link>
            </Button>
          ) : p.status === "submitted" ? (
            <>
              {p.latest_submission_id != null && (
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/results/${p.latest_submission_id}`}>View result</Link>
                </Button>
              )}
              <Button asChild className="flex-1">
                <Link href={`/properties/${p.zpid}`}>Try again</Link>
              </Button>
            </>
          ) : (
            <Button asChild className="flex-1">
              <Link href={`/properties/${p.zpid}`}>
                Review &amp; start <ArrowRight />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
