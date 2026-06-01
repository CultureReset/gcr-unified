import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('error', err => errors.push('Page error: ' + err));
  page.on('pageerror', err => errors.push('Page error: ' + err));

  try {
    console.log('Loading /restaurants...');
    await page.goto('http://localhost:5173/restaurants', { waitUntil: 'domcontentloaded' });
    
    await page.waitForTimeout(3000);
    
    console.log('Console errors:', errors.length > 0 ? errors : 'none');
    
    const html = await page.locator('#root').innerHTML();
    console.log('Root HTML:', html.substring(0, 400) || '(empty)');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
