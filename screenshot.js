const { chromium } = require('playwright');
const fs = require('fs');
const ssDir = __dirname + '/assets';
try { fs.mkdirSync(ssDir); } catch(e) {}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Users/davidmac/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 812 } });

  // 1. Login
  await page.goto('http://127.0.0.1:8125/', { timeout: 15000, waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: ssDir + '/1-login.png', fullPage: true });
  console.log('1-login');

  // 2. Create user
  const avatars = await page.locator('.avatar-option').all();
  if (avatars.length > 0) { await avatars[1].click(); await page.waitForTimeout(300); }
  await page.locator('#login-name').fill('\u7c73\u5157');
  await page.waitForTimeout(200);
  await page.locator('.btn-primary').click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: ssDir + '/2-home.png', fullPage: true });
  console.log('2-home');

  // 3. Days
  await page.goto('http://127.0.0.1:8125/#days/en', { timeout: 10000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: ssDir + '/3-days.png', fullPage: true });
  console.log('3-days');

  // 4. Game
  await page.goto('http://127.0.0.1:8125/#game/en/1', { timeout: 10000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: ssDir + '/4-game.png', fullPage: true });
  console.log('4-game');

  // 5. Dashboard
  await page.goto('http://127.0.0.1:8125/#dashboard', { timeout: 10000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: ssDir + '/5-dashboard.png', fullPage: true });
  console.log('5-dashboard');

  await browser.close();
  console.log('DONE');
})();
