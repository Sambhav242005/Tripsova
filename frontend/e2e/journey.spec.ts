import { test, expect } from "@playwright/test";
import { setupApp, gotoJourney, submitBtn, FIXTURES } from "./helpers";

/**
 * UI/UX coverage for the "Plan My Journey" flow — the smart layer where the user
 * gives only city names and the engine picks the transport + cost. Runs on both the
 * mobile (drawer) and desktop (sidebar/profile) layouts via the config's projects.
 */

test.describe("Plan My Journey", () => {
  test("renders the form with both layouts reachable", async ({ page }) => {
    await setupApp(page);
    await gotoJourney(page);

    await expect(page.getByPlaceholder("e.g. Ratlam")).toBeVisible();
    await expect(page.getByPlaceholder("e.g. Mumbai")).toBeVisible();
    await expect(page.getByRole("button", { name: "Round trip" })).toBeVisible();
    await expect(submitBtn(page)).toBeVisible();
  });

  test("blocks submit and explains when From/To are empty", async ({ page }) => {
    await setupApp(page);
    await gotoJourney(page);

    await submitBtn(page).click();

    await expect(page.getByTestId("journey-error")).toContainText("Tell us where you");
    await expect(page.getByTestId("journey-result")).toHaveCount(0);
  });

  test("short hop → the engine picks Car and shows the cost", async ({ page }) => {
    await setupApp(page, { journey: FIXTURES.shortCar });
    await gotoJourney(page);

    await page.getByPlaceholder("e.g. Ratlam").fill("Pune");
    await page.getByPlaceholder("e.g. Mumbai").fill("Mumbai");
    await submitBtn(page).click();

    const result = page.getByTestId("journey-result");
    await expect(result).toBeVisible();

    const chips = page.getByTestId("mode-chip");
    await expect(chips).toHaveCount(1);
    await expect(chips.first()).toContainText("Car");
    await expect(page.getByTestId("cost-total")).toHaveText("₹1,345");
    // No budget given → no budget verdict shown.
    await expect(page.getByTestId("budget-banner")).toHaveCount(0);
  });

  test("long round trip → two Flight legs, round-trip badge, within-budget banner", async ({ page }) => {
    await setupApp(page, { journey: FIXTURES.longFlightRoundTrip });
    await gotoJourney(page);

    await page.getByPlaceholder("e.g. Ratlam").fill("Delhi");
    await page.getByPlaceholder("e.g. Mumbai").fill("Mumbai");
    await submitBtn(page).click();

    const result = page.getByTestId("journey-result");
    await expect(result).toBeVisible();

    // chosenModes is de-duplicated, so a fly-out-fly-back trip shows ONE Flight chip;
    // the return journey is conveyed by the round-trip badge + the doubled cost.
    const chips = page.getByTestId("mode-chip");
    await expect(chips).toHaveCount(1);
    await expect(chips.first()).toContainText("Flight");
    await expect(result.getByText("Round trip", { exact: true })).toBeVisible();

    // Outbound + mirrored return both appear as cost rows, summing to the total.
    await expect(page.getByTestId("cost-total")).toHaveText("₹31,078");

    const banner = page.getByTestId("budget-banner");
    await expect(banner).toHaveAttribute("data-within", "yes");
    await expect(banner).toContainText("Within your");

    // Cities resolved via OpenStreetMap surface the approximate-coords note.
    await expect(page.getByText("Located via OpenStreetMap", { exact: false })).toBeVisible();
  });

  test("over budget → red verdict banner", async ({ page }) => {
    await setupApp(page, { journey: FIXTURES.overBudget });
    await gotoJourney(page);

    await page.getByPlaceholder("e.g. Ratlam").fill("Delhi");
    await page.getByPlaceholder("e.g. Mumbai").fill("Mumbai");
    await submitBtn(page).click();

    const banner = page.getByTestId("budget-banner");
    await expect(banner).toHaveAttribute("data-within", "no");
    await expect(banner).toContainText("Over your");
  });

  test("unknown city → friendly 404 message, no result", async ({ page }) => {
    await setupApp(page, { journeyStatus: 404, journeyDetail: "Could not locate 'Atlantis'." });
    await gotoJourney(page);

    await page.getByPlaceholder("e.g. Ratlam").fill("Atlantis");
    await page.getByPlaceholder("e.g. Mumbai").fill("Mumbai");
    await submitBtn(page).click();

    await expect(page.getByTestId("journey-error")).toContainText("Could not locate");
    await expect(page.getByTestId("journey-result")).toHaveCount(0);
  });
});
