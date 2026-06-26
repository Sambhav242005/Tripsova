'use strict';
/* eslint-disable @typescript-eslint/no-require-imports -- standalone CommonJS script, not part of the Next bundle */
// Tripsova — FULL feature tour, real backend data, with the non-DB location highlight.
//   --rehearse : verify every selector resolves (no recording)
//   default    : record a 1280x720 webm with cursor + subtitle overlays
//
// Story: Landing -> Sign in -> Feed -> Trip Pulse -> Destination overlay ->
//        PureFind -> TripPods -> Plan My Journey (Delhi -> Leh, a city NOT in our
//        database, resolved live from OpenStreetMap) -> Route Planner -> AI Trip
//        Builder -> Profile & preferences.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:3000';
const EMAIL = 'traveller@tripova.com';
const PASSWORD = 'password123';
const VIDEO_DIR = path.join(__dirname, 'screenshots');
const OUTPUT_NAME = 'tripsova-full-tour.webm';
const REHEARSAL = process.argv.includes('--rehearse');

// ---------------- overlays ----------------
async function injectCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById('demo-cursor')) return;
    const c = document.createElement('div');
    c.id = 'demo-cursor';
    c.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
    c.style.cssText = `position:fixed;z-index:999999;pointer-events:none;width:24px;height:24px;
      transition:left .1s,top .1s;filter:drop-shadow(1px 1px 2px rgba(0,0,0,.35));`;
    c.style.left = '640px'; c.style.top = '360px';
    document.body.appendChild(c);
    document.addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; });
  });
}
async function injectSubtitleBar(page) {
  await page.evaluate(() => {
    if (document.getElementById('demo-subtitle')) return;
    const b = document.createElement('div');
    b.id = 'demo-subtitle';
    b.style.cssText = `position:fixed;bottom:0;left:0;right:0;z-index:999998;text-align:center;
      padding:13px 24px;background:rgba(11,24,46,.84);color:#fff;
      font-family:-apple-system,"Segoe UI",sans-serif;font-size:16px;font-weight:600;
      letter-spacing:.3px;transition:opacity .3s;pointer-events:none;`;
    b.textContent = ''; b.style.opacity = '0';
    document.body.appendChild(b);
  });
}
async function showSubtitle(page, text) {
  await page.evaluate(t => {
    const b = document.getElementById('demo-subtitle');
    if (!b) return;
    if (t) { b.textContent = t; b.style.opacity = '1'; } else { b.style.opacity = '0'; }
  }, text);
  if (text) await page.waitForTimeout(800);
}
async function reinject(page) { await injectCursor(page); await injectSubtitleBar(page); }

