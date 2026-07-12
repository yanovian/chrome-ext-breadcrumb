import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const websiteRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(websiteRoot, '..');
const repoPublic = join(repoRoot, 'public');
const screenshotsSrc = join(repoRoot, '_doc', 'screenshots');
const outPublic = join(websiteRoot, 'public');

const rasterAssets = [
  ['icon/128.png', 'icon.png'],
  ['icon/48.png', 'icon-48.png'],
];

const screenshotAssets = [
  ['screenshot-1.jpg', 'screenshots/screenshot-1.jpg'],
  ['screenshot-2.jpg', 'screenshots/screenshot-2.jpg'],
  ['screenshot-3.jpg', 'screenshots/screenshot-3.jpg'],
  ['screenshot-4.jpg', 'screenshots/screenshot-4.jpg'],
];

const staticRoot = join(websiteRoot, 'static');
const staticAssets = [
  ['robots.txt', 'robots.txt'],
  ['sitemap.xml', 'sitemap.xml'],
  ['og-image.png', 'og-image.png'],
];

mkdirSync(join(outPublic, 'screenshots'), { recursive: true });
mkdirSync(join(outPublic, 'og'), { recursive: true });

for (const [from, to] of rasterAssets) {
  cpSync(join(repoPublic, from), join(outPublic, to));
}

for (const [from, to] of screenshotAssets) {
  cpSync(join(screenshotsSrc, from), join(outPublic, to));
}

for (const [from, to] of staticAssets) {
  cpSync(join(staticRoot, from), join(outPublic, to));
}

const ogStaticDir = join(staticRoot, 'og');
if (existsSync(ogStaticDir)) {
  for (const file of readdirSync(ogStaticDir)) {
    if (file.endsWith('.png')) {
      cpSync(join(ogStaticDir, file), join(outPublic, 'og', file));
    }
  }
}

console.log(
  `Copied ${rasterAssets.length} icons, ${screenshotAssets.length} screenshots, and OG images to website/public/`,
);
