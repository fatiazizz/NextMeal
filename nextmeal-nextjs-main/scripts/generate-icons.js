/**
 * PWA Icon Generator Script
 * 
 * This script generates PNG icons from the SVG source for PWA.
 * 
 * To use this script:
 * 1. Install sharp: npm install sharp --save-dev
 * 2. Run: node scripts/generate-icons.js
 * 
 * Or you can use online tools like:
 * - https://realfavicongenerator.net/
 * - https://www.pwabuilder.com/imageGenerator
 * - https://maskable.app/editor
 * 
 * Required icon sizes for PWA:
 * - 72x72
 * - 96x96
 * - 128x128
 * - 144x144
 * - 152x152
 * - 192x192
 * - 384x384
 * - 512x512
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is installed
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp is not installed. Installing now...');
  console.log('Please run: npm install sharp --save-dev');
  console.log('Then run this script again: node scripts/generate-icons.js');
  process.exit(1);
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.join(__dirname, '../public/icons/icon.svg');
const outputDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
  console.log('Generating PWA icons...\n');

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(inputSvg)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`✗ Error generating ${size}x${size}:`, error.message);
    }
  }

  // Generate Apple Touch Icon
  const appleTouchIcon = path.join(outputDir, '../apple-touch-icon.png');
  try {
    await sharp(inputSvg)
      .resize(180, 180)
      .png()
      .toFile(appleTouchIcon);
    console.log('✓ Generated: apple-touch-icon.png');
  } catch (error) {
    console.error('✗ Error generating apple-touch-icon:', error.message);
  }

  // Generate favicon
  const favicon = path.join(outputDir, '../favicon.ico');
  try {
    await sharp(inputSvg)
      .resize(32, 32)
      .png()
      .toFile(path.join(outputDir, '../favicon-32x32.png'));
    console.log('✓ Generated: favicon-32x32.png');
    
    await sharp(inputSvg)
      .resize(16, 16)
      .png()
      .toFile(path.join(outputDir, '../favicon-16x16.png'));
    console.log('✓ Generated: favicon-16x16.png');
  } catch (error) {
    console.error('✗ Error generating favicons:', error.message);
  }

  // Generate shortcut icons
  const shortcutIcons = ['meals', 'favorites', 'shopping', 'inventory'];
  for (const name of shortcutIcons) {
    const outputPath = path.join(outputDir, `${name}-shortcut.png`);
    try {
      await sharp(inputSvg)
        .resize(96, 96)
        .png()
        .toFile(outputPath);
      console.log(`✓ Generated: ${name}-shortcut.png`);
    } catch (error) {
      console.error(`✗ Error generating ${name}-shortcut:`, error.message);
    }
  }

  console.log('\n✅ Icon generation complete!');
  console.log('\nNote: For production, consider using a proper icon design tool');
  console.log('to create unique shortcut icons for each section.');
}

generateIcons().catch(console.error);
