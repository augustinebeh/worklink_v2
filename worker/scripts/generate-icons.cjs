/**
 * App Icon Generator for WorkLink PWA
 * Crypto.com inspired design with depth
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

// Deep navy blue gradient (from Wallet card)
const COLORS = {
  gradientStart: '#0a1628',
  gradientMid: '#0d1f3c',
  gradientEnd: '#1a1a3e',
  white: '#ffffff',
};

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
 * Draw Crypto.com style icon with gradient and depth
 */
function drawIcon(ctx, size) {
  const center = size / 2;
  const radius = size * 0.22;

  // Background gradient (diagonal)
  const bgGradient = ctx.createLinearGradient(0, 0, size, size);
  bgGradient.addColorStop(0, COLORS.gradientStart);
  bgGradient.addColorStop(0.5, COLORS.gradientMid);
  bgGradient.addColorStop(1, COLORS.gradientEnd);

  // Draw rounded rect background
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fillStyle = bgGradient;
  ctx.fill();

  // Subtle inner glow at top
  const glowGradient = ctx.createLinearGradient(0, 0, 0, size * 0.6);
  glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fillStyle = glowGradient;
  ctx.fill();

  // Draw "W" with depth effect
  const fontSize = size * 0.52;
  ctx.font = `bold ${fontSize}px -apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Shadow layer (depth effect)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillText('W', center + size * 0.015, center + size * 0.04);

  // Main white W
  ctx.fillStyle = COLORS.white;
  ctx.fillText('W', center, center + size * 0.02);

  // Subtle highlight on top of W
  const textGradient = ctx.createLinearGradient(0, center - fontSize/2, 0, center + fontSize/2);
  textGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  textGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
  textGradient.addColorStop(1, 'rgba(220, 220, 220, 0.9)');
  ctx.fillStyle = textGradient;
  ctx.fillText('W', center, center + size * 0.02);
}

/**
 * Generate SVG version
 */
function generateSVG() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a1628"/>
      <stop offset="50%" style="stop-color:#0d1f3c"/>
      <stop offset="100%" style="stop-color:#1a1a3e"/>
    </linearGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="0%" y2="60%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.08)"/>
      <stop offset="100%" style="stop-color:rgba(255,255,255,0)"/>
    </linearGradient>
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff"/>
      <stop offset="50%" style="stop-color:#f8f8f8"/>
      <stop offset="100%" style="stop-color:#e0e0e0"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="4" dy="8" stdDeviation="4" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>

  <!-- Top shine -->
  <rect width="512" height="512" rx="112" fill="url(#shine)"/>

  <!-- W with shadow and gradient -->
  <text x="256" y="276"
        font-family="-apple-system, SF Pro Display, Helvetica Neue, Arial, sans-serif"
        font-size="266"
        font-weight="bold"
        fill="url(#textGrad)"
        text-anchor="middle"
        filter="url(#shadow)">W</text>
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

    // Background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, COLORS.gradientStart);
    bgGradient.addColorStop(0.5, COLORS.gradientMid);
    bgGradient.addColorStop(1, COLORS.gradientEnd);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw icon centered
    const iconSize = Math.min(width, height) * 0.22;
    const iconCanvas = createCanvas(iconSize, iconSize);
    drawIcon(iconCanvas.getContext('2d'), iconSize);
    ctx.drawImage(iconCanvas, (width - iconSize) / 2, height * 0.38 - iconSize / 2);

    // App name with shadow
    const fontSize = Math.min(width, height) * 0.06;
    ctx.font = `600 ${fontSize}px -apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = 'center';

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillText('WorkLink', width / 2 + 2, height * 0.54 + 2);

    // Text
    ctx.fillStyle = COLORS.white;
    ctx.fillText('WorkLink', width / 2, height * 0.54);

    // Tagline
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = `400 ${fontSize * 0.45}px -apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;
    ctx.fillText('Level Up Your Career', width / 2, height * 0.59);

    fs.writeFileSync(path.join(splashDir, `${name}.png`), canvas.toBuffer('image/png'));
    console.log(`  Generated ${name}.png`);
  }
}

async function main() {
  console.log('WorkLink Icon Generator (Crypto.com Style)\n');
  generateSVG();
  await generatePNGs();
  await updateSplashScreens();
  console.log('\nDone!');
}

main().catch(console.error);
