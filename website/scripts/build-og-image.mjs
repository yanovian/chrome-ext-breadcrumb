import { mkdirSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;
const RTL_LOCALES = new Set(['ar', 'fa', 'he']);
const WIDE_TEXT_LOCALES = new Set(['hi', 'bn', 'ta', 'ja', 'ko', 'zh_CN', 'th']);

const websiteRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const localesRoot = join(websiteRoot, 'src', 'locales');
const staticRoot = join(websiteRoot, 'static');
const ogDir = join(staticRoot, 'og');
const defaultOutPath = join(staticRoot, 'og-image.png');
const publicRoot = join(websiteRoot, 'public');
const iconPath = join(publicRoot, 'icon.png');

const ICON_LEFT = 100;
const TEXT_FONT =
  "'Noto Sans', 'Noto Sans Arabic', 'Noto Sans Hebrew', 'Noto Sans CJK SC', 'Noto Sans Devanagari', system-ui, sans-serif";

function fontFamilyFor() {
  return TEXT_FONT;
}

function svgFontDefs() {
  return '';
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function truncate(value, max) {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function wrapLines(text, maxChars, maxLines) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
    }
    current = word;
    if (lines.length >= maxLines) {
      break;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = truncate(lines[maxLines - 1], maxChars);
  }

  return lines;
}

function loadLocales() {
  return readdirSync(localesRoot).filter((entry) =>
    existsSync(join(localesRoot, entry, 'seo.json')),
  );
}

function layout(locale) {
  // Cat stays on the left. Text uses the wide column to the right of the cat.
  if (RTL_LOCALES.has(locale)) {
    return {
      rtl: true,
      wide: false,
      textX: 1175,
      anchor: 'start',
      direction: 'rtl',
      headlineMaxChars: 36,
      bodyMaxChars: 44,
      headlineLines: 2,
      bodyLines: 3,
    };
  }

  if (WIDE_TEXT_LOCALES.has(locale)) {
    return {
      rtl: false,
      wide: true,
      textX: 470,
      anchor: 'start',
      direction: 'ltr',
      headlineMaxChars: 24,
      bodyMaxChars: 34,
      headlineLines: 2,
      bodyLines: 3,
    };
  }

  return {
    rtl: false,
    wide: false,
    textX: 470,
    anchor: 'start',
    direction: 'ltr',
    headlineMaxChars: 28,
    bodyMaxChars: 38,
    headlineLines: 2,
    bodyLines: 3,
  };
}

function linesFromText(text, maxChars, maxLines) {
  if (text.includes('\n')) {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, maxLines);
  }
  return wrapLines(text, maxChars, maxLines);
}

