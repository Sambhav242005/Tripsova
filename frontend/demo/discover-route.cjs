'use strict';
/* eslint-disable @typescript-eslint/no-require-imports -- standalone CommonJS script, not part of the Next bundle */
// Focused discovery of the Route & Map Planner flow.
const { chromium } = require('playwright');

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:3000';
const EMAIL = 'traveller@tripova.com';
const PASSWORD = 'password123';

async function dump(page, label) {
  const els = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('input, select, textarea, button, a, [role="button"]').forEach(el => {
      if (el.offsetParent !== null) {
        out.push({
          tag: el.tagName, type: el.type || '',
          ph: el.placeholder || '', aria: el.getAttribute('aria-label') || '',
          title: el.getAttribute('title') || '',
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 40),
        });
      }
    });
    return out;
  });
  console.log(`\n===== ${label} (${page.url()}) =====`);
  for (const e of els) {
    const bits = [e.tag];
    if (e.type) bits.push(`[${e.type}]`);
    if (e.ph) bits.push(`ph="${e.ph}"`);
    if (e.aria) bits.push(`aria="${e.aria}"`);
    if (e.title) bits.push(`title="${e.title}"`);
    if (e.text) bits.push(`"${e.text}"`);
    console.log('  ' + bits.join(' '));
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button:has-text("Sign In")').click();
  await page.waitForTimeout(2500);

  // Go to Profile tab
  const profileBtn = page.locator('nav[aria-label="Primary"]').first().getByRole('button', { name: 'Profile', exact: true });
  await profileBtn.click();
  await page.waitForTimeout(1500);
  await dump(page, 'Profile tab');

  // Click Route Planner
  const routeBtn = page.locator('button:has-text("Route Planner")').first();
  if (await routeBtn.isVisible().catch(() => false)) {
    await routeBtn.click();
    await page.waitForTimeout(2000);
    await dump(page, 'Route & Map Planner');
  } else {
    console.log('!! Route Planner button not found');
  }

  // Inspect the PointSelect options for From
  const selects = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('select').forEach(sel => {
      const opts = Array.from(sel.options).slice(0, 8).map(o => o.textContent.trim());
      out.push({ name: sel.getAttribute('aria-label') || sel.name || '', count: sel.options.length, sample: opts });
    });
    return out;
  });
  console.log('\n===== SELECTS =====');
  console.log(JSON.stringify(selects, null, 2));

  await page.screenshot({ path: 'demo/discover-route.png', fullPage: true });
  await browser.close();
})().catch(e => { console.error('DISCOVER ERROR', e); process.exit(1); });
