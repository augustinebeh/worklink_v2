const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173/admin/';
const ADMIN_EMAIL = 'admin@worklink.sg';
const ADMIN_PASSWORD = 'admin123';

async function testSpecificIssues() {
  console.log('🔍 Testing specific issues in detail...\n');

  const browser = await puppeteer.launch({
    headless: false, // Run visible for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const issues = [];

  try {
    // ==================== ISSUE 1: Login Redirect ====================
    console.log('1. Testing login redirect issue...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await page.type('input[name="email"]', ADMIN_EMAIL);
    await page.type('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    await new Promise(resolve => setTimeout(resolve, 3000));
    const urlAfterLogin = page.url();
    console.log(`   URL after login: ${urlAfterLogin}`);

    // Check if we're actually on dashboard
    const isDashboard = await page.evaluate(() => {
      return document.body.innerHTML.includes('Dashboard') ||
             document.body.innerHTML.includes('dashboard') ||
             document.querySelector('main') !== null;
    });

    console.log(`   Is on dashboard: ${isDashboard}`);
    console.log(`   Has '/login' in URL: ${urlAfterLogin.includes('/login')}`);

    if (urlAfterLogin === 'http://localhost:5173/admin' || urlAfterLogin === 'http://localhost:5173/admin/') {
      if (isDashboard) {
        console.log('   ✅ Login works, URL is just missing trailing slash or path');
      } else {
        issues.push({
          issue: 'Login Redirect',
          severity: 'High',
          description: 'Login does not properly redirect or show dashboard content',
          url: urlAfterLogin,
          hasDashboardContent: isDashboard
        });
      }
    }

    // ==================== ISSUE 2: Session Management ====================
    console.log('\n2. Testing session management...');

    // Check sessionStorage
    const sessionData = await page.evaluate(() => {
      return {
        hasUser: !!sessionStorage.getItem('admin_user'),
        hasToken: !!sessionStorage.getItem('admin_token'),
        user: sessionStorage.getItem('admin_user'),
        token: sessionStorage.getItem('admin_token')
      };
    });

    console.log('   Session data:', {
      hasUser: sessionData.hasUser,
      hasToken: sessionData.hasToken,
      userLength: sessionData.user?.length,
      tokenLength: sessionData.token?.length
    });

    if (!sessionData.hasUser || !sessionData.hasToken) {
      issues.push({
        issue: 'Session Storage',
        severity: 'Critical',
        description: 'Session data not being stored properly after login',
        sessionData
      });
    }

    // Test clearing session
    await page.evaluate(() => {
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve,1000);

    const urlAfterClear = page.url();
    console.log(`   URL after clearing session: ${urlAfterClear}`);

    if (!urlAfterClear.includes('/login')) {
      issues.push({
        issue: 'Session Clearing',
        severity: 'High',
        description: 'Clearing session does not redirect to login',
        url: urlAfterClear
      });
    } else {
      console.log('   ✅ Session clearing works correctly');
    }

    // Re-login for remaining tests
    await page.type('input[name="email"]', ADMIN_EMAIL);
    await page.type('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await new Promise(resolve => setTimeout(resolve,2000);

    // ==================== ISSUE 3: Candidates Table ====================
    console.log('\n3. Testing Candidates table...');
    await page.goto(`${BASE_URL}candidates`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve,1500);

    // Check for different possible table/grid structures
    const candidatesStructure = await page.evaluate(() => {
      return {
        hasTable: !!document.querySelector('table'),
        hasTableRole: !!document.querySelector('[role="table"]'),
        hasCards: !!document.querySelector('.card, [class*="card"]'),
        hasGrid: !!document.querySelector('[class*="grid"]'),
        candidateElements: document.querySelectorAll('[class*="candidate"], [class*="CandidateCard"]').length,
        viewToggle: !!document.querySelector('button:has([class*="Grid"]), button:has([class*="List"])'),
        currentView: document.querySelector('button.bg-white, button.shadow-sm')?.textContent || 'unknown'
      };
    });

    console.log('   Candidates page structure:', candidatesStructure);

    if (!candidatesStructure.hasTable && !candidatesStructure.hasCards) {
      issues.push({
        issue: 'Candidates Display',
        severity: 'High',
        description: 'No table or card grid found on candidates page',
        structure: candidatesStructure
      });
    } else {
      console.log('   ✅ Candidates page has display elements');

      // If in grid view, try to switch to table view
      if (candidatesStructure.hasGrid && !candidatesStructure.hasTable) {
        console.log('   Attempting to switch to table view...');
        const tableButton = await page.$('button:has(svg)');
        if (tableButton) {
          await tableButton.click();
          await new Promise(resolve => setTimeout(resolve,1000);

          const nowHasTable = await page.$('table').then(el => el !== null);
          console.log(`   Table view available: ${nowHasTable}`);

          if (!nowHasTable) {
            issues.push({
              issue: 'Table View Toggle',
              severity: 'Medium',
              description: 'Table view toggle does not show table element',
              note: 'Grid view works but table view may be missing'
            });
          }
        }
      }
    }

    // Check for search functionality
    const hasSearch = await page.$('input[placeholder*="search" i], input[type="search"]').then(el => el !== null);
    console.log(`   Has search field: ${hasSearch}`);

    if (hasSearch) {
      try {
        await page.type('input[placeholder*="search" i], input[type="search"]', 'test');
        await new Promise(resolve => setTimeout(resolve,1000);
        console.log('   ✅ Search field works');
      } catch (e) {
        console.log('   ⚠️  Search field found but interaction failed');
      }
    }

    // ==================== ISSUE 4: Empty Form Validation ====================
    console.log('\n4. Testing form validation...');
    await page.goto(`${BASE_URL}login`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve,500);

    // Clear any pre-filled values
    await page.evaluate(() => {
      document.querySelector('input[name="email"]').value = '';
      document.querySelector('input[name="password"]').value = '';
    });

    // Try to submit empty form
    await page.click('button[type="submit"]');
    await new Promise(resolve => setTimeout(resolve,1000);

    const validationState = await page.evaluate(() => {
      const emailInput = document.querySelector('input[name="email"]');
      const passwordInput = document.querySelector('input[name="password"]');
      const errorMessages = Array.from(document.querySelectorAll('.text-red-600, .text-red-400, [class*="error"]'))
        .map(el => el.textContent);

      return {
        emailRequired: emailInput?.required,
        passwordRequired: passwordInput?.required,
        emailValidity: emailInput?.validity.valid,
        passwordValidity: passwordInput?.validity.valid,
        errorMessages,
        hasVisibleErrors: errorMessages.length > 0
      };
    });

    console.log('   Validation state:', validationState);

    if (!validationState.hasVisibleErrors && !validationState.emailRequired) {
      issues.push({
        issue: 'Form Validation',
        severity: 'Medium',
        description: 'Empty form submission does not show validation errors',
        validationState
      });
    } else {
      console.log('   ✅ Form validation working');
    }

    // ==================== ISSUE 5: Settings Page Forms ====================
    console.log('\n5. Testing Settings page...');

    // Re-login
    await page.type('input[name="email"]', ADMIN_EMAIL);
    await page.type('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await new Promise(resolve => setTimeout(resolve,2000);

    await page.goto(`${BASE_URL}settings`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve,1500);

    const settingsStructure = await page.evaluate(() => {
      return {
        hasForms: document.querySelectorAll('form').length,
        hasInputs: document.querySelectorAll('input, textarea, select').length,
        hasButtons: document.querySelectorAll('button').length,
        hasCards: document.querySelectorAll('.card, [class*="card"]').length,
        hasResetButton: !!document.querySelector('button:has-text("Reset"), button:has-text("reset")'),
        pageContent: document.querySelector('main, [role="main"]')?.textContent.substring(0, 200)
      };
    });

    console.log('   Settings page structure:', settingsStructure);

    if (settingsStructure.hasForms === 0) {
      console.log('   ℹ️  No traditional forms, but this may be by design (API-based settings)');

      // Check if it's a valid settings page with content
      if (settingsStructure.hasCards === 0 && !settingsStructure.pageContent?.includes('Settings')) {
        issues.push({
          issue: 'Settings Page',
          severity: 'Medium',
          description: 'Settings page appears empty or not properly loaded',
          structure: settingsStructure
        });
      }
    } else {
      console.log('   ✅ Settings page has form elements');
    }

    // ==================== ISSUE 6: Modal Testing ====================
    console.log('\n6. Testing modal functionality...');
    await page.goto(`${BASE_URL}candidates`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve,1000);

    // Look for "Add Candidate" button
    const addButton = await page.$('button:has-text("Add")');
    if (addButton) {
      const buttonText = await page.evaluate(el => el.textContent, addButton);
      console.log(`   Found button: "${buttonText}"`);

      await addButton.click();
      await new Promise(resolve => setTimeout(resolve,1000);

      const modalState = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"], .modal');
        return {
          modalExists: !!modal,
          modalVisible: modal ? modal.offsetParent !== null : false,
          modalContent: modal?.textContent.substring(0, 100),
          hasCloseButton: !!document.querySelector('[role="dialog"] button, .modal button'),
          hasOverlay: !!document.querySelector('[role="dialog"] + div, .modal-overlay')
        };
      });

      console.log('   Modal state:', modalState);

      if (!modalState.modalExists) {
        issues.push({
          issue: 'Modal Opening',
          severity: 'Medium',
          description: 'Add Candidate button does not open a modal',
          buttonText
        });
      } else {
        console.log('   ✅ Modal opens successfully');

        // Test closing modal
        const closeButton = await page.$('[role="dialog"] button:first-of-type, .modal button:first-of-type');
        if (closeButton) {
          await closeButton.click();
          await new Promise(resolve => setTimeout(resolve,500);

          const modalGone = await page.$('[role="dialog"]').then(el => el === null);
          console.log(`   Modal closes: ${modalGone}`);
        }
      }
    } else {
      console.log('   ⚠️  No Add button found to test modal');
    }

    // ==================== ISSUE 7: Console Errors Analysis ====================
    console.log('\n7. Analyzing console errors...');

    const consoleMessages = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });

    // Visit a few pages to capture errors
    await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve,1000);
    await page.goto(`${BASE_URL}candidates`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve,1000);

    const errorSummary = {};
    consoleMessages.forEach(msg => {
      if (msg.includes('401')) {
        errorSummary['401_errors'] = (errorSummary['401_errors'] || 0) + 1;
      } else if (msg.includes('Failed to load')) {
        errorSummary['resource_errors'] = (errorSummary['resource_errors'] || 0) + 1;
      } else {
        errorSummary['other_errors'] = (errorSummary['other_errors'] || 0) + 1;
      }
    });

    console.log('   Console error summary:', errorSummary);

    if (errorSummary['401_errors'] > 5) {
      issues.push({
        issue: 'Authentication Errors',
        severity: 'High',
        description: 'Multiple 401 Unauthorized errors detected',
        count: errorSummary['401_errors'],
        note: 'May indicate session token not being sent with API requests'
      });
    }

  } catch (error) {
    console.error('❌ Test error:', error);
    issues.push({
      issue: 'Test Execution',
      severity: 'Critical',
      description: error.message,
      stack: error.stack
    });
  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📋 SPECIFIC ISSUES FOUND');
  console.log('='.repeat(80));

  if (issues.length === 0) {
    console.log('✅ No critical issues found in detailed testing');
  } else {
    issues.forEach((issue, i) => {
      console.log(`\n${i + 1}. ${issue.issue} [${issue.severity}]`);
      console.log(`   ${issue.description}`);
      if (issue.note) console.log(`   Note: ${issue.note}`);
    });
  }

  const reportPath = path.join(__dirname, 'specific_issues_report.json');
  fs.writeFileSync(reportPath, JSON.stringify({ issues, timestamp: new Date().toISOString() }, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

testSpecificIssues().then(() => {
  console.log('\n✨ Specific issue testing complete!');
}).catch(error => {
  console.error('\n💥 Test crashed:', error);
  process.exit(1);
});
