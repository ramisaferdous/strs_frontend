import type { Metadata } from "next";
import Link from "next/link";
import { Calculator } from "lucide-react";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Underwriting Trainer", template: "%s · Underwriting Trainer" },
  description: "Practice underwriting short-term rental deals and see how close you land to the analyst.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>
          <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
              <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
                <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
                  <Calculator className="size-4" aria-hidden />
                </span>
                Underwriting Trainer
              </Link>
              <nav aria-label="Primary" className="text-sm">
                <Link href="/" className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                  Training dashboard
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
