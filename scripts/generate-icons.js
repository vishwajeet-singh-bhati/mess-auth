#!/usr/bin/env node
// scripts/generate-icons.js
// Generates simple SVG placeholder icons for the PWA manifest.
// Replace /public/icons/icon-192.png and icon-512.png with your real logo.

const fs = require('fs')
const path = require('path')

const iconsDir = path.join(__dirname, '..', 'public', 'icons')
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true })

function svgIcon(size) {
  const fontSize = Math.round(size * 0.35)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#070d1a"/>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e3a8a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0d1526;stop-opacity:1" />
    </linearGradient>
  </defs>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-size="${fontSize}" font-family="system-ui, sans-serif">🍽️</text>
</svg>`
}

// Write SVG files (browsers accept SVG for PWA icons too)
for (const size of [192, 512]) {
  const svgPath = path.join(iconsDir, `icon-${size}.svg`)
  fs.writeFileSync(svgPath, svgIcon(size))
  console.log(`✓ Created ${svgPath}`)
}

// Also write a simple favicon
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#1e3a8a"/>
  <text x="16" y="22" font-size="18" text-anchor="middle" font-family="system-ui">🍽</text>
</svg>`
fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.svg'), faviconSvg)
console.log('✓ Created public/favicon.svg')
console.log('')
console.log('💡 Replace these with your institute logo PNGs for production.')
