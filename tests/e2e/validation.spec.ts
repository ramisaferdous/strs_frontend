import { test, expect } from "../fixtures/test";
import { PROPERTIES } from "../fixtures/seed";
import { fillFinancials, fillRevenue, openStep, startUnderwriting } from "../pages";

const ZPID = PROPERTIES[0]!.zpid;

test.describe("review & validation", () => {
  test("an untouched workspace lists every missing input and blocks submission", async ({ page }) => {
    await startUnderwriting(page, ZPID);
    await openStep(page, "review");

    await expect(page.getByTestId("review-banner")).toHaveAttribute("data-ready", "false");
    await expect(page.getByTestId("review-banner")).toContainText("7 items need attention");

    const financials = page.getByTestId("issues-financials");
    for (const label of ["Down payment %", "Interest rate %", "Loan term (years)", "Closing costs %"]) {
      await expect(financials).toContainText(label);
    }
    const analysis = page.getByTestId("issues-analysis");
    for (const label of ["Low revenue", "Mid revenue", "High revenue"]) {
      await expect(analysis).toContainText(label);
    }

    // Trying to submit anyway explains why instead of sending a doomed request.
    await page.getByTestId("submit-underwriting").click();
    await expect(page.getByText("7 items need attention").first()).toBeVisible();
    await expect(page.getByTestId("confirm-submit")).toHaveCount(0);
  });

  test("clicking an issue jumps to the exact field", async ({ page }) => {
    await startUnderwriting(page, ZPID);
    await openStep(page, "review");
    await page.getByTestId("issues-analysis").getByRole("button", { name: /Mid revenue/ }).click();

    await expect(page.locator("#midRevenue")).toBeFocused();
    await expect(page.getByTestId("step-analysis")).toHaveAttribute("aria-current", "step");
  });

  test("inline errors explain what is wrong with each field", async ({ page }) => {
    await startUnderwriting(page, ZPID);
    await page.locator("#downPaymentPct").fill("150");
    await page.locator("#interestRate").fill("abc");
    await page.locator("#mortgageYears").fill("2.5");
    await page.locator("#closingCostsPct").fill("-1");
    await page.locator("#closingCostsPct").blur();

    await expect(page.locator("#downPaymentPct-error")).toHaveText("Must be between 0 and 100");
    await expect(page.locator("#interestRate-error")).toHaveText("Enter a number");
    await expect(page.locator("#mortgageYears-error")).toHaveText("Use a whole number");
    await expect(page.locator("#closingCostsPct-error")).toHaveText("Must be between 0 and 100");
    await expect(page.locator("#downPaymentPct")).toHaveAttribute("aria-invalid", "true");
  });

  test("Low must not exceed Mid, and Mid must not exceed High", async ({ page }) => {
    await startUnderwriting(page, ZPID);
    await fillRevenue(page, 130_000, 120_000, 110_000);
    await page.locator("#highRevenue").blur();

    await expect(page.locator("#lowRevenue-error")).toHaveText("Low can't be above Mid");
    await expect(page.locator("#highRevenue-error")).toHaveText("High can't be below Mid");

    await page.locator("#lowRevenue").fill("100000");
    await page.locator("#highRevenue").fill("140000");
    await expect(page.locator("#lowRevenue-error")).toHaveCount(0);
    await expect(page.locator("#highRevenue-error")).toHaveCount(0);
  });

  test("a half-filled line item is flagged, and blank rows are ignored", async ({ page }) => {
    await startUnderwriting(page, ZPID);
    await fillFinancials(page);
    await page.getByRole("button", { name: "Add operating expense" }).click();
    await page.getByLabel("Operating expense 1 name").fill("Internet");
    await page.getByRole("button", { name: "Add operating expense" }).click(); // stays blank
    await page.getByLabel("Operating expense 1 monthly amount").blur();

    await expect(page.getByRole("alert").filter({ hasText: "Required" })).toBeVisible();

    await fillRevenue(page, 80_000, 100_000, 120_000);
    await openStep(page, "review");
    await expect(page.getByTestId("review-banner")).toContainText("1 item needs attention");
    await expect(page.getByTestId("issues-financials")).toContainText("Operating expense 1 · Monthly amount");

    await page.getByTestId("issues-financials").getByRole("button").click();
    await page.getByLabel("Operating expense 1 monthly amount").fill("250");
    await openStep(page, "review");
    await expect(page.getByTestId("review-banner")).toHaveAttribute("data-ready", "true");
  });

  test("a deal with no cash going in is rejected", async ({ page }) => {
    await startUnderwriting(page, ZPID);
    await fillFinancials(page, { down: "0", closing: "0" });
    await page.locator("#closingCostsPct").blur();
    await expect(page.locator("#downPaymentPct-error")).toHaveText("Total out of pocket must be above $0");
  });

  test("a complete, valid workspace is ready; soft warnings never block it", async ({ page }) => {
    await startUnderwriting(page, ZPID);
    await fillFinancials(page); // note: no operating expenses
    await fillRevenue(page, 80_000, 100_000, 120_000);
    await openStep(page, "review");

    await expect(page.getByTestId("review-banner")).toHaveAttribute("data-ready", "true");
    await expect(page.getByText("No operating expenses entered")).toBeVisible();
    await expect(page.getByTestId("submit-underwriting")).toBeEnabled();
  });

  test("percentages in the form are whole numbers and live previews match the formulas", async ({ page }) => {
    await startUnderwriting(page, ZPID);
    await fillFinancials(page, { optimization: { amount: "50000" }, opex: { monthly: "500" } });
    await fillRevenue(page, 100_000, 120_000, 140_000);

    // $675,000 purchase: 20% down + 3% closing + $50,000 setup = $205,250 out of pocket.
    await expect(page.getByTestId("snapshot-oop")).toHaveText("$205,250");
    await expect(page.getByTestId("snapshot-coc")).toHaveText("34.5%");
    await expect(page.getByTestId("cash-on-cash-low")).toHaveText("24.9%");
    await expect(page.getByTestId("cash-on-cash-high")).toHaveText("44.2%");
  });
});
