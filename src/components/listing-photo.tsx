"use client";

import { useState } from "react";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";

/** Listing photo that degrades to a neutral placeholder if the image fails to load. */
export function ListingPhoto({ src, alt = "", className }: { src: string | null | undefined; alt?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={cn("grid size-full place-items-center bg-muted text-muted-foreground", className)} role={alt ? "img" : undefined} aria-label={alt || undefined} data-testid="photo-fallback">
        <Home className="size-8 opacity-40" aria-hidden />
      </div>
    );
  }
  // Plain <img>: seed photos are placeholders from an external host.
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={cn("size-full object-cover", className)} />;
}
