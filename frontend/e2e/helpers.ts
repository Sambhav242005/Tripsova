import { Page, expect } from "@playwright/test";

/**
 * Shared setup for Tripsova UI tests.
 *
 * The app gates everything behind auth (`isAuth = !!user`, set when GET /api/auth/me
 * succeeds for a stored token). So each test seeds a token and mocks the auth + data
 * endpoints. No backend runs — every /api/** call is fulfilled here.
 */

const FAKE_USER = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Test Traveller",
  email: "test@tripsova.com",
  role: "user",
  verification_status: "verified",
  trust_score: 80,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

type Json = Record<string, unknown>;

/** A minimal but renderable point (RouteMap reads lat/lng). */
function pt(name: string, lat: number, lng: number) {
  return { name, latitude: lat, longitude: lng };
}

/**
 * Build a JourneyPlanResponse the screen can fully render — chosen modes, a cost
 * breakdown, and a `route` with legs + segments so the SVG map draws.
 */
export function journeyResponse(opts: {
  origin: [string, number, number];
  destination: [string, number, number];
  modes: { transport: string; medium: string; label: string; icon: string; from: [string, number, number]; to: [string, number, number]; km: number; cost: number }[];
  roundTrip?: boolean;
  people?: number;
  budget?: number | null;
  originSource?: string;
  destSource?: string;
}): Json {
  const people = opts.people ?? 1;
  const dep = "2026-07-01T08:00:00";
  const arr = "2026-07-01T14:00:00";
  const legs = opts.modes.map((m, i) => ({
    legIndex: i,
    transport: m.transport,
    medium: m.medium,
    label: m.label,
    icon: m.icon,
    from: pt(...m.from),
    to: pt(...m.to),
    distanceKm: m.km,
    departureTime: dep,
    arrivalTime: arr,
    durationHours: 6,
  }));
  const segments = opts.modes.map((m, i) => ({
    legIndex: i,
    transport: m.transport,
    medium: m.medium,
    day: 1,
    startTime: dep,
    endTime: arr,
    startPoint: { latitude: m.from[1], longitude: m.from[2] },
    endPoint: { latitude: m.to[1], longitude: m.to[2] },
    distanceKm: m.km,
    travelHours: 6,
  }));
  const total = opts.modes.reduce((s, m) => s + m.cost, 0);
  const chosen: string[] = [];
  for (const m of opts.modes) if (!chosen.includes(m.transport)) chosen.push(m.transport);
  const totalKm = opts.modes.reduce((s, m) => s + m.km, 0);
  const budget = opts.budget ?? null;

  return {
    origin: pt(...opts.origin),
    destination: pt(...opts.destination),
    roundTrip: !!opts.roundTrip,
    peopleCount: people,
    chosenModes: chosen,
    geocoding: {
      origin: { resolvedName: opts.origin[0], source: opts.originSource ?? "db" },
      destination: { resolvedName: opts.destination[0], source: opts.destSource ?? "db" },
    },
    cost: {
      currency: "INR",
      people,
      perLeg: opts.modes.map(m => ({
        transport: m.transport,
        label: m.label,
        from: m.from[0],
        to: m.to[0],
        distanceKm: m.km,
        estimatedCost: m.cost,
      })),
      total,
      perPerson: Math.round(total / people),
    },
    budget,
    withinBudget: budget == null ? null : total <= budget,
    route: {
      travelMode: "MULTI",
      transport: "MULTI",
      medium: "MIXED",
      origin: pt(...opts.origin),
      destination: pt(...opts.destination),
      distanceKm: totalKm,
      estimatedDurationHours: 6 * opts.modes.length,
      departureTime: dep,
      arrivalTime: arr,
      legs,
      segments,
      overnightStops: [],
      fuelStops: [],
      notes: [],
    },
  };
}

