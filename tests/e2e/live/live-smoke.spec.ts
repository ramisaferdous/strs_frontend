import { test, expect } from "@playwright/test";
import { completeAndSubmit } from "../../pages";

/**
 * Runs the real app against the real Docker API on :8000
 * (`npm run test:e2e:live`). Assertions avoid anything that depends on how many
 * attempts earlier runs left behind, so it is safe to re-run without reseeding.
 */

test.beforeAll(async ({ request }) => {
  const res = await request.get("http://localhost:8000/api/dashboard").catch(() => null);
  test.skip(!res?.ok(), "Backend not reachable on :8000. Start it with `docker compose up -d --build` in backend/.");
});

const KISSIMMEE = "63456789"; // reference Mid $165,000

test("real API: an accurate forecast scores 100", async ({ page }) => {
  await completeAndSubmit(page, KISSIMMEE, 170_000);
  await expect(page.getByTestId("score-value")).toHaveText("100");
  await expect(page.getByTestId("score-explanation")).toContainText("$165,000");
  await expect(page.getByTestId("leaderboard-rank")).toContainText(/#\d+ of \d+/);
});

test("real API: a far-off forecast scores 40 and explains the miss", async ({ page }) => {
  await completeAndSubmit(page, KISSIMMEE, 300_000);
  await expect(page.getByTestId("score-value")).toHaveText("40");
  await expect(page.getByTestId("score-nudge")).toContainText("$123,750 and $206,250");
});

test("real API: server-calculated Total Out of Pocket agrees with the live preview", async ({ page }) => {
  await completeAndSubmit(page, KISSIMMEE, 165_000);
  // $895,000 purchase: 20% down ($179,000) + 3% closing ($26,850) = $205,850.
  await expect(page.getByText("$205,850")).toBeVisible();
});
