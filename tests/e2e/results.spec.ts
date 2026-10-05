import { test, expect } from "../fixtures/test";
import { PROPERTIES } from "../fixtures/seed";
import { completeAndSubmit } from "../pages";

const SKI = PROPERTIES[0]!; // reference mid $125,000

test.describe("evaluation results", () => {
  test("Best: no nudge, and the deviation is stated", async ({ page }) => {
    await completeAndSubmit(page, SKI.zpid, 130_000);
    await expect(page.getByTestId("score-headline")).toHaveText("Excellent forecast");
    await expect(page.getByTestId("score-deviation")).toHaveText("4.0%");
    await expect(page.getByTestId("score-explanation")).toContainText("4.0% above");
    await expect(page.getByTestId("score-nudge")).toHaveCount(0);
  });

  test("Medium: says how to reach Best", async ({ page }) => {
    await completeAndSubmit(page, SKI.zpid, 150_000);
    await expect(page.getByTestId("score-value")).toHaveText("70");
    await expect(page.getByTestId("score-deviation")).toHaveText("20.0%");
    await expect(page.getByTestId("score-nudge")).toContainText("$112,500 and $137,500");
  });

  test("Low: says how to reach Medium", async ({ page }) => {
    await completeAndSubmit(page, SKI.zpid, 75_000);
    await expect(page.getByTestId("score-value")).toHaveText("40");
    await expect(page.getByTestId("score-explanation")).toContainText("40.0% below");
    await expect(page.getByTestId("score-nudge")).toContainText("$93,750 and $156,250");
  });

  test("the band scale describes both forecasts for assistive tech", async ({ page }) => {
    await completeAndSubmit(page, SKI.zpid, 130_000);
    await expect(page.getByRole("img", { name: /Best band \$112,500 to \$137,500.*you forecast \$130,000/ })).toBeVisible();
  });

  test("the results page shows the underwriting's own returns", async ({ page }) => {
    await completeAndSubmit(page, SKI.zpid, 125_000);
    await expect(page.getByText("Your underwriting at a glance")).toBeVisible();
    // $675,000 purchase: $135,000 down (20%) + $20,250 closing (3%) = $155,250 out of pocket.
    await expect(page.getByText("$155,250")).toBeVisible();
  });
});

test.describe("leaderboard", () => {
  test("ranks attempts by accuracy, breaking ties on the smaller deviation", async ({ page, api }) => {
    api.seedSubmission(SKI.zpid, 127_500); // Best, 2.0% off
    api.seedSubmission(SKI.zpid, 125_000); // Best, 0.0% off
    api.seedSubmission(SKI.zpid, 126_250); // Best, 1.0% off
    await completeAndSubmit(page, SKI.zpid, 128_750); // Best, 3.0% off -> 4th

    await expect(page.getByTestId("leaderboard-rank")).toContainText("#4 of 4");
    const rows = page.getByTestId("leaderboard").getByRole("listitem");
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(0)).toContainText("0.0% off the analyst");
    await expect(rows.nth(3)).toContainText("3.0% off the analyst");
    await expect(rows.nth(3)).toHaveAttribute("aria-current", "true");
  });

  test("a rank outside the top five is still shown, after an ellipsis", async ({ page, api }) => {
    for (const mid of [125_000, 126_250, 127_500, 128_750, 143_750, 147_500]) api.seedSubmission(SKI.zpid, mid);
    await completeAndSubmit(page, SKI.zpid, 150_000); // Medium, 20% off -> 7th

    await expect(page.getByTestId("leaderboard-rank")).toContainText("#7 of 7");
    const rows = page.getByTestId("leaderboard").getByRole("listitem");
    await expect(rows).toHaveCount(5 + 1); // top five plus the trainee; the "···" gap is decorative (aria-hidden)
    await expect(page.getByTestId("leaderboard").getByText("···")).toBeVisible();
    await expect(rows.last()).toHaveAttribute("aria-current", "true");
    await expect(rows.last()).toContainText("70");
  });

  test("'Try this property again' starts a fresh, empty attempt", async ({ page }) => {
    await completeAndSubmit(page, SKI.zpid, 150_000);
    await page.getByRole("button", { name: /Try this property again/ }).click();
    await page.waitForURL(/\/underwriting\/\d+/);
    await expect(page.locator("#downPaymentPct")).toHaveValue("");
    await expect(page.locator("#purchasePrice")).toHaveValue("675000");
  });

  test("an unknown result shows an error instead of a blank page", async ({ page }) => {
    await page.goto("/results/9999");
    await expect(page.getByTestId("error-state")).toContainText("No submission");
  });
});
