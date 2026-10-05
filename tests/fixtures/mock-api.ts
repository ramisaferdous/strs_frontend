import type { Page, Route } from "@playwright/test";
import { byZpid, expectedBand, MARKETS, PROPERTIES } from "./seed";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface RecordedRequest {
  method: string;
  path: string;
  body: Json | null;
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
  "access-control-allow-headers": "content-type",
};

// 1x1 transparent GIF, so listing photos never touch the network.
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

const money = (n: number) => n.toFixed(2);

/**
 * A stateful, in-memory stand-in for the training API. It speaks the same wire
 * format (decimal strings, fractional percentages) and grades with the same
 * rule as the real backend, so tests are deterministic and need no Docker.
 */
export class MockApi {
  readonly requests: RecordedRequest[] = [];
  private underwritings = new Map<number, Json>();
  private submissions: Json[] = [];
  private nextUw = 100;
  private nextSub = 1;
  private failures: { match: string; status: number; detail: string }[] = [];

  /** Make the next request whose "METHOD /path" starts with `match` fail once. */
  failNext(match: string, status = 500, detail = "Simulated server error") {
    this.failures.push({ match, status, detail });
  }

  putRequests() {
    return this.requests.filter((r) => r.method === "PUT");
  }

  /** Preload a finished attempt without driving the UI (for leaderboard / dashboard states). */
  seedSubmission(zpid: string, mid: number) {
    const uw = this.createUnderwriting(zpid);
    uw.detail = {
      purchase_details: { purchase_price: String(byZpid(zpid).price), down_payment_pct: "0.2", interest_rate: "0.07", mortgage_years: 30, closing_costs_pct: "0.03" },
      forecasted_revenue: { co_hosting_fee_pct: "0", annual_re_appreciation_pct: "0.03", scenarios: { low: { forecasted_revenue: money(mid * 0.8) }, mid: { forecasted_revenue: money(mid) }, high: { forecasted_revenue: money(mid * 1.2) } } },
    };
    uw.taxes = { land_assumptions_pct: "0.2", sla_multiplier_pct: "0.25", bonus_amount_pct: "0.6", tax_rate_pct: "0.37", tax_savings: "29970.00" };
    return this.grade(uw).submission;
  }

  /** Preload an unfinished draft. */
  seedDraft(zpid: string) {
    return this.createUnderwriting(zpid);
  }

  async install(page: Page) {
    await page.route(/picsum\.photos/, (route) => route.fulfill({ status: 200, contentType: "image/gif", body: PIXEL }));
    await page.route(/localhost:8000\/api\//, (route) => this.handle(route));
  }

  // ------------------------------------------------------------- internals --

  private json(route: Route, status: number, body: unknown) {
    return route.fulfill({ status, headers: CORS, contentType: "application/json", body: JSON.stringify(body) });
  }

  private async handle(route: Route) {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });

    const url = new URL(req.url());
    const path = url.pathname;
    const body = req.postData() ? (JSON.parse(req.postData()!) as Json) : null;
    this.requests.push({ method: req.method(), path, body });

    const key = `${req.method()} ${path}`;
    const failure = this.failures.findIndex((f) => key.startsWith(f.match));
    if (failure >= 0) {
      const [f] = this.failures.splice(failure, 1);
      return this.json(route, f!.status, { detail: f!.detail });
    }

