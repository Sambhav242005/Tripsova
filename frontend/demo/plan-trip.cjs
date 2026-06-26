'use strict';
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars -- standalone CommonJS demo script, not part of the Next bundle */
// Tripsova — Trip Planning demo recorder (Route & Map Planner working end-to-end).
// Focus: the "Plan my trip" flow, every transport mode, and the live map + timeline output.
// --rehearse : verify every selector resolves.
// default    : record a 1280x720 webm with cursor + subtitle overlays.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:3000';
const EMAIL = 'traveller@tripova.com';
const PASSWORD = 'password123';
const VIDEO_DIR = path.join(__dirname, 'screenshots');
const OUTPUT_NAME = 'tripsova-plan-trip.webm';
const REHEARSAL = process.argv.includes('--rehearse');

const TRANSPORT_TITLES = ['Car', 'Motorcycle', 'Train', 'Bus', 'Metro', 'Bicycle', 'Walk', 'Flight', 'Ferry', 'Cruise'];

// ---------- overlays ----------
async function injectCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById('demo-cursor')) return;
    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    cursor.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`;
    cursor.style.cssText = `position: fixed; z-index: 999999; pointer-events: none; width: 24px; height: 24px;
      transition: left 0.1s, top 0.1s; filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));`;
    cursor.style.left = '640px';
    cursor.style.top = '360px';
    document.body.appendChild(cursor);
    document.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });
  });
}

async function injectSubtitleBar(page) {
  await page.evaluate(() => {
    if (document.getElementById('demo-subtitle')) return;
    const bar = document.createElement('div');
    bar.id = 'demo-subtitle';
    bar.style.cssText = `position: fixed; bottom: 0; left: 0; right: 0; z-index: 999998; text-align: center;
      padding: 12px 24px; background: rgba(11,24,46,0.82); color: white;
      font-family: -apple-system, "Segoe UI", sans-serif; font-size: 16px; font-weight: 500;
      letter-spacing: 0.3px; transition: opacity 0.3s; pointer-events: none;`;
    bar.textContent = '';
    bar.style.opacity = '0';
    document.body.appendChild(bar);
  });
}

async function showSubtitle(page, text) {
  await page.evaluate((t) => {
    const bar = document.getElementById('demo-subtitle');
    if (!bar) return;
    if (t) { bar.textContent = t; bar.style.opacity = '1'; }
    else { bar.style.opacity = '0'; }
  }, text);
  if (text) await page.waitForTimeout(800);
}

async function reinject(page) {
  await injectCursor(page);
  await injectSubtitleBar(page);
}

// ---------- interaction helpers ----------
async function ensureVisible(page, locator, label) {
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  const visible = await el.isVisible().catch(() => false);
  if (!visible) { console.error(`REHEARSAL FAIL: "${label}" not found`); return false; }
  console.log(`REHEARSAL OK: "${label}"`);
  return true;
}

async function moveTo(page, locator, label) {
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  try {
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const box = await el.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
      await page.waitForTimeout(350);
    }
  } catch (e) { console.warn(`WARNING: moveTo "${label}": ${e.message}`); }
}

async function moveAndClick(page, locator, label, opts = {}) {
  const { postClickDelay = 900, ...clickOpts } = opts;
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  const visible = await el.isVisible().catch(() => false);
  if (!visible) { console.error(`WARNING: moveAndClick skipped - "${label}" not visible`); return false; }
  try {
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const box = await el.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
      await page.waitForTimeout(400);
    }
    await el.click(clickOpts);
  } catch (e) { console.error(`WARNING: moveAndClick failed on "${label}": ${e.message}`); return false; }
  await page.waitForTimeout(postClickDelay);
  return true;
}

// Move cursor to a native <select>, then pick an option by label.
async function pickFromSelect(page, index, label, caption) {
  const sel = page.locator('select').nth(index);
  await moveTo(page, sel, `select#${index}`);
  await sel.selectOption({ label });
  await page.waitForTimeout(700);
}

