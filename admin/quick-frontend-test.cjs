/**
 * Quick Frontend Structure Test
 * Simple test to verify the frontend is responding and check basic structure
 */

const puppeteer = require('puppeteer');

async function quickTest() {
  console.log('🚀 Quick Frontend Structure Test...\n');

  let browser, page;

  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    console.log('🌐 Navigating to admin portal...');
    await page.goto('http://127.0.0.1:3002/admin/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Check if page loaded
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);

    // Take screenshot
    await page.screenshot({ path: 'frontend-test-1.png', fullPage: true });
    console.log('📸 Screenshot saved: frontend-test-1.png');

    // Check for login form
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    const loginButton = await page.$('button[type="submit"]');

    if (emailInput && passwordInput && loginButton) {
      console.log('✅ Login form detected');

      // Try to login
      await page.type('input[type="email"]', 'sarah.tan@email.com');
      await page.type('input[type="password"]', 'admin123');

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
        page.click('button[type="submit"]')
      ]);

      console.log('🔐 Login attempted...');

      // Take post-login screenshot
      await page.screenshot({ path: 'frontend-test-2.png', fullPage: true });
      console.log('📸 Post-login screenshot saved: frontend-test-2.png');

      // Check current URL
      const currentUrl = page.url();
      console.log(`🌐 Current URL: ${currentUrl}`);

      // Look for navigation or sidebar
      const navItems = await page.$$('a[href*="/"], .nav-item, .sidebar a');
      console.log(`🧭 Found ${navItems.length} navigation items`);

      // Look for BPO or tender-related links
      const bpoLinks = [];
      for (let item of navItems) {
        const href = await page.evaluate(el => el.href || el.textContent, item);
        if (href && (href.includes('bpo') || href.includes('tender') || href.includes('lifecycle'))) {
          bpoLinks.push(href);
        }
      }

      console.log(`🎯 Found ${bpoLinks.length} BPO/Tender links:`, bpoLinks);

      // Try to navigate to BPO page directly
      console.log('🧭 Attempting direct navigation to BPO Tender Lifecycle...');

      try {
        await page.goto('http://127.0.0.1:3002/admin/bpo', {
          waitUntil: 'networkidle2',
          timeout: 15000
        });

        // Check if kanban board loaded
        await page.waitForSelector('.kanban, .kanban-board, [data-testid="kanban"]', { timeout: 5000 });

        console.log('✅ BPO Tender Lifecycle page loaded successfully!');

        // Count columns and cards
        const columns = await page.$$('.kanban-column, [class*="column"], [data-testid="column"]');
        const cards = await page.$$('.tender-card, .card, [class*="card"], [data-testid="card"]');

        console.log(`📋 Found ${columns.length} kanban columns`);
        console.log(`🎫 Found ${cards.length} tender cards`);

        // Take final screenshot
        await page.screenshot({ path: 'kanban-test.png', fullPage: true });
        console.log('📸 Kanban screenshot saved: kanban-test.png');

        console.log('✅ Frontend structure test completed successfully!');
        return true;

      } catch (error) {
        console.log('❌ Could not load BPO page directly:', error.message);

        // Try to find it in the navigation
        console.log('🔍 Looking for BPO navigation in the UI...');

        // Look for any link that might lead to BPO
        const allLinks = await page.$$('a');
        let found = false;

        for (let link of allLinks) {
          const text = await page.evaluate(el => el.textContent, link);
          const href = await page.evaluate(el => el.href, link);

          if (text && (text.toLowerCase().includes('bpo') ||
                      text.toLowerCase().includes('tender') ||
                      text.toLowerCase().includes('lifecycle') ||
                      text.toLowerCase().includes('kanban'))) {
            console.log(`🔗 Found potential link: "${text}" -> ${href}`);

            try {
              await link.click();
              await page.waitForTimeout(3000);

              const newUrl = page.url();
              console.log(`📍 Navigated to: ${newUrl}`);

              // Check if this has kanban elements
              const hasKanban = await page.$('.kanban, .kanban-board, [data-testid="kanban"]');
              if (hasKanban) {
                console.log('✅ Found kanban board after navigation!');
                found = true;
                break;
              }
            } catch (e) {
              console.log(`⏭️ Link navigation failed: ${e.message}`);
            }
          }
        }

        if (!found) {
          console.log('❌ Could not locate BPO Tender Lifecycle page');
          await page.screenshot({ path: 'navigation-debug.png', fullPage: true });
          console.log('📸 Navigation debug screenshot saved: navigation-debug.png');
        }

        return found;
      }

    } else {
      console.log('❌ No login form found');
      return false;
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (page) {
      await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
      console.log('📸 Error screenshot saved: error-screenshot.png');
    }
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

if (require.main === module) {
  quickTest().then(success => {
    console.log(`\n🏁 Quick test ${success ? 'completed successfully' : 'failed'}`);
    process.exit(success ? 0 : 1);
  });
}

module.exports = quickTest;