    const segs = path.replace(/^\/api\//, "").split("/");
    const [root, id, action] = segs;

    if (root === "dashboard") return this.json(route, 200, this.dashboard());
    if (root === "markets" && id) {
      const m = MARKETS.find((x) => x.id === Number(id));
      return m ? this.json(route, 200, m) : this.json(route, 404, { detail: "No market with this id" });
    }
    if (root === "properties" && id) {
      return PROPERTIES.some((p) => p.zpid === id) ? this.json(route, 200, this.property(id)) : this.json(route, 404, { detail: `Property ${id} not found` });
    }
    if (root === "underwritings") {
      if (req.method() === "POST" && !id) {
        if (!PROPERTIES.some((p) => p.zpid === body?.zpid)) return this.json(route, 404, { detail: `Property ${body?.zpid} not found` });
        return this.json(route, 201, this.createUnderwriting(body!.zpid));
      }
      const uw = this.underwritings.get(Number(id));
      if (!uw) return this.json(route, 404, { detail: `Underwriting ${id} not found` });
      if (req.method() === "GET") return this.json(route, 200, uw);
      if (req.method() === "PUT") return this.json(route, 200, this.apply(uw, body ?? {}));
      if (req.method() === "POST" && action === "submit") {
        if (body) this.apply(uw, body);
        const missing = ["purchase_details", "forecasted_revenue"].filter((k) => !uw.detail?.[k]).concat(uw.taxes ? [] : ["taxes"]);
        if (missing.length) return this.json(route, 422, { detail: `Missing required sections: ${missing.join(", ")}` });
        const { submission } = this.grade(uw);
        return this.json(route, 200, { submission, underwriting: uw, dashboard: this.dashboard() });
      }
    }
    if (root === "submissions") {
      if (id) {
        const s = this.submissions.find((x) => x.id === Number(id));
        return s ? this.json(route, 200, s) : this.json(route, 404, { detail: "No submission with this id" });
      }
      const zpid = url.searchParams.get("zpid");
      const list = this.submissions.filter((s) => !zpid || s.zpid === zpid).slice().reverse();
      return this.json(route, 200, list);
    }
    return this.json(route, 404, { detail: `Unmocked route ${key}` });
  }

  private property(zpid: string) {
    const p = byZpid(zpid);
    const market = MARKETS.find((m) => m.id === p.marketId)!;
    return {
      zpid,
      img_src: `https://picsum.photos/seed/${zpid}/640/420`,
      detail_url: `https://www.zillow.com/homedetails/${zpid}_zpid/`,
      price: `$${p.price.toLocaleString("en-US")}`,
      unformatted_price: String(p.price),
      address: `${p.street}, ${p.city}, ${p.state} ${p.zipcode}`,
      address_street: p.street,
      address_city: p.city,
      address_state: p.state,
      address_zipcode: p.zipcode,
      beds: p.beds,
      baths: p.baths,
      area: p.area,
      home_type: "SINGLE_FAMILY",
      home_status: "FOR_SALE",
      time_on_zillow: "12 days",
      market_id: p.marketId,
      market: { id: market.id, name: market.name, slug: market.slug, state: market.state },
    };
  }

  private createUnderwriting(zpid: string) {
    const p = byZpid(zpid);
    const uw: Json = {
      id: this.nextUw++,
      zpid,
      is_reference: false,
      deal_status: "analyst_started",
      deal_submitted: null,
      property_address: `${p.street}, ${p.city}, ${p.state} ${p.zipcode}`,
      purchase_price: money(p.price),
      total_oop: null,
      prr: null,
      mid_gross_revenue: null,
      m_cash_on_cash: null,
      detail: null,
      taxes: null,
      optimization_items: [],
      operating_expenses: [],
    };
    this.underwritings.set(uw.id, uw);
    return uw;
  }

