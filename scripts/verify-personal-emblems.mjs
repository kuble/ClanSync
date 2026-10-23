import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { awards, milestones, metals, awardColor, monthColors, yearColors, enamelWeight, enamelFilter } from "../public/personal-emblems/v1/catalog.mjs";

assert.equal(new Set(monthColors.map(([, hex]) => hex)).size, 12);
assert.equal(new Set(yearColors.map(([, hex]) => hex)).size, 6);
for (let month = 1; month <= 12; month++)
  assert.equal(awardColor("month", "2026-" + String(month).padStart(2, "0")), monthColors[month - 1]);
assert.equal(awardColor("month", "2027-01"), monthColors[0]);
for (const year of [1, 1999, 2025, 2026, 2027, 2031, 2099]) {
  assert.equal(awardColor("year", String(year).padStart(4, "0")), awardColor("year", String(year + 6).padStart(4, "0")));
}
for (const date of ["2026-00", "2026-13", "0000-01", "26-01", "2026-1"])
  assert.throws(() => awardColor("month", date));
for (const date of ["0000", "2026.5", "2026-01", "year"]) assert.throws(() => awardColor("year", date));
assert.throws(() => awardColor("all", "2026"));
for (const rgb of [[1, .7, .2], [.7, .75, .8], [.7, .4, .2], [.95, .92, .84]])
  assert.equal(enamelWeight(...rgb), 0);
assert.equal(enamelWeight(.1, .5, .3), 1);
assert.throws(() => enamelFilter('bad"id', "#123456"));
assert.throws(() => enamelFilter("valid", "red"));
const paths = [];
for (const period of ["month", "year"]) for (const award of awards) for (const metal of metals)
  paths.push("awards/" + period + "/" + award.id + "-" + metal + ".png");
for (const series of milestones) for (let stage = 1; stage <= 4; stage++)
  paths.push("milestones/" + series.id + "-" + stage + ".png");
assert.equal(paths.length, 50);
const results = [];
for (const relative of paths) {
  const filename = new URL("../public/personal-emblems/v1/" + relative, import.meta.url);
  const input = await readFile(filename);
  const metadata = await sharp(input).metadata();
  assert.equal(metadata.hasAlpha, true, relative + ": alpha");
  assert.equal(metadata.width, metadata.height, relative + ": square");
  const { data, info } = await sharp(input).raw().toBuffer({ resolveWithObject: true });
  let cornerMax = 0, opaque = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const alpha = data[(y * info.width + x) * info.channels + info.channels - 1];
    if ((x < 16 || x >= info.width - 16) && (y < 16 || y >= info.height - 16)) cornerMax = Math.max(cornerMax, alpha);
    if (alpha > 200) opaque++;
  }
  assert(cornerMax <= 1, relative + ": transparent corners");
  assert(opaque > info.width * info.height * .08, relative + ": visible artwork");
  results.push({ file: relative, width: info.width, height: info.height, bytes: input.length, sha256: createHash("sha256").update(input).digest("hex"), cornerAlphaMax: cornerMax });
}
assert.equal(new Set(results.map((row) => row.sha256)).size, 50);
const recorded = [];
for (const name of ["month", "year", "milestone-a", "milestone-b"]) {
  const record = JSON.parse(await readFile(new URL("../docs/design/personal-emblems/production-v1/" + name + "-prompts-and-assets.json", import.meta.url), "utf8"));
  recorded.push(...(record.assets ?? record.records));
}
assert.equal(recorded.length, 50);
const root = fileURLToPath(new URL("../", import.meta.url));
assert.equal(new Set(recorded.map((row) => resolve(root, row.destination))).size, 50);
for (const row of recorded) {
  assert(row.prompt && row.source && row.destination);
  const [original, saved] = await Promise.all([readFile(row.source), readFile(resolve(root, row.destination))]);
  assert.equal(createHash("sha256").update(original).digest("hex"), createHash("sha256").update(saved).digest("hex"), row.destination + ": source copy");
}
const output = { date: "2026-10-23", assets: results, sourceCopies: "50/50 identical to generated originals", dateColors: "12 monthly / 6 yearly, 2026 anchor", enamelMask: "gold/silver/bronze/ivory unaffected in channel checks" };
await writeFile(new URL("../docs/design/personal-emblems/production-v1/verification.json", import.meta.url), JSON.stringify(output, null, 2) + "\n");
console.log("50 unique square alpha PNGs; date cycle, enamel mask and corner transparency passed");
