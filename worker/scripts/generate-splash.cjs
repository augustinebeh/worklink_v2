/**
 * Splash Screen Generator
 *
 * Run with: node scripts/generate-splash.js
 * Requires: npm install canvas (optional, for PNG generation)
 *
 * This script generates iOS splash screens for the PWA.
 * If canvas is not available, it creates SVG files instead.
 */

const fs = require('fs');
const path = require('path');

// Splash screen sizes for different iOS devices
const SPLASH_SIZES = [
  { width: 750, height: 1334, name: 'splash-750x1334' },      // iPhone SE, 8, 7, 6s, 6
  { width: 1242, height: 2208, name: 'splash-1242x2208' },    // iPhone 8 Plus, 7 Plus
  { width: 1125, height: 2436, name: 'splash-1125x2436' },    // iPhone X, XS, 11 Pro
  { width: 828, height: 1792, name: 'splash-828x1792' },      // iPhone XR, 11
  { width: 1242, height: 2688, name: 'splash-1242x2688' },    // iPhone XS Max, 11 Pro Max
  { width: 1170, height: 2532, name: 'splash-1170x2532' },    // iPhone 12, 13, 14
  { width: 1284, height: 2778, name: 'splash-1284x2778' },    // iPhone 12 Pro Max, 13 Pro Max
  { width: 1179, height: 2556, name: 'splash-1179x2556' },    // iPhone 14 Pro
  { width: 1290, height: 2796, name: 'splash-1290x2796' },    // iPhone 14 Pro Max
  { width: 1536, height: 2048, name: 'splash-1536x2048' },    // iPad Mini, Air
  { width: 1668, height: 2388, name: 'splash-1668x2388' },    // iPad Pro 11"
  { width: 2048, height: 2732, name: 'splash-2048x2732' },    // iPad Pro 12.9"
];

// Brand colors
const BG_COLOR = '#020617';  // Dark background
const PRIMARY_COLOR = '#8b5cf6';  // Primary purple
const ACCENT_COLOR = '#10b981';   // Accent green

const outputDir = path.join(__dirname, '../public/splash');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate SVG splash screen
function generateSVG(width, height) {
  const logoSize = Math.min(width, height) * 0.15;
  const fontSize = Math.min(width, height) * 0.06;
  const centerX = width / 2;
  const centerY = height / 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="${BG_COLOR}"/>

  <!-- Gradient overlay -->
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:${PRIMARY_COLOR};stop-opacity:0.15"/>
      <stop offset="100%" style="stop-color:${BG_COLOR};stop-opacity:0"/>
    </radialGradient>
  </defs>
  <ellipse cx="${centerX}" cy="${centerY - height * 0.1}" rx="${width * 0.5}" ry="${height * 0.3}" fill="url(#glow)"/>

  <!-- Logo circle -->
  <circle cx="${centerX}" cy="${centerY - height * 0.05}" r="${logoSize * 0.6}" fill="${PRIMARY_COLOR}" opacity="0.2"/>
  <circle cx="${centerX}" cy="${centerY - height * 0.05}" r="${logoSize * 0.45}" fill="${PRIMARY_COLOR}"/>

  <!-- W letter -->
  <text x="${centerX}" y="${centerY - height * 0.05 + logoSize * 0.15}"
        font-family="Arial, sans-serif" font-size="${logoSize * 0.5}" font-weight="bold"
        fill="white" text-anchor="middle">W</text>

  <!-- App name -->
  <text x="${centerX}" y="${centerY + height * 0.08}"
        font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="600"
        fill="white" text-anchor="middle">WorkLink</text>

  <!-- Tagline -->
  <text x="${centerX}" y="${centerY + height * 0.12}"
        font-family="Arial, sans-serif" font-size="${fontSize * 0.5}"
        fill="#64748b" text-anchor="middle">Level Up Your Career</text>
</svg>`;
}

// Try to use canvas for PNG generation, fall back to SVG
async function generateSplashScreens() {
  console.log('Generating splash screens...\n');

  let useCanvas = false;
  let createCanvas;

  try {
    const canvas = require('canvas');
    createCanvas = canvas.createCanvas;
    useCanvas = true;
    console.log('Using canvas for PNG generation\n');
  } catch (e) {
    console.log('Canvas not available, generating SVG files instead.');
    console.log('To generate PNG files, run: npm install canvas\n');
  }

  for (const size of SPLASH_SIZES) {
    const { width, height, name } = size;

    if (useCanvas) {
      // Generate PNG
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, width, height);

      // Gradient glow
      const gradient = ctx.createRadialGradient(
        width / 2, height / 2 - height * 0.1, 0,
        width / 2, height / 2 - height * 0.1, width * 0.5
      );
      gradient.addColorStop(0, 'rgba(139, 92, 246, 0.15)');
      gradient.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Logo background circle
      const logoSize = Math.min(width, height) * 0.15;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2 - height * 0.05, logoSize * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
      ctx.fill();

      // Logo circle
      ctx.beginPath();
      ctx.arc(width / 2, height / 2 - height * 0.05, logoSize * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = PRIMARY_COLOR;
      ctx.fill();

      // W letter
      ctx.fillStyle = 'white';
      ctx.font = `bold ${logoSize * 0.5}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('W', width / 2, height / 2 - height * 0.05);

      // App name
      const fontSize = Math.min(width, height) * 0.06;
      ctx.font = `600 ${fontSize}px Arial`;
      ctx.fillText('WorkLink', width / 2, height / 2 + height * 0.08);

      // Tagline
      ctx.fillStyle = '#64748b';
      ctx.font = `${fontSize * 0.5}px Arial`;
      ctx.fillText('Level Up Your Career', width / 2, height / 2 + height * 0.12);

      // Save PNG
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(path.join(outputDir, `${name}.png`), buffer);
      console.log(`✓ Generated ${name}.png (${width}x${height})`);
    } else {
      // Generate SVG
      const svg = generateSVG(width, height);
      fs.writeFileSync(path.join(outputDir, `${name}.svg`), svg);
      console.log(`✓ Generated ${name}.svg (${width}x${height})`);
    }
  }

  console.log('\nDone! Splash screens saved to public/splash/');

  if (!useCanvas) {
    console.log('\nNote: SVG files were generated. For best iOS compatibility,');
    console.log('convert them to PNG using an image editor or install canvas:');
    console.log('  npm install canvas');
    console.log('  node scripts/generate-splash.js');
  }
}

generateSplashScreens().catch(console.error);
