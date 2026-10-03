const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type Maybe = number | null | undefined;

export function money(n: Maybe, opts: { cents?: boolean } = {}): string {
  if (n == null || Number.isNaN(n)) return "—";
  return (opts.cents ? usd2 : usd0).format(n);
}

/** `fraction` is 0.3454 -> "34.5%". */
export function percent(fraction: Maybe, digits = 1): string {
  if (fraction == null || Number.isNaN(fraction)) return "—";
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function ratio(n: Maybe, digits = 2): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

/** API decimal string -> number (null when absent). */
export function num(s: string | number | null | undefined): number | null {
  if (s == null || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function titleCaseHomeType(t: string | null | undefined): string {
  if (!t) return "Home";
  return t
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
