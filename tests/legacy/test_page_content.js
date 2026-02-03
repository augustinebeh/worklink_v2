/**
 * Test to capture page content and console errors
 */

const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

async function testPageContent() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 667 });

  // Capture console logs and errors
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  console.log('Loading login page...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 15000 });

  // Wait for React to render
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('\n=== PAGE ANALYSIS ===\n');
  console.log('Title:', await page.title());
  console.log('URL:', page.url());

  // Get body text
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('\n=== BODY TEXT (first 500 chars) ===\n');
  console.log(bodyText.substring(0, 500));

  // Get HTML structure
  const structure = await page.evaluate(() => {
    const root = document.getElementById('root');
    if (!root) return 'No root element found';
    return {
      hasContent: root.children.length > 0,
      childCount: root.children.length,
      firstChildTag: root.children[0]?.tagName,
      classes: root.children[0]?.className
    };
  });
  console.log('\n=== ROOT STRUCTURE ===\n');
  console.log(structure);

  // Check for specific elements
  const elements = await page.evaluate(() => {
    return {
      buttons: document.querySelectorAll('button').length,
      inputs: document.querySelectorAll('input').length,
      forms: document.querySelectorAll('form').length,
      divs: document.querySelectorAll('div').length,
      hasEmailText: document.body.innerText.toLowerCase().includes('email'),
      hasLoginText: document.body.innerText.toLowerCase().includes('login'),
      hasWelcomeText: document.body.innerText.toLowerCase().includes('welcome')
    };
  });
  console.log('\n=== ELEMENTS COUNT ===\n');
  console.log(elements);

  // Try to find any text that might indicate the page loaded
  const pageContent = await page.evaluate(() => {
    const allText = Array.from(document.querySelectorAll('*'))
      .map(el => el.textContent)
      .filter(text => text && text.trim().length > 0 && text.trim().length < 100)
      .slice(0, 20);
    return allText;
  });
  console.log('\n=== VISIBLE TEXT SNIPPETS ===\n');
  console.log(pageContent);

  await browser.close();
}

testPageContent().catch(console.error);
