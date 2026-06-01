import { chromium } from 'playwright';

async function testCategory(browser, categoryPath, categoryName) {
  const page = await browser.newPage();
  
  try {
    await page.goto(`http://localhost:5173${categoryPath}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    
    const headerVisible = await page.locator('.gcr-header').isVisible().catch(() => false);
    const cardCount = await page.locator('.gcr-card').count();
    const chipCount = await page.locator('.chip').count();
    
    if (headerVisible) {
      console.log(`✅ ${categoryName}: ${cardCount} card(s), ${chipCount} filter(s)`);
      return true;
    } else {
      console.log(`❌ ${categoryName}: header not found`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${categoryName}: ${error.message}`);
    return false;
  } finally {
    await page.close();
  }
}

(async () => {
  const browser = await chromium.launch();
  
  const categories = [
    ['/restaurants', 'Restaurants'],
    ['/coffee', 'Coffee & Sweets'],
    ['/happy-hours', 'Happy Hours'],
    ['/events', 'Events'],
    ['/things-to-do', 'Things To Do'],
  ];
  
  console.log('Testing category pages:\n');
  for (const [path, name] of categories) {
    await testCategory(browser, path, name);
  }
  
  await browser.close();
})();
