'use strict';
/* eslint-disable @typescript-eslint/no-require-imports -- standalone CommonJS script, not part of the Next bundle */
// Phase 1 — Discover. Dump interactive elements per page to build a selector map.
const { chromium } = require('playwright');

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:3000';
const EMAIL = 'traveller@tripova.com';
const PASSWORD = 'password123';

async function dump(page, label) {
  const els = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('input, select, textarea, button, a, [role="button"], [contenteditable]').forEach(el => {
      if (el.offsetParent !== null) {
        out.push({
          tag: el.tagName,
          type: el.type || '',
          name: el.name || '',
          placeholder: el.placeholder || '',
          aria: el.getAttribute('aria-label') || '',
          href: el.getAttribute('href') || '',
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 50),
          role: el.getAttribute('role') || '',
        });
      }
    });
    return out;
  });
  console.log(`\n===== ${label} (${page.url()}) =====`);
  for (const e of els) {
    const bits = [e.tag];
    if (e.type) bits.push(`[${e.type}]`);
    if (e.role) bits.push(`role=${e.role}`);
    if (e.href) bits.push(`href=${e.href}`);
    if (e.placeholder) bits.push(`ph="${e.placeholder}"`);
    if (e.aria) bits.push(`aria="${e.aria}"`);
    if (e.text) bits.push(`"${e.text}"`);
    console.log('  ' + bits.join(' '));
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await dump(page, 'Landing /');

  await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await dump(page, 'App (login gate)');

  // Log in
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2500);
  await dump(page, 'Home screen (after login)');

  // Walk each nav tab by visible label
  for (const tab of ['Trip Pulse', 'PureFind', 'TripPods', 'Profile', 'Home']) {
    const btn = page.locator(`nav[aria-label="Primary"] >> text=${tab}`).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(1800);
      await dump(page, `Tab: ${tab}`);
    } else {
      console.log(`\n!! Tab "${tab}" not found in primary nav`);
    }
  }

  await browser.close();
})().catch(e => { console.error('DISCOVER ERROR', e); process.exit(1); });
