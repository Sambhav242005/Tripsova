'use strict';
/* eslint-disable @typescript-eslint/no-require-imports -- standalone CommonJS script, not part of the Next bundle */
const { chromium } = require('playwright');
const BASE='http://localhost:3000', EMAIL='traveller@tripova.com', PASSWORD='password123';
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await (await b.newContext({ viewport:{width:1280,height:800} })).newPage();
  const errs=[]; p.on('console', m=>{ if(m.type()==='error') errs.push(m.text().slice(0,200)); });
  p.on('pageerror', e=> errs.push('PAGEERR '+e.message.slice(0,200)));
  await p.goto(`${BASE}/app`,{waitUntil:'networkidle'}); await p.waitForTimeout(600);
  await p.locator('input[type="email"]').fill(EMAIL); await p.locator('input[type="password"]').fill(PASSWORD);
  await p.locator('button:has-text("Sign In")').click(); await p.waitForTimeout(2200);
  await p.locator('nav[aria-label="Primary"]').first().getByRole('button',{name:'Profile',exact:true}).click(); await p.waitForTimeout(1000);
  await p.locator('button:has-text("Plan My Journey")').first().click(); await p.waitForTimeout(1000);
  await p.locator('input[placeholder^="e.g. Ratlam"]').fill('Mumbai');
  await p.locator('input[placeholder^="e.g. Mumbai"]').fill('Goa');
  await p.locator('button:has-text("Plan My Journey")').last().click();
  await p.waitForSelector('[data-testid="journey-result"]',{timeout:20000});
  await p.waitForTimeout(7000);
  const state = await p.evaluate(()=>({
    hasScript: !!document.querySelector('script[data-leaflet]'),
    hasCss: !!document.querySelector('link[data-leaflet]'),
    LType: typeof window.L,
    containers: document.querySelectorAll('.leaflet-container').length,
    tiles: document.querySelectorAll('.leaflet-tile').length,
    paths: document.querySelectorAll('.leaflet-overlay-pane path').length,
    spinnerTxt: (document.body.innerText.match(/Tracing the roads/)||[])[0]||null,
  }));
  console.log(JSON.stringify(state,null,2));
  console.log('ERRORS:', errs.length?errs:'none');
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
