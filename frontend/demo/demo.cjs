'use strict';
/* eslint-disable @typescript-eslint/no-require-imports -- standalone CommonJS script, not part of the Next bundle */
// Tripsova — Full app tour demo recorder.
// Phase 2 (--rehearse): verify every selector resolves.
// Phase 3 (default):    record a 1280x720 webm with cursor + subtitle overlays.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:3000';
const EMAIL = 'traveller@tripova.com';
const PASSWORD = 'password123';
const VIDEO_DIR = path.join(__dirname, 'screenshots');
const OUTPUT_NAME = 'tripsova-tour.webm';
const REHEARSAL = process.argv.includes('--rehearse');

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
  if (!visible) {
    console.error(`REHEARSAL FAIL: "${label}" not found`);
    return false;
  }
  console.log(`REHEARSAL OK: "${label}"`);
  return true;
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
  } catch (e) {
    console.error(`WARNING: moveAndClick failed on "${label}": ${e.message}`);
    return false;
  }
  await page.waitForTimeout(postClickDelay);
  return true;
}

async function typeSlowly(page, locator, text, label, charDelay = 38) {
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  const visible = await el.isVisible().catch(() => false);
  if (!visible) { console.error(`WARNING: typeSlowly skipped - "${label}" not visible`); return false; }
  await moveAndClick(page, el, label, { postClickDelay: 300 });
  await el.fill('');
  await el.pressSequentially(text, { delay: charDelay });
  await page.waitForTimeout(600);
  return true;
}

async function smoothScroll(page, top, pause = 1400) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), top);
  await page.waitForTimeout(pause);
}

async function panElements(page, selector, maxCount = 5) {
  const elements = await page.locator(selector).all();
  for (let i = 0; i < Math.min(elements.length, maxCount); i++) {
    try {
      const box = await elements[i].boundingBox();
      if (box && box.y > 60 && box.y < 660) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
        await page.waitForTimeout(650);
      }
    } catch (e) {
      console.warn(`WARNING: panElements skipped ${i}: ${e.message}`);
    }
  }
}

function navBtn(page, label) {
  return page.locator('nav[aria-label="Primary"]').first().getByRole('button', { name: label, exact: true });
}

async function gotoTab(page, label, postDelay = 1800) {
  const ok = await moveAndClick(page, navBtn(page, label), `nav: ${label}`, { postClickDelay: postDelay });
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  return ok;
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

  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await check('a[href="/"]', 'Landing CTA');

  await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await check('input[type="email"]', 'Login email');
  await check('input[type="password"]', 'Login password');
  await check('button:has-text("Sign In")', 'Sign In button');

  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button:has-text("Sign In")').click();
  await page.waitForTimeout(2600);

  await check(navBtn(page, 'Home'), 'nav Home');
  await check(navBtn(page, 'Trip Pulse'), 'nav Trip Pulse');
  await check(navBtn(page, 'PureFind'), 'nav PureFind');
  await check(navBtn(page, 'TripPods'), 'nav TripPods');
  await check(navBtn(page, 'Profile'), 'nav Profile');

  await navBtn(page, 'Trip Pulse').click(); await page.waitForTimeout(1500);
  await check('input[aria-label="Search destinations"]', 'Trip Pulse search');

  await navBtn(page, 'PureFind').click(); await page.waitForTimeout(1500);
  await check('input[aria-label="Search restaurants or cities"]', 'PureFind search');
  await check('button:has-text("Pure Veg")', 'PureFind diet chip');

  await navBtn(page, 'TripPods').click(); await page.waitForTimeout(1500);
  await check('[role="tab"]:has-text("Find a Pod")', 'TripPods tab');

  await navBtn(page, 'Profile').click(); await page.waitForTimeout(1500);
  await check('button:has-text("AI Trip Builder")', 'Profile tools');

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
    // 1 — Landing
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await reinject(page);
    await page.waitForTimeout(1200);
    await showSubtitle(page, 'Tripsova — discover through people');
    await panElements(page, 'a[href="/"], a[href="/destinations"]', 4);
    await smoothScroll(page, 520, 1600);
    await smoothScroll(page, 1040, 1600);
    await smoothScroll(page, 0, 1200);

    await showSubtitle(page, 'Step 1 — Open the app');
    await moveAndClick(page, 'a[href="/"]:has-text("Open Tripsova")', 'Open Tripsova CTA', { postClickDelay: 1600 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await reinject(page);

    // 2 — Sign in
    await showSubtitle(page, 'Step 2 — Sign in');
    await page.waitForTimeout(800);
    await login(page);
    await reinject(page);
    await page.waitForTimeout(1000);

    // 3 — Home / Trip Pulse feed
    await showSubtitle(page, 'Step 3 — Your travel feed');
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await page.waitForTimeout(1200);
    await panElements(page, 'button:has-text("Helpful")', 4);
    await smoothScroll(page, 560, 1600);
    await smoothScroll(page, 1120, 1600);
    await smoothScroll(page, 0, 1200);

    // 4 — Trip Pulse search
    await showSubtitle(page, 'Step 4 — Find your destination');
    await gotoTab(page, 'Trip Pulse');
    await reinject(page);
    await typeSlowly(page, 'input[aria-label="Search destinations"]', 'Spiti', 'Trip Pulse search');
    await page.waitForTimeout(1600);

    // 5 — PureFind (hero feature)
    await showSubtitle(page, 'Step 5 — PureFind: eat to your values');
    await gotoTab(page, 'PureFind');
    await reinject(page);
    await page.waitForTimeout(800);
    await panElements(page, 'button:has-text("Veg"), button:has-text("Jain"), button:has-text("Vegan")', 4);
    await moveAndClick(page, 'button:has-text("Pure Veg")', 'Pure Veg filter', { postClickDelay: 1400 });
    await smoothScroll(page, 520, 1600);
    await panElements(page, 'button:has-text("trusted")', 3);
    await smoothScroll(page, 0, 1000);

    // 6 — TripPods
    await showSubtitle(page, 'Step 6 — Join a TripPod');
    await gotoTab(page, 'TripPods');
    await reinject(page);
    await page.waitForTimeout(900);
    await panElements(page, '[role="tab"], button:has-text("Request to Join")', 4);
    await smoothScroll(page, 420, 1500);
    await smoothScroll(page, 0, 1000);

    // 7 — Profile + tools
    await showSubtitle(page, 'Step 7 — Your profile & planning tools');
    await gotoTab(page, 'Profile');
    await reinject(page);
    await page.waitForTimeout(900);
    await panElements(page, 'button:has-text("AI Trip Builder"), button:has-text("Route Planner"), button:has-text("Budget Tracker"), button:has-text("Offline Maps")', 4);
    await smoothScroll(page, 420, 1500);
    await smoothScroll(page, 0, 1200);

    // 8 — Close
    await showSubtitle(page, 'Tripsova — travel you can trust');
    await page.waitForTimeout(2600);
    await showSubtitle(page, '');
    await page.waitForTimeout(800);
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
