# Underwriting Trainer (frontend)

Frontend for the STR Search underwriting training platform. A trainee picks a property, underwrites it, submits, and sees how close their Mid revenue forecast landed to the analyst's, with an explanation and a leaderboard position.

**Stack:** Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS 4, shadcn/ui components on Radix, TanStack Query, React Hook Form + Zod, Playwright, Vitest.

## Setup

```bash
# 1. Backend (needs Docker)
git clone https://github.com/fahimstrsearch/strs_fe_assessment_v1.git
cd strs_fe_assessment_v1/backend && docker compose up -d --build
# check: http://localhost:8000/api/dashboard lists six properties

# 2. Frontend (this repo)
cp .env.example .env.local        # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npx playwright install chromium   # first run only, for the e2e tests
npm run dev                       # http://localhost:3000
```

`npm run dev` compiles each page the first time it is opened, so first clicks are slow. For production speed, run `npm run build && npm start`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server on :3000 |
| `npm run build` / `npm start` | Production build and server on :3000 |
| `npm run typecheck` | TypeScript, strict |
| `npm run test:unit` | Vitest: percent conversion, calculator, validation, mappers |
| ` | **Main suite.** Playwright against an in-memory fake API. Deterministic, no Docker needed |
| `npm run test:e2e:live` | Playwright smoke tests against the real API on :8000 (skips itself if the API is down) |
| `npm run test:e2e:all` | Both projects: the 55 mocked tests plus the 3 live smoke tests |
| `npm run test:e2e:report` | Open the HTML report from the last run |

`npm run test:e2e` builds the app itself and serves it on :3100. The build goes to `.next-e2e/`, so it never clashes with a running `npm run dev`.

## The workflow

1. **Dashboard:** every training case with its status, previous and best score, attempt count, overall progress and average accuracy, plus filters for not started, in progress and submitted.
2. **Property brief:** listing facts, the market description, the three-step underwriting chain, and past attempts. The analyst's numbers are never shown before submission.
3. **Workspace:** four steps, Financials → Analysis → Deal Tags → Review & submit, with a sticky **Deal snapshot** beside them.
4. **Review:** a checklist of every missing or invalid input that jumps to the exact field, plus warnings that don't block submission. Submitting asks for confirmation.
5. **Results:** the score, how far off the forecast was and in which direction, a scale showing where both forecasts sit in the grading bands, what would reach the next band, the deal's own returns, and the leaderboard.

## Design decisions

**The layout follows the underwriting chain.** The brief reduces every deal to three questions: what it costs (Total Out of Pocket), what it earns (Annual Free Cash Flow), and how good the return is (Cash-on-Cash). The steps follow that order. Financials is "what the deal costs" and Analysis is "what the deal earns". Each input card has a badge naming the output it feeds, for example "Feeds Total Out of Pocket". The Deal snapshot shows the same three numbers as a numbered chain that fills in as the trainee types, so they always see how an input moves the headline result.

**A stepper instead of one long form.** Fifteen numeric inputs, two variable-length lists and thirteen tags are a lot on one screen. Steps keep each screen focused and give a natural order for a new analyst, but they never lock anyone in: any step can be opened at any time, and each step's badge shows whether it is complete or how many items need fixing.

**Errors appear when they help.** A field shows its error after the trainee leaves it, and a whole step is checked when they leave that step, so an untouched workspace isn't covered in red. When a rule depends on two fields (Low ≤ Mid ≤ High, or out of pocket above $0), leaving either field re-checks the other. Once an error is showing, it clears as soon as the value is fixed. The Review step lists everything left and links to each field, so submitting is never a guessing game.

**Live preview, API as the source of truth.** `src/lib/underwriting/calc.ts` mirrors the documented formulas so every number updates while typing. The API still recalculates on every save and submit, and an opt-in parity test (below) checks the two agree.

**Saving is automatic and safe.** Work autosaves after a short pause, with a visible status ("Saving…", "All changes saved") and a Retry button if a save fails. The API rejects half-filled sections, so only complete, valid sections are sent and incomplete work stays in the form. Saves are queued one at a time, so an older response can never overwrite newer work. Closing the tab with unsaved changes asks for confirmation.

**Numbers are easy to read.** Dollars are formatted with separators, percentages are shown and typed as whole numbers (20 = 20%), figures use tabular digits so columns line up, and the returns table highlights the Mid column because that is the scenario that gets graded.

**The score is explained, not just shown.** The results page opens with the score and a plain sentence: "You forecasted $130,000 for Mid revenue. The analyst forecasted $125,000, so you were 4.0% above." The band scale shows where both forecasts fall, and the nudge says what range would reach the next band. The point is for the trainee to learn something from every attempt.

**Guarding against values the API can't store.** The API stores money in `NUMERIC(12,2)` columns and ratios in `NUMERIC(6,4)` columns, and values that don't fit make it fail with a 500. The form caps purchase price and revenues at $100M and line items at $10M. It also blocks saving when a calculated value would overflow (for example Mid revenue over 100× the price, or Cash-on-Cash above 10,000%), with a message on the field to fix.

## Code structure

```
src/
  app/                 routes: dashboard, property brief, underwriting workspace, results
  components/ui/       shadcn/ui components
  components/          shared domain pieces (status and rating badges, error state)
  features/            one folder per screen: dashboard, property, underwriting, results
  lib/api/             typed fetch client, API types, TanStack Query hooks
  lib/underwriting/    form schema and validation, calculator, form <-> API mappers, percent conversion
