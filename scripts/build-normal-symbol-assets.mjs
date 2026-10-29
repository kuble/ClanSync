import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const docs = path.join(root, "docs/design/symbols/normal-v1");
const manifest = JSON.parse(await readFile(path.join(docs, "manifest.json"), "utf8"));
const ink = manifest.canvas.ink;
const source = [];
for (const asset of manifest.assets) {
  const svg = await readFile(path.join(root, "public", asset.assetUrl), "utf8");
  assert.match(svg, /viewBox="0 0 128 128"/);
  assert(!/<(?:script|image|animate|filter|linearGradient|radialGradient)\b|href=|url\(/i.test(svg));
  const colors = [...svg.matchAll(/(?:fill|stroke)="(#[0-9a-f]+)"/gi)].map(match => match[1]);
  assert(colors.length > 0 && colors.every(color => color === ink));
  for (const size of [24, 32, 48, 512]) {
    const { data, info } = await sharp(Buffer.from(svg)).resize(size, size).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.channels, 4);
    let opaque = 0;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const alpha = data[(y * size + x) * 4 + 3];
      if (alpha > 0) {
        opaque++;
        assert(x > 0 && y > 0 && x < size - 1 && y < size - 1, `${asset.id}: clipped at ${size}px`);
      }
    }
    assert(opaque > size * size * .08, `${asset.id}: missing silhouette`);
  }
  await sharp(Buffer.from(svg)).resize(512, 512).webp({ lossless: true }).toFile(path.join(root, "public", asset.rasterUrl));
  const metadata = await sharp(path.join(root, "public", asset.rasterUrl)).metadata();
  assert.equal(metadata.width, 512);
  assert.equal(metadata.height, 512);
  assert.equal(metadata.hasAlpha, true);
  source.push(svg);
}

const width = 1424, height = 840;
const text = (x, y, value, size = 14, color = "#8F9E99", extra = "") => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" ${extra}>${value}</text>`;
const layers = [];
let background = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#101715"/><g font-family="Arial, sans-serif">`;
background += text(52, 52, "CLANSYNC / SYMBOL STUDIES", 12, "#9AB0A5", 'letter-spacing="2"');
background += text(52, 109, "Normal. Five shapes, one ink.", 34, "#E8EFEC", 'font-weight="600"');
background += text(52, 143, "01–05 / GEOMETRIC / MONOCHROME / TRANSPARENT", 12);
for (const [index, asset] of manifest.assets.entries()) {
  const x = 52 + index * 268;
  background += `<rect x="${x}" y="181" width="248" height="470" rx="14" fill="#18211D" stroke="#2A3831"/>`;
  background += text(x + 22, 216, asset.number, 12);
  background += text(x + 22, 385, asset.englishName, 23, "#E8EFEC", 'font-weight="600"');
  background += text(x + 22, 412, "NORMAL / STATIC", 10, "#90A79A", 'letter-spacing="1"');
  background += text(x + 22, 454, "24", 10) + text(x + 81, 454, "32", 10) + text(x + 158, 454, "48", 10);
  background += `<rect x="${x + 18}" y="527" width="212" height="54" rx="8" fill="#EDF1EE"/>`;
  background += text(x + 71, 558, "Light surface", 12, "#34483D");
  background += `<rect x="${x + 18}" y="594" width="212" height="40" rx="6" fill="#101715"/>`;
  background += text(x + 65, 619, "Player_01", 12, "#E8EFEC");
  const add = async (size, left, top, dark = false) => {
    const svg = dark ? source[index].replaceAll(ink, "#243E30") : source[index];
    layers.push({ input: await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer(), left, top });
  };
  await add(128, x + 60, 237);
  await add(24, x + 22, 477);
  await add(32, x + 81, 473);
  await add(48, x + 152, 465);
  await add(32, x + 27, 538, true);
  await add(32, x + 25, 598);
}
background += text(52, 711, "Built for small namecards.", 20, "#E8EFEC");
background += text(52, 740, "128-unit SVG masters · 512px lossless WebP · no gradients, textures or animation", 13);
background += text(52, 792, "DESIGN SERIES / NORMAL V1", 11, "#71877A", 'letter-spacing="1"');
background += text(1372, 792, "2026.10.29", 11, "#71877A", 'text-anchor="end"');
background += "</g></svg>";
await sharp(Buffer.from(background)).composite(layers).png().toFile(path.join(docs, "contact-sheet.png"));
console.log(`Verified ${source.length} monochrome symbols at 24/32/48/512px; rendered transparent WebP and contact sheet.`);