// Sweep the cursor across every transport-mode button for the given leg so the
// viewer sees the full multi-modal catalog, then land on the chosen mode.
async function sweepTransport(page, legIndex, chosen) {
  for (const title of TRANSPORT_TITLES) {
    const btn = page.locator(`button[title="${title}"]`).nth(legIndex);
    await moveTo(page, btn, `transport ${title}`);
  }
  await moveAndClick(page, page.locator(`button[title="${chosen}"]`).nth(legIndex), `pick ${chosen}`, { postClickDelay: 700 });
}

async function smoothScroll(page, top, pause = 1400) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), top);
  await page.waitForTimeout(pause);
}

async function scrollToResult(page, pause = 1400) {
  await page.evaluate(() => {
    const svgs = Array.from(document.querySelectorAll('main svg'));
    if (svgs.length) svgs[svgs.length - 1].scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
  await page.waitForTimeout(pause);
}

function navBtn(page, label) {
  return page.locator('nav[aria-label="Primary"]').first().getByRole('button', { name: label, exact: true });
}

async function typeSlowly(page, locator, text, label, charDelay = 40) {
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  const visible = await el.isVisible().catch(() => false);
  if (!visible) { console.error(`WARNING: typeSlowly skipped - "${label}" not visible`); return false; }
  await moveAndClick(page, el, label, { postClickDelay: 300 });
  await el.fill('');
  await el.pressSequentially(text, { delay: charDelay });
  await page.waitForTimeout(600);
  return true;
}

async function login(page) {
  await typeSlowly(page, 'input[type="email"]', EMAIL, 'Email field');
  await typeSlowly(page, 'input[type="password"]', PASSWORD, 'Password field');
  await moveAndClick(page, 'button:has-text("Sign In")', 'Sign In', { postClickDelay: 2600 });
}

// ---------- rehearsal ----------
async function rehearse(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  let allOk = true;
  const check = async (loc, label) => { if (!await ensureVisible(page, loc, label)) allOk = false; };

  await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await check('input[type="email"]', 'Login email');
  await check('button:has-text("Sign In")', 'Sign In button');

  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button:has-text("Sign In")').click();
  await page.waitForTimeout(2600);

  await check(navBtn(page, 'Profile'), 'nav Profile');
  await navBtn(page, 'Profile').click();
  await page.waitForTimeout(1400);
  await check('button:has-text("Route Planner")', 'Profile: Route Planner');

  await page.locator('button:has-text("Route Planner")').first().click();
  await page.waitForTimeout(1600);
  await check('select', 'Route From/To select');
  for (const title of TRANSPORT_TITLES) await check(`button[title="${title}"]`, `transport ${title}`);
  await check('button:has-text("Add another leg")', 'Add another leg');
  await check('button:has-text("Plan Route & Map")', 'Plan Route & Map');

  // build + submit to confirm result renders
  await page.locator('select').nth(0).selectOption({ label: 'Delhi' });
  await page.locator('select').nth(1).selectOption({ label: 'Manali' });
  await page.locator('button[title="Flight"]').first().click();
  await page.locator('button:has-text("Add another leg")').click();
  await page.waitForTimeout(500);
  await page.locator('select').nth(3).selectOption({ label: 'Kasol' });
  await page.locator('button[title="Car"]').nth(1).click();
  await page.locator('button:has-text("Plan Route & Map")').click();
  await page.waitForTimeout(6000);
  const hasMap = await page.locator('main svg').count();
  console.log(hasMap > 0 ? 'REHEARSAL OK: route map rendered' : 'REHEARSAL FAIL: no map');
  if (hasMap === 0) allOk = false;
  await check('text=Journey timeline', 'Journey timeline');
  await check('text=Total distance', 'Total distance');

  await ctx.close();
  if (!allOk) { console.error('\nREHEARSAL FAILED — fix selectors before recording'); process.exit(1); }
  console.log('\nREHEARSAL PASSED — all selectors verified');
}

// ---------- recording ----------
async function record(browser) {
  const ctx = await browser.newContext({
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 },
  });
  const page = await ctx.newPage();
  try {
    // 1 — Sign in
    await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });
    await reinject(page);
    await page.waitForTimeout(900);
    await showSubtitle(page, 'Tripsova — let’s plan a real trip');
    await page.waitForTimeout(700);
    await showSubtitle(page, 'Sign in to your account');
    await login(page);
    await reinject(page);
    await page.waitForTimeout(900);

    // 2 — Profile -> planning tools
    await showSubtitle(page, 'Open your planning tools');
    await moveAndClick(page, navBtn(page, 'Profile'), 'nav Profile', { postClickDelay: 1500 });
    await reinject(page);
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await page.waitForTimeout(900);
    await moveTo(page, 'button:has-text("Plan My Journey")', 'Plan My Journey');
    await moveTo(page, 'button:has-text("AI Trip Builder")', 'AI Trip Builder');
    await moveTo(page, 'button:has-text("Route Planner")', 'Route Planner');

    // 3 — Open Route & Map Planner
    await showSubtitle(page, 'Plan my trip → Route & Map Planner');
    await moveAndClick(page, 'button:has-text("Route Planner")', 'Route Planner', { postClickDelay: 1600 });
    await reinject(page);
    await page.waitForTimeout(900);

    // 4 — Leg 1: choose From / To
    await showSubtitle(page, 'Leg 1 — from Delhi…');
    await pickFromSelect(page, 0, 'Delhi');
    await showSubtitle(page, '…to Manali');
    await pickFromSelect(page, 1, 'Manali');

    // 5 — Show every transport mode, pick Flight
    await showSubtitle(page, 'Pick from every mode of transport');
    await sweepTransport(page, 0, 'Flight');
    await showSubtitle(page, 'Leg 1: fly Delhi → Manali ✈️');
    await page.waitForTimeout(900);

    // 6 — Add leg 2: Manali -> Kasol by Car (multi-modal)
    await showSubtitle(page, 'Chain a second leg');
    await moveAndClick(page, 'button:has-text("Add another leg")', 'Add another leg', { postClickDelay: 1100 });
    await reinject(page);
    await pickFromSelect(page, 3, 'Kasol');
    await showSubtitle(page, 'Leg 2: drive Manali → Kasol 🚗');
    await sweepTransport(page, 1, 'Car');
    await page.waitForTimeout(700);

    // 7 — Plan it
    await showSubtitle(page, 'Plan the route & map');
    await moveAndClick(page, 'button:has-text("Plan Route & Map")', 'Plan Route & Map', { postClickDelay: 1200 });
    await page.waitForTimeout(4500);
    await reinject(page);

    // 8 — Show the live map
    await showSubtitle(page, 'Your route, plotted on the map');
    await scrollToResult(page, 1800);
    await page.waitForTimeout(1400);

    // 9 — Legend + multi-modal path
    await showSubtitle(page, 'Air, land & water legs colour-coded');
    await moveTo(page, 'text=Overnight', 'legend overnight');
    await page.waitForTimeout(1200);

    // 10 — Distance / time summary
    await showSubtitle(page, 'Real distance, transit time & arrival');
    const summary = page.locator('text=Total distance').first();
    if (await summary.isVisible().catch(() => false)) {
      await summary.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1600);
    }

    // 11 — Journey timeline (per-leg modes)
    await showSubtitle(page, 'A leg-by-leg journey timeline');
    const timeline = page.locator('text=Journey timeline').first();
    if (await timeline.isVisible().catch(() => false)) {
      await timeline.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1800);
    }
    await smoothScroll(page, await page.evaluate(() => document.body.scrollHeight), 2000);
    await page.waitForTimeout(1200);

    // 12 — Close
    await showSubtitle(page, 'Tripsova — every trip, fully planned');
    await page.waitForTimeout(2400);
    await showSubtitle(page, '');
    await page.waitForTimeout(700);
  } catch (err) {
    console.error('DEMO ERROR:', err.message);
  } finally {
    await ctx.close();
    const video = page.video();
    if (video) {
      const src = await video.path();
      const dest = path.join(VIDEO_DIR, OUTPUT_NAME);
      try { fs.copyFileSync(src, dest); console.log('Video saved:', dest); }
      catch (e) { console.error('ERROR copying video:', e.message, '\n  src:', src); }
    }
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  if (REHEARSAL) await rehearse(browser);
  else await record(browser);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
