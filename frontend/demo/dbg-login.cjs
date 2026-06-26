'use strict';
/* eslint-disable @typescript-eslint/no-require-imports -- standalone CommonJS script, not part of the Next bundle */
const { chromium } = require('playwright');
const BASE='http://localhost:3000', EMAIL='traveller@tripova.com', PASSWORD='password123';
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await (await b.newContext({ viewport:{width:1280,height:800} })).newPage();
  const errs=[]; p.on('pageerror', e=> errs.push('PAGEERR '+e.message.slice(0,160)));
  p.on('console', m=>{ if(m.type()==='error') errs.push('CON '+m.text().slice(0,160)); });
  await p.goto(`${BASE}/app`,{waitUntil:'networkidle'}); await p.waitForTimeout(800);
  console.log('before login URL', p.url());
  const emailV = await p.locator('input[type="email"]').isVisible().catch(()=>false);
  console.log('email field visible:', emailV);
  if (emailV){
    await p.locator('input[type="email"]').fill(EMAIL);
    await p.locator('input[type="password"]').fill(PASSWORD);
    await p.locator('button:has-text("Sign In")').click();
    await p.waitForTimeout(3500);
  }
  console.log('after login URL', p.url());
  const navVisible = await p.locator('nav[aria-label="Primary"]').first().isVisible().catch(()=>false);
  console.log('primary nav visible:', navVisible);
  console.log('bodyText head:', (await p.locator('body').innerText()).slice(0,200).replace(/\n+/g,' | '));
  console.log('ERRORS:', errs.length?errs:'none');
  await p.screenshot({ path:'demo/dbg-login.png', fullPage:false });
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
