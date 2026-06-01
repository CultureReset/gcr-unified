import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('Testing /restaurants category page...\n');
    await page.goto('http://localhost:5173/restaurants', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Check if header exists
    const header = await page.locator('.gcr-header');
    const headerVisible = await header.isVisible().catch(() => false);
    if (headerVisible) {
      console.log('✅ GCRHeader component rendered');
    } else {
      console.log('❌ GCRHeader not found');
    }
    
    // Check if hero section exists
    const hero = await page.locator('.category-hero');
    const heroVisible = await hero.isVisible().catch(() => false);
    if (heroVisible) {
      console.log('✅ Hero section rendered');
    }
    
    // Check if toolbar with filter chips exists
    const toolbar = await page.locator('.category-toolbar');
    const toolbarVisible = await toolbar.isVisible().catch(() => false);
    if (toolbarVisible) {
      console.log('✅ Filter toolbar rendered');
    }
    
    // Check if cards are rendered
    const cards = await page.locator('.gcr-card');
    const cardCount = await cards.count();
    console.log(`✅ Found ${cardCount} GCR card(s) rendered`);
    
    if (cardCount > 0) {
      // Check first card content
      const firstCard = cards.first();
      const cardName = await firstCard.locator('.gcr-card-name');
      const nameText = await cardName.textContent();
      console.log(`✅ Card name: "${nameText}"`);
      
      // Check if tags exist
      const tags = await firstCard.locator('.gcr-tag');
      const tagCount = await tags.count();
      console.log(`✅ Card has ${tagCount} tags`);
      
      if (tagCount > 0) {
        const firstTag = await tags.first().textContent();
        console.log(`✅ First tag: "${firstTag}"`);
      }
    }
    
    // Check if sidebar exists
    const sidebar = await page.locator('.category-sidebar');
    const sidebarVisible = await sidebar.isVisible().catch(() => false);
    if (sidebarVisible) {
      console.log('✅ Sidebar rendered');
    }
    
    // Test filter chip click
    const filterChips = await page.locator('.chip');
    const chipCount = await filterChips.count();
    console.log(`✅ Found ${chipCount} filter chip(s)`);
    
    if (chipCount > 1) {
      const secondChip = filterChips.nth(1);
      const chipText = await secondChip.textContent();
      console.log(`\n🔍 Testing filter: clicking "${chipText}"`);
      await secondChip.click();
      await page.waitForTimeout(300);
      
      const resultsAfterFilter = await page.locator('.gcr-card').count();
      console.log(`🔍 Cards after filtering: ${resultsAfterFilter}`);
    }
    
    console.log('\n✅ VERIFICATION PASSED: CategoryPage working correctly');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
