// Generates the app icon set in public/ from the SVG shapes below.
// Usage: npm i --no-save playwright-core && node scripts/generate-icons.mjs
// Needs a local Chrome (override its path with CHROME_PATH). Run only when the icon changes; the output is committed.
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const PUBLIC = process.env.ICON_OUT ?? resolve(dirname(fileURLToPath(import.meta.url)), '../public');
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const DEFS = `
  <defs>
    <radialGradient id="bg" cx="30%" cy="22%" r="95%">
      <stop offset="0" stop-color="#3a2e22"/><stop offset="0.55" stop-color="#1f1b17"/><stop offset="1" stop-color="#141110"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f0d9ae"/><stop offset="0.5" stop-color="#c9a978"/><stop offset="1" stop-color="#9a7442"/>
    </linearGradient>
  </defs>`;
// Four-point sparkle (the brand mark) with a small accent dot, drawn on a 64×64 grid.
const MARK = `
  <path fill="url(#gold)" d="M32 11c3.5 8.6 9.2 14.3 17.8 17.8C41.2 32.3 35.5 38 32 46.6 28.5 38 22.8 32.3 14.2 28.8 22.8 25.3 28.5 19.6 32 11Z"/>
  <circle fill="url(#gold)" cx="32" cy="51.5" r="2.5"/>`;

/** rounded = browser tab / Android icon; full-bleed = iOS and maskable (the OS applies its own mask). */
const svg = ({ rounded, scale = 1 }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${DEFS}
  <rect width="64" height="64" rx="${rounded ? 15 : 0}" fill="url(#bg)"/>
  <g transform="translate(32 32) scale(${scale}) translate(-32 -32)">${MARK}</g>
</svg>`;

const browser = await chromium.launch({ executablePath: CHROME });
async function png(markup, size) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${markup}`);
  const buf = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  return buf;
}

/** ICO container holding PNG images (supported by all current browsers and Windows). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size === 256 ? 0 : size, 0); e.writeUInt8(size === 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(data.length, 8); e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const rounded = svg({ rounded: true });
writeFileSync(resolve(PUBLIC, 'favicon.svg'), rounded + '\n');
writeFileSync(resolve(PUBLIC, 'favicon.ico'), ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(rounded, size) })))));
writeFileSync(resolve(PUBLIC, 'icon-192.png'), await png(rounded, 192));
writeFileSync(resolve(PUBLIC, 'icon-512.png'), await png(rounded, 512));
writeFileSync(resolve(PUBLIC, 'apple-touch-icon.png'), await png(svg({ rounded: false, scale: 0.86 }), 180));
// Maskable: the mark stays inside the central 80% safe zone.
writeFileSync(resolve(PUBLIC, 'icon-maskable-512.png'), await png(svg({ rounded: false, scale: 0.7 }), 512));
await browser.close();
console.log('Icons written to', PUBLIC);
