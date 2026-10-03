/** Wire types for the training API. Decimals arrive as strings; percentages are fractions (0.20 = 20%). */

export type Rating = "best" | "medium" | "low";
export type TrainingStatus = "not_started" | "in_progress" | "submitted";

export interface MarketSummary {
  id: number;
  name: string;
  slug: string;
  state: string | null;
}

export interface Property {
  zpid: string;
  img_src: string | null;
  detail_url: string | null;
  price: string | null;
  unformatted_price: string | null;
  address: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zipcode: string | null;
  beds: number | null;
  baths: number | null;
  area: number | null;
  home_type: string | null;
  home_status: string | null;
  time_on_zillow: string | null;
  market_id: number | null;
  market: MarketSummary | null;
}

export interface Market {
  id: number;
  name: string;
  slug: string;
  state: string | null;
  region: string | null;
  description: string | null;
  property_count: number;
}

export interface DashboardProperty {
  zpid: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  price: string | null;
  unformatted_price: string | null;
  beds: number | null;
  baths: number | null;
  area: number | null;
  img_src: string | null;
  home_type: string | null;
  market_id: number | null;
  market_name: string | null;
  status: TrainingStatus;
  attempts: number;
  latest_accuracy: string | null;
  latest_rating: Rating | null;
  best_accuracy: string | null;
  best_rating: Rating | null;
  active_underwriting_id: number | null;
  latest_submission_id: number | null;
}

export interface DashboardSummary {
  total_properties: number;
  submitted: number;
  in_progress: number;
  not_started: number;
  average_accuracy: string | null;
}

export interface Dashboard {
  summary: DashboardSummary;
  properties: DashboardProperty[];
}

export interface ScenarioResult {
  forecasted_revenue: string;
  operating_expenses_annual: string;
  co_hosting_fee: string;
  net_operating_income: string;
  debt_service_annual: string;
  annual_free_cash_flow: string;
  principal_pay_down: string;
  annual_re_appreciation: string;
  annual_total_re_return_pct: string;
  cash_on_cash_pct: string;
}

export interface UnderwritingDetail {
  purchase_details: Record<string, string | number> | null;
  y1_coc_incl_tax_savings: { low_pct?: string; mid_pct?: string; high_pct?: string } | null;
  forecasted_revenue: {
    co_hosting_fee_pct?: string;
    annual_re_appreciation_pct?: string;
    scenarios?: Partial<Record<"low" | "mid" | "high", Partial<ScenarioResult>>>;
  } | null;
}

export interface UnderwritingTaxes {
  land_assumptions_pct: string | null;
  sla_multiplier_pct: string | null;
  bonus_amount_pct: string | null;
  tax_rate_pct: string | null;
  tax_savings: string | null;
}

export interface Underwriting {
  id: number;
  zpid: string | null;
  is_reference: boolean;
  deal_status: string | null;
  deal_submitted: string | null;
  property_address: string | null;
  purchase_price: string | null;
  total_oop: string | null;
  prr: string | null;
  mid_gross_revenue: string | null;
  m_cash_on_cash: string | null;
  detail: UnderwritingDetail | null;
  taxes: UnderwritingTaxes | null;
  optimization_items: { id: number; category: string | null; total_price: string | null }[];
  operating_expenses: { id: number; expense_name: string | null; monthly_amount: string | null }[];
  // Deal tags are flat booleans on the underwriting row.
  [tag: string]: unknown;
}

export interface ScoreBreakdown {
  rating: Rating;
  accuracy: string;
  metric: string;
  label: string;
  candidate: string | null;
  reference: string | null;
  deviation: string;
  best_threshold: string;
  medium_threshold: string;
}

export interface Submission {
  id: number;
  underwriting_id: number;
  zpid: string;
  rating: Rating;
  accuracy: string;
  breakdown: ScoreBreakdown;
  submitted_at: string;
}

export interface SubmitResult {
  submission: Submission;
  underwriting: Underwriting;
  dashboard: Dashboard;
}

/** Request body for PUT /underwritings/{id} and POST .../submit. All sections optional. */
export interface SavePayload {
  purchase_details?: {
    purchase_price: string;
    down_payment_pct: string;
    interest_rate: string;
    mortgage_years: number;
    closing_costs_pct: string;
  };
  forecasted_revenue?: {
    co_hosting_fee_pct: string;
    annual_re_appreciation_pct: string;
    scenarios: Record<"low" | "mid" | "high", { forecasted_revenue: string }>;
  };
  taxes?: {
    land_assumptions_pct: string;
    sla_multiplier_pct: string;
    bonus_amount_pct: string;
    tax_rate_pct: string;
  };
  optimization_items?: { category: string | null; total_price: string | null }[];
  operating_expenses?: { expense_name: string | null; monthly_amount: string | null }[];
  tags?: Record<string, boolean | number | null>;
}
