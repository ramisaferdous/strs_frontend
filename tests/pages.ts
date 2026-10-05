import { expect, type Page } from "@playwright/test";

export interface Financials {
  down?: string;
  rate?: string;
  years?: string;
  closing?: string;
  optimization?: { category?: string; amount: string };
  opex?: { name?: string; monthly: string };
}

/** Start a fresh attempt the way a trainee would: dashboard, brief, then "Start". */
export async function startUnderwriting(page: Page, zpid: string) {
  await page.goto("/");
  await page.getByTestId(`property-card-${zpid}`).getByRole("link", { name: /Review & start|Try again/ }).click();
  await page.getByRole("button", { name: /Start underwriting|Start a new attempt/ }).click();
  await page.waitForURL(/\/underwriting\/\d+/);
  await expect(page.locator("#downPaymentPct")).toBeVisible();
}

export async function fillFinancials(page: Page, f: Financials = {}) {
  await page.locator("#downPaymentPct").fill(f.down ?? "20");
  await page.locator("#interestRate").fill(f.rate ?? "7");
  await page.locator("#mortgageYears").fill(f.years ?? "30");
  await page.locator("#closingCostsPct").fill(f.closing ?? "3");
  if (f.optimization) {
    await page.getByRole("button", { name: "Add optimization item" }).click();
    await page.getByLabel("Optimization item 1 category").fill(f.optimization.category ?? "Furniture");
    await page.getByLabel("Optimization item 1 amount").fill(f.optimization.amount);
  }
  if (f.opex) {
    await page.getByRole("button", { name: "Add operating expense" }).click();
    await page.getByLabel("Operating expense 1 name").fill(f.opex.name ?? "Utilities");
    await page.getByLabel("Operating expense 1 monthly amount").fill(f.opex.monthly);
  }
}

export async function openStep(page: Page, step: "financials" | "analysis" | "tags" | "review") {
  await page.getByTestId(`step-${step}`).click();
}

export async function fillRevenue(page: Page, low: number | string, mid: number | string, high: number | string) {
  await openStep(page, "analysis");
  await page.locator("#lowRevenue").fill(String(low));
  await page.locator("#midRevenue").fill(String(mid));
  await page.locator("#highRevenue").fill(String(high));
}

export async function submitFromReview(page: Page) {
  await openStep(page, "review");
  await page.getByTestId("submit-underwriting").click();
  await page.getByTestId("confirm-submit").click();
}

/** Complete every required input around a chosen Mid forecast, submit, and land on results. */
export async function completeAndSubmit(page: Page, zpid: string, mid: number) {
  await startUnderwriting(page, zpid);
  await fillFinancials(page, { opex: { monthly: "500" } });
  await fillRevenue(page, Math.round(mid * 0.8), mid, Math.round(mid * 1.2));
  await submitFromReview(page);
  await page.waitForURL(/\/results\/\d+/);
  await expect(page.getByTestId("score-card")).toBeVisible();
}