// ---------------- interaction helpers ----------------
async function ensureVisible(page, loc, label) {
  const el = typeof loc === 'string' ? page.locator(loc).first() : loc;
  const ok = await el.isVisible().catch(() => false);
  console.log(`${ok ? 'OK  ' : 'FAIL'}: ${label}`);
  return ok;
}
async function moveAndClick(page, loc, label, opts = {}) {
  const { postClickDelay = 900, ...clickOpts } = opts;
  const el = typeof loc === 'string' ? page.locator(loc).first() : loc;
  // Pull below-the-fold targets into view BEFORE the visibility gate.
  if (await el.count().catch(() => 0)) { await el.scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(250); }
  if (!await el.isVisible().catch(() => false)) { console.error(`WARN moveAndClick skip "${label}"`); return false; }
  try {
    await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
    const box = await el.boundingBox();
    if (box) { await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 }); await page.waitForTimeout(400); }
    await el.click(clickOpts);
  } catch (e) { console.error(`WARN moveAndClick "${label}": ${e.message}`); return false; }
  await page.waitForTimeout(postClickDelay);
  return true;
}
async function typeSlowly(page, loc, text, label, delay = 42) {
  const el = typeof loc === 'string' ? page.locator(loc).first() : loc;
  if (!await el.isVisible().catch(() => false)) { console.error(`WARN type skip "${label}"`); return false; }
  await moveAndClick(page, el, label, { postClickDelay: 300 });
  await el.fill('');
  await el.pressSequentially(text, { delay });
  await page.waitForTimeout(600);
  return true;
}
async function smoothScroll(page, top, pause = 1400) {
  await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), top);
  await page.waitForTimeout(pause);
}
async function panElements(page, selector, maxCount = 5) {
  const els = await page.locator(selector).all();
  for (let i = 0; i < Math.min(els.length, maxCount); i++) {
    try {
      const box = await els[i].boundingBox();
      if (box && box.y > 60 && box.y < 640) { await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 }); await page.waitForTimeout(620); }
    } catch { /* keep going */ }
  }
}
const navBtn = (page, label) => page.locator('nav[aria-label="Primary"]').getByRole('button', { name: label, exact: true }).first();
async function gotoTab(page, label, postDelay = 1700) {
  const ok = await moveAndClick(page, navBtn(page, label), `nav:${label}`, { postClickDelay: postDelay });
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  return ok;
}
async function openPlanner(page, label) {
  await gotoTab(page, 'Profile', 1200);
  await moveAndClick(page, `button:has-text("${label}")`, `planner:${label}`, { postClickDelay: 1600 });
  await reinject(page);
}
async function login(page) {
  await typeSlowly(page, 'input[type="email"]', EMAIL, 'Email');
  await typeSlowly(page, 'input[type="password"]', PASSWORD, 'Password');
  await moveAndClick(page, 'button:has-text("Sign In")', 'Sign In', { postClickDelay: 2800 });
}

// ---------------- rehearsal ----------------
async function rehearse(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  let allOk = true;
  const chk = async (l, lab) => { if (!await ensureVisible(page, l, lab)) allOk = false; };

  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await chk('a[href="/"]', 'Landing CTA');

  await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await chk('input[type="email"]', 'Login email');
  await chk('button:has-text("Sign In")', 'Sign In');

  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button:has-text("Sign In")').click();
  await page.waitForTimeout(2800);

  for (const n of ['Home', 'Trip Pulse', 'PureFind', 'TripPods', 'Profile']) await chk(navBtn(page, n), `nav ${n}`);
  await chk(page.getByText('Goa', { exact: true }).first(), 'Home destination tile (Goa)');

  await navBtn(page, 'Trip Pulse').click(); await page.waitForTimeout(1400);
  await chk('input[aria-label="Search destinations"]', 'Trip Pulse search');

  await navBtn(page, 'PureFind').click(); await page.waitForTimeout(1400);
  await chk('input[aria-label="Search restaurants or cities"]', 'PureFind search');
  await chk('button:has-text("Pure Veg")', 'PureFind diet chip');

  await navBtn(page, 'TripPods').click(); await page.waitForTimeout(1400);
  await chk('[role="tab"]:has-text("Find a Pod")', 'TripPods tab');

  await navBtn(page, 'Profile').click(); await page.waitForTimeout(1400);
  for (const p of ['Plan My Journey', 'AI Trip Builder', 'Route Planner', 'Budget Tracker', 'Offline Maps']) await chk(`button:has-text("${p}")`, `Profile -> ${p}`);

  await page.locator('button:has-text("Plan My Journey")').first().click(); await page.waitForTimeout(1400);
  await chk('input[placeholder="e.g. Ratlam"]', 'Journey origin');
  await chk('input[placeholder="e.g. Mumbai"]', 'Journey destination');
  await chk('input[placeholder="e.g. 20000"]', 'Journey budget');
  await chk('button:has-text("✦ Plan My Journey")', 'Journey submit');

  // Route Planner: dropdown endpoints + the (distinct ✦) submit
  await navBtn(page, 'Profile').click(); await page.waitForTimeout(1200);
  await page.locator('button:has-text("Route Planner")').first().click(); await page.waitForTimeout(1400);
  await chk('select[aria-label="From"]', 'Route From select');
  await chk('select[aria-label="To"]', 'Route To select');
  await chk('button:has-text("✦ Plan Route & Map")', 'Route submit');

  await ctx.close();
  if (!allOk) { console.error('\nREHEARSAL FAILED'); process.exit(1); }
  console.log('\nREHEARSAL PASSED — all selectors verified');
}

