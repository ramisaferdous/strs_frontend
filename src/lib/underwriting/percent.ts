/**
 * The API speaks fractions (0.20) while the form speaks whole percentages (20).
 * Every crossing of that boundary goes through these two functions so the
 * conversion lives in exactly one tested place.
 */

/** Parses user text such as "$1,250.5" or "7.25%" into a number. NaN when blank or invalid. */
export function parseNumber(text: string): number {
  const cleaned = text.replace(/[$,%\s]/g, "");
  if (cleaned === "") return NaN;
  return Number(cleaned);
}

/** Form percentage text ("7.25") -> API fraction string ("0.0725"). */
export function pctToFraction(text: string): string {
  const n = parseNumber(text);
  return String(Number((n / 100).toFixed(6)));
}

/** API fraction ("0.0725" | 0.2) -> form percentage text ("7.25"). */
export function fractionToPct(fraction: string | number | null | undefined): string {
  if (fraction == null || fraction === "") return "";
  const n = Number(fraction);
  if (!Number.isFinite(n)) return "";
  return String(Number((n * 100).toFixed(4)));
}

/** API money string ("100000.00") -> form text ("100000"). */
export function moneyToText(value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return String(Number(n.toFixed(2)));
}

/** Form money text ("$1,250.50") -> API decimal string ("1250.5"). */
export function textToMoney(text: string): string {
  return String(Number(parseNumber(text).toFixed(2)));
}
