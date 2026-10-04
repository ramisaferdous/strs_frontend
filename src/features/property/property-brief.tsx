"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Bath, BedDouble, Banknote, ExternalLink, Loader2, MapPin, Percent, PiggyBank, Ruler } from "lucide-react";
import { toast } from "sonner";
import { useDashboard, useMarket, useProperty, useStartUnderwriting, useSubmissions } from "@/lib/api/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListingPhoto } from "@/components/listing-photo";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, RatingBadge } from "@/components/domain";
import { num, titleCaseHomeType } from "@/lib/underwriting/format";

const CHAIN = [
  { icon: PiggyBank, title: "What it costs up front", body: "Down payment, closing costs and setup spend add up to Total Out of Pocket." },
  { icon: Banknote, title: "What it earns each year", body: "Forecast revenue, minus running costs and the mortgage, gives Annual Free Cash Flow." },
  { icon: Percent, title: "How good the return is", body: "Cash flow divided by the money put in gives Cash-on-Cash." },
];

export function PropertyBrief({ zpid }: { zpid: string }) {
  const router = useRouter();
  const property = useProperty(zpid);
  const market = useMarket(property.data?.market_id);
  const dashboard = useDashboard();
  const submissions = useSubmissions(zpid);
  const start = useStartUnderwriting();

  const entry = dashboard.data?.properties.find((p) => p.zpid === zpid);
  const draftId = entry?.active_underwriting_id ?? null;

  function begin() {
    if (draftId != null) return router.push(`/underwriting/${draftId}`);
    start.mutate(zpid, {
      onSuccess: (uw) => router.push(`/underwriting/${uw.id}`),
      onError: (e) => toast.error("Couldn't start the underwriting", { description: e.message }),
    });
  }

  if (property.error) return <ErrorState message={property.error.message} onRetry={() => property.refetch()} />;
  const p = property.data;

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Training dashboard
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card className="gap-0 overflow-hidden py-0">
            <div className="aspect-[21/9] bg-muted">
              {p && <ListingPhoto src={p.img_src} alt={`Listing photo of ${p.address_street ?? "the property"}`} />}
            </div>
            <div className="space-y-4 p-6">
              {!p ? (
                <Skeleton className="h-16 w-2/3" />
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h1 className="text-2xl font-semibold tracking-tight">{p.address_street}</h1>
                      <p className="text-muted-foreground">
                        {p.address_city}, {p.address_state} {p.address_zipcode}
                      </p>
                    </div>
                    <p className="text-2xl font-semibold tabular" data-testid="listing-price">
                      {p.price}
                    </p>
                  </div>
                  <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <BedDouble className="size-4" aria-hidden />
                      <dt className="sr-only">Bedrooms</dt>
                      <dd>{p.beds} beds</dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Bath className="size-4" aria-hidden />
                      <dt className="sr-only">Bathrooms</dt>
                      <dd>{p.baths} baths</dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Ruler className="size-4" aria-hidden />
                      <dt className="sr-only">Area</dt>
                      <dd className="tabular">{p.area?.toLocaleString("en-US")} sqft</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Type</dt>
                      <dd>{titleCaseHomeType(p.home_type)}</dd>
                    </div>
                    {p.time_on_zillow && (
                      <div>
                        <dt className="sr-only">Time on market</dt>
                        <dd>Listed {p.time_on_zillow} ago</dd>
                      </div>
                    )}
                  </dl>
                  {p.detail_url && (
                    <a href={p.detail_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                      View listing <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  )}
                </>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How an underwriting works</CardTitle>
              <CardDescription>Every field you fill in feeds one of three steps. Keep this chain in mind as you work.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="grid gap-4 sm:grid-cols-3">
                {CHAIN.map((step, i) => (
                  <li key={step.title} className="rounded-lg border bg-muted/40 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
                      <step.icon className="size-4 text-muted-foreground" aria-hidden />
                    </div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" aria-hidden /> Market
              </CardTitle>
              <CardDescription>Properties in a market share the same demand patterns.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {market.isPending && property.data?.market_id != null ? (
                <Skeleton className="h-20" />
              ) : market.data ? (
                <>
                  <p className="font-medium" data-testid="market-name">
                    {market.data.name}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{market.data.description}</p>
                  <Badge variant="outline">{market.data.property_count} training cases</Badge>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No market context for this property.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your attempts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {submissions.data && submissions.data.length > 0 ? (
                <ul className="divide-y rounded-lg border">
                  {submissions.data.map((s, i) => (
                    <li key={s.id}>
                      <Link href={`/results/${s.id}`} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-accent">
                        <span className="text-muted-foreground">Attempt {submissions.data.length - i}</span>
                        <span className="flex items-center gap-2">
                          <span className="font-semibold tabular">{Math.round(num(s.accuracy) ?? 0)}</span>
                          <RatingBadge rating={s.rating} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No attempts yet. You&apos;ll see the analyst&apos;s numbers only after you submit.</p>
              )}

              <Button className="w-full" size="lg" onClick={begin} disabled={start.isPending || !p}>
                {start.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
                {draftId != null ? "Resume your draft" : submissions.data && submissions.data.length > 0 ? "Start a new attempt" : "Start underwriting"}
                {!start.isPending && <ArrowRight aria-hidden />}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