// ---------------- recording ----------------
async function record(browser) {
  const ctx = await browser.newContext({
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 },
  });
  const page = await ctx.newPage();
  try {
    // 1 — Landing
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await reinject(page); await page.waitForTimeout(1200);
    await showSubtitle(page, 'Tripsova — discover travel through people you trust');
    await panElements(page, 'a[href="/"], a[href="/destinations"]', 4);
    await smoothScroll(page, 520, 1500);
    await smoothScroll(page, 1040, 1500);
    await smoothScroll(page, 0, 1100);

    await showSubtitle(page, 'Step 1 — Open the app');
    await moveAndClick(page, 'a[href="/"]', 'Open app CTA', { postClickDelay: 1600 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await reinject(page);

    // 2 — Sign in (real auth)
    await showSubtitle(page, 'Step 2 — Sign in');
    await page.waitForTimeout(700);
    await login(page);
    await reinject(page); await page.waitForTimeout(1000);

    // 3 — Home feed (real posts from the backend)
    await showSubtitle(page, 'Step 3 — Your travel feed, scored by real travellers');
    await page.evaluate(() => window.scrollTo({ top: 0 })); await page.waitForTimeout(1100);
    await panElements(page, 'button:has-text("Helpful")', 4);
    await smoothScroll(page, 560, 1500);
    await smoothScroll(page, 1120, 1500);
    await smoothScroll(page, 0, 1100);

    // 4 — Destination overlay (real destination detail)
    await showSubtitle(page, 'Step 4 — Open a destination');
    await moveAndClick(page, page.getByText('Goa', { exact: true }).first(), 'Open Goa', { postClickDelay: 1800 });
    await reinject(page);
    await smoothScroll(page, 480, 1500);
    await smoothScroll(page, 960, 1500);
    await smoothScroll(page, 0, 900);
    await moveAndClick(page, 'button[aria-label="Back"]', 'Back from destination', { postClickDelay: 1200 });
    await reinject(page);

    // 5 — Trip Pulse search (real destinations)
    await showSubtitle(page, 'Step 5 — Trip Pulse: search any destination');
    await gotoTab(page, 'Trip Pulse'); await reinject(page);
    await typeSlowly(page, 'input[aria-label="Search destinations"]', 'Spiti', 'Trip Pulse search');
    await page.waitForTimeout(1500);

    // 6 — PureFind (real food places + values-based diet options + trust)
    await showSubtitle(page, 'Step 6 — PureFind: eat to your values');
    await gotoTab(page, 'PureFind'); await reinject(page); await page.waitForTimeout(700);
    await showSubtitle(page, 'Jain, Vegan, Halal, Sattvic, Kosher & more');
    await panElements(page, 'button:has-text("Veg"), button:has-text("Jain"), button:has-text("Vegan"), button:has-text("Halal"), button:has-text("Sattvic")', 5);
    await smoothScroll(page, 360, 1500);
    await showSubtitle(page, 'Every spot shows WHY it is trusted');
    await moveAndClick(page, 'button:has-text("See why this food spot is trusted")', 'Trust breakdown', { postClickDelay: 1800 });
    await page.waitForTimeout(1500);
    await smoothScroll(page, 0, 1000);

    // 7 — TripPods (real pods)
    await showSubtitle(page, 'Step 7 — TripPods: find people to travel with');
    await gotoTab(page, 'TripPods'); await reinject(page); await page.waitForTimeout(800);
    await panElements(page, '[role="tab"], button:has-text("Request to Join")', 4);
    await smoothScroll(page, 420, 1400);
    await smoothScroll(page, 0, 900);

    // 8 — Plan My Journey: a location NOT in our database, resolved live (the highlight)
    await showSubtitle(page, 'Step 8 — Plan a journey to ANY place on Earth');
    await openPlanner(page, 'Plan My Journey'); await page.waitForTimeout(700);
    await typeSlowly(page, 'input[placeholder="e.g. Ratlam"]', 'Delhi', 'Journey origin');
    await typeSlowly(page, 'input[placeholder="e.g. Mumbai"]', 'Leh', 'Journey destination');
    await showSubtitle(page, 'Leh is not in our database — resolved live from OpenStreetMap');
    await typeSlowly(page, 'input[placeholder="e.g. 20000"]', '40000', 'Journey budget');
    // The submit carries a ✦ — must match it exactly, else `Plan My Journey` substring-matches
    // the nav entry and `.first()` bounces back to Profile instead of submitting.
    await moveAndClick(page, 'button:has-text("✦ Plan My Journey")', 'Submit journey', { postClickDelay: 2000 });
    // live OSM geocode + route can take a few seconds
    await page.waitForTimeout(5500);
    await showSubtitle(page, 'Real route, modes & cost — computed on the fly');
    await smoothScroll(page, 380, 1600);
    await smoothScroll(page, 820, 1600);
    await smoothScroll(page, 0, 1100);

    // 9 — Route Planner (manual, multi-leg): pick endpoints, choose Car, see the mapped output
    await showSubtitle(page, 'Step 9 — Route Planner: build it leg by leg');
    await openPlanner(page, 'Route Planner'); await page.waitForTimeout(700);
    await page.locator('select[aria-label="From"]').first().selectOption('Delhi').catch(() => {});
    await page.waitForTimeout(700);
    await page.locator('select[aria-label="To"]').first().selectOption('Goa').catch(() => {});
    await page.waitForTimeout(900);
    // A long self-driven leg so the output shows fuel + overnight stops.
    await moveAndClick(page, 'button[title="Car"]', 'Choose Car', { postClickDelay: 700 });
    await moveAndClick(page, 'button:has-text("✦ Plan Route & Map")', 'Plan route', { postClickDelay: 2600 });
    await page.waitForTimeout(2500);
    await showSubtitle(page, 'Real route, times, fuel & overnight stops — mapped');
    await smoothScroll(page, 400, 1600);
    await smoothScroll(page, 900, 1600);
    await smoothScroll(page, 0, 1100);

    // 10 — AI Trip Builder
    await showSubtitle(page, 'Step 10 — AI Trip Builder: a full itinerary in seconds');
    await openPlanner(page, 'AI Trip Builder'); await page.waitForTimeout(700);
    await typeSlowly(page, 'input[placeholder="Manali, Goa, Spiti, Udaipur..."]', 'Spiti Valley', 'AI destination');
    await panElements(page, 'button:has-text("Adventure"), button:has-text("Nature"), button:has-text("Food")', 4);
    await smoothScroll(page, 420, 1400);
    await smoothScroll(page, 0, 900);

    // 11 — Profile & preferences
    await showSubtitle(page, 'Step 11 — Your profile & dietary preferences');
    await gotoTab(page, 'Profile'); await reinject(page); await page.waitForTimeout(800);
    await panElements(page, 'button:has-text("Edit Profile"), button:has-text("Plan My Journey"), button:has-text("Budget Tracker")', 4);
    await smoothScroll(page, 460, 1400);
    await smoothScroll(page, 0, 1100);

    // Close
    await showSubtitle(page, 'Tripsova — travel you can trust');
    await page.waitForTimeout(2600);
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
      catch (e) { console.error('ERROR copy video:', e.message, '\n  src:', src); }
    }
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  if (REHEARSAL) await rehearse(browser);
  else await record(browser);
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
