import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:5173/restaurants', { waitUntil: 'networkidle' });
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Get page title and general structure
    const title = await page.title();
    console.log('Page title:', title);
    
    // Get HTML of body
    const bodyHTML = await page.locator('body').innerHTML();
    console.log('\nPage HTML (first 800 chars):\n', bodyHTML.substring(0, 800));
    
    // Check for error messages
    const errors = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      return scripts.map(s => s.textContent).filter(t => t && t.includes('error')).slice(0, 3);
    });
    
    if (errors.length > 0) {
      console.log('\nErrors found:', errors);
    }
    
    // Check if React app is mounted
    const rootDiv = await page.locator('#root').innerHTML();
    console.log('\nRoot div content (first 500 chars):\n', rootDiv.substring(0, 500));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
