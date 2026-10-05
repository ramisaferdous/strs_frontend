/** The six training cases from the assessment's seed data, with the analyst's reference Mid revenue. */
export interface SeedProperty {
  zpid: string;
  street: string;
  city: string;
  state: string;
  zipcode: string;
  price: number;
  beds: number;
  baths: number;
  area: number;
  marketId: number;
  /** Analyst reference Mid revenue. The UI must never show this before submission. */
  referenceMid: number;
}

export const MARKETS = [
  { id: 1, name: "Smoky & Blue Ridge Mountains", slug: "smoky-blue-ridge-mountains", state: null, region: "Southern Appalachia", property_count: 3, description: "Drive-to cabin market spanning the Tennessee Smokies and the north Georgia mountains. Year-round demand; views and hot tubs carry ADR." },
  { id: 2, name: "Broken Bow", slug: "broken-bow", state: "OK", region: "Ouachita Mountains", property_count: 1, description: "Hochatown / Broken Bow luxury cabin market fed by DFW and OKC. New-build heavy, light regulation, weekend-weighted occupancy." },
  { id: 3, name: "Central Florida", slug: "central-florida", state: "FL", region: "Orlando Metro", property_count: 1, description: "Theme-park resort communities around Kissimmee and Davenport. Large themed homes, HOA-governed, cohost-friendly, steady year-round." },
  { id: 4, name: "Texas Gulf Coast", slug: "texas-gulf-coast", state: "TX", region: "Coastal Bend", property_count: 1, description: "Port Aransas and Mustang Island beach market. Heavy summer seasonality and windstorm insurance, offset by top-decile peak ADR." },
];

export const PROPERTIES: SeedProperty[] = [
  { zpid: "41234567", street: "1240 Ski View Dr", city: "Gatlinburg", state: "TN", zipcode: "37738", price: 675000, beds: 3, baths: 3, area: 2150, marketId: 1, referenceMid: 125000 },
  { zpid: "52345678", street: "88 Lakeshore Ln", city: "Broken Bow", state: "OK", zipcode: "74728", price: 540000, beds: 2, baths: 2, area: 1600, marketId: 2, referenceMid: 96000 },
  { zpid: "63456789", street: "3402 Palm Isle Ct", city: "Kissimmee", state: "FL", zipcode: "34747", price: 895000, beds: 6, baths: 5.5, area: 3400, marketId: 3, referenceMid: 165000 },
  { zpid: "74567890", street: "215 Aspen Ridge Rd", city: "Blue Ridge", state: "GA", zipcode: "30513", price: 725000, beds: 4, baths: 3.5, area: 2600, marketId: 1, referenceMid: 128000 },
  { zpid: "85678901", street: "9 Dune Walk", city: "Port Aransas", state: "TX", zipcode: "78373", price: 1150000, beds: 5, baths: 4, area: 2900, marketId: 4, referenceMid: 192000 },
  { zpid: "96789012", street: "47 Cedar Hollow Rd", city: "Sevierville", state: "TN", zipcode: "37876", price: 449000, beds: 2, baths: 2, area: 1350, marketId: 1, referenceMid: 80000 },
];

export const byZpid = (zpid: string) => PROPERTIES.find((p) => p.zpid === zpid)!;

export type Band = "best" | "medium" | "low";

/**
 * Independent re-statement of the grading rule from the brief. Integer math
 * avoids float noise at the exact 10% / 25% boundaries (both are inclusive).
 */
export function expectedBand(candidate: number, reference: number): { band: Band; accuracy: number } {
  const diff = Math.abs(candidate - reference) * 100;
  if (diff <= reference * 10) return { band: "best", accuracy: 100 };
  if (diff <= reference * 25) return { band: "medium", accuracy: 70 };
  return { band: "low", accuracy: 40 };
}