/** Canned responses for the three decision paths. */
export const FIXTURES = {
  shortCar: journeyResponse({
    origin: ["Pune", 18.52, 73.85],
    destination: ["Mumbai", 19.07, 72.87],
    people: 2,
    modes: [{ transport: "CAR", medium: "LAND", label: "Car", icon: "🚗", from: ["Pune", 18.52, 73.85], to: ["Mumbai", 19.07, 72.87], km: 149, cost: 1345 }],
  }),
  longFlightRoundTrip: journeyResponse({
    origin: ["Delhi", 28.61, 77.2],
    destination: ["Mumbai", 19.07, 72.87],
    roundTrip: true,
    people: 2,
    budget: 40000,
    originSource: "nominatim",
    destSource: "nominatim",
    modes: [
      { transport: "FLIGHT", medium: "AIR", label: "Flight", icon: "✈️", from: ["Delhi (DEL)", 28.55, 77.1], to: ["Mumbai (BOM)", 19.09, 72.86], km: 1194, cost: 15539 },
      { transport: "FLIGHT", medium: "AIR", label: "Flight", icon: "✈️", from: ["Mumbai (BOM)", 19.09, 72.86], to: ["Delhi (DEL)", 28.55, 77.1], km: 1194, cost: 15539 },
    ],
  }),
  overBudget: journeyResponse({
    origin: ["Delhi", 28.61, 77.2],
    destination: ["Mumbai", 19.07, 72.87],
    people: 2,
    budget: 5000,
    modes: [{ transport: "FLIGHT", medium: "AIR", label: "Flight", icon: "✈️", from: ["Delhi (DEL)", 28.55, 77.1], to: ["Mumbai (BOM)", 19.09, 72.86], km: 1194, cost: 15539 }],
  }),
};

/**
 * Seed a token and intercept all API traffic. `journey` is the response for
 * POST /api/trips/journey; pass `journeyStatus: 404` to simulate a geocode miss.
 */
export async function setupApp(
  page: Page,
  opts: { journey?: Json; journeyStatus?: number; journeyDetail?: string } = {},
) {
  await page.addInitScript(() => {
    localStorage.setItem("token", "test-token");
  });

  // Catch-all FIRST so the specific handlers below take precedence (Playwright runs
  // the most-recently-registered matching handler first).
  await page.route("**/api/**", async route => {
    const url = route.request().url();
    if (url.includes("/api/users/me")) {
      return route.fulfill({ json: { ...FAKE_USER, diet_preference: {}, travel_style: {} } });
    }
    // Lists vs objects — return an empty paginated list for anything list-shaped.
    return route.fulfill({ json: { items: [], total: 0, page: 1, per_page: 20, total_pages: 0 } });
  });

  await page.route("**/api/auth/me", route => route.fulfill({ json: FAKE_USER }));

  await page.route("**/api/trips/journey", async route => {
    if (route.request().method() !== "POST") return route.fallback();
    if (opts.journeyStatus && opts.journeyStatus >= 400) {
      return route.fulfill({ status: opts.journeyStatus, json: { detail: opts.journeyDetail ?? "Could not locate that place." } });
    }
    return route.fulfill({ json: opts.journey ?? FIXTURES.shortCar });
  });
}

/**
 * The screen's submit button. It carries a ✦ so it's distinct from the "Plan My
 * Journey" *navigation* entries (drawer + profile), which matters on mobile where the
 * side drawer stays mounted in the DOM alongside the screen.
 */
export function submitBtn(page: Page) {
  return page.getByRole("button", { name: "✦ Plan My Journey" });
}

/** Navigate to the Journey screen via the real UI path for the current viewport. */
export async function gotoJourney(page: Page) {
  const isMobile = (page.viewportSize()?.width ?? 1280) < 768;
  await page.goto("/app");

  // The nav entries are the exact label (no ✦); use exact match so they never collide
  // with the screen's submit button.
  const navEntry = page.getByRole("button", { name: "Plan My Journey", exact: true });
  if (isMobile) {
    await page.getByRole("button", { name: "Menu" }).click();
    await navEntry.click();
  } else {
    await page.getByRole("button", { name: "Profile" }).first().click();
    await navEntry.first().click();
  }

  // The intro header confirms we arrived (no apostrophe → no quote-matching surprises).
  await expect(page.getByText("We pick the transport", { exact: false })).toBeVisible();
}
