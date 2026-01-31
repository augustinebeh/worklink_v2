/**
 * App Icon Generator for WorkLink PWA
 *
 * Generates all required icon sizes for PWA, favicon, and splash screens
 * Run with: node scripts/generate-icons.cjs
 */

const fs = require('fs');
const path = require('path');

// Try to use canvas for PNG generation
let createCanvas;
try {
  const canvas = require('canvas');
  createCanvas = canvas.createCanvas;
} catch (e) {
  console.error('Canvas not available. Run: npm install canvas');
  process.exit(1);
}

// Brand colors
const COLORS = {
  bgDark: '#020617',
  bgGradientStart: '#0a1628',
  bgGradientEnd: '#1a0a2e',
  primary: '#8b5cf6',
  primaryLight: '#a78bfa',
  primaryDark: '#7c3aed',
  accent: '#10b981',
  accentLight: '#34d399',
  white: '#ffffff',
  gold: '#fbbf24',
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

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Draw the WorkLink icon on a canvas
 */
function drawIcon(ctx, size) {
  const center = size / 2;
  const padding = size * 0.1;
  const iconSize = size - (padding * 2);

  // Background with gradient
  const bgGradient = ctx.createRadialGradient(
    center, center * 0.7, 0,
    center, center, size * 0.8
  );
  bgGradient.addColorStop(0, COLORS.bgGradientStart);
  bgGradient.addColorStop(0.5, '#0f0a1f');
  bgGradient.addColorStop(1, COLORS.bgGradientEnd);

  // Rounded rectangle background
  const radius = size * 0.22;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fillStyle = bgGradient;
  ctx.fill();

  // Subtle outer glow
  const glowGradient = ctx.createRadialGradient(
    center, center * 0.6, size * 0.1,
    center, center * 0.6, size * 0.5
  );
  glowGradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
  glowGradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
  ctx.fillStyle = glowGradient;
  ctx.fillRect(0, 0, size, size);

  // Main icon circle with gradient
  const circleRadius = size * 0.32;
  const circleGradient = ctx.createLinearGradient(
    center - circleRadius, center - circleRadius,
    center + circleRadius, center + circleRadius
  );
  circleGradient.addColorStop(0, COLORS.primary);
  circleGradient.addColorStop(0.5, COLORS.primaryLight);
  circleGradient.addColorStop(1, COLORS.primaryDark);

  // Outer ring glow
  ctx.beginPath();
  ctx.arc(center, center, circleRadius + size * 0.02, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(139, 92, 246, 0.4)';
  ctx.fill();

  // Main circle
  ctx.beginPath();
  ctx.arc(center, center, circleRadius, 0, Math.PI * 2);
  ctx.fillStyle = circleGradient;
  ctx.fill();

  // Inner shadow on circle
  const innerShadow = ctx.createRadialGradient(
    center, center - circleRadius * 0.3, 0,
    center, center, circleRadius
  );
  innerShadow.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
  innerShadow.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  innerShadow.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
  ctx.beginPath();
  ctx.arc(center, center, circleRadius, 0, Math.PI * 2);
  ctx.fillStyle = innerShadow;
  ctx.fill();

  // Draw stylized "W" letter
  const letterSize = size * 0.28;
  const letterY = center + letterSize * 0.15;

  ctx.fillStyle = COLORS.white;
  ctx.font = `bold ${letterSize}px "SF Pro Display", "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Add subtle shadow to letter
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = size * 0.02;
  ctx.shadowOffsetY = size * 0.01;
  ctx.fillText('W', center, letterY);
  ctx.shadowColor = 'transparent';

  // Small accent dot (like a notification/level indicator)
  const dotRadius = size * 0.06;
  const dotX = center + circleRadius * 0.7;
  const dotY = center - circleRadius * 0.7;

  // Dot glow
  ctx.beginPath();
  ctx.arc(dotX, dotY, dotRadius + size * 0.015, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.5)';
  ctx.fill();

  // Dot
  const dotGradient = ctx.createRadialGradient(
    dotX - dotRadius * 0.3, dotY - dotRadius * 0.3, 0,
    dotX, dotY, dotRadius
  );
  dotGradient.addColorStop(0, COLORS.accentLight);
  dotGradient.addColorStop(1, COLORS.accent);
  ctx.beginPath();
  ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
  ctx.fillStyle = dotGradient;
  ctx.fill();

  // Dot shine
  ctx.beginPath();
  ctx.arc(dotX - dotRadius * 0.2, dotY - dotRadius * 0.2, dotRadius * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fill();
}

/**
 * Generate SVG version of the icon
 */
function generateSVG() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="35%" r="80%">
      <stop offset="0%" style="stop-color:#0a1628"/>
      <stop offset="50%" style="stop-color:#0f0a1f"/>
      <stop offset="100%" style="stop-color:#1a0a2e"/>
    </radialGradient>

    <!-- Glow gradient -->
    <radialGradient id="glowGrad" cx="50%" cy="30%" r="50%">
      <stop offset="0%" style="stop-color:rgba(139,92,246,0.3)"/>
      <stop offset="100%" style="stop-color:rgba(139,92,246,0)"/>
    </radialGradient>

    <!-- Circle gradient -->
    <linearGradient id="circleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8b5cf6"/>
      <stop offset="50%" style="stop-color:#a78bfa"/>
      <stop offset="100%" style="stop-color:#7c3aed"/>
    </linearGradient>

    <!-- Dot gradient -->
    <radialGradient id="dotGrad" cx="30%" cy="30%" r="70%">
      <stop offset="0%" style="stop-color:#34d399"/>
      <stop offset="100%" style="stop-color:#10b981"/>
    </radialGradient>

    <!-- Inner highlight -->
    <radialGradient id="innerHighlight" cx="50%" cy="30%" r="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.2)"/>
      <stop offset="50%" style="stop-color:rgba(255,255,255,0)"/>
      <stop offset="100%" style="stop-color:rgba(0,0,0,0.2)"/>
    </radialGradient>

    <!-- Drop shadow -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>

  <!-- Glow overlay -->
  <rect width="512" height="512" rx="112" fill="url(#glowGrad)"/>

  <!-- Outer ring glow -->
  <circle cx="256" cy="256" r="168" fill="rgba(139,92,246,0.4)"/>

  <!-- Main circle -->
  <circle cx="256" cy="256" r="164" fill="url(#circleGrad)"/>

  <!-- Inner highlight on circle -->
  <circle cx="256" cy="256" r="164" fill="url(#innerHighlight)"/>

  <!-- W Letter -->
  <text x="256" y="276"
        font-family="SF Pro Display, Segoe UI, Arial, sans-serif"
        font-size="144"
        font-weight="bold"
        fill="white"
        text-anchor="middle"
        filter="url(#shadow)">W</text>

  <!-- Accent dot glow -->
  <circle cx="371" cy="141" r="38" fill="rgba(16,185,129,0.5)"/>

  <!-- Accent dot -->
  <circle cx="371" cy="141" r="31" fill="url(#dotGrad)"/>

  <!-- Dot shine -->
  <circle cx="365" cy="135" r="9" fill="rgba(255,255,255,0.4)"/>
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

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(outputDir, name), buffer);
    console.log(`  Generated ${name} (${size}x${size})`);
  }

  // Also save the main favicon.png (use 192x192)
  const mainCanvas = createCanvas(192, 192);
  const mainCtx = mainCanvas.getContext('2d');
  drawIcon(mainCtx, 192);
  fs.writeFileSync(path.join(outputDir, 'favicon.png'), mainCanvas.toBuffer('image/png'));
  console.log('  Generated favicon.png (192x192)');
}

/**
 * Update splash screens with new icon
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
    const bgGradient = ctx.createRadialGradient(
      width / 2, height * 0.4, 0,
      width / 2, height * 0.4, Math.max(width, height) * 0.8
    );
    bgGradient.addColorStop(0, '#0a1628');
    bgGradient.addColorStop(0.5, '#0f0a1f');
    bgGradient.addColorStop(1, COLORS.bgDark);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Ambient glow
    const glowGradient = ctx.createRadialGradient(
      width / 2, height * 0.35, 0,
      width / 2, height * 0.35, width * 0.6
    );
    glowGradient.addColorStop(0, 'rgba(139, 92, 246, 0.15)');
    glowGradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw icon in center (larger for splash)
    const iconSize = Math.min(width, height) * 0.25;
    const iconX = (width - iconSize) / 2;
    const iconY = height * 0.35 - iconSize / 2;

    // Create temporary canvas for icon
    const iconCanvas = createCanvas(iconSize, iconSize);
    const iconCtx = iconCanvas.getContext('2d');
    drawIcon(iconCtx, iconSize);

    // Draw icon on splash
    ctx.drawImage(iconCanvas, iconX, iconY);

    // App name
    const fontSize = Math.min(width, height) * 0.07;
    ctx.fillStyle = COLORS.white;
    ctx.font = `bold ${fontSize}px "SF Pro Display", "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('WorkLink', width / 2, height * 0.55);

    // Tagline
    ctx.fillStyle = '#64748b';
    ctx.font = `${fontSize * 0.45}px "SF Pro Display", "Segoe UI", Arial, sans-serif`;
    ctx.fillText('Level Up Your Career', width / 2, height * 0.60);

    // Save
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(splashDir, `${name}.png`), buffer);
    console.log(`  Generated ${name}.png`);
  }
}

// Main execution
async function main() {
  console.log('WorkLink Icon Generator\n');
  console.log('========================\n');

  generateSVG();
  await generatePNGs();
  await updateSplashScreens();

  console.log('\n========================');
  console.log('All icons generated successfully!');
  console.log(`Output directory: ${outputDir}`);
}

main().catch(console.error);
