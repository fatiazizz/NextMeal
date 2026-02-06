/**
 * Generate Android app icons in different densities
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputIcon = path.join(__dirname, '../public/icons/icon-512x512.png');
const androidResDir = path.join(__dirname, '../android-project/app/src/main/res');

// Android mipmap sizes (based on density)
const mipmapSizes = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

async function generateAndroidIcons() {
  console.log('Generating Android icons...\n');

  for (const { folder, size } of mipmapSizes) {
    const outputDir = path.join(androidResDir, folder);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
      // Generate regular icon
      await sharp(inputIcon)
        .resize(size, size)
        .png()
        .toFile(path.join(outputDir, 'ic_launcher.png'));
      
      // Generate round icon
      await sharp(inputIcon)
        .resize(size, size)
        .png()
        .toFile(path.join(outputDir, 'ic_launcher_round.png'));
      
      console.log(`✓ Generated ${folder}: ${size}x${size}`);
    } catch (error) {
      console.error(`✗ Error generating ${folder}:`, error.message);
    }
  }

  console.log('\n✅ Android icons generated successfully!');
}

generateAndroidIcons().catch(console.error);
