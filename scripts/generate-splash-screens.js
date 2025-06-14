const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [
  { width: 2048, height: 2732, name: 'splash2048x2732' },
  { width: 1668, height: 2224, name: 'splash1668x2224' },
  { width: 1536, height: 2048, name: 'splash1536x2048' },
  { width: 1290, height: 2796, name: 'splash1290x2796' },
  { width: 1179, height: 2556, name: 'splash1179x2556' },
  { width: 1284, height: 2778, name: 'splash1284x2778' },
  { width: 1170, height: 2532, name: 'splash1170x2532' },
  { width: 1133, height: 2436, name: 'splash1133x2436' },
  { width: 750, height: 1334, name: 'splash750x1334' },
  { width: 640, height: 1136, name: 'splash640x1136' }
];

const sourceImage = path.join(__dirname, '../public/logo512.png');
const outputDir = path.join(__dirname, '../public');

async function generateSplashScreens() {
  for (const size of sizes) {
    await sharp(sourceImage)
      .resize(size.width, size.height, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(outputDir, `${size.name}.png`));
    console.log(`Generated ${size.name}.png`);
  }
}

generateSplashScreens().catch(console.error); 