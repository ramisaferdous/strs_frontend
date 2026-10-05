import { test, expect } from "../fixtures/test";
import { PROPERTIES } from "../fixtures/seed";
import { fillFinancials, fillRevenue, startUnderwriting, submitFromReview } from "../pages";

const ZPID = PROPERTIES[0]!.zpid;
const status = (page: import("@playwright/test").Page) => page.getByTestId("save-status");

test.describe("saving & API contract", () => {
  test("percentages cross the API boundary as fractions", async ({ page, api }) => {
    await startUnderwriting(page, ZPID);
    await fillFinancials(page, { optimization: { amount: "50000" }, opex: { monthly: "500" } });
    await fillRevenue(page, 100_000, 120_000, 140_000);
    await expect(status(page)).toHaveAttribute("data-state", "saved");

    const last = api.putRequests().at(-1)!.body!;
    expect(last.purchase_details).toEqual({
      purchase_price: "675000",
      down_payment_pct: "0.2", // typed as 20
      interest_rate: "0.07", // typed as 7
      mortgage_years: 30,
      closing_costs_pct: "0.03", // typed as 3
    });
    expect(last.taxes).toEqual({ land_assumptions_pct: "0.2", sla_multiplier_pct: "0.25", bonus_amount_pct: "0.6", tax_rate_pct: "0.37" });
    expect(last.forecasted_revenue.scenarios.mid).toEqual({ forecasted_revenue: "120000" });
    expect(last.forecasted_revenue.annual_re_appreciation_pct).toBe("0.03");
    expect(last.optimization_items).toEqual([{ category: "Furniture", total_price: "50000" }]);
    expect(last.operating_expenses).toEqual([{ expense_name: "Utilities", monthly_amount: "500" }]);
  });

  test("an incomplete section is never sent, so the API can't 422 a draft", async ({ page, api }) => {
    await startUnderwriting(page, ZPID);
    await page.locator("#downPaymentPct").fill("20"); // interest rate, term and closing still empty
    await expect(status(page)).toHaveAttribute("data-state", "saved");
    await expect(page.getByText("Incomplete sections save once they're complete")).toBeVisible();

    for (const req of api.putRequests()) expect(req.body).not.toHaveProperty("purchase_details");
  });

  test("a failed save is surfaced with a retry, and nothing is lost", async ({ page, api }) => {
    await startUnderwriting(page, ZPID);
    api.failNext("PUT /api/underwritings", 500, "Database unavailable");
    await fillFinancials(page);

    await expect(status(page)).toHaveAttribute("data-state", "error");
    await expect(status(page)).toContainText("Couldn't save");
    await expect(status(page)).toContainText("Database unavailable");
    await expect(page.locator("#downPaymentPct")).toHaveValue("20");

    await status(page).getByRole("button", { name: "Retry" }).click();
    await expect(status(page)).toHaveAttribute("data-state", "saved");
  });

  test("a saved draft survives a reload, shown back as whole percentages", async ({ page }) => {
    await startUnderwriting(page, ZPID);
    await fillFinancials(page, { down: "25", rate: "6.5", years: "15", closing: "2.5", opex: { monthly: "400" } });
    await fillRevenue(page, 90_000, 110_000, 130_000);
    await expect(status(page)).toHaveAttribute("data-state", "saved");

    await page.reload();
    await expect(page.locator("#downPaymentPct")).toHaveValue("25");
    await expect(page.locator("#interestRate")).toHaveValue("6.5");
    await expect(page.locator("#mortgageYears")).toHaveValue("15");
    await expect(page.locator("#closingCostsPct")).toHaveValue("2.5");
    await expect(page.getByLabel("Operating expense 1 monthly amount")).toHaveValue("400");
    await page.getByTestId("step-analysis").click();
    await expect(page.locator("#midRevenue")).toHaveValue("110000");
  });

  test("the dashboard offers to continue a draft", async ({ page }) => {
    await startUnderwriting(page, ZPID);
    await fillFinancials(page);
    await expect(status(page)).toHaveAttribute("data-state", "saved");

    await page.goto("/");
    const card = page.getByTestId(`property-card-${ZPID}`);
    await expect(card).toContainText("In progress");
    await card.getByRole("link", { name: /Continue draft/ }).click();
    await expect(page.locator("#downPaymentPct")).toHaveValue("20");
  });

  test("a failed submission keeps the work and can be retried", async ({ page, api }) => {
    await startUnderwriting(page, ZPID);
    await fillFinancials(page);
    await fillRevenue(page, 100_000, 125_000, 150_000);

    api.failNext("POST /api/underwritings", 500, "Grader offline");
    await submitFromReview(page);
    await expect(page.getByText("Couldn't submit your underwriting")).toBeVisible();
    await expect(page.getByText("Grader offline")).toBeVisible();
    await expect(page).toHaveURL(/\/underwriting\/\d+/);

    await page.getByTestId("submit-underwriting").click();
    await page.getByTestId("confirm-submit").click();
    await page.waitForURL(/\/results\/\d+/);
    await expect(page.getByTestId("score-value")).toHaveText("100");
  });

  test("a submitted underwriting is final", async ({ page }) => {
    await startUnderwriting(page, ZPID);
    const url = page.url();
    await fillFinancials(page);
    await fillRevenue(page, 100_000, 125_000, 150_000);
    await submitFromReview(page);
    await page.waitForURL(/\/results\/\d+/);

    await page.goto(url);
    await expect(page.getByText("This underwriting was already submitted")).toBeVisible();
    await page.getByRole("link", { name: "View result" }).click();
    await expect(page.getByTestId("score-card")).toBeVisible();
  });
});
