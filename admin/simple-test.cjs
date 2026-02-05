/**
 * Simple Test to Check Frontend Status
 */

const puppeteer = require('puppeteer');

async function simpleTest() {
  console.log('🧪 Simple Frontend Test...\n');

  let browser, page;

  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      slowMo: 100
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    console.log('🌐 Loading admin portal...');
    await page.goto('http://127.0.0.1:3002/admin/', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    const title = await page.title();
    console.log(`📄 Page title: ${title}`);

    // Check for login form
    await page.waitForSelector('form, input[type="email"]', { timeout: 5000 });
    console.log('✅ Login form found');

    // Fill login form
    await page.type('input[type="email"]', 'admin@worklink.sg');
    await page.type('input[type="password"]', 'admin123');

    console.log('🔐 Submitting login...');
    await page.click('button[type="submit"]');

    // Wait a bit for the redirect
    await new Promise(resolve => setTimeout(resolve, 3000));

    const currentUrl = page.url();
    console.log(`📍 Current URL after login: ${currentUrl}`);

    // Take screenshot after login attempt
    await page.screenshot({ path: 'post-login.png', fullPage: true });
    console.log('📸 Post-login screenshot saved');

    // Check if we're logged in (look for dashboard elements)
    const isDashboard = await page.$('.dashboard, .sidebar, nav, [class*="nav"]');
    if (isDashboard) {
      console.log('✅ Login appears successful - dashboard elements found');

      // Try to navigate to BPO page
      console.log('🧭 Navigating to BPO page...');
      await page.goto('http://127.0.0.1:3002/admin/bpo');
      await new Promise(resolve => setTimeout(resolve, 2000));

      const bpoTitle = await page.title();
      console.log(`📄 BPO page title: ${bpoTitle}`);

      // Look for kanban or BPO elements
      const hasKanban = await page.$('.kanban, .lifecycle, [class*="tender"], [class*="bpo"]');
      if (hasKanban) {
        console.log('✅ BPO/Kanban elements found!');

        // Take final screenshot
        await page.screenshot({ path: 'bpo-page.png', fullPage: true });
        console.log('📸 BPO page screenshot saved');

        return true;
      } else {
        console.log('❌ No kanban/BPO elements found');
        const bodyText = await page.$eval('body', el => el.textContent.slice(0, 200));
        console.log(`📝 Page content preview: ${bodyText}...`);
      }
    } else {
      console.log('❌ Login may have failed - no dashboard elements found');
    }

    return false;

  } catch (error) {
    console.error('❌ Test error:', error.message);
    return false;
  } finally {
    if (browser) {
      // Keep browser open for 5 seconds for manual inspection
      console.log('🔍 Keeping browser open for inspection...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      await browser.close();
    }
  }
}

if (require.main === module) {
  simpleTest().then(success => {
    console.log(`\n🏁 Simple test ${success ? 'passed' : 'failed'}`);
    process.exit(success ? 0 : 1);
  });
}