function textBlock({
  x,
  anchor,
  direction,
  y,
  size,
  weight,
  fill,
  lines,
  lineHeight,
  lineGaps,
  fontFamily,
}) {
  const spans = lines
    .map((line, index) => {
      const dy =
        index === 0 ? 0 : lineGaps?.[index] ?? lineHeight;
      return `<tspan x="${x}" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join('');
  return `<text x="${x}" y="${y}" fill="${fill}" direction="${direction}" text-anchor="${anchor}" font-family="${fontFamily}" font-size="${size}" font-weight="${weight}">${spans}</text>`;
}

function buildSvg({ headlineLines, bodyLines, layoutConfig, locale }) {
  const { textX, anchor, direction, rtl, wide } = layoutConfig;
  const isWide = WIDE_TEXT_LOCALES.has(locale);
  const fontFamily = fontFamilyFor();
  const longestHeadline = headlineLines.reduce((max, line) => Math.max(max, line.length), 0);
  const titleSize = rtl
    ? longestHeadline > 30
      ? 42
      : longestHeadline > 24
        ? 48
        : 54
    : wide
      ? longestHeadline > 20
        ? 40
        : longestHeadline > 16
          ? 44
          : 48
      : longestHeadline > 24
        ? 46
        : longestHeadline > 18
          ? 52
          : 58;
  const titleY = rtl ? 210 : 220;
  const titleLineHeight = rtl ? 56 : 62;
  const bodyY = titleY + headlineLines.length * titleLineHeight + (rtl ? 28 : 32);
  const bodyLineHeight = rtl ? 48 : isWide ? 46 : 52;
  const bodySize = isWide ? 26 : 28;

  const title = textBlock({
    x: textX,
    anchor,
    direction,
    y: titleY,
    size: titleSize,
    weight: 800,
    fill: '#f6efe2',
    lines: headlineLines,
    lineHeight: titleLineHeight,
    fontFamily,
  });

  const body = textBlock({
    x: textX,
    anchor,
    direction,
    y: bodyY,
    size: bodySize,
    weight: 500,
    fill: '#a99d86',
    lines: bodyLines,
    lineHeight: bodyLineHeight,
    fontFamily,
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${OG_IMAGE_WIDTH}" height="${OG_IMAGE_HEIGHT}" viewBox="0 0 ${OG_IMAGE_WIDTH} ${OG_IMAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${svgFontDefs()}
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2a1f12"/>
      <stop offset="45%" stop-color="#14110c"/>
      <stop offset="100%" stop-color="#0d0a07"/>
    </linearGradient>
    <radialGradient id="glow" cx="28%" cy="38%" r="55%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="78%" cy="72%" r="45%">
      <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${OG_IMAGE_WIDTH}" height="${OG_IMAGE_HEIGHT}" fill="url(#bg)"/>
  <rect width="${OG_IMAGE_WIDTH}" height="${OG_IMAGE_HEIGHT}" fill="url(#glow)"/>
  <rect width="${OG_IMAGE_WIDTH}" height="${OG_IMAGE_HEIGHT}" fill="url(#glow2)"/>
  <circle cx="930" cy="520" r="220" fill="#f59e0b" fill-opacity="0.08"/>
  <rect x="80" y="130" width="340" height="370" rx="28" fill="#ffffff" fill-opacity="0.04" stroke="#ffffff" stroke-opacity="0.08"/>
  ${title}
  ${body}
</svg>`;
}

async function loadIconImage() {
  return sharp(iconPath).resize(300, 300, { fit: 'contain' }).png().toBuffer();
}

async function renderOgImage({ locale, seo, iconImage }) {
  const layoutConfig = layout(locale);
  const { rtl, headlineMaxChars, bodyMaxChars, headlineLines: maxHeadlineLines, bodyLines: maxBodyLines } =
    layoutConfig;
  const headlineSource = seo.title.replace(/^Breadcrumb[.:]\s*/i, '');
  const headline = truncate(headlineSource, rtl ? 66 : 64);
  const headlineLines = linesFromText(headline, headlineMaxChars, maxHeadlineLines);
  const bodyLines = linesFromText(seo.description, bodyMaxChars, maxBodyLines);
  const svg = buildSvg({ headlineLines, bodyLines, layoutConfig, locale });
  const textLayer = await sharp(Buffer.from(svg)).png().toBuffer();

  return sharp({
    create: {
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      channels: 4,
      background: '#14110c',
    },
  })
    .composite([
      { input: textLayer, top: 0, left: 0 },
      { input: iconImage, top: 165, left: ICON_LEFT },
    ])
    .png()
    .toBuffer();
}

async function main() {
  mkdirSync(ogDir, { recursive: true });
  if (!existsSync(iconPath)) {
    console.warn('[build-og-image] Run copy-assets first (needs public/icon.png).');
  }
  const iconImage = await loadIconImage();
  const locales = loadLocales();
  let wrote = 0;

  for (const locale of locales) {
    const seo = JSON.parse(readFileSync(join(localesRoot, locale, 'seo.json'), 'utf8'));
    const png = await renderOgImage({ locale, seo, iconImage });
    const outPath = join(ogDir, `${locale}.png`);
    await sharp(png).toFile(outPath);
    if (locale === 'en') {
      await sharp(png).toFile(defaultOutPath);
    }
    wrote += 1;
  }

  console.log(`[build-og-image] wrote ${wrote} OG images (${OG_IMAGE_WIDTH}x${OG_IMAGE_HEIGHT})`);
}

await main();
