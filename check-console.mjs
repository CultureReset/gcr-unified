import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const logs = [];
  const errors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    } else {
      logs.push(msg.text());
    }
  });

  try {
    await page.goto('http://localhost:5173/restaurants', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    console.log('Console errors:');
    errors.forEach(e => console.log('  ❌', e));
    
    if (errors.length === 0) {
      console.log('  (no errors)');
    }
    
    // Check what the useParams is getting
    const location = await page.evaluate(() => window.location);
    console.log('\nPage location:', location.pathname);
    
  } finally {
    await browser.close();
  }
})();
