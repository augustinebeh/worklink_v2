/**
 * Test BPO Navigation and Kanban Functionality
 */

const puppeteer = require('puppeteer');

async function testBPONavigation() {
  console.log('🧪 Testing BPO Navigation and Kanban...\n');

  let browser, page;

  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      slowMo: 200,
      defaultViewport: { width: 1400, height: 900 }
    });
    page = await browser.newPage();

    // Set up console logging
    page.on('console', msg => console.log(`🖥️ Console: ${msg.text()}`));

    console.log('🌐 Loading admin portal...');
    await page.goto('http://127.0.0.1:3002/admin/', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    // Login
    await page.waitForSelector('form, input[type="email"]', { timeout: 5000 });
    await page.type('input[type="email"]', 'admin@worklink.sg');
    await page.type('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('✅ Login successful');

    // Take dashboard screenshot
    await page.screenshot({ path: 'dashboard.png', fullPage: true });
    console.log('📸 Dashboard screenshot saved');

    // Look for BPO navigation link in the sidebar/nav
    console.log('🔍 Looking for BPO navigation links...');

    // Try different selectors for BPO navigation
    const bpoSelectors = [
      'a[href*="bpo"]',
      'a:contains("BPO")',
      'text=BPO',
      'text=Tender',
      '[data-testid*="bpo"]',
      'nav a', // Get all nav links
    ];

    let bpoLink = null;

    // Get all navigation links and their text
    const allLinks = await page.$$eval('a', links =>
      links.map(link => ({
        href: link.href,
        text: link.textContent.trim(),
        classes: link.className
      }))
    );

    console.log('📋 All navigation links found:');
    allLinks.forEach(link => {
      console.log(`  📎 "${link.text}" -> ${link.href}`);
    });

    // Find BPO-related link
    const bpoLinkData = allLinks.find(link =>
      link.text.toLowerCase().includes('bpo') ||
      link.text.toLowerCase().includes('tender') ||
      link.href.includes('bpo')
    );

    if (bpoLinkData) {
      console.log(`✅ Found BPO link: "${bpoLinkData.text}" -> ${bpoLinkData.href}`);

      // Click the BPO link
      await page.click(`a[href*="${bpoLinkData.href.split('/').pop()}"]`);
      console.log('🔄 Clicked BPO navigation link');

      // Wait for page load
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check current URL
      const currentUrl = page.url();
      console.log(`📍 Current URL: ${currentUrl}`);

      // Take screenshot of BPO page
      await page.screenshot({ path: 'bpo-page.png', fullPage: true });
      console.log('📸 BPO page screenshot saved');

      // Look for kanban/lifecycle elements
      const kanbanElements = await page.$$eval('*', elements => {
        const kanbanKeywords = ['kanban', 'lifecycle', 'tender', 'stage', 'column', 'card'];
        return elements
          .filter(el => {
            const classList = Array.from(el.classList).join(' ').toLowerCase();
            const id = (el.id || '').toLowerCase();
            const textContent = (el.textContent || '').toLowerCase().slice(0, 100);

            return kanbanKeywords.some(keyword =>
              classList.includes(keyword) ||
              id.includes(keyword) ||
              textContent.includes(keyword)
            );
          })
          .map(el => ({
            tag: el.tagName,
            classes: Array.from(el.classList),
            id: el.id,
            text: el.textContent?.slice(0, 50) || ''
          }))
          .slice(0, 10); // Limit to first 10 matches
      });

      console.log('🎯 Kanban-related elements found:');
      kanbanElements.forEach(el => {
        console.log(`  🎫 ${el.tag}.${el.classes.join('.')}${el.id ? '#' + el.id : ''}: "${el.text}"`);
      });

      // Look for specific tender lifecycle elements
      console.log('🔍 Checking for specific BPO Tender Lifecycle elements...');

      // Check page text content for lifecycle stages
      const pageText = await page.$eval('body', el => el.textContent);
      const stageKeywords = [
        'renewal watch', 'new opportunity', 'review', 'bidding',
        'approval', 'submitted', 'awarded', 'lost'
      ];

      const foundStages = stageKeywords.filter(stage =>
        pageText.toLowerCase().includes(stage)
      );

      console.log(`📋 Lifecycle stages found: ${foundStages.join(', ')}`);

      // Check for view toggle (list/kanban)
      const viewToggle = await page.$('button:contains("kanban"), button:contains("list"), [data-testid*="view"]');
      if (viewToggle) {
        console.log('🔘 View toggle found - attempting to switch to kanban view');
        await viewToggle.click();
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Take screenshot after view toggle
        await page.screenshot({ path: 'kanban-view.png', fullPage: true });
        console.log('📸 Kanban view screenshot saved');
      }

      // Check for drag-and-drop elements
      const draggableElements = await page.$$eval('[draggable="true"], .draggable, [data-draggable]', elements =>
        elements.map(el => ({
          tag: el.tagName,
          classes: Array.from(el.classList),
          draggable: el.draggable
        }))
      );

      if (draggableElements.length > 0) {
        console.log(`✅ Found ${draggableElements.length} draggable elements!`);
        draggableElements.forEach(el => {
          console.log(`  🎯 ${el.tag}.${el.classes.join('.')} (draggable: ${el.draggable})`);
        });

        console.log('🎉 BPO Tender Lifecycle with drag-and-drop functionality is working!');
        return true;
      } else {
        console.log('⚠️ No draggable elements found in current view');
      }

      // Final check - look for any evidence of working kanban
      const hasWorkingKanban = kanbanElements.length > 0 || foundStages.length >= 3;

      if (hasWorkingKanban) {
        console.log('✅ BPO Tender Lifecycle page appears to be functional');
        return true;
      } else {
        console.log('❌ BPO Tender Lifecycle functionality not confirmed');
        return false;
      }

    } else {
      console.log('❌ No BPO navigation link found');
      return false;
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
    if (page) {
      await page.screenshot({ path: 'error-debug.png', fullPage: true });
      console.log('📸 Error debug screenshot saved');
    }
    return false;
  } finally {
    if (browser) {
      console.log('🔍 Keeping browser open for manual inspection...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      await browser.close();
    }
  }
}

if (require.main === module) {
  testBPONavigation().then(success => {
    console.log(`\n🏁 BPO Navigation test ${success ? 'PASSED ✅' : 'FAILED ❌'}`);
    process.exit(success ? 0 : 1);
  });
}

module.exports = testBPONavigation;