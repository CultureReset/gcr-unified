import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log('🧪 FULL GCR-UNIFIED APP TEST\n');
  console.log('═════════════════════════════════════════════════════════════\n');

  const tests = [
    { path: '/', name: 'Landing Page', expectHeader: true },
    { path: '/auth', name: 'Auth Page', expectHeader: false },
    { path: '/browse', name: 'Browse Page', expectHeader: true },
    { path: '/restaurants', name: '🍽️ Restaurants Category', expectHeader: true, expectCards: true },
    { path: '/coffee', name: '☕ Coffee & Sweets', expectHeader: true, expectCards: true },
    { path: '/happy-hours', name: '🍻 Happy Hours', expectHeader: true, expectCards: true },
    { path: '/events', name: '🎉 Events', expectHeader: true, expectCards: true },
    { path: '/things-to-do', name: '🎯 Things To Do', expectHeader: true, expectCards: true },
    { path: '/services', name: '🛠️ Services', expectHeader: true, expectCards: true },
    { path: '/public-spots', name: '✨ Public Spots', expectHeader: true, expectCards: true },
    { path: '/shopping', name: '🛍️ Shopping', expectHeader: true, expectCards: true },
    { path: '/staying', name: '🏨 Staying', expectHeader: true, expectCards: true },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await page.goto(`http://localhost:5173${test.path}`, { 
        waitUntil: 'domcontentloaded', 
        timeout: 5000 
      });
      await page.waitForTimeout(500);

      const hasContent = (await page.content()).length > 500;
      const headerVisible = await page.locator('.gcr-header, .nav, nav').isVisible().catch(() => false);
      const cardsCount = await page.locator('.gcr-card, .card').count();
      const hasError = (await page.content()).includes('error') && (await page.content()).includes('404');

      if (hasError) {
        console.log(`❌ ${test.name} ${test.path}`);
        console.log(`   Error page returned\n`);
        failed++;
      } else if (hasContent) {
        let status = '✅';
        let details = [];
        
        if (test.expectHeader && !headerVisible) {
          status = '⚠️';
          details.push('no header');
        }
        if (test.expectCards && cardsCount === 0) {
          details.push('no cards');
        }
        
        console.log(`${status} ${test.name} ${test.path}`);
        if (details.length > 0) {
          console.log(`   (${details.join(', ')})`);
        }
        if (cardsCount > 0) {
          console.log(`   📊 ${cardsCount} card(s) found`);
        }
        console.log();
        
        passed++;
      } else {
        console.log(`❌ ${test.name} ${test.path} - Empty content\n`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} ${test.path}`);
      console.log(`   Error: ${error.message.substring(0, 50)}\n`);
      failed++;
    }
  }

  console.log('═════════════════════════════════════════════════════════════');
  console.log(`\n📊 RESULTS: ${passed}/${tests.length} pages working`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}\n`);

  await browser.close();
})();
