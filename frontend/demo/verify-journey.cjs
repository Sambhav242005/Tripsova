'use strict';
/* eslint-disable @typescript-eslint/no-require-imports -- standalone CommonJS script, not part of the Next bundle */
// Verifies the novice "Plan My Journey" flow: enter A→B, the engine picks the mode,
// trains snap to real stations, and the real (Leaflet) map renders.
const { chromium } = require('playwright');

const BASE = process.env.QA_BASE_URL || 'http://localhost:3000';
const EMAIL = 'traveller@tripova.com';
const PASSWORD = 'password123';

async function login(page) {
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button:has-text("Sign In")').click();
  await page.waitForTimeout(2200);
}

async function openJourney(page) {
  await page.locator('nav[aria-label="Primary"]').first().getByRole('button', { name: 'Profile', exact: true }).click();
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Plan My Journey")').first().click();
  await page.waitForTimeout(1200);
}

async function plan(page, from, to) {
  await page.locator('input[placeholder^="e.g. Ratlam"]').fill(from);
  await page.locator('input[placeholder^="e.g. Mumbai"]').fill(to);
  await page.locator('button:has-text("Plan My Journey")').last().click();
  await page.waitForSelector('[data-testid="journey-result"]', { timeout: 20000 });
  await page.waitForTimeout(1500);
  const modes = await page.locator('[data-testid="mode-chip"]').allInnerTexts();
  const timeline = await page.locator('text=Journey timeline').first().isVisible().catch(() => false);
  // Real map vs SVG fallback
  const hasLeaflet = await page.locator('.leaflet-container').first().isVisible().catch(() => false);
  // First leg label (station/airport name)
  const firstLeg = await page.locator('[data-testid="journey-result"] >> text=/→/').first().innerText().catch(() => '');
  return { modes: modes.map(m => m.replace(/\s+/g, ' ').trim()), timeline, hasLeaflet, firstLeg };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('  [console.error]', m.text().slice(0, 120)); });

  await login(page);

  // 1) Medium hop → TRAIN, should snap to real stations.
  await openJourney(page);
  const r1 = await plan(page, 'Mumbai', 'Goa');
  console.log('\n=== Mumbai → Goa (expect TRAIN, station-snapped) ===');
  console.log(JSON.stringify(r1, null, 2));
  await page.waitForTimeout(1500);
  await page.locator('.leaflet-container, svg').first().scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: 'demo/verify-journey-train.png' });

  // 2) Long hop → FLIGHT via airports.
  await openJourney(page);
  const r2 = await plan(page, 'Delhi', 'Goa');
  console.log('\n=== Delhi → Goa (expect FLIGHT via airports) ===');
  console.log(JSON.stringify(r2, null, 2));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'demo/verify-journey-flight.png' });

  await browser.close();
})().catch(e => { console.error('VERIFY ERROR', e); process.exit(1); });
