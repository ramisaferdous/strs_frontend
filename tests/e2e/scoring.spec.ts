import { test, expect } from "../fixtures/test";
import { expectedBand, PROPERTIES } from "../fixtures/seed";
import { completeAndSubmit } from "../pages";

/**
 * Data-driven grading coverage. Cases are generated from the seed table in the
 * brief (reference Mid revenue per property), so adding a property adds tests.
 * Expected scores come from `expectedBand`, a re-statement of the rule that
 * shares no code with the app.
 */

const LABEL = { best: "Best", medium: "Medium", low: "Low" } as const;

interface Case {
  name: string;
  zpid: string;
  mid: number;
}

// One representative forecast per band, for every property.
const representative: Case[] = PROPERTIES.flatMap((p) => [
  { name: `${p.street}: exact match`, zpid: p.zpid, mid: p.referenceMid },
  { name: `${p.street}: 20% high`, zpid: p.zpid, mid: Math.round(p.referenceMid * 1.2) },
  { name: `${p.street}: 50% high`, zpid: p.zpid, mid: Math.round(p.referenceMid * 1.5) },
]);

// Edge values on the first property (reference $125,000). Both limits count in the trainee's favor.
const first = PROPERTIES[0]!;
const boundaries: Case[] = [
  { name: "exactly 10% below is still Best", zpid: first.zpid, mid: 112_500 },
  { name: "exactly 10% above is still Best", zpid: first.zpid, mid: 137_500 },
  { name: "$1 past 10% below drops to Medium", zpid: first.zpid, mid: 112_499 },
  { name: "$1 past 10% above drops to Medium", zpid: first.zpid, mid: 137_501 },
  { name: "exactly 25% below is still Medium", zpid: first.zpid, mid: 93_750 },
  { name: "exactly 25% above is still Medium", zpid: first.zpid, mid: 156_250 },
  { name: "$1 past 25% below drops to Low", zpid: first.zpid, mid: 93_749 },
  { name: "$1 past 25% above drops to Low", zpid: first.zpid, mid: 156_251 },
];

for (const c of [...representative, ...boundaries]) {
  const reference = PROPERTIES.find((p) => p.zpid === c.zpid)!.referenceMid;
  const { band, accuracy } = expectedBand(c.mid, reference);

  test(`scores ${LABEL[band]} (${accuracy}) · ${c.name} · $${c.mid.toLocaleString("en-US")}`, async ({ page }) => {
    await completeAndSubmit(page, c.zpid, c.mid);

    const card = page.getByTestId("score-card");
    await expect(card).toHaveAttribute("data-rating", band);
    await expect(page.getByTestId("score-value")).toHaveText(String(accuracy));
    await expect(page.getByTestId("score-band")).toContainText(LABEL[band]);

    // The score is explained, not just stated: both numbers and the direction of the miss.
    const explanation = page.getByTestId("score-explanation");
    await expect(explanation).toContainText(`$${c.mid.toLocaleString("en-US")}`);
    await expect(explanation).toContainText(`$${reference.toLocaleString("en-US")}`);
    await expect(explanation).toContainText(c.mid === reference ? /above|below/ : c.mid > reference ? "above" : "below");
  });
}
