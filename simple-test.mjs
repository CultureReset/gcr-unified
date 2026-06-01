import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('Loading /restaurants...');
    await page.goto('http://localhost:5173/restaurants', { waitUntil: 'domcontentloaded' });
    
    await page.waitForTimeout(2000);
    
    const html = await page.locator('body').innerHTML();
    console.log('Page content:', html.substring(0, 400));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
