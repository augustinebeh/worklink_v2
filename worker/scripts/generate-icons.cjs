/**
 * App Icon Generator for WorkLink PWA
 * Clean, simple design inspired by Crypto.com dark theme
 */

const fs = require('fs');
const path = require('path');

let createCanvas;
try {
  const canvas = require('canvas');
  createCanvas = canvas.createCanvas;
} catch (e) {
  console.error('Canvas not available. Run: npm install canvas');
  process.exit(1);
}

// Dark bluish theme colors (Crypto.com style)
const COLORS = {
  bg: '#0a0f1a',
  bgLight: '#0f1629',
  primary: '#6366f1',      // Indigo
  primaryLight: '#818cf8',
  white: '#ffffff',
};

// Icon sizes to generate
const ICON_SIZES = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 48, name: 'favicon-48x48.png' },
  { size: 64, name: 'favicon-64x64.png' },
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 256, name: 'icon-256x256.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
];

const outputDir = path.join(__dirname, '../public');

/**
 * Draw clean, simple WorkLink icon
 */
function drawIcon(ctx, size) {
  const center = size / 2;
  const radius = size * 0.22;  // Rounded corner radius

  // Dark bluish background
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fillStyle = COLORS.bg;
  ctx.fill();

  // Simple "W" letter - clean and bold
  const fontSize = size * 0.5;
  ctx.fillStyle = COLORS.white;
  ctx.font = `600 ${fontSize}px -apple-system, "SF Pro Display", "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('W', center, center + size * 0.02);
}

/**
 * Generate SVG version
 */
function generateSVG() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="${COLORS.bg}"/>
  <text x="256" y="270"
        font-family="-apple-system, SF Pro Display, Segoe UI, sans-serif"
        font-size="256"
        font-weight="600"
        fill="white"
        text-anchor="middle">W</text>
</svg>`;

  fs.writeFileSync(path.join(outputDir, 'favicon.svg'), svg);
  console.log('Generated favicon.svg');
}

/**
 * Generate all PNG icons
 */
async function generatePNGs() {
  console.log('Generating PNG icons...\n');

  for (const { size, name } of ICON_SIZES) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    drawIcon(ctx, size);
    fs.writeFileSync(path.join(outputDir, name), canvas.toBuffer('image/png'));
    console.log(`  Generated ${name}`);
  }

  // Main favicon.png
  const mainCanvas = createCanvas(192, 192);
  drawIcon(mainCanvas.getContext('2d'), 192);
  fs.writeFileSync(path.join(outputDir, 'favicon.png'), mainCanvas.toBuffer('image/png'));
  console.log('  Generated favicon.png');
}

/**
 * Update splash screens
 */
async function updateSplashScreens() {
  const splashDir = path.join(outputDir, 'splash');

  const SPLASH_SIZES = [
    { width: 750, height: 1334, name: 'splash-750x1334' },
    { width: 1242, height: 2208, name: 'splash-1242x2208' },
    { width: 1125, height: 2436, name: 'splash-1125x2436' },
    { width: 828, height: 1792, name: 'splash-828x1792' },
    { width: 1242, height: 2688, name: 'splash-1242x2688' },
    { width: 1170, height: 2532, name: 'splash-1170x2532' },
    { width: 1284, height: 2778, name: 'splash-1284x2778' },
    { width: 1179, height: 2556, name: 'splash-1179x2556' },
    { width: 1290, height: 2796, name: 'splash-1290x2796' },
    { width: 1536, height: 2048, name: 'splash-1536x2048' },
    { width: 1668, height: 2388, name: 'splash-1668x2388' },
    { width: 2048, height: 2732, name: 'splash-2048x2732' },
  ];

  console.log('\nGenerating splash screens...\n');

  for (const { width, height, name } of SPLASH_SIZES) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Solid dark background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, width, height);

    // Draw icon centered
    const iconSize = Math.min(width, height) * 0.2;
    const iconCanvas = createCanvas(iconSize, iconSize);
    drawIcon(iconCanvas.getContext('2d'), iconSize);
    ctx.drawImage(iconCanvas, (width - iconSize) / 2, height * 0.38 - iconSize / 2);

    // App name
    const fontSize = Math.min(width, height) * 0.055;
    ctx.fillStyle = COLORS.white;
    ctx.font = `600 ${fontSize}px -apple-system, "SF Pro Display", "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('WorkLink', width / 2, height * 0.52);

    // Tagline
    ctx.fillStyle = '#64748b';
    ctx.font = `400 ${fontSize * 0.5}px -apple-system, "SF Pro Display", "Segoe UI", sans-serif`;
    ctx.fillText('Level Up Your Career', width / 2, height * 0.57);

    fs.writeFileSync(path.join(splashDir, `${name}.png`), canvas.toBuffer('image/png'));
    console.log(`  Generated ${name}.png`);
  }
}

async function main() {
  console.log('WorkLink Icon Generator (Clean Design)\n');
  generateSVG();
  await generatePNGs();
  await updateSplashScreens();
  console.log('\nDone!');
}

main().catch(console.error);
