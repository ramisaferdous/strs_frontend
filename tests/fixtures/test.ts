import { test as base, expect } from "@playwright/test";
import { MockApi } from "./mock-api";

/**
 * `api` is a fresh in-memory backend per test, so tests never share state.
 * It is an *auto* fixture: Playwright fixtures are lazy, and a test that never
 * names `api` would otherwise fall through to whatever is on localhost:8000.
 */
export const test = base.extend<{ api: MockApi }>({
  api: [
    async ({ page }, use) => {
      const api = new MockApi();
      await api.install(page);
      await use(api);
    },
    { auto: true },
  ],
});

export { expect };
