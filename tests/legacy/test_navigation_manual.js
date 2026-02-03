/**
 * Manual Navigation Test - Interactive browser for debugging
 */

const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

async function manualTest() {
  const browser = await puppeteer.launch({
    headless: false, // Show browser
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    slowMo: 50 // Slow down actions
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 667 });

  console.log('Navigating to login page...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });

  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\nPage title:', await page.title());
  console.log('Current URL:', page.url());

  console.log('\nSearching for email toggle button...');
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(btn => ({
      text: btn.textContent.trim().substring(0, 50),
      class: btn.className,
      type: btn.type
    }));
  });
  console.log('Found buttons:', buttons);

  console.log('\nSearching for inputs...');
  const inputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input')).map(input => ({
      type: input.type,
      id: input.id,
      placeholder: input.placeholder,
      visible: input.offsetHeight > 0
    }));
  });
  console.log('Found inputs:', inputs);

  console.log('\nSearching for navigation elements...');
  const navElements = await page.evaluate(() => {
    const header = document.querySelector('header');
    const nav = document.querySelector('nav');
    return {
      hasHeader: !!header,
      hasNav: !!nav,
      headerHTML: header ? header.outerHTML.substring(0, 200) : null,
      navHTML: nav ? nav.outerHTML.substring(0, 200) : null
    };
  });
  console.log('Navigation elements:', navElements);

  console.log('\n\nBrowser will stay open for 30 seconds for manual inspection...');
  await new Promise(resolve => setTimeout(resolve, 30000));

  await browser.close();
}

manualTest().catch(console.error);