tests/
  e2e/                 Playwright specs (live/ holds the opt-in real-API smoke tests)
  fixtures/            in-memory fake API, seed data, test fixture
  pages.ts             shared steps (start an attempt, fill financials, submit, ...)
```

- **Percentages:** the form uses whole numbers and the API uses fractions (0.20 = 20%). All conversion lives in `percent.ts` and is unit tested.
- **One validation source:** a single Zod schema drives inline errors, step badges and the Review checklist, so they can't disagree.
- **Leaderboard:** the API has no leaderboard endpoint, so it is built from `GET /api/submissions`, ranked by accuracy, then smaller deviation, then earlier attempt.

## Testing strategy

**Fixtures.** The main suite replaces the API with `tests/fixtures/mock-api.ts`, a stateful in-memory fake that speaks the real wire format (fractions as strings, the same response shapes) and grades with the rule from the brief. It is written separately from the app code, so a bug in the app's maths can't also hide in the test oracle. Every test gets a fresh fake, so tests never share state and can run in parallel.

**Generated cases.** `tests/e2e/scoring.spec.ts` generates its cases from the brief's seed table: for each of the six properties, one forecast in each band (Best, Medium, Low), plus the exact 10% and 25% boundaries (both inclusive) and $1 past each.

**What the mocked suite covers (55 tests; 58 with the 3 live smoke tests):**
- **Main flow:** dashboard → brief → workspace → review → submit → results.
- **Scoring:** all three bands for every property, boundaries, the deviation and direction text, and the "how to reach the next band" nudge.
- **Validation:** an untouched workspace, jump-to-field, inline messages, Low ≤ Mid ≤ High, half-filled line items, a deal with no cash going in.
- **Saving and the API contract:** percentages sent as fractions, incomplete sections never sent, a failed save with retry, a failed submit with retry, a draft surviving a reload, a submitted underwriting being final.
- **Dashboard and results states:** filters, an API error with recovery, unknown property or result IDs, and leaderboard ranking with ties and a rank outside the top five.

**Real API checks.** `npm run test:e2e:live` runs three smoke tests against the Docker API. A Vitest parity test compares the live preview with the API's own calculations for several input sets:

```powershell
$env:API_PARITY=1; npx vitest run src/lib/underwriting/api-parity.test.ts
```

Both create drafts in the real database. Reseed afterwards (`python -m scripts.seed --reset` in the backend) to clear them.

**Debugging failures.** For a failing test, Playwright keeps a full trace (DOM snapshots, network and console), a screenshot and a video under `test-results/<test>/`, plus an `error-context.md` with the page snapshot at the moment of failure. Open the trace with:

```bash
npx playwright show-trace test-results/<test>/trace.zip
```

or browse everything with `npm run test:e2e:report`. One real example from building this: a test timed out waiting for "Operating expense 1 name". The trace showed the click on "Add operating expense" had landed, but an error message disappearing on mouse-down had shifted the button out from under the mouse-up. That pointed straight at the validation timing, which was then fixed.

