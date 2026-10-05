import { test, expect } from "../fixtures/test";
import { PROPERTIES } from "../fixtures/seed";

test.describe("training dashboard", () => {
  test("lists every case with market, price and an empty progress state", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId(/^property-card-/)).toHaveCount(PROPERTIES.length);
    await expect(page.getByTestId("progress-count")).toContainText("0 of 6 cases submitted");
    await expect(page.getByTestId("average-accuracy")).toHaveText("—");

    const card = page.getByTestId(`property-card-${PROPERTIES[0]!.zpid}`);
    await expect(card).toContainText("1240 Ski View Dr");
    await expect(card).toContainText("$675,000");
    await expect(card).toContainText("Smoky & Blue Ridge Mountains");
    await expect(card).toContainText("Not started");
  });

  test("shows previous scores, progress and filters by status", async ({ page, api }) => {
    api.seedSubmission(PROPERTIES[0]!.zpid, 125_000); // Best
    api.seedSubmission(PROPERTIES[1]!.zpid, 120_000); // 25% above 96k -> Medium
    api.seedDraft(PROPERTIES[2]!.zpid);
    await page.goto("/");

    await expect(page.getByTestId("progress-count")).toContainText("2 of 6 cases submitted");
    await expect(page.getByTestId("average-accuracy")).toHaveText("85");
    await expect(page.getByRole("tab", { name: /Submitted/ })).toContainText("2");
    await expect(page.getByRole("tab", { name: /In progress/ })).toContainText("1");
    await expect(page.getByRole("tab", { name: /Not started/ })).toContainText("3");

    const best = page.getByTestId(`property-card-${PROPERTIES[0]!.zpid}`);
    await expect(best.getByTestId("score-strip")).toContainText(/Latest\s*100/);
    await expect(best.getByTestId("score-strip")).toContainText("Best");
    await expect(page.getByTestId(`property-card-${PROPERTIES[1]!.zpid}`).getByTestId("score-strip")).toContainText(/Latest\s*70/);
    await expect(page.getByTestId(`property-card-${PROPERTIES[2]!.zpid}`)).toContainText("Continue draft");

    await page.getByRole("tab", { name: /^Submitted/ }).click();
    await expect(page.getByTestId(/^property-card-/)).toHaveCount(2);
    await page.getByRole("tab", { name: /In progress/ }).click();
    await expect(page.getByTestId(/^property-card-/)).toHaveCount(1);
  });

  test("an API failure shows a clear error and recovers on retry", async ({ page, api }) => {
    api.failNext("GET /api/dashboard", 500, "Failed to build dashboard");
    await page.goto("/");
    await expect(page.getByTestId("error-state")).toContainText("Failed to build dashboard");

    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByTestId(/^property-card-/)).toHaveCount(PROPERTIES.length);
  });

  test("the property brief gives market context and keeps the analyst's numbers hidden", async ({ page }) => {
    const p = PROPERTIES[1]!; // Broken Bow, reference mid $96,000
    await page.goto("/");
    await page.getByTestId(`property-card-${p.zpid}`).getByRole("link", { name: /Review & start/ }).click();

    await expect(page.getByTestId("market-name")).toHaveText("Broken Bow");
    await expect(page.getByText(/Hochatown \/ Broken Bow luxury cabin market/)).toBeVisible();
    await expect(page.getByTestId("listing-price")).toHaveText("$540,000");
    await expect(page.getByText("No attempts yet")).toBeVisible();

    const text = await page.locator("main").innerText();
    expect(text).not.toContain("96,000");
  });

  test("an unknown property shows an error instead of a blank page", async ({ page }) => {
    await page.goto("/properties/00000000");
    await expect(page.getByTestId("error-state")).toContainText("not found");
  });
});
