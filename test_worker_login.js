/**
 * Quick test to verify Worker PWA login functionality
 */

const puppeteer = require('puppeteer');

async function testWorkerLogin() {
  console.log('🧪 Testing Worker PWA Login...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });

    // Navigate to worker PWA
    console.log('📱 Navigating to Worker PWA...');
    await page.goto('http://localhost:8080/', { waitUntil: 'networkidle0' });

    await page.screenshot({ path: 'worker_login_test_1_initial.png' });

    // Check if login page is visible
    const hasEmailInput = await page.$('input[type="email"]');

    if (hasEmailInput) {
      console.log('✅ Login page detected');

      // Type email
      await page.type('input[type="email"]', 'sarah.tan@email.com');
      console.log('✅ Email entered');

      await page.screenshot({ path: 'worker_login_test_2_email_entered.png' });

      // Click submit button
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        console.log('✅ Submit button clicked');

        // Wait for navigation or response
        await new Promise(resolve => setTimeout(resolve, 3000));
        await page.screenshot({ path: 'worker_login_test_3_after_submit.png' });

        // Check localStorage
        const userData = await page.evaluate(() => {
          return {
            user: localStorage.getItem('worker_user'),
            token: localStorage.getItem('token'),
            hasUser: !!localStorage.getItem('worker_user'),
            hasToken: !!localStorage.getItem('token')
          };
        });

        console.log('\n📊 localStorage Status:');
        console.log('  Has User:', userData.hasUser);
        console.log('  Has Token:', userData.hasToken);

        if (userData.hasUser && userData.hasToken) {
          const user = JSON.parse(userData.user);
          console.log('\n✅ Login Successful!');
          console.log('  User ID:', user.id);
          console.log('  Name:', user.name);
          console.log('  Email:', user.email);
          console.log('  Level:', user.level);
          console.log('  XP:', user.xp);
          console.log('  Status:', user.status);
        } else {
          console.log('\n❌ Login Failed - localStorage empty');

          // Check for errors in console
          const logs = await page.evaluate(() => {
            return window._errors || [];
          });
          console.log('Browser errors:', logs);
        }

        // Check current URL
        const currentUrl = page.url();
        console.log('\n📍 Current URL:', currentUrl);

        await page.screenshot({ path: 'worker_login_test_4_final.png' });

      } else {
        console.log('❌ Submit button not found');
      }
    } else {
      console.log('ℹ️  Already logged in or on home page');

      // Check localStorage anyway
      const userData = await page.evaluate(() => {
        return {
          user: localStorage.getItem('worker_user'),
          token: localStorage.getItem('token'),
          hasUser: !!localStorage.getItem('worker_user'),
          hasToken: !!localStorage.getItem('token')
        };
      });

      console.log('\n📊 localStorage Status:');
      console.log('  Has User:', userData.hasUser);
      console.log('  Has Token:', userData.hasToken);

      if (userData.hasUser) {
        const user = JSON.parse(userData.user);
        console.log('\n✅ User Already Logged In!');
        console.log('  User ID:', user.id);
        console.log('  Name:', user.name);
        console.log('  Email:', user.email);
        console.log('  Level:', user.level);
        console.log('  XP:', user.xp);
      }
    }

    console.log('\n⏳ Keeping browser open for 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testWorkerLogin();
