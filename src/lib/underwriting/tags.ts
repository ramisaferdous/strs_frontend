export const DEAL_TAGS = [
  { key: "turnkey", label: "Turnkey", hint: "Ready to host with minimal work." },
  { key: "furnished", label: "Furnished", hint: "Sells with furniture, or furnishing is already planned." },
  { key: "luxury", label: "Luxury", hint: "High-end finishes and a premium nightly rate." },
  { key: "tax_efficient", label: "Tax Efficient", hint: "Depreciation meaningfully offsets income." },
  { key: "new_construction", label: "New Construction", hint: "Built recently or still being built." },
  { key: "existing_airbnb", label: "Existing Airbnb", hint: "Already operating as a short-term rental." },
  { key: "arv", label: "ARV", hint: "Value depends on after-repair value." },
  { key: "high_cash_on_cash", label: "High Cash-on-Cash", hint: "Returns look strong relative to cash in." },
  { key: "low_cash_on_cash", label: "Low Cash-on-Cash", hint: "Returns look thin relative to cash in." },
  { key: "add_inground_pool", label: "Add In-ground Pool", hint: "A pool is part of the upside plan." },
  { key: "waterfront", label: "Waterfront", hint: "On or directly adjacent to water." },
  { key: "remote", label: "Remote", hint: "Isolated location, away from town." },
  { key: "can_support_cohost", label: "Can Support Co-host", hint: "Margins leave room for a co-host fee." },
] as const;

export type TagKey = (typeof DEAL_TAGS)[number]["key"];
export type TagValues = Record<TagKey, boolean>;

export const emptyTags = (): TagValues =>
  Object.fromEntries(DEAL_TAGS.map((t) => [t.key, false])) as TagValues;