  private apply(uw: Json, payload: Json) {
    if (payload.purchase_details) {
      uw.detail = { ...(uw.detail ?? {}), purchase_details: payload.purchase_details };
      uw.purchase_price = money(Number(payload.purchase_details.purchase_price));
    }
    if (payload.forecasted_revenue) {
      uw.detail = { ...(uw.detail ?? {}), forecasted_revenue: payload.forecasted_revenue };
      uw.mid_gross_revenue = money(Number(payload.forecasted_revenue.scenarios.mid.forecasted_revenue));
    }
    if (payload.taxes) uw.taxes = { ...payload.taxes, tax_savings: null };
    if (payload.optimization_items) {
      uw.optimization_items = payload.optimization_items.map((r: Json, i: number) => ({ id: i + 1, category: r.category, total_price: money(Number(r.total_price)) }));
    }
    if (payload.operating_expenses) {
      uw.operating_expenses = payload.operating_expenses.map((r: Json, i: number) => ({ id: i + 1, expense_name: r.expense_name, monthly_amount: money(Number(r.monthly_amount)) }));
    }
    if (payload.tags) Object.assign(uw, payload.tags);
    const pd = uw.detail?.purchase_details;
    if (pd) {
      const opt = uw.optimization_items.reduce((s: number, r: Json) => s + Number(r.total_price), 0);
      uw.total_oop = money(Number(pd.purchase_price) * (Number(pd.down_payment_pct) + Number(pd.closing_costs_pct)) + opt);
    }
    return uw;
  }

  private grade(uw: Json) {
    const reference = byZpid(uw.zpid).referenceMid;
    const candidate = Number(uw.detail.forecasted_revenue.scenarios.mid.forecasted_revenue);
    const { band, accuracy } = expectedBand(candidate, reference);
    const deviation = Math.abs(candidate - reference) / reference;
    uw.deal_status = "analyst_completed";
    uw.deal_submitted = new Date().toISOString();
    const submission = {
      id: this.nextSub++,
      underwriting_id: uw.id,
      reference_underwriting_id: 1,
      zpid: uw.zpid,
      rating: band,
      accuracy: money(accuracy),
      breakdown: {
        rating: band,
        accuracy: money(accuracy),
        metric: "mid_gross_revenue",
        label: "Mid forecasted revenue",
        candidate: money(candidate),
        reference: money(reference),
        deviation: deviation.toFixed(4),
        best_threshold: "0.10",
        medium_threshold: "0.25",
      },
      submitted_at: new Date(Date.now() + this.nextSub * 1000).toISOString(),
    };
    this.submissions.push(submission);
    return { submission };
  }

  private dashboard() {
    const properties = PROPERTIES.map((p) => {
      const subs = this.submissions.filter((s) => s.zpid === p.zpid);
      const drafts = [...this.underwritings.values()].filter((u) => u.zpid === p.zpid && !u.deal_submitted);
      const latest = subs[subs.length - 1];
      const best = subs.reduce<Json | null>((b, s) => (!b || Number(s.accuracy) > Number(b.accuracy) ? s : b), null);
      const draft = drafts[drafts.length - 1];
      return {
        zpid: p.zpid,
        address: `${p.street}, ${p.city}, ${p.state} ${p.zipcode}`,
        city: p.city,
        state: p.state,
        zipcode: p.zipcode,
        price: `$${p.price.toLocaleString("en-US")}`,
        unformatted_price: String(p.price),
        beds: p.beds,
        baths: p.baths,
        area: p.area,
        img_src: `https://picsum.photos/seed/${p.zpid}/640/420`,
        home_type: "SINGLE_FAMILY",
        market_id: p.marketId,
        market_name: MARKETS.find((m) => m.id === p.marketId)!.name,
        status: draft ? "in_progress" : subs.length ? "submitted" : "not_started",
        attempts: subs.length,
        latest_accuracy: latest?.accuracy ?? null,
        latest_rating: latest?.rating ?? null,
        best_accuracy: best?.accuracy ?? null,
        best_rating: best?.rating ?? null,
        active_underwriting_id: draft?.id ?? null,
        latest_submission_id: latest?.id ?? null,
      };
    });
    const submitted = properties.filter((p) => p.status === "submitted").length;
    const scored = properties.filter((p) => p.latest_accuracy != null);
    return {
      summary: {
        total_properties: properties.length,
        submitted,
        in_progress: properties.filter((p) => p.status === "in_progress").length,
        not_started: properties.filter((p) => p.status === "not_started").length,
        average_accuracy: scored.length ? money(scored.reduce((s, p) => s + Number(p.latest_accuracy), 0) / scored.length) : null,
      },
      properties,
    };
  }
}
